// Zena Sidekick - Popup Script (Auto-Bridge Version)

document.addEventListener('DOMContentLoaded', async () => {
    const bridgeList = document.getElementById('bridgeList');
    const rescanBtn = document.getElementById('rescanBtn');

    // Get bridged sessions from background
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (response && response.capturedSessions) {
            updateBridgeList(response.capturedSessions);
        } else {
            bridgeList.innerHTML = '<li class="empty-state">No sessions bridged yet</li>';
        }
    });

    function updateBridgeList(sessions) {
        if (sessions && sessions.length > 0) {
            bridgeList.innerHTML = sessions.map(domain => `
                <li class="bridge-item">
                    <span class="name">
                        <span>🔗</span>
                        <span>${formatDomain(domain)}</span>
                    </span>
                    <span class="status bridged">BRIDGED</span>
                </li>
            `).join('');
        } else {
            bridgeList.innerHTML = '<li class="empty-state">No sessions bridged yet. Log into your portals and they\'ll be captured automatically!</li>';
        }
    }

    function formatDomain(domain) {
        // Clean up domain for display
        return domain
            .replace('www.', '')
            .split('.')[0]
            .charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    }

    // Rescan button
    rescanBtn.addEventListener('click', async () => {
        rescanBtn.textContent = '⏳ Scanning...';
        rescanBtn.disabled = true;

        chrome.runtime.sendMessage({ type: 'RESCAN_SESSIONS' }, (response) => {
            setTimeout(() => {
                rescanBtn.textContent = '✅ Scan Complete!';

                // Refresh the list
                chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
                    if (res && res.capturedSessions) {
                        updateBridgeList(res.capturedSessions);
                    }
                });

                setTimeout(() => {
                    rescanBtn.textContent = '🔍 Rescan All Sessions';
                    rescanBtn.disabled = false;
                }, 2000);
            }, 1500);
        });
    });
});
