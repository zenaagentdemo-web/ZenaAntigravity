// Zena Sidekick - Background Service Worker
// Auto-bridges all logged-in sessions on install

const ZENA_API = 'http://localhost:3001/api';

// Known portals to auto-detect and bridge
const KNOWN_PORTALS = [
    { domain: 'trademe.co.nz', name: 'Trade Me Property', category: 'portal' },
    { domain: 'oneroof.co.nz', name: 'OneRoof', category: 'portal' },
    { domain: 'corelogic.co.nz', name: 'CoreLogic', category: 'portal' },
    { domain: 'valocity.co.nz', name: 'Valocity', category: 'portal' },
    { domain: 'realestate.co.nz', name: 'realestate.co.nz', category: 'portal' },
    { domain: 'homes.co.nz', name: 'Homes.co.nz', category: 'portal' },
    { domain: 'reinz.co.nz', name: 'REINZ', category: 'portal' },
    { domain: 'myvault.co.nz', name: 'MRI Vault', category: 'crm' },
    { domain: 'rex.software', name: 'Rex Software', category: 'crm' },
    { domain: 'palace.co.nz', name: 'Palace', category: 'crm' }
];

// Track bridged sessions
let bridgedSessions = [];

// ===========================================
// AUTO-BRIDGE ON INSTALL
// ===========================================

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Zena Sidekick] Extension installed/updated');

    if (details.reason === 'install' || details.reason === 'update') {
        // Wait a moment for tabs to be accessible
        setTimeout(async () => {
            await autoBridgeAllSessions();
        }, 1000);
    }
});

// Also run on browser startup
chrome.runtime.onStartup.addListener(async () => {
    console.log('[Zena Sidekick] Browser started - checking sessions');
    await autoBridgeAllSessions();
});

async function autoBridgeAllSessions() {
    console.log('[Zena Sidekick] 🔍 Scanning for logged-in sessions...');

    const bridgedCount = { success: 0, failed: 0, domains: [] };

    try {
        // Get all open tabs
        const tabs = await chrome.tabs.query({});

        for (const tab of tabs) {
            if (!tab.url || tab.url.startsWith('chrome://')) continue;

            try {
                const url = new URL(tab.url);
                const domain = url.hostname.replace('www.', '');

                // Check if this is a known portal
                const knownPortal = KNOWN_PORTALS.find(p => domain.includes(p.domain));

                if (knownPortal || !bridgedSessions.includes(domain)) {
                    // Try to capture this session
                    const result = await captureSessionFromTab(tab, domain, knownPortal);

                    if (result.success) {
                        bridgedCount.success++;
                        bridgedCount.domains.push(knownPortal?.name || domain);
                        bridgedSessions.push(domain);
                    }
                }
            } catch (err) {
                console.log('[Zena Sidekick] Skipping tab:', tab.url);
            }
        }

        // Show notification if we bridged anything
        if (bridgedCount.success > 0) {
            showBridgeNotification(bridgedCount.domains);
        }

        // Store bridged sessions
        await chrome.storage.local.set({ bridgedSessions });

        console.log(`[Zena Sidekick] ✅ Auto-bridged ${bridgedCount.success} sessions`);

    } catch (error) {
        console.error('[Zena Sidekick] Auto-bridge error:', error);
    }
}

