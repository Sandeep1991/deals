import type { Message } from "../types";

interface Props {
  message: Message;
}

function formatInline(text: string) {
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

export function MessageBubble({ message }: Props) {
  return (
    <div className={`bubble ${message.role}`}>
      {message.role === "assistant" && (
        <span className="avatar" aria-hidden="true">
          🏷️
        </span>
      )}
      <div className="bubble-content">{formatContent(message.content)}</div>
    </div>
  );
}
