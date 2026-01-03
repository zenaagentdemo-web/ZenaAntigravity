import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MessageBubble.css';
import { ActionChips, ActionChip } from './ActionChips';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: any[];
    timestamp?: Date;
    chips?: ActionChip[];
}

interface MessageBubbleProps {
    message: Message;
    onPreviewAttachment?: (attachment: any) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onPreviewAttachment }) => {
    const isAssistant = message.role === 'assistant';

    return (
        <div className={`message-bubble-wrapper ${isAssistant ? 'assistant' : 'user'}`}>
            <div className="message-bubble">
                {message.attachments && message.attachments.length > 0 && (
                    <div className="message-attachments">
                        {message.attachments.map((att, idx) => (
                            <div
                                key={idx}
                                className="attachment-preview clickable"
                                onClick={() => onPreviewAttachment?.(att)}
                                title="Click to preview"
                            >
                                {att.type === 'image' && <img src={att.url || att.base64} alt="attachment" />}
                                {att.type !== 'image' && <div className="file-icon">📄 {att.name}</div>}
                            </div>
                        ))}
                    </div>
                )}
                <div className="message-content">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // Make all links open in new tabs
                            a: ({ node, href, children, ...props }) => (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="zena-source-link"
                                    {...props}
                                >
                                    {children}
                                </a>
                            )
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>
                {isAssistant && message.chips && message.chips.length > 0 && (
                    <ActionChips chips={message.chips} />
                )}
            </div>
        </div>
    );
};
