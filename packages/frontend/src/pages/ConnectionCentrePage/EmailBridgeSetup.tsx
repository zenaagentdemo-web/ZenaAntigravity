import React, { useState, useEffect } from 'react';
import { Mail, Shield, Send, CheckCircle, Database, Plus, Trash2, Loader2 } from 'lucide-react';
import { api } from '../../utils/apiClient';
import { useThreadActions } from '../../hooks/useThreadActions';
import './EmailBridgeSetup.css';

interface CrmEmailConfig {
    email: string;
    type: 'rex' | 'vault' | 'generic';
    label?: string;
}

const EmailBridgeSetup: React.FC = () => {
    const [crmEmails, setCrmEmails] = useState<CrmEmailConfig[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const { addToast } = useThreadActions();

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await api.get('/api/crm-delivery/config');
                if (response.data?.crmEmails?.length > 0) {
                    setCrmEmails(response.data.crmEmails);
                } else if (response.data?.crmEmail) {
                    // Legacy single email format
                    setCrmEmails([{ email: response.data.crmEmail, type: response.data.crmType || 'generic' }]);
                } else {
                    setCrmEmails([]);
                }
            } catch (err) {
                console.error('Failed to fetch CRM config:', err);
            }
        };
        fetchConfig();
    }, []);

    const handleEmailChange = (index: number, field: keyof CrmEmailConfig, value: string) => {
        const updated = [...crmEmails];
        updated[index] = { ...updated[index], [field]: value };
        setCrmEmails(updated);
    };

    const handleAddEmail = () => {
        setCrmEmails([...crmEmails, { email: '', type: 'generic' }]);
    };

    const handleRemoveEmail = (index: number) => {
        setCrmEmails(crmEmails.filter((_, i) => i !== index));
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to remove all CRM email addresses?')) return;

        setIsSaving(true);
        try {
            await api.post('/api/crm-delivery/config', { crmEmails: [], crmType: null });
            setCrmEmails([]);
            addToast('success', 'All CRM email addresses cleared');
        } catch (err) {
            console.error('Failed to clear CRM config:', err);
            addToast('error', 'Failed to clear configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        // Filter out empty emails
        const validEmails = crmEmails.filter(e => e.email && e.email.includes('@'));

        if (validEmails.length === 0 && crmEmails.length > 0) {
            addToast('error', 'Please enter at least one valid CRM dropbox email address');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/api/crm-delivery/config', {
                crmEmails: validEmails,
                crmType: validEmails[0]?.type || 'generic'
            });
            setCrmEmails(validEmails);
            addToast('success', `CRM Email Bridge configured with ${validEmails.length} address${validEmails.length !== 1 ? 'es' : ''}`);
        } catch (err) {
            console.error('Failed to save CRM config:', err);
            addToast('error', 'Failed to save configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        try {
            await api.post('/api/crm-delivery/test');
            addToast('success', 'Test sync email sent to your CRM!');
        } catch (err: any) {
            console.error('Sync test failed:', err);
            addToast('error', err.message || 'Test failed. Ensure your CRM email is correct.');
        } finally {
            setIsTesting(false);
        }
    };

    const isConfigured = crmEmails.some(e => e.email && e.email.includes('@'));

    return (
        <div className="email-bridge-setup">
            <div className="email-bridge-setup__header">
                <div className="email-bridge-setup__icon-wrap">
                    <Mail className="email-bridge-setup__icon" />
                </div>
                <div className="email-bridge-setup__title-wrap">
                    <h2 className="email-bridge-setup__title">CRM Email Bridge</h2>
                    <p className="email-bridge-setup__subtitle">Push Zena updates directly into your CRM dropbox address(es).</p>
                </div>
            </div>

            <div className="email-bridge-setup__content">
                {crmEmails.length === 0 ? (
                    <div className="email-bridge-setup__empty">
                        <p>No CRM email addresses configured yet.</p>
                        <button
                            className="email-bridge-setup__add-first-btn"
                            onClick={handleAddEmail}
                        >
                            <Plus size={16} />
                            Add CRM Email Address
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="email-bridge-setup__emails-list">
                            {crmEmails.map((config, index) => (
                                <div key={index} className="email-bridge-setup__email-row">
                                    <select
                                        value={config.type}
                                        onChange={(e) => handleEmailChange(index, 'type', e.target.value)}
                                        className="email-bridge-setup__type-select"
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
                                        className="email-bridge-setup__email-input"
                                    />
                                    <button
                                        className="email-bridge-setup__remove-btn"
                                        onClick={() => handleRemoveEmail(index)}
                                        title="Remove this email"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            className="email-bridge-setup__add-btn"
                            onClick={handleAddEmail}
                        >
                            <Plus size={16} />
                            Add Another Email
                        </button>
                    </>
                )}

                <p className="email-bridge-setup__help">
                    This is the unique address your CRM provides for auto-filing emails. You can add multiple addresses to sync to different CRMs.
                </p>

                <div className="email-bridge-setup__actions">
                    {crmEmails.length > 0 && (
                        <button
                            className="email-bridge-setup__save-btn"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 size={16} className="spinning" /> : null}
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    )}

                    {isConfigured && (
                        <button
                            className="email-bridge-setup__test-btn"
                            onClick={handleTest}
                            disabled={isTesting}
                        >
                            {isTesting ? 'Sending...' : 'Send Test Sync'}
                        </button>
                    )}

                    {crmEmails.length > 0 && (
                        <button
                            className="email-bridge-setup__clear-btn"
                            onClick={handleClearAll}
                            disabled={isSaving}
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            <div className="email-bridge-setup__footer">
                <Shield size={14} className="email-bridge-setup__footer-icon" />
                <span>Encrypted point-to-point delivery. Files are never stored on third-party mail servers.</span>
            </div>
        </div>
    );
};

export default EmailBridgeSetup;
