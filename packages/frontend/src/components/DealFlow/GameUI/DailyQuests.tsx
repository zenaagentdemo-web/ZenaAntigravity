import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore, Quest } from '../GameSystem';
import './DailyQuests.css';

// Generate daily quests based on current date (deterministic)
const generateDailyQuests = (): Quest[] => {
    const today = new Date().toISOString().split('T')[0];
    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);

    const questPool: Omit<Quest, 'id' | 'completed'>[] = [
        { title: 'Contact 5 leads', description: 'Reach out to new prospects', xpReward: 50, progress: 0, target: 5, type: 'daily' },
        { title: 'Schedule a viewing', description: 'Book a property showing', xpReward: 35, progress: 0, target: 1, type: 'daily' },
        { title: 'Update 3 deal statuses', description: 'Keep your pipeline fresh', xpReward: 25, progress: 0, target: 3, type: 'daily' },
        { title: 'Add notes to a deal', description: 'Document your progress', xpReward: 15, progress: 0, target: 1, type: 'daily' },
        { title: 'Move a deal forward', description: 'Progress towards settlement', xpReward: 40, progress: 0, target: 1, type: 'daily' },
        { title: 'Host an open home', description: 'Show a property to buyers', xpReward: 60, progress: 0, target: 1, type: 'daily' },
        { title: 'Complete a Zena tip', description: 'Learn something new', xpReward: 20, progress: 0, target: 1, type: 'daily' },
        { title: 'Check in on stale deals', description: 'Review deals inactive for 7+ days', xpReward: 30, progress: 0, target: 2, type: 'daily' },
    ];

    // Select 4 quests deterministically based on date
    const selectedQuests = [];
    for (let i = 0; i < 4; i++) {
        const index = (seed + i * 3) % questPool.length;
        selectedQuests.push({
            ...questPool[index],
            id: `daily-${today}-${i}`,
            completed: false
        });
    }

    return selectedQuests;
};

// Generate weekly challenge
const generateWeeklyChallenge = (): Quest => {
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

    const challenges = [
        { title: 'The Closer', description: 'Move 5 deals forward one stage', xpReward: 500, target: 5 },
        { title: 'Listing Legend', description: 'Add 3 new listings', xpReward: 600, target: 3 },
        { title: 'Open House Hero', description: 'Host 4 open homes', xpReward: 400, target: 4 },
        { title: 'Pipeline Master', description: 'Update all deal statuses', xpReward: 300, target: 10 },
        { title: 'The Negotiator', description: 'Receive 3 offers', xpReward: 550, target: 3 },
    ];

    const selected = challenges[weekNumber % challenges.length];

    return {
        id: `weekly-${weekNumber}`,
        title: selected.title,
        description: selected.description,
        xpReward: selected.xpReward,
        mysteryBonus: true,
        progress: 0,
        target: selected.target,
        type: 'weekly',
        completed: false
    };
};

export const DailyQuests: React.FC = () => {
    const { isQuestComplete, markQuestComplete, awardXP } = useGameStore();

    const dailyQuests = useMemo(() => generateDailyQuests(), []);
    const weeklyChallenge = useMemo(() => generateWeeklyChallenge(), []);

    const completedDailyCount = dailyQuests.filter(q => isQuestComplete(q.id)).length;
    const allDailyComplete = completedDailyCount === dailyQuests.length;

    const handleQuestClick = (quest: Quest) => {
        if (isQuestComplete(quest.id)) return;

        // For demo: clicking completes the quest
        markQuestComplete(quest.id);
        awardXP('QUEST_COMPLETED', {
            description: quest.title,
            customMultiplier: quest.xpReward / 10 // Scale by quest reward
        });
    };

    return (
        <div className="daily-quests">
            {/* Daily Quests Header */}
            <div className="daily-quests__header">
                <h3 className="daily-quests__title">
                    🎯 Daily Quests
                </h3>
                <span className="daily-quests__count">
                    {completedDailyCount}/{dailyQuests.length}
                </span>
            </div>

            {/* Quest List */}
            <div className="daily-quests__list">
                {dailyQuests.map((quest, index) => {
                    const completed = isQuestComplete(quest.id);
                    return (
                        <motion.div
                            key={quest.id}
                            className={`quest-item ${completed ? 'quest-item--complete' : ''}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => handleQuestClick(quest)}
                        >
                            <div className="quest-item__checkbox">
                                {completed ? '✓' : ''}
                            </div>
                            <div className="quest-item__content">
                                <span className="quest-item__title">{quest.title}</span>
                                <span className="quest-item__desc">{quest.description}</span>
                            </div>
                            <div className="quest-item__reward">
                                +{quest.xpReward} XP
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* All Complete Bonus */}
            {allDailyComplete && (
                <motion.div
                    className="daily-quests__bonus"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                >
                    🎉 All quests complete! +100 XP Bonus!
                </motion.div>
            )}

            {/* Weekly Challenge */}
            <div className="weekly-challenge">
                <div className="weekly-challenge__header">
                    <h4 className="weekly-challenge__title">
                        🏆 Weekly Challenge: {weeklyChallenge.title}
                    </h4>
                </div>
                <p className="weekly-challenge__desc">{weeklyChallenge.description}</p>
                <div className="weekly-challenge__progress">
                    <div className="weekly-challenge__bar">
                        <motion.div
                            className="weekly-challenge__fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${(weeklyChallenge.progress / weeklyChallenge.target) * 100}%` }}
                        />
                    </div>
                    <span className="weekly-challenge__count">
                        {weeklyChallenge.progress}/{weeklyChallenge.target}
                    </span>
                </div>
                <div className="weekly-challenge__reward">
                    Reward: {weeklyChallenge.xpReward} XP + Mystery Bonus ✨
                </div>
            </div>
        </div>
    );
};

export default DailyQuests;
