import type { Message } from "../types";

interface Props {
  message: Message;
}

function formatContent(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function MessageBubble({ message }: Props) {
  return (
    <div className={`bubble ${message.role}`}>
      {message.role === "assistant" && (
        <span className="avatar" aria-hidden="true">
          🏷️
        </span>
      )}
      <div className="bubble-content">
        <p>{formatContent(message.content)}</p>
      </div>
    </div>
  );
}
