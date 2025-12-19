import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MessageBubble.css';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: any[];
    timestamp?: Date;
}

interface MessageBubbleProps {
    message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isAssistant = message.role === 'assistant';

    return (
        <div className={`message-bubble-wrapper ${isAssistant ? 'assistant' : 'user'}`}>
            <div className="message-bubble">
                {message.attachments && message.attachments.length > 0 && (
                    <div className="message-attachments">
                        {message.attachments.map((att, idx) => (
                            <div key={idx} className="attachment-preview">
                                {att.type === 'image' && <img src={att.url || att.base64} alt="attachment" />}
                                {att.type !== 'image' && <div className="file-icon">📄 {att.name}</div>}
                            </div>
                        ))}
                    </div>
                )}
                <div className="message-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};
