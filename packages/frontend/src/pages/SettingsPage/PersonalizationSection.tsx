import React, { useState, useEffect } from 'react';
import { api } from '../../utils/apiClient';

interface UserPersona {
    tone: {
        formality: number;
        lengthPreference: 'concise' | 'balanced' | 'detailed';
        sentimentBias: number;
        linguisticMarkers: string[];
    };
    actionWeights: Record<string, number>;
    peakActivityHours: number[];
    maturityLevel: number;
}

const MATURITY_LABELS = ['Learning', 'Observing', 'Profiling', 'Predicting'];

export const PersonalizationSection: React.FC = () => {
    const [persona, setPersona] = useState<UserPersona | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadPersona();
    }, []);

    const loadPersona = async () => {
        try {
            setLoading(true);
            const response = await api.get<UserPersona>('/api/user/persona');
            setPersona(response.data);
        } catch (error) {
            console.error('Failed to load persona:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            const response = await api.post<UserPersona>('/api/user/persona/refresh');
            setPersona(response.data);
            alert('Zena has refreshed your intelligence profile!');
        } catch (error) {
            console.error('Failed to refresh persona:', error);
            alert('Failed to refresh profile. Please try again.');
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) return <div className="personalization-section__loading">Reading User Signal...</div>;
    if (!persona) return null;

    return (
        <section className="settings-section personalization-section">
            <div className="personalization-header">
                <div className="personalization-header__info">
                    <h2 className="settings-section__title">🧠 Zena Intelligence Profile</h2>
                    <p className="settings-section__description">
                        Zena learns your style and preferences to adapt her tone and proactive logic.
                    </p>
                </div>
                <div className="maturity-badge">
                    <span className="maturity-badge__dot" data-level={persona.maturityLevel} />
                    {MATURITY_LABELS[persona.maturityLevel]} Level
                </div>
            </div>

            <div className="persona-grid">
                {/* Linguistic Style Card */}
                <div className="persona-card">
                    <h3 className="persona-card__title">Linguistic Style</h3>
                    <div className="style-metric">
                        <label>Formality</label>
                        <div className="progress-bar">
                            <div className="progress-bar__fill" style={{ width: `${persona.tone.formality * 100}%` }} />
                        </div>
                        <div className="progress-labels">
                            <span>Casual</span>
                            <span>Formal</span>
                        </div>
                    </div>
                    <div className="style-metric">
                        <label>Response Length</label>
                        <div className="length-badge">{persona.tone.lengthPreference}</div>
                    </div>
                    {persona.tone.linguisticMarkers.length > 0 && (
                        <div className="marker-pills">
                            {persona.tone.linguisticMarkers.map(m => (
                                <span key={m} className="marker-pill">{m.replace(/_/g, ' ')}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Success Card */}
                <div className="persona-card">
                    <h3 className="persona-card__title">Action Preferences</h3>
                    <div className="weights-list">
                        {Object.entries(persona.actionWeights).length > 0 ? (
                            Object.entries(persona.actionWeights).map(([type, weight]) => (
                                <div key={type} className="weight-item">
                                    <div className="weight-item__info">
                                        <span className="weight-item__label">{type.replace(/_/g, ' ')}</span>
                                        <span className="weight-item__value">{Math.round(weight * 100)}% Success</span>
                                    </div>
                                    <div className="progress-bar progress-bar--small">
                                        <div className="progress-bar__fill" style={{ width: `${weight * 100}%` }} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="empty-state">No action history yet.</p>
                        )}
                    </div>
                </div>

                {/* Behavioral Patterns Card */}
                <div className="persona-card">
                    <h3 className="persona-card__title">Behavioral Patterns</h3>
                    <div className="activity-pattern">
                        <label>Active Windows</label>
                        <div className="hour-dots">
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`hour-dot ${persona.peakActivityHours.includes(i) ? 'hour-dot--active' : ''}`}
                                    title={`${i}:00`}
                                />
                            ))}
                        </div>
                        <p className="pattern-note">Zena prioritizes nudges during your peak activity hours.</p>
                    </div>
                </div>
            </div>

            <div className="personalization-footer">
                <button
                    className="button button--secondary"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? 'Analyzing signals...' : '🔄 Refresh Profile'}
                </button>
                <p className="footer-note">Profiles are built from your last 50 interactions.</p>
            </div>
        </section>
    );
};
