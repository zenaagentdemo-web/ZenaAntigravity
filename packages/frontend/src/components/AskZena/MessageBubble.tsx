import React from 'react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MessageBubble.css';
import { ActionChips, ActionChip } from './ActionChips';
import { useNavigate } from 'react-router-dom';

// 🧠 ZENA BUTTON REGEX: Robust matching for [PRODUCT_BUTTON: Label, /path, id]
// Allow optional spaces after commas and colons to handle varied LLM formatting
const PRODUCT_BUTTON_REGEX = /\[PRODUCT_BUTTON:\s*([^,]+),\s*([^,]+),\s*([^\]]+)\]/g;

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    attachments?: any[];
    timestamp?: Date;
    chips?: ActionChip[];
    isError?: boolean;
}

interface MessageBubbleProps {
    message: Message;
    onPreviewAttachment?: (attachment: any) => void;
    onRetry?: (messageId: string) => void;
    onNavigateToDeal?: () => void;
    showBackToDeal?: boolean;
    dealAddress?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    onPreviewAttachment,
    onRetry,
    onNavigateToDeal,
    showBackToDeal,
    dealAddress
}) => {
    const isAssistant = message.role === 'assistant';
    const navigate = useNavigate();
    const [copied, setCopied] = React.useState(false);

    // Parse product buttons from content
    const productButtons: Array<{ label: string; path: string; id: string }> = [];
    let cleanContent = message.content;

    if (isAssistant) {
        let match;
        const matches = [...message.content.matchAll(PRODUCT_BUTTON_REGEX)];
        for (const m of matches) {
            productButtons.push({
                label: m[1].trim(),
                path: m[2].trim(),
                id: m[3].trim()
            });
        }
        if (productButtons.length > 0) {
            console.log(`[MessageBubble] Found ${productButtons.length} product buttons in message ${message.id}`);
        }
        // Remove the meta-tags from the displayed content
        cleanContent = message.content.replace(PRODUCT_BUTTON_REGEX, '').trim();
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(cleanContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                        {cleanContent}
                    </ReactMarkdown>

                    {productButtons.length > 0 && (
                        <div className="product-buttons-container">
                            {productButtons.map((btn, idx) => (
                                <button
                                    key={idx}
                                    className="product-navigation-btn"
                                    onClick={() => navigate(btn.path, { state: { fromZena: true, highlightId: btn.id } })}
                                >
                                    <span className="btn-icon">👁️</span>
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="message-bubble-footer">
                    <button
                        className={`copy-message-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                        title="Copy message text"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                </div>

                {isAssistant && message.chips && message.chips.length > 0 && (
                    <ActionChips chips={message.chips} />
                )}
                {isAssistant && message.isError && onRetry && (
                    <div className="message-error-actions">
                        <button
                            className="retry-btn"
                            onClick={() => onRetry(message.id)}
                        >
                            <span className="retry-icon">🔄</span>
                            Retry Request
                        </button>
                    </div>
                )}
                {isAssistant && showBackToDeal && dealAddress && (
                    <button
                        className="back-to-deal-btn"
                        onClick={onNavigateToDeal}
                    >
                        <ArrowLeft size={16} />
                        Back to {dealAddress.split(',')[0]} deal flow card
                    </button>
                )}
            </div>
        </div>
    );
};
