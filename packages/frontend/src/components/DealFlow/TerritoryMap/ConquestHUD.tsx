import React from 'react';

// Neon colors matching the markers
const STAGE_COLORS = [
    { label: 'Settlement', color: '#00ff41' },
    { label: 'Conditional', color: '#bc13fe' },
    { label: 'Offer Phase', color: '#ffd700' },
    { label: 'Viewings', color: '#ff003c' },
    { label: 'New Lead', color: '#00f3ff' }
];

export const ConquestHUD: React.FC = () => {
    return (
        <div className="conquest-hud" style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(13, 27, 42, 0.9)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 243, 255, 0.4)',
            borderRadius: '16px',
            padding: '24px',
            color: '#fff',
            width: '220px',
            boxShadow: '0 0 30px rgba(0, 243, 255, 0.15), inset 0 0 20px rgba(0, 243, 255, 0.05)',
            zIndex: 1001
        }}>
            {/* Header with circuit pattern effect */}
            <div style={{
                position: 'relative',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(0, 243, 255, 0.3)'
            }}>
                <h3 style={{
                    margin: 0,
                    color: '#00f3ff',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textShadow: '0 0 10px rgba(0, 243, 255, 0.5)'
                }}>
                    CONQUEST STATUS
                </h3>
                {/* Decorative circuit lines */}
                <div style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-10px',
                    width: '20px',
                    height: '20px',
                    borderRight: '2px solid rgba(0, 243, 255, 0.3)',
                    borderTop: '2px solid rgba(0, 243, 255, 0.3)'
                }} />
            </div>

            {/* Status indicators */}
            <div className="hud-stats">
                {STAGE_COLORS.map(({ label, color }) => (
                    <div
                        key={label}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '14px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                        }}
                    >
                        {/* Glowing indicator dot */}
                        <div style={{
                            width: '10px',
                            height: '10px',
                            background: color,
                            borderRadius: '50%',
                            marginRight: '14px',
                            boxShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
                            animation: 'pulse 2s ease-in-out infinite'
                        }} />
                        <span style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#e0f2fe',
                            letterSpacing: '0.5px'
                        }}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{
                marginTop: '20px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(0, 243, 255, 0.2)',
                fontSize: '9px',
                color: 'rgba(255,255,255,0.4)',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '2px'
            }}>
                LIVE FEED • AUCKLAND SECTOR
            </div>

            {/* Keyframe animation for pulse */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(0.9); }
                }
            `}</style>
        </div>
    );
};

export default ConquestHUD;
