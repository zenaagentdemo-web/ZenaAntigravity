import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../GameSystem';
import './Leaderboard.css';

// Mock leaderboard data
const MOCK_AGENTS = [
    { id: '1', name: 'Sarah K.', xp: 15420, level: 28, avatar: '👩‍💼' },
    { id: '2', name: 'Mike T.', xp: 12850, level: 24, avatar: '👨‍💼' },
    { id: '3', name: 'Jenny L.', xp: 11200, level: 22, avatar: '👩' },
    { id: '4', name: 'David R.', xp: 9800, level: 20, avatar: '👨' },
    { id: '5', name: 'Emma W.', xp: 8500, level: 18, avatar: '👩‍🦰' },
];

interface LeaderboardProps {
    compact?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ compact = false }) => {
    const { totalXP, level } = useGameStore();

    // Insert current user into leaderboard
    const currentUser = { id: 'me', name: 'You', xp: totalXP, level, avatar: '🌟' };
    const allAgents = [...MOCK_AGENTS, currentUser].sort((a, b) => b.xp - a.xp);
    const userRank = allAgents.findIndex(a => a.id === 'me') + 1;

    // For compact view, show only nearby ranks
    const displayAgents = compact
        ? allAgents.slice(0, 5)
        : allAgents;

    return (
        <div className={`leaderboard ${compact ? 'leaderboard--compact' : ''}`}>
            <div className="leaderboard__header">
                <h3 className="leaderboard__title">🏆 Leaderboard</h3>
                {compact && (
                    <span className="leaderboard__your-rank">
                        Your Rank: #{userRank}
                    </span>
                )}
            </div>

            <div className="leaderboard__list">
                {displayAgents.map((agent, index) => {
                    const rank = index + 1;
                    const isCurrentUser = agent.id === 'me';

                    return (
                        <motion.div
                            key={agent.id}
                            className={`leaderboard__item ${isCurrentUser ? 'leaderboard__item--you' : ''}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className="leaderboard__rank">
                                {rank === 1 && '🥇'}
                                {rank === 2 && '🥈'}
                                {rank === 3 && '🥉'}
                                {rank > 3 && `#${rank}`}
                            </div>
                            <div className="leaderboard__avatar">{agent.avatar}</div>
                            <div className="leaderboard__info">
                                <span className="leaderboard__name">
                                    {agent.name}
                                    {isCurrentUser && ' ⭐'}
                                </span>
                                <span className="leaderboard__level">Lv.{agent.level}</span>
                            </div>
                            <div className="leaderboard__xp">
                                {agent.xp.toLocaleString()} XP
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* User position if not in top display */}
            {compact && userRank > 5 && (
                <div className="leaderboard__user-position">
                    <div className="leaderboard__dots">...</div>
                    <div className="leaderboard__item leaderboard__item--you">
                        <div className="leaderboard__rank">#{userRank}</div>
                        <div className="leaderboard__avatar">🌟</div>
                        <div className="leaderboard__info">
                            <span className="leaderboard__name">You</span>
                            <span className="leaderboard__level">Lv.{level}</span>
                        </div>
                        <div className="leaderboard__xp">
                            {totalXP.toLocaleString()} XP
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
