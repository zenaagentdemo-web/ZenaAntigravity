import { Request, Response } from 'express';
import { pageAnalysisService } from '../services/page-analysis.service.js';
import { cloudRobotService } from '../services/cloud-robot.service.js';
import { siteNavigationMapService } from '../services/site-navigation-maps.js';
import { siteDiscoveryService } from '../services/site-discovery.service.js';
import { intelligentNavigatorService } from '../services/intelligent-navigator.service.js';
import * as fs from 'fs';
import * as path from 'path';

interface ConnectionStatus {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'syncing' | 'error';
    lastSyncAt?: string;
    type: 'portal' | 'crm';
}

interface CapturedSession {
    domain: string;
    pageUrl: string;
    pageTitle: string;
    cookies: Array<{
        name: string;
        value: string;
        domain: string;
        path: string;
        secure: boolean;
        httpOnly: boolean;
        expirationDate?: number;
    }>;
    capturedAt: string;
    pageDOM?: string;
}

const SESSION_FILE = path.join(process.cwd(), 'sessions.json');

// In-memory session vault (backed by file)
const sessionVault: Map<string, CapturedSession> = new Map();

function saveSessions() {
    try {
        const data = JSON.stringify(Array.from(sessionVault.entries()));
        fs.writeFileSync(SESSION_FILE, data);
        console.log(`[SessionPersistence] Saved ${sessionVault.size} sessions to disk`);
    } catch (e) {
        console.error('[SessionPersistence] Failed to save sessions:', e);
    }
}

export function restoreSessions() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const data = fs.readFileSync(SESSION_FILE, 'utf8');
            const entries = JSON.parse(data);
            console.log(`[SessionPersistence] 📂 Loading sessions from ${SESSION_FILE}...`);
            for (const [key, value] of entries) {
                sessionVault.set(key, value);
                // Restore to services
                if (cloudRobotService) cloudRobotService.storeSession(key, value);
                if (intelligentNavigatorService) intelligentNavigatorService.storeSession(key, value);
            }
            console.log(`[SessionPersistence] ✅ Restored ${sessionVault.size} sessions from disk`);
        }
    } catch (e) {
        console.error('[SessionPersistence] Failed to restore sessions:', e);
    }
}

// Restore immediately on module load - REMOVED to prevent initialization hangs
// restoreSessions();

/**
 * ConnectionsController
 * 
 * Manages the "Universal Bridge" connections (Cookie Bridge)
 * for Zena. This handles metadata about active sessions captured
 * by the Zena Sidekick extension.
 */
