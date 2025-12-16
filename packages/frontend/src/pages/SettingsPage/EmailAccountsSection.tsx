import React, { useState, useEffect } from 'react';
import { api } from '../../utils/apiClient';

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  syncEnabled: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

export const EmailAccountsSection: React.FC = () => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadAccounts();
    
    // Listen for OAuth callback
    window.addEventListener('message', handleOAuthCallback);
    return () => window.removeEventListener('message', handleOAuthCallback);
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ accounts: EmailAccount[] }>('/api/accounts/email');
      setAccounts(response.data.accounts);
    } catch (error) {
      console.error('Failed to load email accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectEmail = async (provider: 'gmail' | 'microsoft' | 'yahoo') => {
    try {
      console.log(`[EmailAccountsSection] Starting OAuth for provider: ${provider}`);
      setConnecting(true);
      
      // Get authorization URL
      console.log('[EmailAccountsSection] Calling /api/accounts/email/connect...');
      const response = await api.post<{ authorizationUrl: string; state: string }>(
        '/api/accounts/email/connect',
        { provider }
      );

      console.log('[EmailAccountsSection] Response received:', response.data);
      const { authorizationUrl } = response.data;

      if (!authorizationUrl) {
        throw new Error('No authorization URL received from server');
      }

      console.log('[EmailAccountsSection] Opening OAuth popup with URL:', authorizationUrl);

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authorizationUrl,
        'oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      console.log('[EmailAccountsSection] Popup opened successfully');
    } catch (error) {
      console.error('[EmailAccountsSection] Failed to initiate OAuth:', error);
      alert(`Failed to connect email account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setConnecting(false);
    }
  };

  const handleOAuthCallback = async (event: MessageEvent) => {
    if (event.data.type !== 'oauth-callback') return;

    const { code, state, error } = event.data;

    if (error) {
      alert(`OAuth error: ${error}`);
      setConnecting(false);
      return;
    }

    try {
      // Complete OAuth flow
      await api.post('/api/accounts/email/callback', { code, state });

      // Reload accounts
      await loadAccounts();
      
      alert('Email account connected successfully!');
    } catch (error) {
      console.error('Failed to complete OAuth:', error);
      alert('Failed to connect email account. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this email account?')) {
      return;
    }

    try {
      await api.delete(`/api/accounts/email/${accountId}`);
      await loadAccounts();
      alert('Email account disconnected');
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      alert('Failed to disconnect account. Please try again.');
    }
  };

  const triggerSync = async (accountId: string) => {
    try {
      await api.post(`/api/accounts/email/${accountId}/sync`);
      alert('Sync triggered. This may take a few minutes.');
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      alert('Failed to trigger sync. Please try again.');
    }
  };

  if (loading) {
    return <div>Loading email accounts...</div>;
  }

  return (
    <div className="email-accounts-section">
      <h2>Connected Email Accounts</h2>
      
      {accounts.length === 0 ? (
        <p>No email accounts connected yet.</p>
      ) : (
        <div className="email-accounts-list">
          {accounts.map((account) => (
            <div key={account.id} className="email-account-card">
              <div className="email-account-info">
                <div className="email-account-provider">
                  {account.provider === 'gmail' && '📧 Gmail'}
                  {account.provider === 'microsoft' && '📧 Outlook'}
                  {account.provider === 'yahoo' && '📧 Yahoo Mail'}
                </div>
                <div className="email-account-email">{account.email}</div>
                {account.lastSyncAt && (
                  <div className="email-account-sync">
                    Last synced: {new Date(account.lastSyncAt).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="email-account-actions">
                <button
                  onClick={() => triggerSync(account.id)}
                  className="btn-secondary"
                >
                  Sync Now
                </button>
                <button
                  onClick={() => disconnectAccount(account.id)}
                  className="btn-danger"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="email-accounts-connect">
        <h3>Connect New Account</h3>
        <div className="connect-buttons">
          <button
            onClick={() => connectEmail('gmail')}
            disabled={connecting}
            className="btn-connect-gmail"
          >
            {connecting ? 'Connecting...' : '📧 Connect Gmail'}
          </button>
          <button
            onClick={() => connectEmail('microsoft')}
            disabled={connecting}
            className="btn-connect-outlook"
          >
            {connecting ? 'Connecting...' : '📧 Connect Outlook'}
          </button>
          <button
            onClick={() => connectEmail('yahoo')}
            disabled={connecting}
            className="btn-connect-yahoo"
          >
            {connecting ? 'Connecting...' : '📧 Connect Yahoo Mail'}
          </button>
        </div>
      </div>
    </div>
  );
};
