
import { EventEmitter } from 'events';
import { logger } from './logger.service.js';

export interface BackgroundJob {
    id: string;
    userId: string;
    toolName: string;
    status: 'running' | 'completed' | 'failed';
    result?: any;
    error?: string;
    startTime: number;
    endTime?: number;
}

export class JobManagerService extends EventEmitter {
    private jobs: Map<string, BackgroundJob> = new Map();

    /**
     * Start a new background job
     */
    startJob(userId: string, toolName: string): BackgroundJob {
        const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const job: BackgroundJob = {
            id,
            userId,
            toolName,
            status: 'running',
            startTime: Date.now()
        };
        this.jobs.set(id, job);
        logger.info(`[JobManager] Started job ${id} for ${toolName}`);
        return job;
    }

    /**
     * Complete a job successfully
     */
    completeJob(id: string, result: any) {
        const job = this.jobs.get(id);
        if (job) {
            job.status = 'completed';
            job.result = result;
            job.endTime = Date.now();
            this.emit('job_completed', job);
            logger.info(`[JobManager] Completed job ${id}`);
        }
    }

    /**
     * Fail a job
     */
    failJob(id: string, error: string) {
        const job = this.jobs.get(id);
        if (job) {
            job.status = 'failed';
            job.error = error;
            job.endTime = Date.now();
            this.emit('job_failed', job);
            logger.error(`[JobManager] Failed job ${id}: ${error}`);
        }
    }

    getJob(id: string) {
        return this.jobs.get(id);
    }
}

export const jobManager = new JobManagerService();
