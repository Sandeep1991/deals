import type { ClarificationPrompt, Message } from "../types";
import { ClarificationChoices } from "./ClarificationChoices";
import { parseClarificationFromMarkdown } from "../parseClarification";

interface Props {
  message: Message;
  /** Only the latest clarify prompt should be interactive. */
  interactive?: boolean;
  disabled?: boolean;
  onClarifyAnswer?: (text: string) => void;
}

function formatInline(text: string) {
  // Affilliate deep links include long query strings; stop at the closing ")" of the
  // markdown link by requiring the URL to start with http(s) and allowing "&" etc.
  return text
    .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }

      const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link"
          >
            {linkMatch[1]}
          </a>
        );
      }

      return part;
    });
}

function formatContent(text: string) {
  const lines = text.split("\n");
  const blocks: JSX.Element[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h4 key={index} className="bubble-heading">
          {formatInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("- ")) {
      blocks.push(
        <p key={index} className="bubble-list-item">
          {formatInline(trimmed.slice(2))}
        </p>
      );
      return;
    }

    if (trimmed.startsWith("_") && trimmed.endsWith("_")) {
      blocks.push(
        <p key={index} className="bubble-muted">
          <em>{trimmed.slice(1, -1)}</em>
        </p>
      );
      return;
    }

    blocks.push(<p key={index}>{formatInline(trimmed)}</p>);
  });

  return blocks;
}

/** When structured clarify UI is shown, keep only the intro / session-facts lines. */
function clarifyFallbackText(content: string, clarification?: ClarificationPrompt) {
  if (!clarification?.questions?.length) return content;
  const lines = content.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (kept.length) kept.push("");
      continue;
    }
    // Drop lettered question blocks and numbered options — chips replace them.
    if (/^\*\*[A-Z]\.\s/.test(t) || /^[A-Z]\.\s/.test(t)) break;
    if (/^\d+\.\s/.test(t)) continue;
    if (/^tap an option/i.test(t) || /^reply with answers/i.test(t)) continue;
    kept.push(line);
  }
  const text = kept.join("\n").trim();
  return text || clarification.intro || content;
}

function resolveClarification(message: Message): ClarificationPrompt | undefined {
  if (message.clarification?.questions?.length) {
    // Still collapse duplicate topics if API sent them.
    const seen = new Set<string>();
    const questions = [];
    for (const q of message.clarification.questions) {
      const key = (q.similarity_key || q.question || "").toLowerCase();
      const topic =
        /(ready[- ]made|store[- ]bought|bake|homemade|ingredients|make at home)/.test(key)
          ? "fulfillment_path"
          : key.slice(0, 64);
      if (seen.has(topic)) continue;
      seen.add(topic);
      questions.push(q);
    }
    if (questions.length !== message.clarification.questions.length) {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      return {
        ...message.clarification,
        questions: questions.map((q, i) => ({
          ...q,
          letter: letters[i] || String(i + 1),
        })),
      };
    }
    return message.clarification;
  }
  return parseClarificationFromMarkdown(message.content) || undefined;
}

export function MessageBubble({ message, interactive, disabled, onClarifyAnswer }: Props) {
  const clarification = resolveClarification(message);
  const showChoices =
    message.role === "assistant" &&
    Boolean(clarification?.needs_clarification) &&
    (clarification?.questions?.length || 0) > 0;

  return (
    <div className={`bubble ${message.role}`}>
      {message.role === "assistant" && (
        <span className="avatar" aria-hidden="true">
          🏷️
        </span>
      )}
      <div className="bubble-content">
        {showChoices
          ? formatContent(clarifyFallbackText(message.content, clarification))
          : formatContent(message.content)}
        {showChoices && interactive && onClarifyAnswer && clarification && (
          <ClarificationChoices
            clarification={clarification}
            disabled={disabled}
            onAnswer={onClarifyAnswer}
          />
        )}
        {showChoices && !interactive && (
          <p className="clarify-expired">Options were shown for this question earlier in the chat.</p>
        )}
      </div>
    </div>
  );
}
