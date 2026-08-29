import type { Message } from "../types";

interface Props {
  message: Message;
}

function formatContent(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }

      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
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
