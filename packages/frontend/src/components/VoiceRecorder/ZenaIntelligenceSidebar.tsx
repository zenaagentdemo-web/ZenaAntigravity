import React from 'react';
import './ZenaIntelligenceSidebar.css';

interface ProposedAction {
    toolName: string;
    label: string;
    params: any;
    confidence: number;
}

interface ZenaIntelligenceSidebarProps {
    summary: string;
    proposedActions: ProposedAction[];
    onActionApprove: (action: ProposedAction) => void;
    onChatWithZena: () => void;
}

export const ZenaIntelligenceSidebar: React.FC<ZenaIntelligenceSidebarProps> = ({
    summary,
    proposedActions,
    onActionApprove,
    onChatWithZena,
}) => {
    return (
        <div className="zena-intelligence-sidebar">
            <div className="zena-intelligence-sidebar__header">
                <span className="zena-intelligence-sidebar__badge">ZENA INTELLIGENCE</span>
                <h2 className="zena-intelligence-sidebar__title">Actionable Insights</h2>
            </div>

            <div className="zena-intelligence-sidebar__section">
                <h3 className="zena-intelligence-sidebar__section-title">Timeline Summary</h3>
                <div className="zena-intelligence-sidebar__summary-box">
                    <p className="zena-intelligence-sidebar__summary-text">{summary || "Analyzing recording for timeline summary..."}</p>
                </div>
            </div>

            <div className="zena-intelligence-sidebar__section">
                <div className="zena-intelligence-sidebar__section-header">
                    <h3 className="zena-intelligence-sidebar__section-title">Proposed Actions</h3>
                    <span className="zena-intelligence-sidebar__action-count">{proposedActions.length}</span>
                </div>

                <div className="zena-intelligence-sidebar__actions-list">
                    {proposedActions.length > 0 ? (
                        proposedActions.map((action, index) => {
                            const getActionIcon = (toolName: string) => {
                                if (toolName.includes('property')) return '🏠';
                                if (toolName.includes('task')) return '✅';
                                if (toolName.includes('contact')) return '👤';
                                if (toolName.includes('calendar')) return '📅';
                                return '⚡';
                            };

                            return (
                                <div key={index} className="zena-intelligence-sidebar__action-card">
                                    <div className="zena-intelligence-sidebar__action-header">
                                        <span className="zena-intelligence-sidebar__action-icon">
                                            {getActionIcon(action.toolName)}
                                        </span>
                                        <div className="zena-intelligence-sidebar__action-info">
                                            <span className="zena-intelligence-sidebar__action-tool">{action.toolName}</span>
                                            <p className="zena-intelligence-sidebar__action-label">{action.label}</p>
                                        </div>
                                    </div>
                                    <button
                                        className="zena-intelligence-sidebar__approve-btn"
                                        onClick={() => onActionApprove(action)}
                                    >
                                        Approve
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <p className="zena-intelligence-sidebar__empty-text">No immediate actions identified.</p>
                    )}
                </div>
            </div>

            <button className="zena-intelligence-sidebar__chat-btn" onClick={onChatWithZena}>
                <span className="zena-intelligence-sidebar__chat-icon">💬</span>
                Chat with Zena about this
            </button>
        </div>
    );
};
