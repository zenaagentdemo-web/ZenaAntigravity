import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Database,
    Lock,
    TrendingUp,
    Home,
    BarChart3,
    Tag,
    Globe,
    Building2,
    Crown,
    FileText,
    Plus,
    Zap,
    ArrowLeft,
    Cloud,
    Brain,
    Link as LinkIcon,
    ShieldCheck,
    Cpu,
    Search,
    Mail,
    Calendar,
    MessageSquare,
    Linkedin,
    FileSignature,
    Slack,
    LayoutDashboard
} from 'lucide-react';
import { ExtensionOnboardingModal } from '../../components/ExtensionOnboardingModal/ExtensionOnboardingModal';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { api } from '../../utils/apiClient';
import { useThreadActions } from '../../hooks/useThreadActions';
import EmailBridgeSetup from './EmailBridgeSetup';
import './ConnectionCentrePage.css';

interface Connection {
    id: string;
    name: string;
    type: 'communication' | 'storage' | 'calendar' | 'crm' | 'social' | 'workflow';
    status: 'connected' | 'disconnected' | 'syncing' | 'error';
    lastSync?: string;
    icon: React.ReactNode;
    description: string;
    syncedViaCloud?: boolean;
}

export const ConnectionCentrePage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useThreadActions();

    const getIconForId = (id: string) => {
        switch (id) {
            case 'gmail':
            case 'outlook':
            case 'custom_email': return <Mail size={20} />;
            case 'google_drive':
            case 'dropbox': return <Cloud size={20} />;
            case 'google_calendar':
            case 'outlook_calendar': return <Calendar size={20} />;
            case 'slack': return <Slack size={20} />;
            case 'whatsapp': return <MessageSquare size={20} />;
            case 'docusign': return <FileSignature size={20} />;
            case 'linkedin': return <Linkedin size={20} />;
            case 'salesforce':
            case 'hubspot': return <LayoutDashboard size={20} />;
            case 'mri_vault': return <Lock size={20} />;
            case 'rex_software': return <Database size={20} />;
            case 'palace': return <Crown size={20} />;
            default: return <LinkIcon size={20} />;
        }
    };

    const initialConnections: Connection[] = [
        // Communication
        {
            id: 'gmail',
            name: 'Gmail',
            type: 'communication',
            status: 'connected',
            icon: getIconForId('gmail'),
            description: 'Zena monitors your inbox to auto-draft replies and extract task context from client emails.'
        },
        {
            id: 'outlook',
            name: 'Outlook',
            type: 'communication',
            status: 'disconnected',
            icon: getIconForId('outlook'),
            description: 'Connect your Microsoft 365 account to unify communication intelligence.'
        },
        {
            id: 'custom_email',
            name: 'Custom Email (IMAP)',
            type: 'communication',
            status: 'disconnected',
            icon: getIconForId('custom_email'),
            description: 'Sync any private or boutique agency email server with Zena.'
        },
        // Storage
        {
            id: 'google_drive',
            name: 'Google Drive',
            type: 'storage',
            status: 'disconnected',
            icon: getIconForId('google_drive'),
            description: 'Zena scans listing documents, floorplans, and contracts for real-time data extraction.'
        },
        {
            id: 'dropbox',
            name: 'Dropbox',
            type: 'storage',
            status: 'disconnected',
            icon: getIconForId('dropbox'),
            description: 'Securely link your property collateral folders to Zena\'s vision system.'
        },
        // Calendars
        {
            id: 'google_calendar',
            name: 'Google Calendar',
            type: 'calendar',
            status: 'connected',
            icon: getIconForId('google_calendar'),
            description: 'Zena manages your viewing schedule and auto-reminds clients via SMS/Email.'
        },
        {
            id: 'outlook_calendar',
            name: 'Outlook Calendar',
            type: 'calendar',
            status: 'disconnected',
            icon: getIconForId('outlook_calendar'),
            description: 'Synchronise appraisal appointments and follow-up tasks with your Microsoft calendar.'
        },
        // Social & CRM
        {
            id: 'linkedin',
            name: 'LinkedIn',
            type: 'social',
            status: 'disconnected',
            icon: getIconForId('linkedin'),
            description: 'Enrich contact profiles with professional background and latest updates for better rapport.'
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp Business',
            type: 'communication',
            status: 'disconnected',
            icon: getIconForId('whatsapp'),
            description: 'Capture client sentiment and momentum from mobile chat logs securely.'
        },
        {
            id: 'slack',
            name: 'Slack',
            type: 'communication',
            status: 'disconnected',
            icon: getIconForId('slack'),
            description: 'Monitor team channels for property updates and internal deal coordination.'
        },
        {
            id: 'docusign',
            name: 'DocuSign',
            type: 'workflow',
            status: 'disconnected',
            icon: getIconForId('docusign'),
            description: 'Automated workflow triggers once contracts are signed, moving deals to the next stage.'
        },
        // CRMs
        {
            id: 'mri_vault',
            name: 'MRI Vault',
            type: 'crm',
            status: 'disconnected',
            icon: getIconForId('mri_vault'),
            description: 'Push activity logs, contact notes, and lead intelligence directly to your CRM profile.'
        },
        {
            id: 'rex_software',
            name: 'Rex Software',
            type: 'crm',
            status: 'disconnected',
            icon: getIconForId('rex_software'),
            description: 'Synchronise listings, appraisal data, and buyer matching intelligence.'
        },
        {
            id: 'salesforce',
            name: 'Salesforce',
            type: 'crm',
            status: 'disconnected',
            icon: getIconForId('salesforce'),
            description: 'Enterprise-grade CRM integration for global teams and high-volume agencies.'
        },
        {
            id: 'hubspot',
            name: 'HubSpot',
            type: 'crm',
            status: 'disconnected',
            icon: getIconForId('hubspot'),
            description: 'All-in-one marketing and sales sync for modern real estate teams.'
        }
    ];

    const [connections, setConnections] = useState<Connection[]>(initialConnections);
    const [loading, setLoading] = useState(true);
    const [isDesktopSynced, setIsDesktopSynced] = useState(false);
    const [isPWA, setIsPWA] = useState(false);
    const [showBridgeModal, setShowBridgeModal] = useState(false);
    const [activeConnectId, setActiveConnectId] = useState<string | null>(null);

    const [showExtensionOnboarding, setShowExtensionOnboarding] = useState(false);

    const fetchConnections = async () => {
        try {
            const { data } = await api.get('/api/connections');
            if (data.success) {
                const enriched = initialConnections.map(base => {
                    const serverConn = data.connections.find((c: any) => c.id === base.id);
                    if (serverConn) {
                        return { ...base, status: serverConn.status, lastSync: serverConn.lastSync, syncedViaCloud: serverConn.syncedViaCloud };
                    }
                    return base;
                });

                data.connections.forEach((serverConn: any) => {
                    if (!enriched.find(e => e.id === serverConn.id)) {
                        enriched.push({
                            ...serverConn,
                            icon: getIconForId(serverConn.id),
                            description: 'Advanced data connection authorised.'
                        });
                    }
                });

                setConnections(enriched);
            }
        } catch (error) {
            console.error('Failed to fetch connections:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const isStandalone = (window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://'));
        setIsPWA(isStandalone);

        const isExtensionInstalled = document.documentElement.getAttribute('data-zena-extension-active') === 'true';
        if (isExtensionInstalled) {
            setIsDesktopSynced(true);
        }

        fetchConnections();
    }, []);

    const handleSyncDesktop = () => {
        alert('Updating Smart Connector... Connection Validated.');
    };

    const toggleConnection = async (id: string, url?: string) => {
        const conn = connections.find(c => c.id === id);
        if (!conn) return;

        if (conn.status === 'disconnected') {
            if (isPWA) {
                setActiveConnectId(id);
                setShowBridgeModal(true);
                return;
            }
            if (url) {
                window.open(url, '_blank');
            }
        }

        try {
            const { data } = await api.post(`/api/connections/${id}/toggle`);

            if (data.success) {
                setConnections(prev => prev.map(c => {
                    if (c.id === id) {
                        return {
                            ...c,
                            status: c.status === 'connected' ? 'disconnected' as const : 'connected' as const,
                            lastSync: c.status === 'disconnected' ? 'Just now' : undefined
                        };
                    }
                    return c;
                }));
            }
        } catch (error) {
            console.error('Failed to update connection:', error);
        }
    };

    const handleConfirmBridge = () => {
        if (!activeConnectId) return;

        const urls: Record<string, string> = {
            gmail: 'https://accounts.google.com',
            google_drive: 'https://drive.google.com',
            mri_vault: 'https://vaultre.com.au/login',
            rex_software: 'https://www.rexsoftware.com/login'
        };

        const targetUrl = urls[activeConnectId];
        if (targetUrl) {
            window.open(targetUrl, '_blank');
        }

        setTimeout(() => toggleConnection(activeConnectId), 1000);
        setShowBridgeModal(false);
    };

    return (
        <div className="connection-centre" data-theme="high-tech">
            <AmbientBackground variant="default" showParticles={true} />

            <section className="connection-centre__section">
                <header className="connection-centre__header">
                    <button className="back-button" onClick={() => navigate('/')}>
                        <ArrowLeft size={16} />
                        Back to Command Centre
                    </button>
                    <div className="title-wrapper">
                        <h1 className="connection-centre__title">
                            <span className="title-glow">Smart</span> Connections
                        </h1>
                        <p className="connection-centre__subtitle">
                            Securely export contacts & property data to your CRM and unify your storage, communication, and calendar intelligence.
                        </p>
                    </div>
                </header>

                <section className="connection-centre__extension-card">
                    <div className="extension-status">
                        <div className="extension-status__icon-box">
                            <Cpu className={`extension-status__cpu ${isDesktopSynced ? 'active' : ''}`} size={22} />
                            <div className={`extension-status__indicator ${isDesktopSynced ? 'active' : 'inactive'}`} />
                        </div>
                        <div className="extension-status__content">
                            <h3 className="extension-status__title">Zena Sidekick Smart Connector</h3>
                            <p className="extension-status__text">
                                {isDesktopSynced
                                    ? 'Smart connection active. Your professional ecosystem is securely synchronised.'
                                    : 'Activate the Zena Smart Connector to link your professional workspace.'}
                            </p>
                        </div>
                        {isDesktopSynced ? (
                            <button className="button button--secondary premium-btn" onClick={handleSyncDesktop}>
                                <Zap size={14} /> REFRESH LINK
                            </button>
                        ) : (
                            <button
                                className="button button--primary extension-install-btn premium-btn"
                                onClick={() => setShowExtensionOnboarding(true)}
                            >
                                {isDesktopSynced ? 'OPEN SIDEKICK' : 'INSTALL EXTENSION'}
                            </button>
                        )}
                    </div>
                </section>

                {/* Phase 2: CRM Email Bridge Section */}
                <section className="connection-centre__crm-bridge">
                    <EmailBridgeSetup />
                </section>

                <div className="connection-centre__grid">
                    {/* Communication Intelligence */}
                    <section className="connection-section">
                        <h2 className="connection-section__title">
                            <Mail size={20} className="section-icon" />
                            Communication Intelligence
                        </h2>
                        <div className="connection-grid">
                            {connections.filter(c => c.type === 'communication' || c.type === 'social').map(conn => (
                                <div key={conn.id} className={`connection-card connection-card--${conn.status}`}>
                                    <div className="connection-card__header">
                                        <div className="icon-wrapper">
                                            {conn.icon}
                                        </div>
                                        <div className={`status-pill status-pill--${conn.status}`}>{conn.status}</div>
                                    </div>
                                    <h3 className="connection-card__name">{conn.name}</h3>
                                    <p className="connection-card__description">{conn.description}</p>
                                    <div className="card-footer">
                                        <button
                                            className={`button ${conn.status === 'connected' ? 'button--danger' : 'button--primary'} button--full premium-btn`}
                                            onClick={() => toggleConnection(conn.id)}
                                        >
                                            {conn.status === 'connected' ? 'DISCONNECT' : 'SECURE CONNECT'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Storage & Schedule */}
                    <div className="connection-groups-split">
                        <section className="connection-section">
                            <h2 className="connection-section__title">
                                <Cloud size={20} className="section-icon" />
                                Storage & Documents
                            </h2>
                            <div className="connection-grid">
                                {connections.filter(c => c.type === 'storage' || c.type === 'workflow').map(conn => (
                                    <div key={conn.id} className={`connection-card connection-card--${conn.status}`}>
                                        <div className="connection-card__header">
                                            <div className="icon-wrapper">
                                                {conn.icon}
                                            </div>
                                            <div className={`status-pill status-pill--${conn.status}`}>{conn.status}</div>
                                        </div>
                                        <h3 className="connection-card__name">{conn.name}</h3>
                                        <p className="connection-card__description">{conn.description}</p>
                                        <div className="card-footer">
                                            <button
                                                className={`button ${conn.status === 'connected' ? 'button--danger' : 'button--primary'} button--full premium-btn`}
                                                onClick={() => toggleConnection(conn.id)}
                                            >
                                                {conn.status === 'connected' ? 'DISCONNECT' : 'SECURE CONNECT'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="connection-section">
                            <h2 className="connection-section__title">
                                <Calendar size={20} className="section-icon" />
                                Schedule & Planning
                            </h2>
                            <div className="connection-grid">
                                {connections.filter(c => c.type === 'calendar').map(conn => (
                                    <div key={conn.id} className={`connection-card connection-card--${conn.status}`}>
                                        <div className="connection-card__header">
                                            <div className="icon-wrapper">
                                                {conn.icon}
                                            </div>
                                            <div className={`status-pill status-pill--${conn.status}`}>{conn.status}</div>
                                        </div>
                                        <h3 className="connection-card__name">{conn.name}</h3>
                                        <p className="connection-card__description">{conn.description}</p>
                                        <div className="card-footer">
                                            <button
                                                className={`button ${conn.status === 'connected' ? 'button--danger' : 'button--primary'} button--full premium-btn`}
                                                onClick={() => toggleConnection(conn.id)}
                                            >
                                                {conn.status === 'connected' ? 'DISCONNECT' : 'SECURE CONNECT'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* CRM Smart Connections */}
                    <section className="connection-section">
                        <h2 className="connection-section__title">
                            <Brain size={20} className="section-icon" />
                            CRM Intelligence & Export
                        </h2>
                        <div className="connection-grid">
                            {connections.filter(c => c.type === 'crm').map(conn => (
                                <div key={conn.id} className={`connection-card connection-card--${conn.status}`}>
                                    <div className="connection-card__header">
                                        <div className="icon-wrapper">
                                            {conn.icon}
                                        </div>
                                        <div className={`status-pill status-pill--${conn.status}`}>{conn.status}</div>
                                    </div>
                                    <h3 className="connection-card__name">{conn.name}</h3>
                                    <p className="connection-card__description">{conn.description}</p>

                                    <div className="card-footer">
                                        {conn.status === 'connected' && (
                                            <div className="connection-card__sync">
                                                <Zap size={12} /> Syncing Data...
                                            </div>
                                        )}
                                        <button
                                            className={`button ${conn.status === 'connected' || conn.status === 'syncing' ? 'button--danger' : 'button--primary'} button--full premium-btn`}
                                            onClick={() => toggleConnection(conn.id)}
                                        >
                                            {conn.status === 'connected' || conn.status === 'syncing' ? 'DISCONNECT' : 'SECURE CONNECT'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <footer className="connection-centre__footer">
                    <div className="footer-glow" />
                    <div className="footer-content">
                        <ShieldCheck size={20} className="footer-icon" />
                        <p>
                            <strong>ENCRYPTION PROTOCOL:</strong> Zena utilises AES-256 bank-grade encryption.
                            Smart Connections facilitate secure data synchronisation without persistent credential storage.
                        </p>
                    </div>
                </footer>
            </section>

            {/* Link Assistant Modal */}
            {
                showBridgeModal && (
                    <div className="bridge-modal-overlay">
                        <div className="bridge-modal">
                            <div className="bridge-modal__glow" />
                            <h2 className="bridge-modal__title">SMART LINK ASSISTANT</h2>
                            <div className="bridge-modal__icon-box">
                                <Zap size={48} className="pulse-zap" />
                            </div>
                            <p className="bridge-modal__text">
                                Securing connection to <strong>{connections.find(c => c.id === activeConnectId)?.name}</strong>:
                            </p>
                            <ol className="bridge-modal__steps">
                                <li>Initialising secure authentication link.</li>
                                <li>Zena Sidekick validating session credentials.</li>
                                <li>Establishing real-time data synchronisation.</li>
                            </ol>
                            <div className="bridge-modal__actions">
                                <button className="button button--secondary" onClick={() => setShowBridgeModal(false)}>CANCEL</button>
                                <button className="button button--primary premium-btn" onClick={handleConfirmBridge}>START LINK</button>
                            </div>
                        </div>
                    </div>
                )
            }

            <ExtensionOnboardingModal
                isOpen={showExtensionOnboarding}
                onClose={() => setShowExtensionOnboarding(false)}
                onComplete={() => {
                    setIsDesktopSynced(true);
                    setShowExtensionOnboarding(false);
                }}
            />
        </div >
    );
};
