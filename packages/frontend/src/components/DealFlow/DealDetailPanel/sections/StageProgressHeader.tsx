/**
 * StageProgressHeader - Visual indicator of deal progress through stages
 */

import React from 'react';
import { DealStage, PipelineType, STAGE_LABELS, BUYER_STAGE_SEQUENCE, SELLER_STAGE_SEQUENCE } from '../../types';
import './sections.css';

interface StageProgressHeaderProps {
    currentStage: DealStage;
    pipelineType: PipelineType;
    onStageChange?: (stage: DealStage) => void;
    recommendedStage?: DealStage;
}

export const StageProgressHeader: React.FC<StageProgressHeaderProps> = ({ currentStage, pipelineType, onStageChange, recommendedStage }) => {
    const sequence = pipelineType === 'buyer' ? BUYER_STAGE_SEQUENCE : SELLER_STAGE_SEQUENCE;
    const currentIndex = sequence.indexOf(currentStage);

    return (
        <div className="stage-progress-header">
            <div className="stage-progress__track">
                {sequence.map((stage, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isRecommended = stage === recommendedStage;

                    return (
                        <div
                            key={stage}
                            className={`stage-progress__step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isRecommended ? 'recommended' : ''}`}
                            onClick={() => onStageChange?.(stage)}
                            style={{ cursor: onStageChange ? 'pointer' : 'default' }}
                        >
                            <div className="step__indicator">
                                {isCompleted ? '✓' : index + 1}
                                {isRecommended && <div className="step__pulse" />}
                            </div>
                            <span className="step__label">
                                {STAGE_LABELS[stage] || stage}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="stage-progress__bar">
                <div
                    className="stage-progress__fill"
                    style={{ width: `${(currentIndex / (sequence.length - 1)) * 100}%` }}
                />
            </div>
        </div>
    );
};
