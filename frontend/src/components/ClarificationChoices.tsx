import { useMemo, useState } from "react";
import type { ClarificationPrompt, ClarificationQuestion } from "../types";

interface Props {
  clarification: ClarificationPrompt;
  disabled?: boolean;
  onAnswer: (text: string) => void;
}

function buildLetteredReply(
  questions: ClarificationQuestion[],
  selected: Record<string, string>
): string {
  return questions
    .map((q) => {
      const choice = selected[q.id];
      if (!choice) return null;
      return `${q.letter}: ${choice}`;
    })
    .filter(Boolean)
    .join("; ");
}

export function ClarificationChoices({ clarification, disabled, onAnswer }: Props) {
  const questions = clarification.questions || [];
  const [selected, setSelected] = useState<Record<string, string>>({});

  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every((q) => Boolean(selected[q.id])),
    [questions, selected]
  );

  if (!questions.length) return null;

  const single = questions.length === 1;

  const pick = (question: ClarificationQuestion, option: string) => {
    if (disabled) return;
    if (single) {
      onAnswer(option);
      return;
    }
    const next = { ...selected, [question.id]: option };
    setSelected(next);
    if (questions.every((q) => Boolean(next[q.id]))) {
      onAnswer(buildLetteredReply(questions, next));
    }
  };

  return (
    <div className="clarify-panel">
      {questions.map((q) => (
        <div key={q.id || q.letter} className="clarify-question">
          <div className="clarify-question-title">
            <span className="clarify-letter">{q.letter}</span>
            <div>
              <div className="clarify-intent">{q.intent_label || q.intent}</div>
              <div className="clarify-prompt">{q.question}</div>
            </div>
          </div>
          <div className="clarify-options">
            {(q.options || []).map((opt) => {
              const active = selected[q.id] === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`clarify-option ${active ? "selected" : ""}`}
                  disabled={disabled}
                  onClick={() => pick(q, opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!single && (
        <div className="clarify-actions">
          <button
            type="button"
            className="clarify-send"
            disabled={disabled || !allAnswered}
            onClick={() => onAnswer(buildLetteredReply(questions, selected))}
          >
            Continue with selected answers
          </button>
        </div>
      )}
    </div>
  );
}
