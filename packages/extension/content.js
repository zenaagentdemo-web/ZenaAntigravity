// Zena Sidekick - Content Script
// Runs on all pages to detect logins and capture DOM

(function () {
    'use strict';

    const domain = window.location.hostname.replace('www.', '');
    let hasNotifiedLogin = false;

    // Inject detection marker for the frontend
    document.documentElement.setAttribute('data-zena-extension-active', 'true');

    // Check if this domain is registered for capture
    chrome.runtime.sendMessage({ type: 'CHECK_DOMAIN', domain }, (response) => {
        if (response && response.isRegistered) {
            console.log('[Zena Sidekick] Domain is registered:', domain);

            if (!response.hasCapturedSession) {
                console.log('[Zena Sidekick] 🚀 New portal detected! Capturing immediately...');
                // AGGRESSIVE CAPTURE: Don't wait for "login detection". 
                // We want to bridge this site ASAP so Zena can use it.
                setTimeout(() => captureSession(), 2000);
            }

            // Still run login detection in case session status changes or we are re-logging in
            startLoginDetection();
        }
    });

    function startLoginDetection() {
        // Method 1: Watch for URL changes (common after login redirects)
        let lastUrl = window.location.href;

        const urlObserver = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                checkForLoginSuccess();
            }
        });

        urlObserver.observe(document.body, { childList: true, subtree: true });

        // Method 2: Watch for dashboard-like elements appearing
        const dashboardIndicators = [
            '[data-testid="dashboard"]',
            '.dashboard',
            '#dashboard',
            '.user-profile',
            '.account-menu',
            '.logout-button',
            '[href*="logout"]',
            '[href*="sign-out"]'
        ];

        const dashboardObserver = new MutationObserver((mutations) => {
            for (const selector of dashboardIndicators) {
                if (document.querySelector(selector)) {
                    console.log('[Zena Sidekick] Dashboard indicator found:', selector);
                    checkForLoginSuccess();
                    break;
                }
            }
        });

        dashboardObserver.observe(document.body, { childList: true, subtree: true });

        // Method 3: Check immediately (in case we landed on a logged-in page)
        setTimeout(checkForLoginSuccess, 2000);
    }

    function checkForLoginSuccess() {
        if (hasNotifiedLogin) return;

        // Check for login page indicators (if present, we're NOT logged in)
        const loginIndicators = [
            'input[type="password"]',
            '[name="password"]',
            '.login-form',
            '#login-form',
            '[action*="login"]',
            '[action*="signin"]'
        ];

        const isOnLoginPage = loginIndicators.some(sel => document.querySelector(sel));

        if (!isOnLoginPage && isLikelyLoggedIn()) {
            hasNotifiedLogin = true;
            console.log('[Zena Sidekick] Login detected! Capturing session...');
            captureSession();
        }
    }

    function isLikelyLoggedIn() {
        // Look for signs of a logged-in state
        const loggedInIndicators = [
            // User-specific elements
            document.querySelector('.user-name, .user-email, .account-name'),
            // Logout buttons
            document.querySelector('[href*="logout"], [href*="sign-out"], .logout'),
            // Dashboard-like URLs
            /dashboard|account|portal|app\./i.test(window.location.href),
            // Absence of login forms
            !document.querySelector('input[type="password"]')
        ];

        return loggedInIndicators.filter(Boolean).length >= 2;
    }

    function captureSession() {
        // Capture essential page DOM (cleaned)
        const pageDOM = getCleanedDOM();

        chrome.runtime.sendMessage({
            type: 'CAPTURE_SESSION',
            data: {
                domain: domain,
                pageUrl: window.location.href,
                pageTitle: document.title,
                pageDOM: pageDOM
            }
        }, (response) => {
            if (response && response.success) {
                showCaptureNotification('success');
            } else {
                showCaptureNotification('error');
            }
        });
    }

    function getCleanedDOM() {
        // Clone the document
        const clone = document.documentElement.cloneNode(true);

        // Remove scripts, styles, and other non-content elements
        const removeSelectors = ['script', 'style', 'noscript', 'iframe', 'svg', 'img'];
        removeSelectors.forEach(sel => {
            clone.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Get outer HTML but limit size
        let html = clone.outerHTML;
        if (html.length > 100000) {
            html = html.substring(0, 100000) + '<!-- truncated -->';
        }

        return html;
    }

    function showCaptureNotification(type) {
        const notification = document.createElement('div');
        notification.id = 'zena-sidekick-notification';
        notification.innerHTML = type === 'success'
            ? '✅ Zena captured your session!'
            : '❌ Session capture failed';

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px 24px',
            background: type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            borderRadius: '12px',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: '999999',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease'
        });

        // Add animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Also listen for manual capture trigger from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'MANUAL_CAPTURE') {
            captureSession();
            sendResponse({ success: true });
        }
    });

})();