async function captureSessionFromTab(tab, domain, portalInfo) {
    if (!tab || !tab.url) {
        console.warn(`[Zena Sidekick] Missing tab or URL for capture: ${domain}`);
        return { success: false, reason: 'missing_tab_info' };
    }

    try {
        // Get cookies for this URL (safer than domain matching)
        const cookies = await chrome.cookies.getAll({ url: tab.url });

        if (cookies.length === 0) {
            console.log(`[Zena Sidekick] No cookies found for ${domain}`);
            // For known portals like Trade Me, we might still want to proceed if we can (though cookies usually exist)
            // But usually 0 cookies means strict privacy or error. Return false.
            return { success: false, reason: 'no_cookies' };
        }

        // Check for session indicators (logged-in state)
        // EXPANDED: Include common variations for Trade Me ("TM_") and others
        const hasSessionCookie = cookies.some(c =>
            c.name.toLowerCase().includes('session') ||
            c.name.toLowerCase().includes('auth') ||
            c.name.toLowerCase().includes('token') ||
            c.name.toLowerCase().includes('user') ||
            c.name.toUpperCase().startsWith('TM_') || // Trade Me specific
            c.name.toLowerCase().includes('id')
        );

        // RELAXED CHECK: If it's a known portal, capture it ANYWAY.
        // Zena can use "Guest Mode" (public search) even without a login session.
        if (!hasSessionCookie && !portalInfo) {
            return { success: false, reason: 'no_session' };
        }

        if (portalInfo && !hasSessionCookie) {
            console.log(`[Zena Sidekick] ⚠️ No obvious session cookie for ${domain}, but continuing as Guest/Public...`);
        }

        console.log(`[Zena Sidekick] 📡 Bridging: ${portalInfo?.name || domain}`);

        // Capture DOM from the tab (if accessible)
        let pageDOM = null;
        try {
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => document.documentElement.outerHTML.substring(0, 50000)
            });
            pageDOM = result?.result;
        } catch (e) {
            // DOM capture failed, continue without it
        }

        // Send to Zena backend
        const sessionData = {
            domain: domain,
            pageUrl: tab.url,
            pageTitle: tab.title,
            cookies: cookies.map(c => ({
                name: c.name,
                value: c.value,
                domain: c.domain,
                path: c.path,
                secure: c.secure,
                httpOnly: c.httpOnly,
                expirationDate: c.expirationDate
            })),
            capturedAt: new Date().toISOString(),
            pageDOM: pageDOM,
            autoBridged: true,
            portalName: portalInfo?.name,
            portalCategory: portalInfo?.category
        };

        const response = await fetch(`${ZENA_API}/connections/capture-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
        });

        if (response.ok) {
            console.log(`[Zena Sidekick] ✅ Bridged: ${domain}`);
            return { success: true, domain };
        } else {
            console.log(`[Zena Sidekick] ⚠️ Backend error for ${domain}`);
            return { success: false, reason: 'backend_error' };
        }

    } catch (error) {
        console.error(`[Zena Sidekick] ❌ Capture failed for ${domain}:`, error);
        return { success: false, reason: error.message };
    }
}

function showBridgeNotification(domains) {
    const domainList = domains.slice(0, 3).join(', ');
    const extra = domains.length > 3 ? ` +${domains.length - 3} more` : '';

    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Zena Sessions Bridged!',
        message: `Auto-bridged: ${domainList}${extra}`,
        priority: 2
    }).catch(err => {
        // Silent catch for notification permission issues or image errors
        console.warn('[Zena Sidekick] Notification failed:', err);
    });
}


// ===========================================
// MESSAGE HANDLERS (for popup and content scripts)
// ===========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Zena Sidekick] Message:', message.type);

    switch (message.type) {
        case 'CAPTURE_SESSION':
            handleManualCapture(message.data, sender.tab)
                .then(result => sendResponse(result))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;

        case 'GET_STATUS':
            chrome.storage.local.get(['bridgedSessions'], (result) => {
                sendResponse({
                    capturedSessions: result.bridgedSessions || [],
                    registeredDomains: KNOWN_PORTALS.map(p => p.domain)
                });
            });
            return true;

        case 'CHECK_DOMAIN':
            const isKnown = KNOWN_PORTALS.some(p => message.domain.includes(p.domain));
            sendResponse({
                isRegistered: isKnown,
                hasCapturedSession: bridgedSessions.includes(message.domain)
            });
            return true;

        case 'RESCAN_SESSIONS':
            autoBridgeAllSessions()
                .then(() => sendResponse({ success: true }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
    }
});

async function handleManualCapture(data, tab) {
    const domain = data.domain || new URL(tab.url).hostname.replace('www.', '');
    const portalInfo = KNOWN_PORTALS.find(p => domain.includes(p.domain));

    return await captureSessionFromTab(tab, domain, portalInfo);
}


// ===========================================
// TAB MONITORING (detect new logins)
// ===========================================

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only check when page fully loads
    if (changeInfo.status !== 'complete' || !tab.url) return;

    try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace('www.', '');

        // Check if this is a known portal we haven't bridged yet
        const knownPortal = KNOWN_PORTALS.find(p => domain.includes(p.domain));

        if (knownPortal && !bridgedSessions.includes(domain)) {
            // Check for login indicators in URL
            const isPostLogin =
                tab.url.includes('dashboard') ||
                tab.url.includes('account') ||
                tab.url.includes('home') ||
                !tab.url.includes('login') && !tab.url.includes('signin');

            if (isPostLogin) {
                console.log(`[Zena Sidekick] 🎯 Detected login on: ${knownPortal.name}`);
                const result = await captureSessionFromTab(tab, domain, knownPortal);

                if (result.success) {
                    bridgedSessions.push(domain);
                    await chrome.storage.local.set({ bridgedSessions });

                    // Inject success toast on the page
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (name) => {
                            const toast = document.createElement('div');
                            toast.innerHTML = `✅ Zena bridged your ${name} session!`;
                            Object.assign(toast.style, {
                                position: 'fixed',
                                top: '20px',
                                right: '20px',
                                padding: '16px 24px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                borderRadius: '12px',
                                fontFamily: 'system-ui',
                                fontSize: '14px',
                                fontWeight: '600',
                                zIndex: '999999',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                            });
                            document.body.appendChild(toast);
                            setTimeout(() => toast.remove(), 4000);
                        },
                        args: [knownPortal.name]
                    });
                }
            }
        }
    } catch (err) {
        // Ignore invalid URLs
    }
});

// Load stored sessions on startup
chrome.storage.local.get(['bridgedSessions'], (result) => {
    bridgedSessions = result.bridgedSessions || [];
    console.log('[Zena Sidekick] Loaded bridged sessions:', bridgedSessions);
});
