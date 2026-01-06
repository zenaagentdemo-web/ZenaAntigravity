import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, Settings, Laptop } from 'lucide-react';
import './ExtensionOnboardingModal.css';

interface ExtensionOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete?: () => void;
}

export const ExtensionOnboardingModal: React.FC<ExtensionOnboardingModalProps> = ({
    isOpen,
    onClose,
    onComplete
}) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isCheckingExtension, setIsCheckingExtension] = useState(false);
    const [extensionInstalled, setExtensionInstalled] = useState(false);
    const [isDeveloperMode, setIsDeveloperMode] = useState(false);
    const [pathCopied, setPathCopied] = useState(false);

    const CHROME_STORE_URL = 'https://chrome.google.com/webstore/detail/zena-sidekick/YOUR_EXTENSION_ID';
    const LOCAL_EXTENSION_PATH = '/Users/hamishmcgee/Desktop/ZenaAntigravity/packages/extension';

    // For development, use the local extension check
    const checkExtensionInstalled = async (shouldJumpToSuccess = false) => {
        setIsCheckingExtension(true);

        // Try to detect the extension via the DOM marker injected by content.js
        const isInstalled = document.documentElement.getAttribute('data-zena-extension-active') === 'true';

        if (isInstalled) {
            setExtensionInstalled(true);
            if (shouldJumpToSuccess) {
                setCurrentStep(4);
            }
        } else {
            setExtensionInstalled(false);
        }

        setIsCheckingExtension(false);
    };

    useEffect(() => {
        if (isOpen) {
            // Initial check on open, but don't jump to success yet
            checkExtensionInstalled(false);
        }
    }, [isOpen]);

    const handleInstallClick = () => {
        if (isDeveloperMode) {
            setCurrentStep(2);
        } else {
            // Open Chrome Web Store in new tab
            window.open(CHROME_STORE_URL, '_blank');
            setCurrentStep(2);
        }

        // Start polling to check if extension is installed
        const pollInterval = setInterval(() => {
            checkExtensionInstalled(true);
        }, 2000);

        // Stop polling after 5 minutes during manual setup
        setTimeout(() => clearInterval(pollInterval), 300000);
    };

    const handleCopyPath = () => {
        navigator.clipboard.writeText(LOCAL_EXTENSION_PATH);
        setPathCopied(true);
        setTimeout(() => setPathCopied(false), 2000);
    };

    const handleCheckAgain = () => {
        setCurrentStep(3);
        checkExtensionInstalled(true);
    };

    const handleComplete = () => {
        onComplete?.();
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="extension-onboarding-overlay" onClick={onClose}>
            <div className="extension-onboarding-modal" onClick={e => e.stopPropagation()}>
                {/* Progress Bar */}
                <div className="onboarding-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${(currentStep / 4) * 100}%` }}
                        />
                    </div>
                    <span className="progress-text">Step {currentStep} of 4</span>
                </div>

                {/* Close Button */}
                <button className="onboarding-close" onClick={onClose}>×</button>

                {/* Step 1: Introduction */}
                {currentStep === 1 && (
                    <div className="onboarding-step">
                        <div className="step-icon">🚀</div>
                        <h2>Unlock Pro Intelligence</h2>
                        <p className="step-description">
                            Connect your professional accounts to access deep insights from
                            Trade Me, OneRoof, CoreLogic, and more — all without sharing passwords.
                        </p>

                        <div className="benefits-list">
                            <div className="benefit-item">
                                <span className="benefit-icon">🔐</span>
                                <span>Secure data sync (no passwords stored)</span>
                            </div>
                            <div className="benefit-item">
                                <span className="benefit-icon">⚡</span>
                                <span>Auto-syncs your logged-in portals</span>
                            </div>
                            <div className="benefit-item">
                                <span className="benefit-icon">🎯</span>
                                <span>One-time setup, works forever</span>
                            </div>
                        </div>

                        <div className="step-options">
                            <label className={`mode-toggle ${isDeveloperMode ? 'active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={isDeveloperMode}
                                    onChange={(e) => setIsDeveloperMode(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                                <span className="toggle-label">Developer / Local Mode</span>
                            </label>
                        </div>

                        <div className="step-time">
                            <span className="time-icon">⏱️</span>
                            <span>Takes only 30 seconds</span>
                        </div>

                        <button className="onboarding-btn primary" onClick={handleInstallClick}>
                            {isDeveloperMode ? 'Start Local Setup →' : 'Install Zena Sidekick →'}
                        </button>

                        <button className="onboarding-btn text" onClick={onClose}>
                            I'll do this later
                        </button>
                    </div>
                )}

                {/* Step 2: Installing */}
                {currentStep === 2 && (
                    <div className="onboarding-step">
                        {isDeveloperMode ? (
                            <>
                                <div className="step-icon pulse">🛠️</div>
                                <h2>Local Installation</h2>
                                <p className="step-description">
                                    Since the extension is in development, please load it manually:
                                </p>

                                <div className="manual-steps">
                                    <div className="manual-step">
                                        <div className="manual-step-num">1</div>
                                        <div className="manual-step-content">
                                            Open <code onClick={() => window.open('chrome://extensions/', '_blank')}>chrome://extensions/</code>
                                        </div>
                                    </div>
                                    <div className="manual-step">
                                        <div className="manual-step-num">2</div>
                                        <div className="manual-step-content">
                                            Enable <strong>Developer mode</strong> (top right)
                                        </div>
                                    </div>
                                    <div className="manual-step">
                                        <div className="manual-step-num">3</div>
                                        <div className="manual-step-content">
                                            Click <strong>Load unpacked</strong>
                                        </div>
                                    </div>
                                    <div className="manual-step">
                                        <div className="manual-step-num">4</div>
                                        <div className="manual-step-content">
                                            Select the folder at this path:
                                            <div className="path-copy-box">
                                                <code>{LOCAL_EXTENSION_PATH}</code>
                                                <button className="copy-btn" onClick={handleCopyPath}>
                                                    {pathCopied ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="step-icon pulse">🔄</div>
                                <h2>Installing Extension...</h2>
                                <p className="step-description">
                                    A new tab opened with the Chrome Web Store.
                                    Click <strong>"Add to Chrome"</strong> to install.
                                </p>

                                <div className="install-visual">
                                    <div className="browser-mockup">
                                        <div className="browser-bar">
                                            <div className="browser-dots">
                                                <span></span><span></span><span></span>
                                            </div>
                                            <div className="browser-url">chrome.google.com/webstore</div>
                                        </div>
                                        <div className="browser-content">
                                            <div className="store-card">
                                                <div className="store-icon">🔗</div>
                                                <div className="store-info">
                                                    <div className="store-name">Zena Sidekick</div>
                                                    <div className="store-rating">★★★★★</div>
                                                </div>
                                                <button className="store-btn">Add to Chrome</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="arrow-indicator">
                                        <span className="arrow">👆</span>
                                        <span className="arrow-text">Click this button</span>
                                    </div>
                                </div>
                            </>
                        )}

                        <button className="onboarding-btn secondary" onClick={handleCheckAgain}>
                            I've installed it ✓
                        </button>
                    </div>
                )}

                {/* Step 3: Checking */}
                {currentStep === 3 && (
                    <div className="onboarding-step">
                        <div className="step-icon spin">🔍</div>
                        <h2>Checking for Extension...</h2>
                        <p className="step-description">
                            Looking for Zena Sidekick in your browser...
                        </p>

                        {isCheckingExtension ? (
                            <div className="checking-loader">
                                <div className="loader-dots">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        ) : !extensionInstalled ? (
                            <div className="not-found">
                                <p>Extension not detected yet.</p>
                                <button className="onboarding-btn secondary" onClick={handleInstallClick}>
                                    {isDeveloperMode ? 'Retry Local Setup' : 'Open Chrome Web Store'}
                                </button>
                                <button className="onboarding-btn text" onClick={handleCheckAgain}>
                                    Check Again
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Step 4: Success */}
                {currentStep === 4 && (
                    <div className="onboarding-step success">
                        <div className="step-icon success-icon">✅</div>
                        <h2>You're All Set!</h2>
                        <p className="step-description">
                            Zena Sidekick is now active. Your professional tools
                            will be securely connected.
                        </p>

                        <div className="success-features">
                            <div className="success-item">
                                <span className="check">✓</span>
                                <span>Extension installed</span>
                            </div>
                            <div className="success-item">
                                <span className="check">✓</span>
                                <span>Auto-sync enabled</span>
                            </div>
                            <div className="success-item">
                                <span className="check">✓</span>
                                <span>Connection validated</span>
                            </div>
                        </div>

                        <div className="success-tip">
                            <span className="tip-icon">💡</span>
                            <span>
                                <strong>Pro tip:</strong> Log into Trade Me, OneRoof, or any portal.
                                Zena will automatically validate your connection!
                            </span>
                        </div>

                        <button className="onboarding-btn primary" onClick={handleComplete}>
                            Start Using Pro Features →
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
