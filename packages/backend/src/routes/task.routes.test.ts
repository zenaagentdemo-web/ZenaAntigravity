import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import taskRoutes from './task.routes';
import * as taskController from '../controllers/task.controller';

// Mock middleware
vi.mock('../middleware/auth.middleware', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 'test-user' };
        next();
    }
}));

// Mock controller
vi.mock('../controllers/task.controller', () => ({
    getTasks: vi.fn((req, res) => res.status(200).json({ tasks: [] })),
    createTask: vi.fn((req, res) => res.status(201).json({ id: 'new-task', ...req.body })),
    getTask: vi.fn((req, res) => res.status(200).json({ id: req.params.id })),
    updateTask: vi.fn((req, res) => res.status(200).json({ id: req.params.id, ...req.body })),
    deleteTask: vi.fn((req, res) => res.status(204).send()),
    getOverdueTasks: vi.fn((req, res) => res.status(200).json({ tasks: [] })),
    reopenTask: vi.fn((req, res) => res.status(200).json({ status: 'open' })),
    detectCompletions: vi.fn((req, res) => res.status(200).json({ detections: [] })),
}));

const app = express();
app.use(express.json());
app.use('/api/tasks', taskRoutes);

describe('Task Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('GET /api/tasks should return 200 and tasks', async () => {
        const res = await request(app).get('/api/tasks');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('tasks');
        expect(taskController.getTasks).toHaveBeenCalled();
    });

    it('POST /api/tasks should create task', async () => {
        const newTask = { title: 'Test Task', status: 'open' };
        const res = await request(app).post('/api/tasks').send(newTask);
        expect(res.status).toBe(201);
        expect(taskController.createTask).toHaveBeenCalled();
    });

    it('PUT /api/tasks/:id should update task', async () => {
        const update = { title: 'Updated' };
        const res = await request(app).put('/api/tasks/123').send(update);
        expect(res.status).toBe(200);
        expect(taskController.updateTask).toHaveBeenCalled();
    });

    it('DELETE /api/tasks/:id should delete task', async () => {
        const res = await request(app).delete('/api/tasks/123');
        expect(res.status).toBe(204);
        expect(taskController.deleteTask).toHaveBeenCalled();
    });
});
