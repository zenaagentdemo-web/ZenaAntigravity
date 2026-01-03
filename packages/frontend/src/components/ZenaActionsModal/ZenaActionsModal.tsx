import React from 'react';
import { X, Zap, ArrowRight, MessageSquare, Calendar, CheckCircle } from 'lucide-react';
import './ZenaActionsModal.css';

interface ZenaActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyAddress: string;
    actions: Array<{
        action: string;
        reasoning: string;
        impact: 'Low' | 'Medium' | 'High';
    }>;
    onExecute: (action: string, reasoning: string) => void;
    isLoading?: boolean;
}

export const ZenaActionsModal: React.FC<ZenaActionsModalProps> = ({
    isOpen,
    onClose,
    propertyAddress,
    actions,
    onExecute,
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="zena-actions-modal-overlay">
            <div className="zena-actions-modal">
                <div className="zena-actions-modal__header">
                    <div className="zena-actions-modal__title-group">
                        <div className="zena-actions-icon-wrapper">
                            <Zap size={20} color="#FFD700" fill="#FFD700" />
                        </div>
                        <div>
                            <h2>Zena Intelligence</h2>
                            <p className="zena-actions-modal__subtitle">Suggested Actions for {propertyAddress}</p>
                        </div>
                    </div>
                    <button className="zena-actions-modal__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="zena-actions-modal__content">
                    {isLoading ? (
                        <div className="zena-actions-thinking">
                            <Zap size={32} className="zena-zap-pulse" />
                            <p>Zena is pulsing neural networks...</p>
                            <span>Analyzing market metrics & buyer patterns</span>
                        </div>
                    ) : (
                        <div className="zena-actions-list">
                            {actions.map((item, index) => (
                                <div key={index} className="zena-action-card">
                                    <div className="zena-action-card__header">
                                        <div className="zena-action-card__badge">STRATEGIC RECOMMENDATION</div>
                                        <div className={`zena-action-impact-badge impact-${(item.impact || 'Medium').toLowerCase()}`}>
                                            {item.impact || 'Medium'} Impact
                                        </div>
                                    </div>
                                    <div className="zena-action-card__content">
                                        <h3 className="zena-action-card__title">{item.action}</h3>
                                        <div className="zena-action-card__reasoning-container">
                                            <span className="zena-action-card__reasoning-label">WHY IT MATTERS:</span>
                                            <p className="zena-action-card__reasoning">{item.reasoning}</p>
                                        </div>
                                    </div>
                                    <div className="zena-action-card__footer">
                                        <button
                                            className="zena-action-btn zena-action-btn--primary"
                                            onClick={() => onExecute(item.action, item.reasoning)}
                                        >
                                            <MessageSquare size={14} />
                                            <span>Execute Action</span>
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="zena-actions-modal__footer">
                    <p>Zena Autonomous Agent • God Mode Active</p>
                </div>
            </div>
        </div>
    );
};