export class ConnectionsController {
    /**
     * GET /api/connections
     * Returns the list of available and active connections for the user.
     */
    public async getConnections(req: Request, res: Response): Promise<void> {
        try {
            // Mock data representing active bridges
            const connections: ConnectionStatus[] = [
                {
                    id: 'oneroof',
                    name: 'OneRoof',
                    status: 'connected',
                    lastSyncAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
                    type: 'portal'
                },
                {
                    id: 'corelogic',
                    name: 'CoreLogic / RP Data',
                    status: 'disconnected',
                    type: 'portal'
                },
                {
                    id: 'mri_vault',
                    name: 'MRI Vault',
                    status: 'syncing',
                    lastSyncAt: new Date().toISOString(),
                    type: 'crm'
                },
                {
                    id: 'valocity',
                    name: 'Valocity',
                    status: 'disconnected',
                    type: 'portal'
                },
                {
                    id: 'rex_software',
                    name: 'Rex Software',
                    status: 'disconnected',
                    type: 'crm'
                },
                {
                    id: 'trademe_property',
                    name: 'Trade Me Property',
                    status: 'disconnected',
                    type: 'portal'
                },
                {
                    id: 'realestate_co_nz',
                    name: 'realestate.co.nz',
                    status: 'disconnected',
                    type: 'portal'
                },
                {
                    id: 'homes_co_nz',
                    name: 'Homes.co.nz',
                    status: 'disconnected',
                    type: 'portal'
                },
                {
                    id: 'palace',
                    name: 'Palace (Property Management)',
                    status: 'disconnected',
                    type: 'crm'
                },
                {
                    id: 'reinz',
                    name: 'REINZ (Forms & Data)',
                    status: 'disconnected',
                    type: 'portal'
                }
            ];

            // Add custom connections from vault
            sessionVault.forEach((session, domain) => {
                connections.push({
                    id: `custom_${domain}`,
                    name: domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0],
                    status: 'connected',
                    lastSyncAt: session.capturedAt,
                    type: 'portal'
                });
            });

            res.status(200).json({
                success: true,
                connections,
                desktopSync: {
                    active: true,
                    lastHeartbeat: new Date().toISOString(),
                    extensionVersion: '1.0.4'
                }
            });
        } catch (error) {
            console.error('Error fetching connections:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * POST /api/connections/:id/sync
     * Triggers a manual sync or updates session metadata.
     */
    public async syncConnection(req: Request, res: Response): Promise<void> {
        const { id } = req.params;

        try {
            // Logic would involve notifying the cloud robot or checking extension status
            res.status(200).json({
                success: true,
                message: `Sync initiated for ${id}`,
                status: 'syncing'
            });
        } catch (error) {
            console.error(`Error syncing connection ${id}:`, error);
            res.status(500).json({ success: false, message: 'Sync failed' });
        }
    }

    /**
     * POST /api/connections/:id/toggle
     * Toggles connection status (mock implementation).
     */
    public async toggleConnection(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        // In a real app, this would persist to DB. For now, we mock the toggle.
        // Since we don't have a persistent store for the hardcoded list other than the code itself,
        // we'll just return success and the *new proposed status*.
        // The frontend will optimistically update.

        // For the sessionVault items, we can actually toggle them if we wanted.

        try {
            res.status(200).json({
                success: true,
                id,
                message: `Connection ${id} toggled`
            });
        } catch (error) {
            console.error(`Error toggling connection ${id}:`, error);
            res.status(500).json({ success: false, message: 'Toggle failed' });
        }
    }

    /**
     * POST /api/connections/capture-session
     * Receives captured session data from the Zena Sidekick extension.
     */
    public async captureSession(req: Request, res: Response): Promise<void> {
        try {
            const sessionData: CapturedSession = req.body;

            if (!sessionData.domain || !sessionData.cookies) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: domain and cookies'
                });
                return;
            }

            console.log(`[SessionVault] Capturing session for: ${sessionData.domain}`);
            console.log(`[SessionVault] Cookies count: ${sessionData.cookies.length}`);
            console.log(`[SessionVault] Page: ${sessionData.pageTitle}`);

            // Store in vault (in production, this would be encrypted)
            sessionVault.set(sessionData.domain, sessionData);

            // Store in CloudRobotService for legacy support
            cloudRobotService.storeSession(sessionData.domain, sessionData);

            // Store in IntelligentNavigator for new vision-based navigation
            intelligentNavigatorService.storeSession(sessionData.domain, sessionData);

            // Persist to disk
            saveSessions();

            // Check if we already have learned knowledge for this site
            const hasKnowledge = await siteDiscoveryService.hasKnowledge(sessionData.domain);

            // Trigger site discovery in background if this is a new site
            if (!hasKnowledge) {
                console.log(`[SessionVault] 🔍 New site detected! Triggering intelligent discovery for ${sessionData.domain}...`);

                // Run discovery in background (don't await - let it run async)
                siteDiscoveryService.discoverSite(sessionData.domain, sessionData.cookies)
                    .then(() => {
                        console.log(`[SessionVault] ✅ Discovery completed for ${sessionData.domain}`);
                    })
                    .catch((err) => {
                        console.error(`[SessionVault] ❌ Discovery failed for ${sessionData.domain}:`, err);
                    });
            } else {
                console.log(`[SessionVault] Site already learned: ${sessionData.domain}`);
            }

            // Trigger AI page analysis if DOM is present (legacy support)
            let siteProfile = null;
            if (sessionData.pageDOM) {
                console.log(`[SessionVault] DOM size: ${sessionData.pageDOM.length} chars`);
                console.log(`[SessionVault] Triggering AI page analysis...`);

                // Analyze page structure asynchronously
                siteProfile = await pageAnalysisService.analyzePageStructure(
                    sessionData.domain,
                    sessionData.pageDOM
                );

                // Phase 5: Create and register a navigation map for this custom site
                if (siteProfile) {
                    console.log(`[SessionVault] Registering custom navigation map for ${sessionData.domain}`);
                    siteNavigationMapService.createFromSiteProfile(sessionData.domain, siteProfile);
                }
            }

            res.status(200).json({
                success: true,
                message: `Session captured for ${sessionData.domain}`,
                domain: sessionData.domain,
                cookieCount: sessionData.cookies.length,
                capturedAt: sessionData.capturedAt,
                siteProfile: siteProfile ? {
                    pageType: siteProfile.pageType,
                    dataFieldsCount: siteProfile.dataFields.length,
                    confidence: siteProfile.confidence,
                    suggestedActions: siteProfile.suggestedActions
                } : null
            });

        } catch (error) {
            console.error('Error capturing session:', error);
            res.status(500).json({ success: false, message: 'Failed to capture session' });
        }
    }

    /**
     * GET /api/connections/sessions
     * Returns list of captured session domains (for extension sync).
     */
    public async getSessions(req: Request, res: Response): Promise<void> {
        try {
            const domains = Array.from(sessionVault.keys());

            res.status(200).json({
                success: true,
                sessions: domains.map(domain => ({
                    domain,
                    capturedAt: sessionVault.get(domain)?.capturedAt,
                    cookieCount: sessionVault.get(domain)?.cookies.length,
                    hasProfile: !!pageAnalysisService.getProfile(domain)
                }))
            });
        } catch (error) {
            console.error('Error fetching sessions:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
        }
    }

    /**
     * GET /api/connections/debug-sessions
     * PUBLIC debug endpoint to check session capture status.
     */
    public async getDebugSessions(req: Request, res: Response): Promise<void> {
        try {
            const domains = Array.from(sessionVault.keys());
            const cloudRobotHasSession = (domain: string) => cloudRobotService.hasSession(domain);

            res.status(200).json({
                success: true,
                timestamp: new Date().toISOString(),
                capturedSessions: domains.map(domain => ({
                    domain,
                    capturedAt: sessionVault.get(domain)?.capturedAt,
                    cookieCount: sessionVault.get(domain)?.cookies.length,
                    hasProfile: !!pageAnalysisService.getProfile(domain),
                    syncedToCloudRobot: cloudRobotHasSession(domain),
                    pageTitle: sessionVault.get(domain)?.pageTitle
                })),
                tradeMeStatus: {
                    hasCapturedSession: domains.some(d => d.includes('trademe')),
                    syncedToCloudRobot: cloudRobotHasSession('trademe.co.nz'),
                    details: sessionVault.get('trademe.co.nz') ? {
                        capturedAt: sessionVault.get('trademe.co.nz')?.capturedAt,
                        cookieCount: sessionVault.get('trademe.co.nz')?.cookies.length,
                        pageTitle: sessionVault.get('trademe.co.nz')?.pageTitle
                    } : null
                }
            });
        } catch (error) {
            console.error('Error fetching debug sessions:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch debug sessions' });
        }
    }

    /**
     * POST /api/connections/trigger-discovery/:domain
     * Manually trigger site discovery for a domain.
     * Useful for pre-training Zena on important sites.
     */
    public async triggerDiscovery(req: Request, res: Response): Promise<void> {
        try {
            const { domain } = req.params;

            // Get session for this domain
            const session = sessionVault.get(domain);

            if (!session) {
                res.status(404).json({
                    success: false,
                    message: `No captured session for ${domain}. Please connect to ${domain} first.`
                });
                return;
            }

            console.log(`[Discovery] Manual trigger for ${domain}`);

            // Check current status
            const currentStatus = await siteDiscoveryService.getDiscoveryStatus(domain);

            if (currentStatus?.status === 'discovering') {
                res.status(409).json({
                    success: false,
                    message: `Discovery already in progress for ${domain}`,
                    progress: currentStatus.progress
                });
                return;
            }

            // Trigger discovery (don't await, return immediately)
            siteDiscoveryService.discoverSite(domain, session.cookies)
                .then(() => console.log(`[Discovery] ✅ Completed for ${domain}`))
                .catch((err) => console.error(`[Discovery] ❌ Failed for ${domain}:`, err));

            res.status(202).json({
                success: true,
                message: `Discovery started for ${domain}`,
                checkStatusAt: `/api/connections/discovery-status/${domain}`
            });

        } catch (error: any) {
            console.error('Error triggering discovery:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/connections/discovery-status/:domain
     * Get the discovery status for a domain.
     */
    public async getDiscoveryStatus(req: Request, res: Response): Promise<void> {
        try {
            const { domain } = req.params;

            const status = await siteDiscoveryService.getDiscoveryStatus(domain);

            if (!status) {
                res.status(404).json({
                    success: false,
                    message: `No discovery record for ${domain}`
                });
                return;
            }

            res.status(200).json({
                success: true,
                domain,
                ...status
            });

        } catch (error: any) {
            console.error('Error fetching discovery status:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/connections/intelligent-query
     * Execute a query using the intelligent navigator (vision-based).
     */
    public async intelligentQuery(req: Request, res: Response): Promise<void> {
        try {
            const { query, domain } = req.body;

            if (!query) {
                res.status(400).json({
                    success: false,
                    message: 'Query is required'
                });
                return;
            }

            console.log(`[IntelligentQuery] Query: "${query}", Domain: ${domain || 'auto'}`);

            const result = await intelligentNavigatorService.executeQuery(query, domain);

            res.status(200).json({
                success: result.success,
                answer: result.answer,
                data: result.data,
                error: result.error,
                executionTimeMs: result.executionTimeMs,
                usedCache: result.usedCache
            });

        } catch (error: any) {
            console.error('Error executing intelligent query:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    /**
     * GET /api/connections/profiles
     * Returns all site profiles created by AI analysis.
     */
    public async getSiteProfiles(req: Request, res: Response): Promise<void> {
        try {
            const profiles = pageAnalysisService.getAllProfiles();

            res.status(200).json({
                success: true,
                profiles: profiles.map(p => ({
                    domain: p.domain,
                    pageType: p.pageType,
                    dataFields: p.dataFields,
                    navigationPatterns: p.navigationPatterns,
                    suggestedActions: p.suggestedActions,
                    confidence: p.confidence,
                    analyzedAt: p.analyzedAt
                }))
            });
        } catch (error) {
            console.error('Error fetching site profiles:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch profiles' });
        }
    }

    /**
     * GET /api/connections/profiles/:domain
     * Returns site profile for a specific domain.
     */
    public async getSiteProfile(req: Request, res: Response): Promise<void> {
        const { domain } = req.params;

        try {
            const profile = pageAnalysisService.getProfile(domain);

            if (!profile) {
                res.status(404).json({
                    success: false,
                    message: `No profile found for ${domain}`
                });
                return;
            }

            res.status(200).json({
                success: true,
                profile
            });
        } catch (error) {
            console.error(`Error fetching profile for ${domain}:`, error);
            res.status(500).json({ success: false, message: 'Failed to fetch profile' });
        }
    }

    /**
     * POST /api/connections/extract/:domain
     * Trigger data extraction for a connected domain.
     */
    public async triggerExtraction(req: Request, res: Response): Promise<void> {
        const { domain } = req.params;
        const { targetUrl } = req.body;

        try {
            console.log(`[ConnectionsController] Triggering extraction for: ${domain}`);

            // Get session from vault
            const session = sessionVault.get(domain);
            if (!session) {
                res.status(404).json({
                    success: false,
                    message: `No session found for ${domain}. Please bridge this site first.`
                });
                return;
            }

            // Store session in cloud robot
            cloudRobotService.storeSession(domain, session);

            // Trigger extraction
            const result = await cloudRobotService.extractData(domain, targetUrl);

            res.status(200).json({
                success: result.success,
                extraction: result
            });

        } catch (error: any) {
            console.error(`Error triggering extraction for ${domain}:`, error);
            res.status(500).json({
                success: false,
                message: error.message || 'Extraction failed'
            });
        }
    }

    /**
     * POST /api/connections/schedule/:domain
     * Schedule periodic extraction for a domain.
     */
    public async scheduleExtraction(req: Request, res: Response): Promise<void> {
        const { domain } = req.params;
        const { intervalHours = 6 } = req.body;

        try {
            // Get session from vault
            const session = sessionVault.get(domain);
            if (!session) {
                res.status(404).json({
                    success: false,
                    message: `No session found for ${domain}. Please bridge this site first.`
                });
                return;
            }

            // Store session in cloud robot
            cloudRobotService.storeSession(domain, session);

            // Schedule extraction
            const scheduleId = cloudRobotService.scheduleExtraction(domain, intervalHours);

            res.status(200).json({
                success: true,
                message: `Extraction scheduled for ${domain} every ${intervalHours} hours`,
                scheduleId
            });

        } catch (error: any) {
            console.error(`Error scheduling extraction for ${domain}:`, error);
            res.status(500).json({
                success: false,
                message: error.message || 'Scheduling failed'
            });
        }
    }

    /**
     * POST /api/connections/query/:domain
     * Execute a dynamic query against a connected site.
     * Phase 5: Uses NavigationPlanner + CloudRobot to navigate and extract data.
     */
    public async executeQuery(req: Request, res: Response): Promise<void> {
        const { domain } = req.params;
        const { question, filters } = req.body;

        if (!question) {
            res.status(400).json({
                success: false,
                message: 'Question is required'
            });
            return;
        }

        try {
            console.log(`[ConnectionsController] Executing query for ${domain}: "${question}"`);

            // Check if we have a session for this domain
            const session = sessionVault.get(domain);
            if (session) {
                // Ensure cloud robot has the session
                cloudRobotService.storeSession(domain, session);
            }

            // Execute the query using CloudRobot
            const result = await cloudRobotService.executeQuery(question, domain);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    answer: result.answer,
                    data: result.data,
                    stepResults: result.stepResults
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.error || 'Query execution failed'
                });
            }

        } catch (error: any) {
            console.error(`Error executing query for ${domain}:`, error);
            res.status(500).json({
                success: false,
                message: error.message || 'Query execution failed'
            });
        }
    }

    /**
     * POST /api/connections/query
     * Execute a dynamic query - auto-detect target site from question.
     * Phase 5: Main entry point for natural language queries to 3rd party sites.
     */
    public async executeQueryAuto(req: Request, res: Response): Promise<void> {
        const { question, filters } = req.body;

        if (!question) {
            res.status(400).json({
                success: false,
                message: 'Question is required'
            });
            return;
        }

        try {
            console.log(`[ConnectionsController] Auto-executing query: "${question}"`);

            // Execute without specifying domain - let planner figure it out
            const result = await cloudRobotService.executeQuery(question);

            if (result.success) {
                res.status(200).json({
                    success: true,
                    answer: result.answer,
                    data: result.data,
                    stepResults: result.stepResults
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.error || 'Query execution failed'
                });
            }

        } catch (error: any) {
            console.error('Error executing auto query:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Query execution failed'
            });
        }
    }
}

export const connectionsController = new ConnectionsController();

