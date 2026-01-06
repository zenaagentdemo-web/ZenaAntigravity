import React, { useState, useEffect } from 'react';
import './DataRetrievalProgress.css';

interface ProgressStep {
    id: string;
    label: string;
    icon: string;
    duration: number; // in ms
}

interface DataRetrievalProgressProps {
    isActive: boolean;
    source?: string;
    onComplete?: () => void;
}

const DEFAULT_STEPS: ProgressStep[] = [
    { id: 'searching', label: 'Searching', icon: '🔍', duration: 2500 },
    { id: 'extracting', label: 'Extracting property data', icon: '📊', duration: 3000 },
    { id: 'generating', label: 'Generating your report', icon: '📝', duration: 2500 },
    { id: 'complete', label: 'Report ready!', icon: '✅', duration: 1000 },
];

export const DataRetrievalProgress: React.FC<DataRetrievalProgressProps> = ({
    isActive,
    source = 'CoreLogic',
    onComplete
}) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    const steps = DEFAULT_STEPS.map((step, index) =>
        index === 0 ? { ...step, label: `Searching ${source}...` } : step
    );

    useEffect(() => {
        if (!isActive) {
            setCurrentStepIndex(0);
            setProgress(0);
            return;
        }

        let stepIndex = 0;
        let stepProgress = 0;

        const progressInterval = setInterval(() => {
            if (stepIndex >= steps.length) {
                clearInterval(progressInterval);
                onComplete?.();
                return;
            }

            const currentStep = steps[stepIndex];
            const progressIncrement = 100 / (currentStep.duration / 100);

            stepProgress += progressIncrement;

            if (stepProgress >= 100) {
                stepIndex++;
                stepProgress = 0;
                setCurrentStepIndex(stepIndex);
            }

            // Calculate overall progress
            const overallProgress = ((stepIndex / steps.length) * 100) +
                ((stepProgress / 100) * (100 / steps.length));
            setProgress(Math.min(overallProgress, 100));
        }, 100);

        return () => clearInterval(progressInterval);
    }, [isActive, onComplete, steps]);

    if (!isActive) return null;

    const currentStep = steps[Math.min(currentStepIndex, steps.length - 1)];

    return (
        <div className="data-retrieval-progress">
            <div className="data-retrieval-progress__container">
                <div className="data-retrieval-progress__glow" />

                <div className="data-retrieval-progress__icon">
                    {currentStep.icon}
                </div>

                <div className="data-retrieval-progress__label">
                    {currentStep.label}
                </div>

                <div className="data-retrieval-progress__bar">
                    <div
                        className="data-retrieval-progress__bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="data-retrieval-progress__steps">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`data-retrieval-progress__step ${index < currentStepIndex ? 'data-retrieval-progress__step--complete' :
                                    index === currentStepIndex ? 'data-retrieval-progress__step--active' : ''
                                }`}
                        >
                            <span className="step-icon">{step.icon}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
