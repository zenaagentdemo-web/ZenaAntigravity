import React, { useState, useEffect } from 'react';
import { api } from '../../utils/apiClient';
import './GodmodeSettingsPanel.css';

// Define all available God Powers by module
const GOD_POWERS = {
    inbox: {
        label: '📬 Inbox',
        powers: [
            { key: 'inbox:draft_reply', label: 'Draft Replies', description: 'AI drafts email responses' },
            { key: 'inbox:archive_noise', label: 'Archive Noise', description: 'Auto-archive marketing/spam' },
            { key: 'inbox:book_calendar', label: 'Book Calendar', description: 'Extract events from emails' },
            { key: 'inbox:flag_urgent', label: 'Flag Urgent', description: 'AI-flag high-priority emails' },
        ],
    },
    tasks: {
        label: '✅ Tasks',
        powers: [
            { key: 'tasks:create_from_email', label: 'From Email', description: 'Create tasks from emails' },
            { key: 'tasks:create_from_deal', label: 'From Deal', description: 'Create tasks from deal stage' },
            { key: 'tasks:create_from_voice', label: 'From Voice', description: 'Create tasks from voice notes' },
        ],
    },
    deals: {
        label: '💼 Deals',
        powers: [
            { key: 'deals:nudge_client', label: 'Nudge Client', description: 'Nudge stale deals' },
            { key: 'deals:finance_followup', label: 'Finance Follow-up', description: 'Follow up on finance' },
            { key: 'deals:vendor_update', label: 'Vendor Update', description: 'Send vendor updates' },
        ],
    },
    contacts: {
        label: '👥 Contacts',
        powers: [
            { key: 'contacts:send_email', label: 'Send Email', description: 'Re-engagement emails' },
            { key: 'contacts:schedule_followup', label: 'Schedule Follow-up', description: 'Schedule tasks' },
            { key: 'contacts:update_category', label: 'Update Category', description: 'Auto-categorize' },
        ],
    },
    properties: {
        label: '🏠 Properties',
        powers: [
            { key: 'properties:vendor_update', label: 'Vendor Update', description: 'Market updates' },
            { key: 'properties:price_review', label: 'Price Review', description: 'Initiate price review' },
            { key: 'properties:buyer_match_intro', label: 'Buyer Match', description: 'Intro matched buyers' },
        ],
    },
};

type GodmodeMode = 'off' | 'demi_god' | 'full_god';

interface GodmodeSettingsPanelProps {
    onClose?: () => void;
}

export const GodmodeSettingsPanel: React.FC<GodmodeSettingsPanelProps> = ({ onClose }) => {
    const [featureConfig, setFeatureConfig] = useState<Record<string, GodmodeMode>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await api.get('/api/godmode/settings');
            if (response.data?.featureConfig) {
                setFeatureConfig(response.data.featureConfig);
            }
        } catch (error) {
            console.error('Failed to load Godmode settings:', error);
        }
    };

    const handleModeChange = (powerKey: string, mode: GodmodeMode) => {
        setFeatureConfig(prev => ({ ...prev, [powerKey]: mode }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put('/api/godmode/settings', { featureConfig });
            setHasChanges(false);
            window.dispatchEvent(new CustomEvent('zena-godmode-updated'));
        } catch (error) {
            console.error('Failed to save Godmode settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const getModeLabel = (mode: GodmodeMode) => {
        switch (mode) {
            case 'off': return 'Off';
            case 'demi_god': return 'Demi';
            case 'full_god': return 'Full';
        }
    };

    return (
        <div className="godmode-settings-panel">
            <div className="godmode-settings-header">
                <h2>⚡ God Mode Authority</h2>
                <p className="godmode-settings-subtitle">
                    Configure AI autonomy for each feature. <strong>Demi</strong> = AI drafts, you approve. <strong>Full</strong> = AI acts autonomously.
                </p>
            </div>

            <div className="godmode-settings-modules">
                {Object.entries(GOD_POWERS).map(([moduleKey, module]) => (
                    <div key={moduleKey} className="godmode-module">
                        <h3 className="godmode-module-title">{module.label}</h3>
                        <div className="godmode-powers-list">
                            {module.powers.map(power => (
                                <div key={power.key} className="godmode-power-row">
                                    <div className="godmode-power-info">
                                        <span className="godmode-power-label">{power.label}</span>
                                        <span className="godmode-power-desc">{power.description}</span>
                                    </div>
                                    <div className="godmode-toggle-group">
                                        {(['off', 'demi_god', 'full_god'] as GodmodeMode[]).map(mode => (
                                            <button
                                                key={mode}
                                                className={`godmode-toggle-btn ${featureConfig[power.key] === mode ? `active-${mode}` : ''}`}
                                                onClick={() => handleModeChange(power.key, mode)}
                                            >
                                                {getModeLabel(mode)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="godmode-settings-footer">
                {onClose && (
                    <button className="godmode-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                )}
                <button
                    className="godmode-btn-primary"
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

export default GodmodeSettingsPanel;
