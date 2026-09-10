import { formatSessionTime } from "../session";

export type SidebarChat = {
  chatId: string;
  title: string;
  updatedAt: string;
};

type Props = {
  chats: SidebarChat[];
  activeChatId: string;
  open: boolean;
  disabled?: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onClearActive: () => void;
};

export function ChatSidebar({
  chats,
  activeChatId,
  open,
  disabled,
  onClose,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClearActive,
}: Props) {
  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`chat-sidebar ${open ? "open" : ""}`} aria-label="Chat history">
        <div className="sidebar-top">
          <button
            type="button"
            className="sidebar-new-chat"
            onClick={onNewChat}
            disabled={disabled}
          >
            <span aria-hidden>+</span> New chat
          </button>
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <div className="sidebar-section-label">Chats</div>
        <nav className="sidebar-list">
          {chats.length === 0 && (
            <p className="sidebar-empty">No saved chats yet.</p>
          )}
          {chats.map((chat) => {
            const active = chat.chatId === activeChatId;
            return (
              <div
                key={chat.chatId}
                className={`sidebar-item ${active ? "active" : ""}`}
              >
                <button
                  type="button"
                  className="sidebar-item-main"
                  onClick={() => onSelectChat(chat.chatId)}
                  disabled={disabled}
                  title={chat.title}
                >
                  <span className="sidebar-item-title">{chat.title}</span>
                  <span className="sidebar-item-time">
                    {formatSessionTime(chat.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="sidebar-item-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.chatId);
                  }}
                  disabled={disabled}
                  aria-label={`Delete ${chat.title}`}
                  title="Delete chat"
                >
                  ×
                </button>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-footer-btn"
            onClick={onClearActive}
            disabled={disabled}
          >
            Clear this chat
          </button>
          <p className="sidebar-hint">Saved in this browser</p>
        </div>
      </aside>
    </>
  );
}
