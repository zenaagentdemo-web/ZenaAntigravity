import React, { useEffect, useState } from 'react';
import { CheckCircle, Database, Send, X } from 'lucide-react';
import './CrmSuccessOverlay.css';

interface CrmSuccessOverlayProps {
    isVisible: boolean;
    crmType: string;
    onClose: () => void;
}

export const CrmSuccessOverlay: React.FC<CrmSuccessOverlayProps> = ({ isVisible, crmType, onClose }) => {
    const [shouldRender, setShouldRender] = useState(isVisible);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => setShouldRender(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!shouldRender) return null;

    return (
        <div className={`crm-success-overlay ${isVisible ? 'visible' : 'hide'}`}>
            <div className="crm-success-content">
                <div className="crm-success-glow" />
                <div className="crm-success-icon-wrap">
                    <Database size={24} className="icon-db" />
                    <Send size={16} className="icon-send" />
                </div>
                <div className="crm-success-text">
                    <h3>Sent to CRM</h3>
                    <p>Record delivered to your <strong>{crmType.toUpperCase()}</strong> bridge.</p>
                </div>
                <div className="crm-success-check">
                    <CheckCircle size={20} />
                </div>
            </div>
        </div>
    );
};
