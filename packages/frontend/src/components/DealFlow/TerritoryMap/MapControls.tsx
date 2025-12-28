import React from 'react';

export const MapControls: React.FC = () => {
    return (
        <div className="conquest-hud" style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(13, 27, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 243, 255, 0.3)',
            borderRadius: '16px',
            padding: '24px',
            color: '#fff',
            width: '240px',
            boxShadow: '0 0 20px rgba(0, 243, 255, 0.1)',
            zIndex: 100
        }}>
            <h3 style={{
                margin: '0 0 16px 0',
                color: '#00f3ff',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontSize: '12px',
                borderBottom: '1px solid rgba(0, 243, 255, 0.3)',
                paddingBottom: '8px'
            }}>
                CONQUEST STATUS
            </h3>

            <div className="hud-stats">
                {['Settlement', 'Conditional', 'Offer Phase', 'Viewings'].map((label, i) => {
                    const color = [
                        '#00ff41', // Green
                        '#bc13fe', // Purple
                        '#ffd700', // Gold
                        '#ff003c'  // Red
                    ][i];

                    return (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                background: color,
                                borderRadius: '50%',
                                marginRight: '12px',
                                boxShadow: `0 0 8px ${color}`
                            }} />
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#e0f2fe' }}>{label}</span>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '20px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                LIVE FEED • AUCKLAND SECTOR
            </div>
        </div>
    );
};
