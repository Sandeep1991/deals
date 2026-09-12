import type { ClarificationPrompt, ClarificationQuestion } from "../types";

const LETTER_RE = /^\*\*([A-Z])\.\s+([^*]+)\*\*\s*[—\-–]\s*(.+)$/;
const LETTER_PLAIN_RE = /^([A-Z])\.\s+([^—\-–]+)\s*[—\-–]\s*(.+)$/;
const OPTION_RE = /^\s*(\d+)\.\s+\*?\*?(.+?)\*?\*?\s*$/;

function normalizeTopic(text: string): string {
  const t = (text || "").toLowerCase();
  if (
    /(ready[- ]made|store[- ]bought|bake|homemade|ingredients|make at home)/.test(t)
  ) {
    return "fulfillment_path";
  }
  if (/(adult|child|kid|pet|household|who is coming|how many)/.test(t)) {
    return "party_size";
  }
  if (/(meal|breakfast|lunch|dinner|weekend)/.test(t)) {
    return "meal_count";
  }
  if (/(power station|power bank|charging)/.test(t)) {
    return "power_capacity";
  }
  return t.slice(0, 48);
}

/**
 * Parse lettered clarify markdown into a structured prompt.
 * Used when the API does not yet return `clarification` (older backends).
 * Also collapses duplicate ready-made vs bake paraphrases.
 */
export function parseClarificationFromMarkdown(content: string): ClarificationPrompt | null {
  const lines = (content || "").split("\n");
  if (!lines.some((l) => /before i plan/i.test(l) || /a few details/i.test(l))) {
    return null;
  }

  const introLines: string[] = [];
  const questions: ClarificationQuestion[] = [];
  let current: ClarificationQuestion | null = null;
  let pastIntro = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const letterMatch = line.match(LETTER_RE) || line.match(LETTER_PLAIN_RE);
    if (letterMatch) {
      pastIntro = true;
      if (current) questions.push(current);
      current = {
        id: `parsed.${letterMatch[1]}`,
        letter: letterMatch[1],
        intent: "grocery",
        intent_label: letterMatch[2].replace(/\*\*/g, "").trim(),
        question: letterMatch[3].trim(),
        options: [],
        similarity_key: normalizeTopic(letterMatch[3]),
      };
      continue;
    }

    const optMatch = line.match(OPTION_RE);
    if (optMatch && current) {
      pastIntro = true;
      current.options.push(optMatch[2].trim());
      continue;
    }

    if (/^tap an option/i.test(line) || /^reply with answers/i.test(line)) {
      pastIntro = true;
      continue;
    }

    if (!pastIntro) {
      introLines.push(line.replace(/\*\*/g, ""));
    }
  }
  if (current) questions.push(current);

  if (!questions.length || !questions.some((q) => q.options.length >= 2)) {
    return null;
  }

  // Dedupe paraphrases (e.g. two ready-made vs bake questions).
  const seen = new Map<string, ClarificationQuestion>();
  for (const q of questions) {
    const key = q.similarity_key || normalizeTopic(q.question);
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, q);
      continue;
    }
    // Prefer clearer option labels (Ready-made / store-bought over "ready-made").
    const prevScore = (prev.options || []).join(" ").length;
    const nextScore = (q.options || []).join(" ").length;
    if (nextScore > prevScore) {
      seen.set(key, q);
    }
  }
  const deduped = Array.from(seen.values());

  // Relabel letters after dedupe.
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const relabeled = deduped.map((q, i) => ({
    ...q,
    letter: letters[i] || String(i + 1),
    id: `parsed.${letters[i] || i}`,
  }));

  return {
    needs_clarification: true,
    intro: introLines.join(" ").trim() || "I need a few details before planning:",
    questions: relabeled,
  };
}
