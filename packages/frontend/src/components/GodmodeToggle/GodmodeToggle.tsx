/**
 * GodmodeToggle Component
 * 
 * Three-position toggle for switching between Godmode modes:
 * - Off: No autonomous actions
 * - Demi-God: Actions queued for human approval
 * - Full God: Actions auto-execute within time window
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Power, UserCheck, Zap, Clock, Settings, Calendar, Sliders } from 'lucide-react';
import { api } from '../../utils/apiClient';
import { GodmodeHistoryModal } from '../GodmodeHistoryModal/GodmodeHistoryModal';
import { GodmodeSettingsPanel } from '../GodmodeSettingsPanel/GodmodeSettingsPanel';
import { ZenaDatePicker } from '../ZenaDatePicker/ZenaDatePicker';
import { ZenaTimePicker } from '../ZenaTimePicker/ZenaTimePicker';
import './GodmodeToggle.css';

type GodmodeMode = 'off' | 'demi_god' | 'full_god';

interface GodmodeSettings {
    mode: GodmodeMode;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    enabledActionTypes: string[];
    fullGodStart?: string;
    fullGodEnd?: string;
}

interface GodmodeToggleProps {
    onModeChange?: (mode: GodmodeMode) => void;
    compact?: boolean;
}

const MODE_INFO: Record<GodmodeMode, {
    label: string;
    mythicLabel: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    glow: string;
}> = {
    off: {
        label: 'Human',
        mythicLabel: 'NORMAL MODE',
        icon: <Power size={18} />,
        color: '#6b7280',
        glow: 'rgba(107, 114, 128, 0.5)',
        description: 'Manual control only'
    },
    demi_god: {
        label: 'Demi-God',
        mythicLabel: 'DEMI-GOD ACTIVE',
        icon: <UserCheck size={20} />,
        color: '#A78BFA',
        glow: 'rgba(167, 139, 250, 0.6)',
        description: 'Zena suggests, you approve'
    },
    full_god: {
        label: 'Full God',
        mythicLabel: 'FULL GOD MODE',
        icon: <Zap size={22} />,
        color: '#FCD34D',
        glow: 'rgba(252, 211, 77, 0.7)',
        description: 'Zena acts autonomously'
    }
};

export const GodmodeToggle: React.FC<GodmodeToggleProps> = ({
    onModeChange,
    compact = false
}) => {
    const [settings, setSettings] = useState<GodmodeSettings>({
        mode: 'demi_god',
        enabledActionTypes: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [pendingMode, setPendingMode] = useState<GodmodeMode | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showFeatureSettings, setShowFeatureSettings] = useState(false);
    const [isSchedulingInModal, setIsSchedulingInModal] = useState(false);

    const [timeWindowStart, setTimeWindowStart] = useState('21:00');
    const [timeWindowEnd, setTimeWindowEnd] = useState('07:00');
    const [fullGodStart, setFullGodStart] = useState('');
    const [fullGodEnd, setFullGodEnd] = useState('');

    // Fetch current settings on mount and listen for updates
    useEffect(() => {
        fetchSettings();

        const handleUpdate = () => {
            fetchSettings();
        };

        const handleShowHistory = () => {
            setShowHistory(true);
        };

        window.addEventListener('zena-godmode-updated', handleUpdate);
        window.addEventListener('zena-show-godmode-history', handleShowHistory);
        return () => {
            window.removeEventListener('zena-godmode-updated', handleUpdate);
            window.removeEventListener('zena-show-godmode-history', handleShowHistory);
        };
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/api/godmode/settings');
            if (response.data) {
                setSettings(response.data);
                if (response.data.timeWindowStart) {
                    setTimeWindowStart(response.data.timeWindowStart);
                }
                if (response.data.timeWindowEnd) {
                    setTimeWindowEnd(response.data.timeWindowEnd);
                }
                if (response.data.fullGodStart) {
                    setFullGodStart(new Date(response.data.fullGodStart).toISOString());
                }
                if (response.data.fullGodEnd) {
                    setFullGodEnd(new Date(response.data.fullGodEnd).toISOString());
                }
            }
        } catch (error) {
            console.error('Failed to fetch Godmode settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModeChange = async (mode: GodmodeMode) => {
        // Validation: Show safety warning for Full God mode
        if (mode === 'full_god' && settings.mode !== 'full_god') {
            setPendingMode(mode);
            setShowWarning(true);
            setIsSchedulingInModal(false); // Reset for new modal open
            return;
        }

        executeModeChange(mode);
    };

    const executeModeChange = async (mode: GodmodeMode) => {
        try {
            const payload: Partial<GodmodeSettings> = { mode };

            // Include time window and date range for full_god mode
            if (mode === 'full_god') {
                payload.timeWindowStart = timeWindowStart;
                payload.timeWindowEnd = timeWindowEnd;
                if (fullGodStart) payload.fullGodStart = fullGodStart;
                if (fullGodEnd) payload.fullGodEnd = fullGodEnd;
            }

            await api.put('/api/godmode/settings', payload);

            setSettings(prev => ({ ...prev, mode }));
            onModeChange?.(mode);
            setShowWarning(false);
            setPendingMode(null);

            // Notify other components/hooks
            window.dispatchEvent(new CustomEvent('zena-godmode-updated'));
        } catch (error) {
            console.error('Failed to update Godmode mode:', error);
        }
    };

    const handleSettingsSave = async () => {
        try {
            await api.put('/api/godmode/settings', {
                timeWindowStart,
                timeWindowEnd,
                fullGodStart: fullGodStart || null,
                fullGodEnd: fullGodEnd || null
            });
            setSettings(prev => ({
                ...prev,
                timeWindowStart,
                timeWindowEnd,
                fullGodStart: fullGodStart || undefined,
                fullGodEnd: fullGodEnd || undefined
            }));
            setShowSettings(false);
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="godmode-toggle godmode-toggle--loading">
                <div className="godmode-toggle__spinner" />
            </div>
        );
    }

    const currentMode = MODE_INFO[settings.mode];

    const renderContent = () => {
        // Compact mode: just show current mode icon
        if (compact) {
            return (
                <div className="godmode-compact-container">
                    <div
                        className={`godmode-toggle godmode-toggle--compact godmode-toggle--${settings.mode}`}
                        style={{
                            '--mode-color': currentMode.color,
                            '--mode-glow': currentMode.glow
                        } as React.CSSProperties}
                        onClick={() => {
                            const modes: GodmodeMode[] = ['off', 'demi_god', 'full_god'];
                            const nextIndex = (modes.indexOf(settings.mode) + 1) % modes.length;
                            handleModeChange(modes[nextIndex]);
                        }}
                    >
                        <div className="godmode-toggle__mythic-icon">
                            {currentMode.icon}
                        </div>
                        <div className="godmode-toggle__mythic-label">
                            {currentMode.mythicLabel}
                        </div>
                    </div>
                    <button
                        className="godmode-settings-gear"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowFeatureSettings(true);
                        }}
                        title="Configure God Powers"
                    >
                        <Sliders size={16} />
                    </button>
                </div>
            );
        }

        return (
            <>
                {/* Mode Selector */}
                <div className="godmode-toggle__modes">
                    {(Object.entries(MODE_INFO) as [GodmodeMode, typeof MODE_INFO['off']][]).map(([mode, info]) => (
                        <button
                            key={mode}
                            className={`godmode-toggle__mode ${settings.mode === mode ? 'godmode-toggle__mode--active' : ''}`}
                            style={{ '--mode-color': info.color } as React.CSSProperties}
                            onClick={() => handleModeChange(mode)}
                        >
                            {info.icon}
                            <span>{info.label}</span>
                        </button>
                    ))}
                </div>

                {/* Description */}
                <p className="godmode-toggle__description">
                    {currentMode.description}
                </p>

                {/* Time Window (for Full God mode) */}
                {settings.mode === 'full_god' && (
                    <div className="godmode-toggle__time-window">
                        <div className="godmode-toggle__time-header">
                            <Clock size={14} />
                            <span>Active Window</span>
                            <button
                                className="godmode-toggle__settings-btn"
                                onClick={() => setShowSettings(!showSettings)}
                            >
                                <Settings size={12} />
                            </button>
                        </div>

                        <div className="godmode-toggle__time-display">
                            <div className="time-display-row">
                                <span className="time-label">Recurring:</span>
                                <span>{settings.timeWindowStart || '21:00'} - {settings.timeWindowEnd || '07:00'}</span>
                            </div>
                            {(settings.fullGodStart || settings.fullGodEnd) && (
                                <div className="time-display-row">
                                    <span className="time-label">Specific:</span>
                                    <span>{new Date(settings.fullGodStart!).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - {new Date(settings.fullGodEnd!).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            )}
                        </div>

                        {showSettings && (
                            <div className="godmode-toggle__time-editor">
                                <div className="godmode-toggle__time-section">
                                    <span className="section-label">Daily Recurring Window</span>
                                    <div className="godmode-toggle__time-inputs">
                                        <label>
                                            Start
                                            <input
                                                type="time"
                                                value={timeWindowStart}
                                                onChange={(e) => setTimeWindowStart(e.target.value)}
                                            />
                                        </label>
                                        <label>
                                            End
                                            <input
                                                type="time"
                                                value={timeWindowEnd}
                                                onChange={(e) => setTimeWindowEnd(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="godmode-toggle__time-section">
                                    <span className="section-label">Specific Active Period</span>
                                    <div className="godmode-toggle__date-inputs">
                                        <label>
                                            From
                                            <input
                                                type="datetime-local"
                                                value={fullGodStart}
                                                onChange={(e) => setFullGodStart(e.target.value)}
                                            />
                                        </label>
                                        <label>
                                            To
                                            <input
                                                type="datetime-local"
                                                value={fullGodEnd}
                                                onChange={(e) => setFullGodEnd(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <button
                                    className="godmode-toggle__save-btn"
                                    onClick={handleSettingsSave}
                                >
                                    Save Settings
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* View History Link */}
                <button
                    className="godmode-toggle__history-link"
                    onClick={() => setShowHistory(true)}
                >
                    <Clock size={12} />
                    View Recent God Mode Activity
                </button>
            </>
        );
    };

    return (
        <div className={`godmode-toggle ${compact ? 'godmode-toggle--compact-container' : ''}`}>
            {renderContent()}

            {/* Safety Warning Modal */}
            {showWarning && createPortal(
                <div className="godmode-warning-overlay" onClick={() => { setShowWarning(false); setPendingMode(null); }}>
                    <div className="godmode-warning-modal" onClick={e => e.stopPropagation()}>
                        <div className="godmode-warning-icon">
                            <Zap size={32} />
                        </div>
                        <h3>Enable Full God Mode?</h3>
                        <p>
                            <strong>WARNING:</strong> In Full God Mode, Zena will act <strong>autonomously</strong> without requiring your approval.
                            This includes:
                        </p>
                        <ul className="warning-list">
                            <li>Sending emails to your contacts</li>
                            <li>Booking calendar appointments</li>
                            <li>Updating deal stages and property statuses</li>
                        </ul>

                        <p className="warning-footer">Are you sure you want to proceed?</p>

                        {isSchedulingInModal && (
                            <div className="godmode-warning-scheduling">
                                <div className="godmode-toggle__time-section">
                                    <span className="section-label">Daily Recurring Window</span>
                                    <div className="godmode-toggle__time-inputs">
                                        <label>
                                            Start
                                            <ZenaTimePicker
                                                value={timeWindowStart}
                                                onChange={setTimeWindowStart}
                                                variant="godmode"
                                            />
                                        </label>
                                        <label>
                                            End
                                            <ZenaTimePicker
                                                value={timeWindowEnd}
                                                onChange={setTimeWindowEnd}
                                                variant="godmode"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="godmode-toggle__time-section">
                                    <span className="section-label">Specific Active Period</span>
                                    <div className="godmode-toggle__date-inputs">
                                        <label>
                                            From
                                            <ZenaDatePicker
                                                value={fullGodStart}
                                                onChange={setFullGodStart}
                                                placeholder="Select start date"
                                            />
                                        </label>
                                        <label>
                                            To
                                            <ZenaDatePicker
                                                value={fullGodEnd}
                                                onChange={setFullGodEnd}
                                                placeholder="Select end date"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="godmode-warning-actions">
                            <button className="btn-secondary btn-demi" onClick={() => { setShowWarning(false); setPendingMode(null); }}>Stay in Demi-God</button>
                            <button className="btn-secondary btn-normal" onClick={() => executeModeChange('off')}>Go to Normal Mode</button>
                            {!isSchedulingInModal && (
                                <button className="btn-secondary" onClick={() => setIsSchedulingInModal(true)}>Customise Schedule</button>
                            )}
                            <button className={`btn-primary btn-warning ${!isSchedulingInModal ? 'full-width' : ''}`} onClick={() => executeModeChange('full_god')}>
                                Activate Full-God Mode
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {createPortal(
                <GodmodeHistoryModal
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                />,
                document.body
            )}

            {/* Feature-Level Settings Modal */}
            {showFeatureSettings && createPortal(
                <div className="godmode-warning-overlay" onClick={() => setShowFeatureSettings(false)}>
                    <div className="godmode-feature-settings-modal" onClick={e => e.stopPropagation()}>
                        <GodmodeSettingsPanel onClose={() => setShowFeatureSettings(false)} />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default GodmodeToggle;
