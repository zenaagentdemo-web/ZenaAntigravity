import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Mail, Database, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../../utils/apiClient';
import './CrmQuickSetupModal.css';

interface CrmEmailConfig {
    email: string;
    type: 'rex' | 'vault' | 'generic';
    label?: string;
}

interface CrmQuickSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    addToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export const CrmQuickSetupModal: React.FC<CrmQuickSetupModalProps> = ({ isOpen, onClose, onSuccess, addToast }) => {
    const [crmEmails, setCrmEmails] = useState<CrmEmailConfig[]>([{ email: '', type: 'generic' }]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const fetchConfig = async () => {
            try {
                const response = await api.get('/api/crm-delivery/config');
                if (response.data?.crmEmails?.length > 0) {
                    setCrmEmails(response.data.crmEmails);
                } else if (response.data?.crmEmail) {
                    // Legacy single email format
                    setCrmEmails([{ email: response.data.crmEmail, type: response.data.crmType || 'generic' }]);
                } else {
                    setCrmEmails([{ email: '', type: 'generic' }]);
                }
            } catch (err) {
                console.error('Failed to fetch CRM config:', err);
            }
        };
        fetchConfig();
    }, [isOpen]);

    const handleEmailChange = (index: number, field: keyof CrmEmailConfig, value: string) => {
        const updated = [...crmEmails];
        updated[index] = { ...updated[index], [field]: value };
        setCrmEmails(updated);
    };

    const handleAddEmail = () => {
        setCrmEmails([...crmEmails, { email: '', type: 'generic' }]);
    };

    const handleRemoveEmail = (index: number) => {
        if (crmEmails.length === 1) {
            // Don't allow removing the last one, just clear it
            setCrmEmails([{ email: '', type: 'generic' }]);
        } else {
            setCrmEmails(crmEmails.filter((_, i) => i !== index));
        }
    };

    const handleSave = async () => {
        // Filter out empty emails
        const validEmails = crmEmails.filter(e => e.email && e.email.includes('@'));

        if (validEmails.length === 0) {
            setError('Please enter at least one valid CRM dropbox email address');
            addToast?.('error', 'Please enter at least one valid CRM dropbox email address');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            await api.post('/api/crm-delivery/config', {
                crmEmails: validEmails,
                crmType: validEmails[0]?.type || 'generic'
            });
            addToast?.('success', `CRM Email Bridge configured with ${validEmails.length} address${validEmails.length > 1 ? 'es' : ''}`);
            onSuccess();
        } catch (err) {
            console.error('Failed to save CRM config:', err);
            setError('Failed to save configuration');
            addToast?.('error', 'Failed to save configuration');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="crm-quick-setup-overlay">
            <div className="crm-quick-setup">
                <div className="crm-quick-setup__header">
                    <div className="crm-quick-setup__title-row">
                        <Database size={20} className="crm-quick-setup__icon" />
                        <h2>CRM Email Bridge Setup</h2>
                    </div>
                    <button className="crm-quick-setup__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="crm-quick-setup__body">
                    <p className="crm-quick-setup__intro">
                        Configure your CRM dropbox email addresses. Zena will send record updates to all configured addresses.
                    </p>

                    {error && (
                        <div className="crm-quick-setup__error">
                            {error}
                        </div>
                    )}

                    <div className="crm-quick-setup__emails-list">
                        {crmEmails.map((config, index) => (
                            <div key={index} className="crm-quick-setup__email-row">
                                <div className="crm-quick-setup__email-inputs">
                                    <select
                                        value={config.type}
                                        onChange={(e) => handleEmailChange(index, 'type', e.target.value)}
                                        className="crm-quick-setup__type-select"
                                    >
                                        <option value="rex">Rex</option>
                                        <option value="vault">Vault</option>
                                        <option value="generic">Other</option>
                                    </select>
                                    <input
                                        type="email"
                                        placeholder="crm-dropbox@example.com"
                                        value={config.email}
                                        onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
                                        className="crm-quick-setup__email-input"
                                    />
                                    <button
                                        className="crm-quick-setup__remove-btn"
                                        onClick={() => handleRemoveEmail(index)}
                                        title="Remove this email"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="crm-quick-setup__add-btn"
                        onClick={handleAddEmail}
                    >
                        <Plus size={16} />
                        Add Another Email
                    </button>
                </div>

                <div className="crm-quick-setup__footer">
                    <button
                        className="crm-quick-setup__cancel"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        className="crm-quick-setup__save"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 size={16} className="spinning" /> : <Mail size={16} />}
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
