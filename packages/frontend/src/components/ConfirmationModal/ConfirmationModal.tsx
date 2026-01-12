import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirmation-modal__glow" />

                <header className="confirmation-modal__header">
                    <div className={`confirmation-modal__icon confirmation-modal__icon--${type}`}>
                        {type === 'danger' ? <AlertTriangle size={20} /> : <Info size={20} />}
                    </div>
                    <div className="confirmation-modal__title-group">
                        <h2 className="confirmation-modal__title">{title}</h2>
                        <p className="confirmation-modal__subtitle">Neuro-Verification Required</p>
                    </div>
                    <button className="confirmation-modal__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="confirmation-modal__content">
                    <p className="confirmation-modal__message">{message}</p>
                </div>

                <footer className="confirmation-modal__footer">
                    <button className="confirmation-modal__btn confirmation-modal__btn--cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button
                        className={`confirmation-modal__btn confirmation-modal__btn--${type}`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
};
