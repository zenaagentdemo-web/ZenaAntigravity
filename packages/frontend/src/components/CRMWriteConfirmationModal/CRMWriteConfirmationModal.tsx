import React from 'react';
import './CRMWriteConfirmationModal.css';
import {
    FiShield,
    FiCheckCircle,
    FiX,
    FiEdit3,
    FiDatabase,
    FiExternalLink
} from 'react-icons/fi';

interface CRMWriteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApprove: () => void;
    action: {
        type: string;
        targetSite: string;
        payload: Record<string, any>;
        description: string;
    };
    isExecuting?: boolean;
}

const CRMWriteConfirmationModal: React.FC<CRMWriteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onApprove,
    action,
    isExecuting = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="crm-write-modal-overlay">
            <div className="crm-write-modal-container">
                <div className="crm-write-modal-header">
                    <div className="header-icon">
                        <FiShield />
                    </div>
                    <div className="header-text">
                        <h3>Action Approval Required</h3>
                        <p>Zena is requesting permission to write data</p>
                    </div>
                    <button className="close-btn" onClick={onClose} disabled={isExecuting}>
                        <FiX />
                    </button>
                </div>

                <div className="crm-write-modal-body">
                    <div className="action-summary">
                        <div className="summary-item">
                            <span className="label">Target System</span>
                            <span className="value">
                                <FiDatabase className="icon" /> {action.targetSite}
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Action Type</span>
                            <span className="value">
                                <FiEdit3 className="icon" /> {action.type === 'logNote' ? 'Log Interaction Note' : action.type}
                            </span>
                        </div>
                    </div>

                    <div className="payload-preview">
                        <span className="payload-label">Data to be written:</span>
                        <div className="payload-content">
                            {Object.entries(action.payload).map(([key, value]) => (
                                <div key={key} className="payload-entry">
                                    <strong className="payload-key">{key}:</strong>
                                    <span className="payload-value">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="safety-notice">
                        <FiCheckCircle className="notice-icon" />
                        <p>This action will be performed using your active session. You can review the result in the target system immediately after execution.</p>
                    </div>
                </div>

                <div className="crm-write-modal-footer">
                    <button
                        className="cancel-btn"
                        onClick={onClose}
                        disabled={isExecuting}
                    >
                        Cancel
                    </button>
                    <button
                        className="approve-btn"
                        onClick={onApprove}
                        disabled={isExecuting}
                    >
                        {isExecuting ? (
                            <div className="btn-loading">
                                <div className="spinner"></div>
                                Executing...
                            </div>
                        ) : (
                            <>
                                Approve & Execute <FiExternalLink style={{ marginLeft: '8px' }} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CRMWriteConfirmationModal;
