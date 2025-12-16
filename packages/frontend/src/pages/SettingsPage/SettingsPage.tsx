import React, { useState, useEffect } from 'react';
import { api } from '../../utils/apiClient';
import { ExportDialog, ExportType, ExportFormat } from '../../components/ExportDialog/ExportDialog';
import { ExportProgress } from '../../components/ExportProgress/ExportProgress';
import { CRMDialog, CRMIntegration } from '../../components/CRMDialog/CRMDialog';
import './SettingsPage.css';

interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  lastSyncAt: string;
  syncEnabled: boolean;
}

interface CalendarAccount {
  id: string;
  provider: string;
  email: string;
  lastSyncAt: string;
  syncEnabled: boolean;
}

interface NotificationPreferences {
  highPriorityThreads: boolean;
  riskDeals: boolean;
  calendarReminders: boolean;
  taskReminders: boolean;
}

interface VoiceSettings {
  sttProvider: 'openai' | 'google';
  ttsProvider: 'openai' | 'google';
  ttsVoice: string;
  autoPlayResponses: boolean;
}

export const SettingsPage: React.FC = () => {
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    highPriorityThreads: true,
    riskDeals: true,
    calendarReminders: true,
    taskReminders: true,
  });
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    sttProvider: 'openai',
    ttsProvider: 'openai',
    ttsVoice: 'alloy',
    autoPlayResponses: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('contacts');
  const [exportInProgress, setExportInProgress] = useState(false);
  const [currentExportId, setCurrentExportId] = useState<string | null>(null);
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const [crmDialogOpen, setCrmDialogOpen] = useState(false);
  const [crmIntegrations, setCrmIntegrations] = useState<CRMIntegration[]>([]);
  const [syncingCRM, setSyncingCRM] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const oauthStatus = urlParams.get('oauth');
    const provider = urlParams.get('provider');
    const email = urlParams.get('email');
    const errorMessage = urlParams.get('message');
    
    if (oauthStatus === 'success' && provider && email) {
      alert(`Successfully connected ${provider} account: ${email}`);
      // Clean up URL
      window.history.replaceState({}, document.title, '/settings');
    } else if (oauthStatus === 'error') {
      alert(`Failed to connect email account: ${errorMessage || 'Unknown error'}`);
      // Clean up URL
      window.history.replaceState({}, document.title, '/settings');
    }
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [emailRes, calendarRes, notifRes, crmRes] = await Promise.all([
        api.get('/api/accounts/email'),
        api.get('/api/accounts/calendar'),
        api.get('/api/notifications/preferences'),
        api.get('/api/integrations/crm/user'),
      ]);

      setEmailAccounts(emailRes.data.accounts || []);
      setCalendarAccounts(calendarRes.data.accounts || []);
      setNotificationPrefs(notifRes.data);
      setCrmIntegrations(crmRes.data.integrations || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectEmail = async (provider: string) => {
    try {
      const response = await api.post('/api/accounts/email/connect', { provider });
      // Redirect to OAuth flow
      window.location.href = response.data.authorizationUrl;
    } catch (error) {
      console.error('Failed to initiate email connection:', error);
      alert('Failed to connect email account. Please try again.');
    }
  };

  const handleDisconnectEmail = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this email account?')) {
      return;
    }

    try {
      await api.delete(`/api/accounts/email/${accountId}`);
      await loadSettings();
    } catch (error) {
      console.error('Failed to disconnect email account:', error);
    }
  };

  const handleConnectCalendar = async (provider: string) => {
    try {
      const response = await api.post('/api/accounts/calendar/connect', { provider });
      // Redirect to OAuth flow
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Failed to initiate calendar connection:', error);
    }
  };

  const handleDisconnectCalendar = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar?')) {
      return;
    }

    try {
      await api.delete(`/api/accounts/calendar/${accountId}`);
      await loadSettings();
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
    }
  };

  const handleSaveNotificationPrefs = async () => {
    try {
      setSaving(true);
      await api.put('/api/notifications/preferences', notificationPrefs);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    } finally {
      setSaving(false);
    }
  };



  const handleOpenExportDialog = (type: ExportType) => {
    setExportType(type);
    setExportDialogOpen(true);
    setExportDownloadUrl(null);
  };

  const handleExport = async (format: ExportFormat, selectedIds?: string[]) => {
    try {
      setExportInProgress(true);
      
      const endpoint = `/api/export/${exportType}`;
      const response = await api.post(endpoint, {
        format,
        recordIds: selectedIds,
      });

      setCurrentExportId(response.data.id);
    } catch (error) {
      console.error('Failed to start export:', error);
      alert('Failed to start export. Please try again.');
      setExportInProgress(false);
      setExportDialogOpen(false);
    }
  };

  const handleExportComplete = (downloadUrl: string) => {
    setExportDownloadUrl(downloadUrl);
    setExportInProgress(false);
    setCurrentExportId(null);
  };

  const handleExportError = (error: string) => {
    alert(`Export failed: ${error}`);
    setExportInProgress(false);
    setExportDialogOpen(false);
    setCurrentExportId(null);
  };

  const handleDownload = () => {
    if (exportDownloadUrl) {
      window.open(exportDownloadUrl, '_blank');
      setExportDialogOpen(false);
      setExportDownloadUrl(null);
    }
  };

  const handleCRMSuccess = async () => {
    // Reload CRM integrations after successful connection
    try {
      const crmRes = await api.get('/api/integrations/crm/user');
      setCrmIntegrations(crmRes.data.integrations || []);
    } catch (error) {
      console.error('Failed to reload CRM integrations:', error);
    }
  };

  const handleSyncCRM = async (provider: string) => {
    try {
      setSyncingCRM(provider);
      await api.post(`/api/integrations/crm/${provider}/sync`);
      alert('Sync completed successfully!');
      await handleCRMSuccess();
    } catch (error: any) {
      console.error('Failed to sync CRM:', error);
      alert(error.response?.data?.error?.message || 'Failed to sync CRM');
    } finally {
      setSyncingCRM(null);
    }
  };

  const handleDisconnectCRM = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect from ${provider}?`)) {
      return;
    }

    try {
      await api.delete(`/api/integrations/crm/${provider}`);
      await handleCRMSuccess();
    } catch (error) {
      console.error('Failed to disconnect CRM:', error);
      alert('Failed to disconnect CRM');
    }
  };

  const getProviderName = (provider: string): string => {
    const names: Record<string, string> = {
      mri_vault: 'MRI Vault',
      salesforce: 'Salesforce',
      top_producer: 'Top Producer',
      kvcore: 'kvCORE',
      follow_up_boss: 'Follow Up Boss',
    };
    return names[provider] || provider;
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-page__loading">Loading settings...</div>
      </div>
    );
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">Settings</h1>
        <button 
          className="button button--danger"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </div>

      <div className="settings-page__content">
        {/* Email Accounts Section */}
        <section className="settings-section">
          <h2 className="settings-section__title">Email Accounts</h2>
          <p className="settings-section__description">
            Connect your email accounts to sync communications and build your deal universe.
          </p>

          <div className="settings-section__accounts">
            {emailAccounts.map((account) => (
              <div key={account.id} className="account-card">
                <div className="account-card__info">
                  <div className="account-card__provider">{account.provider}</div>
                  <div className="account-card__email">{account.email}</div>
                  <div className="account-card__status">
                    Last synced: {new Date(account.lastSyncAt).toLocaleString()}
                  </div>
                </div>
                <div className="account-card__actions">
                  <button
                    className="button button--danger button--small"
                    onClick={() => handleDisconnectEmail(account.id)}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="settings-section__add">
            <h3 className="settings-section__subtitle">Add Email Account</h3>
            <div className="provider-buttons">
              <button
                className="button button--provider"
                onClick={() => handleConnectEmail('gmail')}
              >
                <span className="provider-icon">📧</span>
                Gmail
              </button>
              <button
                className="button button--provider"
                onClick={() => handleConnectEmail('outlook')}
              >
                <span className="provider-icon">📧</span>
                Outlook
              </button>
              <button
                className="button button--provider"
                onClick={() => handleConnectEmail('icloud')}
              >
                <span className="provider-icon">📧</span>
                iCloud
              </button>
              <button
                className="button button--provider"
                onClick={() => handleConnectEmail('yahoo')}
              >
                <span className="provider-icon">📧</span>
                Yahoo
              </button>
            </div>
          </div>
        </section>

        {/* Calendar Accounts Section */}
        <section className="settings-section">
          <h2 className="settings-section__title">Calendar Accounts</h2>
          <p className="settings-section__description">
            Connect your calendars to link events to properties and deals.
          </p>

          <div className="settings-section__accounts">
            {calendarAccounts.map((account) => (
              <div key={account.id} className="account-card">
                <div className="account-card__info">
                  <div className="account-card__provider">{account.provider}</div>
                  <div className="account-card__email">{account.email}</div>
                  <div className="account-card__status">
                    Last synced: {new Date(account.lastSyncAt).toLocaleString()}
                  </div>
                </div>
                <div className="account-card__actions">
                  <button
                    className="button button--danger button--small"
                    onClick={() => handleDisconnectCalendar(account.id)}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="settings-section__add">
            <h3 className="settings-section__subtitle">Add Calendar</h3>
            <div className="provider-buttons">
              <button
                className="button button--provider"
                onClick={() => handleConnectCalendar('google')}
              >
                <span className="provider-icon">📅</span>
                Google Calendar
              </button>
              <button
                className="button button--provider"
                onClick={() => handleConnectCalendar('microsoft')}
              >
                <span className="provider-icon">📅</span>
                Microsoft Calendar
              </button>
            </div>
          </div>
        </section>

        {/* Notification Preferences Section */}
        <section className="settings-section">
          <h2 className="settings-section__title">Notifications</h2>
          <p className="settings-section__description">
            Choose which notifications you want to receive.
          </p>

          <div className="settings-section__preferences">
            <label className="preference-item">
              <input
                type="checkbox"
                checked={notificationPrefs.highPriorityThreads}
                onChange={(e) =>
                  setNotificationPrefs({
                    ...notificationPrefs,
                    highPriorityThreads: e.target.checked,
                  })
                }
              />
              <div className="preference-item__content">
                <div className="preference-item__title">High-Priority Threads</div>
                <div className="preference-item__description">
                  Get notified when important threads require your reply
                </div>
              </div>
            </label>

            <label className="preference-item">
              <input
                type="checkbox"
                checked={notificationPrefs.riskDeals}
                onChange={(e) =>
                  setNotificationPrefs({
                    ...notificationPrefs,
                    riskDeals: e.target.checked,
                  })
                }
              />
              <div className="preference-item__content">
                <div className="preference-item__title">At-Risk Deals</div>
                <div className="preference-item__description">
                  Get notified when deals are flagged as at risk
                </div>
              </div>
            </label>

            <label className="preference-item">
              <input
                type="checkbox"
                checked={notificationPrefs.calendarReminders}
                onChange={(e) =>
                  setNotificationPrefs({
                    ...notificationPrefs,
                    calendarReminders: e.target.checked,
                  })
                }
              />
              <div className="preference-item__content">
                <div className="preference-item__title">Calendar Reminders</div>
                <div className="preference-item__description">
                  Get notified before upcoming events
                </div>
              </div>
            </label>

            <label className="preference-item">
              <input
                type="checkbox"
                checked={notificationPrefs.taskReminders}
                onChange={(e) =>
                  setNotificationPrefs({
                    ...notificationPrefs,
                    taskReminders: e.target.checked,
                  })
                }
              />
              <div className="preference-item__content">
                <div className="preference-item__title">Task Reminders</div>
                <div className="preference-item__description">
                  Get notified about overdue tasks
                </div>
              </div>
            </label>
          </div>

          <button
            className="button button--primary"
            onClick={handleSaveNotificationPrefs}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </section>

        {/* Voice Settings Section */}
        <section className="settings-section">
          <h2 className="settings-section__title">Voice Settings</h2>
          <p className="settings-section__description">
            Configure speech-to-text and text-to-speech preferences.
          </p>

          <div className="settings-section__preferences">
            <div className="preference-item">
              <div className="preference-item__content">
                <div className="preference-item__title">Speech-to-Text Provider</div>
                <select
                  className="preference-select"
                  value={voiceSettings.sttProvider}
                  onChange={(e) =>
                    setVoiceSettings({
                      ...voiceSettings,
                      sttProvider: e.target.value as 'openai' | 'google',
                    })
                  }
                >
                  <option value="openai">OpenAI Whisper</option>
                  <option value="google">Google Speech-to-Text</option>
                </select>
              </div>
            </div>

            <div className="preference-item">
              <div className="preference-item__content">
                <div className="preference-item__title">Text-to-Speech Provider</div>
                <select
                  className="preference-select"
                  value={voiceSettings.ttsProvider}
                  onChange={(e) =>
                    setVoiceSettings({
                      ...voiceSettings,
                      ttsProvider: e.target.value as 'openai' | 'google',
                    })
                  }
                >
                  <option value="openai">OpenAI TTS</option>
                  <option value="google">Google Text-to-Speech</option>
                </select>
              </div>
            </div>

            <div className="preference-item">
              <div className="preference-item__content">
                <div className="preference-item__title">Voice</div>
                <select
                  className="preference-select"
                  value={voiceSettings.ttsVoice}
                  onChange={(e) =>
                    setVoiceSettings({
                      ...voiceSettings,
                      ttsVoice: e.target.value,
                    })
                  }
                >
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="fable">Fable</option>
                  <option value="onyx">Onyx</option>
                  <option value="nova">Nova</option>
                  <option value="shimmer">Shimmer</option>
                </select>
              </div>
            </div>

            <label className="preference-item">
              <input
                type="checkbox"
                checked={voiceSettings.autoPlayResponses}
                onChange={(e) =>
                  setVoiceSettings({
                    ...voiceSettings,
                    autoPlayResponses: e.target.checked,
                  })
                }
              />
              <div className="preference-item__content">
                <div className="preference-item__title">Auto-Play Responses</div>
                <div className="preference-item__description">
                  Automatically read Ask Zena responses aloud
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Export & Sync Section */}
        <section className="settings-section">
          <h2 className="settings-section__title">Export & Sync</h2>
          <p className="settings-section__description">
            Export your data or connect to external CRM systems.
          </p>

          <div className="settings-section__actions">
            <button 
              className="button button--secondary"
              onClick={() => handleOpenExportDialog('contacts')}
            >
              Export Contacts
            </button>
            <button 
              className="button button--secondary"
              onClick={() => handleOpenExportDialog('properties')}
            >
              Export Properties
            </button>
            <button 
              className="button button--secondary"
              onClick={() => handleOpenExportDialog('deals')}
            >
              Export Deals
            </button>
          </div>

          <div className="settings-section__crm">
            <h3 className="settings-section__subtitle">CRM Integrations</h3>
            <p className="settings-section__description">
              Connect to your existing CRM to sync data automatically.
            </p>

            {crmIntegrations.length > 0 && (
              <div className="settings-section__accounts">
                {crmIntegrations.map((integration) => (
                  <div key={integration.id} className="account-card">
                    <div className="account-card__info">
                      <div className="account-card__provider">
                        {getProviderName(integration.provider)}
                      </div>
                      <div className="account-card__status">
                        {integration.lastSyncAt ? (
                          <>Last synced: {new Date(integration.lastSyncAt).toLocaleString()}</>
                        ) : (
                          <>Never synced</>
                        )}
                      </div>
                      <div className="account-card__config">
                        Syncing: {[
                          integration.syncConfig.syncContacts && 'Contacts',
                          integration.syncConfig.syncProperties && 'Properties',
                          integration.syncConfig.syncDeals && 'Deals',
                        ].filter(Boolean).join(', ')}
                      </div>
                    </div>
                    <div className="account-card__actions">
                      <button
                        className="button button--secondary button--small"
                        onClick={() => handleSyncCRM(integration.provider)}
                        disabled={syncingCRM === integration.provider}
                      >
                        {syncingCRM === integration.provider ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        className="button button--danger button--small"
                        onClick={() => handleDisconnectCRM(integration.provider)}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              className="button button--primary"
              onClick={() => setCrmDialogOpen(true)}
            >
              {crmIntegrations.length > 0 ? 'Connect Another CRM' : 'Connect CRM'}
            </button>
          </div>
        </section>
      </div>

      {/* Export Dialog */}
      {exportDialogOpen && !exportInProgress && !exportDownloadUrl && (
        <ExportDialog
          isOpen={exportDialogOpen}
          exportType={exportType}
          onClose={() => setExportDialogOpen(false)}
          onExport={handleExport}
        />
      )}

      {/* Export Progress Dialog */}
      {exportInProgress && currentExportId && (
        <div className="export-dialog-overlay">
          <div className="export-dialog">
            <div className="export-dialog__header">
              <h2 className="export-dialog__title">Exporting...</h2>
            </div>
            <ExportProgress
              exportId={currentExportId}
              onComplete={handleExportComplete}
              onError={handleExportError}
            />
          </div>
        </div>
      )}

      {/* Export Complete Dialog */}
      {exportDownloadUrl && (
        <div className="export-dialog-overlay" onClick={() => setExportDialogOpen(false)}>
          <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="export-dialog__header">
              <h2 className="export-dialog__title">Export Complete</h2>
              <button 
                className="export-dialog__close" 
                onClick={() => setExportDialogOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="export-dialog__content">
              <p>Your export is ready for download.</p>
            </div>
            <div className="export-dialog__footer">
              <button
                className="button button--secondary"
                onClick={() => setExportDialogOpen(false)}
              >
                Close
              </button>
              <button
                className="button button--primary"
                onClick={handleDownload}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRM Connection Dialog */}
      <CRMDialog
        isOpen={crmDialogOpen}
        onClose={() => setCrmDialogOpen(false)}
        onSuccess={handleCRMSuccess}
      />
    </div>
  );
};
