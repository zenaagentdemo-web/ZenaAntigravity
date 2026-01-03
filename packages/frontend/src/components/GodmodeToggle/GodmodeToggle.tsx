/**
 * GodmodeToggle Component
 * 
 * Three-position toggle for switching between Godmode modes:
 * - Off: No autonomous actions
 * - Demi-God: Actions queued for human approval
 * - Full God: Actions auto-execute within time window
 */

import React, { useState, useEffect } from 'react';
import { Power, UserCheck, Zap, Clock, Settings } from 'lucide-react';
import { api } from '../../utils/apiClient';
import './GodmodeToggle.css';

type GodmodeMode = 'off' | 'demi_god' | 'full_god';

interface GodmodeSettings {
    mode: GodmodeMode;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    enabledActionTypes: string[];
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
    const [timeWindowStart, setTimeWindowStart] = useState('21:00');
    const [timeWindowEnd, setTimeWindowEnd] = useState('07:00');

    // Fetch current settings on mount and listen for updates
    useEffect(() => {
        fetchSettings();

        const handleUpdate = () => {
            fetchSettings();
        };

        window.addEventListener('zena-godmode-updated', handleUpdate);
        return () => window.removeEventListener('zena-godmode-updated', handleUpdate);
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
            }
        } catch (error) {
            console.error('Failed to fetch Godmode settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModeChange = async (mode: GodmodeMode) => {
        try {
            const payload: Partial<GodmodeSettings> = { mode };

            // Include time window for full_god mode
            if (mode === 'full_god') {
                payload.timeWindowStart = timeWindowStart;
                payload.timeWindowEnd = timeWindowEnd;
            }

            await api.put('/api/godmode/settings', payload);

            setSettings(prev => ({ ...prev, mode }));
            onModeChange?.(mode);

            // Notify other components/hooks
            window.dispatchEvent(new CustomEvent('zena-godmode-updated'));
        } catch (error) {
            console.error('Failed to update Godmode mode:', error);
        }
    };

    const handleTimeWindowSave = async () => {
        try {
            await api.put('/api/godmode/settings', {
                timeWindowStart,
                timeWindowEnd
            });
            setSettings(prev => ({
                ...prev,
                timeWindowStart,
                timeWindowEnd
            }));
            setShowSettings(false);
        } catch (error) {
            console.error('Failed to update time window:', error);
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

    // Compact mode: just show current mode icon
    if (compact) {
        return (
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
        );
    }

    return (
        <div className="godmode-toggle">
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
                        {settings.timeWindowStart || '21:00'} - {settings.timeWindowEnd || '07:00'}
                    </div>

                    {showSettings && (
                        <div className="godmode-toggle__time-editor">
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
                            <button
                                className="godmode-toggle__save-btn"
                                onClick={handleTimeWindowSave}
                            >
                                Save
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GodmodeToggle;
