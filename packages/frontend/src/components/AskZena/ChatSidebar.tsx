import React from 'react';
import './ChatSidebar.css';

export interface Conversation {
    id: string;
    title: string;
    updatedAt: Date;
}

interface ChatSidebarProps {
    conversations: Conversation[];
    activeConversationId?: string;
    onConversationSelect: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    conversations,
    activeConversationId,
    onConversationSelect,
    onNewChat,
    onDeleteConversation,
}) => {
    return (
        <aside className="chat-sidebar">
            <div className="chat-sidebar__header">
                <button className="new-chat-btn" onClick={onNewChat}>
                    <span className="plus-icon">+</span>
                    New Chat
                </button>
            </div>

            <div className="chat-sidebar__list">
                {conversations.length === 0 ? (
                    <div className="empty-state">No past conversations</div>
                ) : (
                    conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={`conversation-item ${activeConversationId === conv.id ? 'active' : ''}`}
                            onClick={() => onConversationSelect(conv.id)}
                        >
                            <div className="conversation-item__title">{conv.title || 'Untitled Chat'}</div>
                            <button
                                className="delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteConversation(conv.id);
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="chat-sidebar__footer">
                {/* User profile or settings could go here */}
            </div>
        </aside>
    );
};
