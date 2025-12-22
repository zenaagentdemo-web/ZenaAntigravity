import React, { useState, useMemo } from 'react';
import './ChatSidebar.css';
import { groupConversationsByDate } from '../../utils/dateGrouping';

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
    const [isHistoricalVisible, setIsHistoricalVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredConversations = useMemo(() => {
        if (!searchTerm.trim()) return conversations;
        return conversations.filter(conv =>
            conv.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [conversations, searchTerm]);

    const grouped = useMemo(() => {
        return groupConversationsByDate(filteredConversations);
    }, [filteredConversations]);

    const renderConversationItem = (conv: Conversation) => (
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
                title="Delete Conversation"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        </div>
    );

    return (
        <aside className="chat-sidebar">
            <div className="chat-sidebar__header">
                <button className="new-chat-btn" onClick={onNewChat}>
                    <span className="plus-icon">+</span>
                    New Chat
                </button>
                <button
                    className={`history-toggle-btn ${isHistoricalVisible ? 'active' : ''}`}
                    onClick={() => setIsHistoricalVisible(!isHistoricalVisible)}
                    title="Toggle Historical Chats"
                >
                    <span className="history-icon">🕒</span>
                    {isHistoricalVisible ? 'Hide History' : 'Show History'}
                </button>
            </div>

            {isHistoricalVisible && (
                <div className="history-search-container animate-in">
                    <div className="search-wrapper">
                        <span className="search-icon-small">🔍</span>
                        <input
                            type="text"
                            className="history-search-input"
                            placeholder="Search chats..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
                        )}
                    </div>
                </div>
            )}

            <div className="chat-sidebar__list">
                {filteredConversations.length === 0 ? (
                    <div className="empty-state">
                        {searchTerm ? 'No matches found' : 'No past conversations'}
                    </div>
                ) : (
                    <>
                        {isHistoricalVisible ? (
                            <>
                                {grouped.map((group) => (
                                    <div key={group.label} className="conversation-group animate-in">
                                        <div className="group-label">{group.label}</div>
                                        {group.conversations.map(renderConversationItem)}
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="history-collapsed-indicator">
                                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} hidden
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="chat-sidebar__footer">
                {/* User profile or settings could go here */}
            </div>
        </aside>
    );
};
