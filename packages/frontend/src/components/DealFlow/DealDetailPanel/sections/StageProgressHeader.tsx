/**
 * StageProgressHeader - Visual indicator of deal progress through stages
 */

import React from 'react';
import { DealStage, PipelineType, STAGE_LABELS } from '../../types';
import './sections.css';

interface StageProgressHeaderProps {
    currentStage: DealStage;
    pipelineType: PipelineType;
}

const BUYER_SEQUENCE: DealStage[] = ['buyer_consult', 'shortlisting', 'viewings', 'offer_made', 'conditional', 'unconditional', 'pre_settlement', 'settled'];
const SELLER_SEQUENCE: DealStage[] = ['appraisal', 'listing_signed', 'marketing', 'offers_received', 'conditional', 'unconditional', 'pre_settlement', 'settled'];

export const StageProgressHeader: React.FC<StageProgressHeaderProps> = ({ currentStage, pipelineType }) => {
    const sequence = pipelineType === 'buyer' ? BUYER_SEQUENCE : SELLER_SEQUENCE;
    const currentIndex = sequence.indexOf(currentStage);

    return (
        <div className="stage-progress-header">
            <div className="stage-progress__track">
                {sequence.map((stage, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                        <div
                            key={stage}
                            className={`stage-progress__step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                            title={STAGE_LABELS[stage] || stage}
                        >
                            <div className="step__indicator">
                                {isCompleted ? '✓' : index + 1}
                            </div>
                            {isCurrent && (
                                <span className="step__label">
                                    {STAGE_LABELS[stage] || stage}
                                </span>
                            )}
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
