import React from 'react';
import { motion } from 'framer-motion';
import { Deal } from '../types';
import { TacticalIcons } from './TacticalIcons';
import './TacticalDealCard.css';

interface TacticalDealCardProps {
    deal: Deal;
    onClick: () => void;
    onAction: (e: React.MouseEvent, action: string) => void;
    statusColor: string;
    isStalled?: boolean;
    velocity?: number; // 0-100
    probability?: number; // 0-100
    isDimmed?: boolean;
}

export const TacticalDealCard: React.FC<TacticalDealCardProps> = ({
    deal,
    onClick,
    onAction,
    statusColor,
    isStalled = false,
    velocity = 75,
    probability = 65,
    isDimmed = false
}) => {
    return (
        <motion.div
            className={`tactical-card ${isStalled ? 'tactical-card--stalled' : ''} ${isDimmed ? 'tactical-card--dimmed' : ''}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
                opacity: isDimmed ? 0.2 : 1,
                scale: isDimmed ? 0.95 : 1,
                borderColor: statusColor
            }}
            whileHover={{ scale: isDimmed ? 0.95 : 1.02, y: -4 }}
            onClick={onClick}
            style={{ '--status-color': statusColor } as React.CSSProperties}
        >
            {/* Corner Brackets */}
            <div className="tactical-card__bracket tl" />
            <div className="tactical-card__bracket tr" />
            <div className="tactical-card__bracket bl" />
            <div className="tactical-card__bracket br" />

            {/* Scanning Laser Line */}
            <div className="tactical-card__scanner" />

            {/* Header */}
            <div className="tactical-card__header">
                <div className="tactical-card__id-tag">REF-{deal.id.slice(0, 4).toUpperCase()}</div>
                <div className="tactical-card__status" style={{ color: statusColor }}>
                    {deal.stage?.toUpperCase().replace('_', ' ')}
                </div>
            </div>

            {/* Content */}
            <div className="tactical-card__main">
                <div className="tactical-card__address">
                    {deal.property?.address || 'UNKNOWN PROPERTY'}
                </div>

                <div className="tactical-card__metrics">
                    <div className="metric">
                        <span className="metric__label">VALUE</span>
                        <span className="metric__value">${(deal.dealValue || 0).toLocaleString()}</span>
                    </div>
                    <div className="metric">
                        <span className="metric__label">BOUNTY</span>
                        <span className="metric__value text-xp">+50 XP</span>
                    </div>
                </div>

                {/* Micro-Gauges */}
                <div className="tactical-card__gauges">
                    <div className="gauge-item">
                        <svg className="gauge-ring" viewBox="0 0 36 36">
                            <path className="gauge-ring__bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <motion.path
                                className="gauge-ring__fill"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                strokeDasharray={`${probability}, 100`}
                                initial={{ strokeDasharray: "0, 100" }}
                                animate={{ strokeDasharray: `${probability}, 100` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>
                        <div className="gauge-label">PROB</div>
                    </div>
                    <div className="gauge-item">
                        <svg className="gauge-ring" viewBox="0 0 36 36">
                            <path className="gauge-ring__bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <motion.path
                                className="gauge-ring__fill"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                strokeDasharray={`${velocity}, 100`}
                                initial={{ strokeDasharray: "0, 100" }}
                                animate={{ strokeDasharray: `${velocity}, 100` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                style={{ stroke: '#00ff41' }}
                            />
                        </svg>
                        <div className="gauge-label">VELO</div>
                    </div>
                </div>
            </div>

            {/* Actions Area */}
            <div className="tactical-card__footer">
                <button className="tactical-btn" onClick={(e) => onAction(e, 'update')}>
                    <span className="tactical-btn__icon"><TacticalIcons.Action /></span>
                    UPDATE
                </button>
                <button className="tactical-btn" onClick={(e) => onAction(e, 'note')}>
                    <span className="tactical-btn__icon"><TacticalIcons.Note /></span>
                    NOTE
                </button>
            </div>

            {/* Error Overlay */}
            {isStalled && (
                <div className="tactical-card__stall-alert">
                    <div className="stall-glitch">⚠️ STALL DETECTED</div>
                </div>
            )}
        </motion.div>
    );
};
