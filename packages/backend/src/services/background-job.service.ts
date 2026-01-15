/**
 * Background Job Notification Service
 * 
 * Unifies job notifications across Zena Live and Ask Zena.
 * Listens to the JobManager and broadcasts status updates via WebSocket.
 */

import { jobManager } from './job-manager.service.js';
import { websocketService } from './websocket.service.js';
import { logger } from './logger.service.js';
import { toolRegistry } from '../tools/registry.js';

class BackgroundJobService {
    initialize() {
        logger.info('[BackgroundJobService] Initializing global job listeners...');

        jobManager.on('job_completed', (job) => {
            this.handleJobCompletion(job);
        });

        jobManager.on('job_failed', (job) => {
            this.handleJobFailure(job);
        });
    }

    private handleJobCompletion(job: any) {
        logger.info(`[BackgroundJobService] Job ${job.id} (${job.toolName}) completed for user ${job.userId}`);

        const tool = toolRegistry.getTool(job.toolName);
        const toolLabel = tool?.name.split('.').pop()?.replace(/_/g, ' ') || job.toolName;

        // 1. Send generic system notification to the UI
        // This ensures the message bubble or toast appears in Ask Zena
        websocketService.broadcastToUser(job.userId, 'voice.live.system_notification', {
            message: `Task Completed: ${toolLabel}`,
            details: job.result,
            jobId: job.id,
            toolName: job.toolName
        });

        // 2. Proactive "Zena-fied" notification for text chat
        // In a future version, we could use a lite Gemini call here to generate
        // a witty status update. For now, we'll use a high-quality template.
        const deliveryHint = tool?.deliveryPrompt ? `\n\nHint: ${tool.deliveryPrompt}` : '';
        const answer = `I've finished that **${toolLabel}** for you! 🧠\n\n${JSON.stringify(job.result, null, 2)}${deliveryHint}`;

        // We broadcast this as an agent message so it appears in the chat history
        // Note: The frontend AskZenaPage has a listener for 'agent.message'
        // websocketService.broadcastAgentMessage(job.userId, answer); 
        // Actually, broadcastAgentMessage is for interim messages. 
        // For completed jobs, 'voice.live.system_notification' is better handled by the UI.
    }

    private handleJobFailure(job: any) {
        logger.error(`[BackgroundJobService] Job ${job.id} (${job.toolName}) failed for user ${job.userId}: ${job.error}`);

        websocketService.broadcastToUser(job.userId, 'voice.live.system_notification', {
            message: `Task Failed: ${job.toolName}`,
            error: job.error,
            jobId: job.id,
            status: 'failed'
        });
    }
}

export const backgroundJobService = new BackgroundJobService();
export default backgroundJobService;
