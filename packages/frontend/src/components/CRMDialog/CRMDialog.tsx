import React, { useState, useEffect } from 'react';
import { api } from '../../utils/apiClient';
import './CRMDialog.css';

export interface CRMProvider {
  provider: string;
  name: string;
  description: string;
  supported: boolean;
}

export interface CRMIntegration {
  id: string;
  provider: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  syncConfig: {
    syncContacts: boolean;
    syncProperties: boolean;
    syncDeals: boolean;
    syncDirection: 'push' | 'pull' | 'bidirectional';
  };
  createdAt: string;
}

interface CRMDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CRMDialog: React.FC<CRMDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'list' | 'configure' | 'syncing'>('list');
  const [providers, setProviders] = useState<CRMProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<CRMProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for MRI Vault
  const [apiKey, setApiKey] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');
  
  // Sync configuration
  const [syncContacts, setSyncContacts] = useState(true);
  const [syncProperties, setSyncProperties] = useState(true);
  const [syncDeals, setSyncDeals] = useState(true);
  const [syncDirection, setSyncDirection] = useState<'push' | 'pull' | 'bidirectional'>('push');

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/integrations/crm');
      setProviders(response.data.providers);
    } catch (err) {
      console.error('Failed to load CRM providers:', err);
      setError('Failed to load CRM providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = (provider: CRMProvider) => {
    if (!provider.supported) {
      alert(`${provider.name} integration is coming soon!`);
      return;
    }
    setSelectedProvider(provider);
    setStep('configure');
    setError(null);
  };

  const handleConnect = async () => {
    if (!selectedProvider) return;

    // Validate inputs
    if (selectedProvider.provider === 'mri_vault') {
      if (!apiKey.trim()) {
        setError('API Key is required');
        return;
      }
      if (!instanceUrl.trim()) {
        setError('Instance URL is required');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const credentials: any = {};
      if (selectedProvider.provider === 'mri_vault') {
        credentials.apiKey = apiKey;
        credentials.instanceUrl = instanceUrl;
      }

      const syncConfig = {
        syncContacts,
        syncProperties,
        syncDeals,
        syncDirection,
      };

      await api.post(`/api/integrations/crm/${selectedProvider.provider}/connect`, {
        credentials,
        syncConfig,
      });

      setStep('syncing');
      
      // Trigger initial sync
      await api.post(`/api/integrations/crm/${selectedProvider.provider}/sync`);
      
      // Success
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Failed to connect CRM:', err);
      setError(err.response?.data?.error?.message || 'Failed to connect to CRM');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('list');
    setSelectedProvider(null);
    setApiKey('');
    setInstanceUrl('');
    setSyncContacts(true);
    setSyncProperties(true);
    setSyncDeals(true);
    setSyncDirection('push');
    setError(null);
    onClose();
  };

  const handleBack = () => {
    setStep('list');
    setSelectedProvider(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="crm-dialog-overlay" onClick={handleClose}>
      <div className="crm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="crm-dialog__header">
          <h2 className="crm-dialog__title">
            {step === 'list' && 'Connect CRM'}
            {step === 'configure' && `Configure ${selectedProvider?.name}`}
            {step === 'syncing' && 'Syncing...'}
          </h2>
          <button 
            className="crm-dialog__close" 
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="crm-dialog__content">
          {error && (
            <div className="crm-dialog__error">
              {error}
            </div>
          )}

          {step === 'list' && (
            <div className="crm-dialog__providers">
              <p className="crm-dialog__description">
                Choose a CRM provider to connect and sync your data.
              </p>
              
              {loading ? (
                <div className="crm-dialog__loading">Loading providers...</div>
              ) : (
                <div className="crm-providers-list">
                  {providers.map((provider) => (
                    <button
                      key={provider.provider}
                      className={`crm-provider-card ${!provider.supported ? 'crm-provider-card--disabled' : ''}`}
                      onClick={() => handleSelectProvider(provider)}
                      disabled={!provider.supported}
                    >
                      <div className="crm-provider-card__icon">
                        {provider.provider === 'mri_vault' && '🏢'}
                        {provider.provider === 'salesforce' && '☁️'}
                        {provider.provider === 'top_producer' && '📊'}
                        {provider.provider === 'kvcore' && '🔑'}
                        {provider.provider === 'follow_up_boss' && '👔'}
                      </div>
                      <div className="crm-provider-card__content">
                        <div className="crm-provider-card__name">{provider.name}</div>
                        <div className="crm-provider-card__description">{provider.description}</div>
                        {!provider.supported && (
                          <div className="crm-provider-card__badge">Coming Soon</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'configure' && selectedProvider && (
            <div className="crm-dialog__configure">
              <p className="crm-dialog__description">
                Enter your {selectedProvider.name} credentials to connect.
              </p>

              {selectedProvider.provider === 'mri_vault' && (
                <div className="crm-form">
                  <div className="crm-form__field">
                    <label className="crm-form__label" htmlFor="apiKey">
                      API Key *
                    </label>
                    <input
                      id="apiKey"
                      type="text"
                      className="crm-form__input"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your MRI Vault API key"
                    />
                  </div>

                  <div className="crm-form__field">
                    <label className="crm-form__label" htmlFor="instanceUrl">
                      Instance URL *
                    </label>
                    <input
                      id="instanceUrl"
                      type="url"
                      className="crm-form__input"
                      value={instanceUrl}
                      onChange={(e) => setInstanceUrl(e.target.value)}
                      placeholder="https://your-instance.mrivault.com"
                    />
                  </div>
                </div>
              )}

              <div className="crm-sync-config">
                <h3 className="crm-sync-config__title">Sync Configuration</h3>
                
                <div className="crm-sync-config__options">
                  <label className="crm-sync-option">
                    <input
                      type="checkbox"
                      checked={syncContacts}
                      onChange={(e) => setSyncContacts(e.target.checked)}
                    />
                    <span>Sync Contacts</span>
                  </label>

                  <label className="crm-sync-option">
                    <input
                      type="checkbox"
                      checked={syncProperties}
                      onChange={(e) => setSyncProperties(e.target.checked)}
                    />
                    <span>Sync Properties</span>
                  </label>

                  <label className="crm-sync-option">
                    <input
                      type="checkbox"
                      checked={syncDeals}
                      onChange={(e) => setSyncDeals(e.target.checked)}
                    />
                    <span>Sync Deals</span>
                  </label>
                </div>

                <div className="crm-form__field">
                  <label className="crm-form__label" htmlFor="syncDirection">
                    Sync Direction
                  </label>
                  <select
                    id="syncDirection"
                    className="crm-form__select"
                    value={syncDirection}
                    onChange={(e) => setSyncDirection(e.target.value as any)}
                  >
                    <option value="push">Push to CRM (Zena → CRM)</option>
                    <option value="pull">Pull from CRM (CRM → Zena)</option>
                    <option value="bidirectional">Bidirectional Sync</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 'syncing' && (
            <div className="crm-dialog__syncing">
              <div className="crm-dialog__spinner"></div>
              <p>Connecting and syncing your data...</p>
            </div>
          )}
        </div>

        <div className="crm-dialog__footer">
          {step === 'list' && (
            <button
              className="button button--secondary"
              onClick={handleClose}
            >
              Cancel
            </button>
          )}

          {step === 'configure' && (
            <>
              <button
                className="button button--secondary"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </button>
              <button
                className="button button--primary"
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Connect & Sync'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
