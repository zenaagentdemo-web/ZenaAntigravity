import prisma from '../config/database.js';
import { timelineService } from './timeline.service.js';
import { websocketService } from './websocket.service.js';
import { askZenaService } from './ask-zena.service.js';

export interface TaskInput {
  userId: string;
  label: string;
  status?: 'open' | 'completed';
  dueDate?: Date;
  dealId?: string;
  propertyId?: string;
  contactId?: string;
  source: 'email' | 'voice_note' | 'manual' | 'ai_suggested';
}

export interface TaskQueryOptions {
  userId: string;
  status?: 'open' | 'completed';
  dealId?: string;
  propertyId?: string;
  contactId?: string;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

export class TaskService {
  /**
   * Create a new task
   */
  async createTask(input: TaskInput) {
    const task = await prisma.task.create({
      data: {
        userId: input.userId,
        label: input.label,
        status: input.status || 'open',
        dueDate: input.dueDate,
        dealId: input.dealId,
        propertyId: input.propertyId,
        contactId: input.contactId,
        source: input.source,
      },
    });

    // Create timeline event for task creation
    if (input.dealId) {
      await timelineService.createTaskEvent(
        input.userId,
        'deal',
        input.dealId,
        `Task created: ${input.label}`,
        undefined,
        { taskId: task.id, source: input.source }
      );
    } else if (input.propertyId) {
      await timelineService.createTaskEvent(
        input.userId,
        'property',
        input.propertyId,
        `Task created: ${input.label}`,
        undefined,
        { taskId: task.id, source: input.source }
      );
    } else if (input.contactId) {
      await timelineService.createTaskEvent(
        input.userId,
        'contact',
        input.contactId,
        `Task created: ${input.label}`,
        undefined,
        { taskId: task.id, source: input.source }
      );
    }

    // Emit task.created event
    websocketService.broadcastToUser(input.userId, 'task.created', {
      taskId: task.id,
      label: task.label,
      dueDate: task.dueDate,
      dealId: task.dealId,
      propertyId: task.propertyId,
      contactId: task.contactId,
      source: task.source,
    });

    return task;
  }

  /**
   * Extract tasks from email or voice note content using AI
   * 🧠 ZENA INTELLIGENCE: Uses askBrain for high-intelligence task extraction
   */
  async extractTasksFromContent(
    userId: string,
    content: string,
    source: 'email' | 'voice_note',
    entityId?: string,
    entityType?: 'deal' | 'property' | 'contact'
  ): Promise<any[]> {
    try {
      // Skip if content is too short or empty
      if (!content || content.trim().length < 20) {
        return [];
      }

      // Build context about the linked entity
      let entityContext = '';
      if (entityId && entityType) {
        if (entityType === 'property') {
          const property = await prisma.property.findUnique({
            where: { id: entityId },
            select: { address: true }
          });
          if (property) entityContext = `This is related to property: ${property.address}`;
        } else if (entityType === 'contact') {
          const contact = await prisma.contact.findUnique({
            where: { id: entityId },
            select: { name: true }
          });
          if (contact) entityContext = `This is related to contact: ${contact.name}`;
        } else if (entityType === 'deal') {
          const deal = await prisma.deal.findUnique({
            where: { id: entityId },
            select: { stage: true, property: { select: { address: true } } }
          });
          if (deal) entityContext = `This is related to a ${deal.stage} deal${deal.property ? ` for ${deal.property.address}` : ''}`;
        }
      }

      const prompt = `You are Zena, an AI assistant for NZ real estate agents. Analyze the following ${source === 'email' ? 'email' : 'voice note'} and extract any ACTION ITEMS or TASKS that the agent needs to do.

${entityContext}

CONTENT TO ANALYZE:
"""
${content.substring(0, 2000)}
"""

RULES:
1. Only extract CLEAR, ACTIONABLE tasks (not vague suggestions)
2. Each task should be something the AGENT needs to do (not the client)
3. If there are no clear action items, return an empty array
4. For each task, infer a reasonable priority based on urgency words
5. If a deadline is mentioned or implied, include it as dueDate

Return a JSON array of tasks. Each task object should have:
- label: string (the task description, max 100 chars)
- priority: "urgent" | "important" | "normal" (based on urgency signals)
- dueDate: string | null (ISO date if mentioned, null otherwise)
- reasoning: string (brief explanation of why this is a task)

EXAMPLE OUTPUT:
[
  {"label": "Call John Smith about viewing feedback", "priority": "important", "dueDate": null, "reasoning": "Client requested callback"},
  {"label": "Send LIM report to buyer", "priority": "urgent", "dueDate": "2026-01-15T17:00:00Z", "reasoning": "Deadline mentioned for Friday"}
]

If no tasks found, return: []`;

      const response = await askZenaService.askBrain(prompt, { jsonMode: true });

      // Parse the JSON response
      let extractedTasks: any[] = [];
      try {
        // Handle potential markdown code blocks
        let jsonStr = response.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
        }
        extractedTasks = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('[TaskService] Failed to parse AI task extraction response:', parseError);
        return [];
      }

      // Validate and sanitize extracted tasks
      if (!Array.isArray(extractedTasks)) {
        return [];
      }

      const validatedTasks = extractedTasks
        .filter(t => t && typeof t.label === 'string' && t.label.length > 0)
        .slice(0, 5) // Max 5 tasks per extraction
        .map(t => ({
          label: t.label.substring(0, 100),
          priority: ['urgent', 'important', 'normal'].includes(t.priority) ? t.priority : 'normal',
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          reasoning: t.reasoning || 'Extracted from content',
          source,
          entityId,
          entityType
        }));

      console.log(`[TaskService] 🧠 AI extracted ${validatedTasks.length} tasks from ${source}`);
      return validatedTasks;

    } catch (error) {
      console.error('[TaskService] Error in AI task extraction:', error);
      return [];
    }
  }

  /**
   * 🧠 ZENA INTELLIGENCE: Suggest task priority based on linked entity health
   * Analyzes deal health scores, contact urgency, and due date proximity
   */
  async suggestTaskPriority(
    userId: string,
    taskLabel: string,
    entityId?: string,
    entityType?: 'deal' | 'property' | 'contact',
    dueDate?: Date
  ): Promise<{ priority: 'urgent' | 'important' | 'normal' | 'low'; reason: string }> {
    try {
      let priority: 'urgent' | 'important' | 'normal' | 'low' = 'normal';
      let reason = 'Standard priority';

      // 1. Check due date proximity
      if (dueDate) {
        const now = new Date();
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDue < 0) {
          priority = 'urgent';
          reason = 'Task is overdue';
        } else if (hoursUntilDue < 24) {
          priority = 'urgent';
          reason = 'Due within 24 hours';
        } else if (hoursUntilDue < 72) {
          priority = 'important';
          reason = 'Due within 3 days';
        }
      }

      // 2. Check linked deal health (if linked to a deal)
      if (entityType === 'deal' && entityId) {
        const deal = await prisma.deal.findUnique({
          where: { id: entityId },
          select: { stage: true, stageEnteredAt: true, price: true }
        });

        if (deal) {
          // Calculate days in current stage
          const daysInStage = deal.stageEnteredAt
            ? Math.floor((Date.now() - new Date(deal.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          // Critical deals (stalling or high value)
          if (daysInStage > 14) {
            priority = 'urgent';
            reason = `Deal stalling - ${daysInStage} days in ${deal.stage} stage`;
          } else if (deal.price && Number(deal.price) > 1000000) {
            if (priority !== 'urgent') {
              priority = 'important';
              reason = `High-value deal ($${(Number(deal.price) / 1000000).toFixed(1)}M)`;
            }
          }
        }
      }

      // 3. Check linked property status
      if (entityType === 'property' && entityId) {
        const property = await prisma.property.findUnique({
          where: { id: entityId },
          select: { status: true, createdAt: true }
        });

        if (property) {
          const daysListed = Math.floor((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24));

          if (property.status === 'active' && daysListed > 60) {
            if (priority !== 'urgent') {
              priority = 'important';
              reason = `Property on market ${daysListed} days - needs attention`;
            }
          }
        }
      }

      // 4. Keyword analysis for urgency signals
      const urgentKeywords = ['urgent', 'asap', 'immediately', 'deadline', 'critical', 'settlement', 'conditional'];
      const importantKeywords = ['follow up', 'callback', 'meeting', 'viewing', 'appraisal'];

      const lowerLabel = taskLabel.toLowerCase();
      if (urgentKeywords.some(kw => lowerLabel.includes(kw))) {
        priority = 'urgent';
        reason = 'Urgency keywords detected in task';
      } else if (priority === 'normal' && importantKeywords.some(kw => lowerLabel.includes(kw))) {
        priority = 'important';
        reason = 'Important action type detected';
      }

      console.log(`[TaskService] 🧠 AI suggested priority: ${priority} - ${reason}`);
      return { priority, reason };

    } catch (error) {
      console.error('[TaskService] Error in AI priority suggestion:', error);
      return { priority: 'normal', reason: 'Default priority' };
    }
  }

  /**
   * Get tasks with filters - includes linked entity data AND Virtual Milestone Tasks
   */
  async getTasks(options: TaskQueryOptions) {
    const where: any = {
      userId: options.userId,
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.dealId) {
      where.dealId = options.dealId;
    }

    if (options.propertyId) {
      where.propertyId = options.propertyId;
    }

    if (options.contactId) {
      where.contactId = options.contactId;
    }

    if (options.overdue) {
      where.status = 'open';
      where.dueDate = {
        lt: new Date(),
      };
    }

    // 1. Fetch regular database tasks (WITHOUT relations, as they are missing in schema)
    const dbTasksPromise = prisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // Open tasks first
        { dueDate: 'asc' }, // Earliest due date first
        { createdAt: 'desc' }, // Most recent first
      ],
      // We handle pagination manually after merging
    });

    // 2. Fetch properties with milestones (if applicable)
    // Only fetch if we're not filtering by deal or contact exclusively (unless filtering by property)
    // and if we're not asking for a specific non-property task filtering that excludes properties.
    let propertyMilestonesPromise = Promise.resolve([]);

    // Check if we should fetch milestones based on filters
    const shouldFetchMilestones = !options.dealId && !options.contactId; // General fetch
    const specificPropertyFetch = !!options.propertyId;

    if (shouldFetchMilestones || specificPropertyFetch) {
      const propWhere: any = {
        userId: options.userId,
      };

      if (options.propertyId) {
        propWhere.id = options.propertyId;
      }

      propertyMilestonesPromise = prisma.property.findMany({
        where: propWhere,
        select: {
          id: true,
          address: true,
          milestones: true,
        },
      }) as any;
    }

    const [dbTasks, properties] = await Promise.all([
      dbTasksPromise,
      propertyMilestonesPromise,
    ]);

    // 3. Convert Milestones to Virtual Tasks
    const virtualTasks: any[] = [];
    const now = new Date();

    (properties as any[]).forEach((prop) => {
      const milestones = (prop.milestones as any[]) || [];
      if (!Array.isArray(milestones)) return; // Safety check

      milestones.forEach((ms) => {
        // Fallback for title
        const title = ms.title || ms.type || ms.notes || 'Untitled Milestone';
        const msStatus = ms.status || 'pending';

        // Apply status filters to milestones
        if (options.status && msStatus !== options.status) return;

        // Apply overdue filter
        const dueDate = new Date(ms.date);
        const isOverdue = msStatus !== 'completed' && dueDate < now;
        if (options.overdue && !isOverdue) return;

        // Construct Virtual Task
        // ID Format: milestone_<propertyId>_<milestoneId>
        const virtualId = `milestone_${prop.id}_${ms.id || title.replace(/\s+/g, '_')}`;

        virtualTasks.push({
          id: virtualId,
          userId: options.userId,
          label: `${title}`,
          status: msStatus === 'pending' ? 'open' : msStatus === 'completed' ? 'completed' : 'open',
          dueDate: new Date(ms.date),
          dealId: null,
          propertyId: prop.id,
          contactId: null,
          source: 'milestone',
          createdAt: new Date(ms.createdAt || new Date().toISOString()),
          completedAt: msStatus === 'completed' ? new Date() : null,
          property: {
            id: prop.id,
            address: prop.address,
          },
          contact: null,
          deal: null,
          isVirtual: true,
        });
      });
    });

    // 3b. Manually Fetch Related Entities for DB Tasks
    // Since Prisma relations are missing in schema, we must fetch manually.
    const propIds = new Set<string>();
    const contactIds = new Set<string>();
    const dealIds = new Set<string>();

    dbTasks.forEach((t) => {
      if (t.propertyId) propIds.add(t.propertyId);
      if (t.contactId) contactIds.add(t.contactId);
      if (t.dealId) dealIds.add(t.dealId);
    });

    const [relatedProps, relatedContacts, relatedDeals] = await Promise.all([
      propIds.size > 0 ? prisma.property.findMany({ where: { id: { in: Array.from(propIds) } }, select: { id: true, address: true } }) : [],
      contactIds.size > 0 ? prisma.contact.findMany({ where: { id: { in: Array.from(contactIds) } }, select: { id: true, name: true, emails: true } }) : [],
      dealIds.size > 0 ? prisma.deal.findMany({ where: { id: { in: Array.from(dealIds) } }, select: { id: true, stage: true } }) : []
    ]);

    const propMap = new Map(relatedProps.map(p => [p.id, p]));
    const contactMap = new Map(relatedContacts.map(c => [c.id, c]));
    const dealMap = new Map(relatedDeals.map(d => [d.id, d]));

    // Attach entities to DB tasks
    const enrichedDbTasks = dbTasks.map(t => {
      const contact = t.contactId ? contactMap.get(t.contactId) : null;
      return {
        ...t,
        property: t.propertyId ? propMap.get(t.propertyId) || null : null,
        contact: contact ? { id: contact.id, name: contact.name, email: contact.emails?.[0] || null } : null,
        deal: t.dealId ? dealMap.get(t.dealId) || null : null,
        isVirtual: false
      };
    });


    // 4. Merge and Sort
    const allTasks = [...enrichedDbTasks, ...virtualTasks];

    // Sort: Open first, then by Due Date (asc), then Created At (desc)
    allTasks.sort((a, b) => {
      // 1. Status: Open < Completed
      const aOpen = a.status === 'open' ? 0 : 1;
      const bOpen = b.status === 'open' ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;

      // 2. Due Date: Earliest first (nulls last)
      if (a.dueDate && b.dueDate) {
        const diff = a.dueDate.getTime() - b.dueDate.getTime();
        if (diff !== 0) return diff;
      } else if (a.dueDate) return -1;
      else if (b.dueDate) return 1;

      // 3. Created At: Newest first
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // 5. Apply Pagination
    const limit = options.limit || 100; // Default limit
    const offset = options.offset || 0;

    return allTasks.slice(offset, offset + limit);
  }

  /**
   * Get a single task by ID - supporting Virtual Milestone Tasks
   */
  async getTask(userId: string, taskId: string) {
    // Check if it's a virtual milestone task
    if (taskId.startsWith('milestone_')) {
      const parts = taskId.split('_');
      // format: milestone_<propId>_<milestoneId>
      // NOTE: address might contain underscores so this split is risky if we used address.
      // But we used ID or title hash. Let's rely on the structure.
      // safely extract property ID (UUID is standard length usually, but let's be robust)
      // Actually, safest is to parse the ID structure we generated: `milestone_${prop.id}_${ms.id}`
      // Since propID is UUID (36 chars), we can extract it.

      // However, splitting by underscore is dangerous if ID has no underscores. UUIDs have hyphens.
      // The prefix is 'milestone_'.
      const prefixRemoved = taskId.substring(10); // remove 'milestone_'
      // Find the first underscore after the UUID? UUIDs don't have underscores.
      // So we can split by first underscore to separate propId and milestoneId
      const firstUnderscoreIndex = prefixRemoved.indexOf('_');

      if (firstUnderscoreIndex > 0) {
        const propertyId = prefixRemoved.substring(0, firstUnderscoreIndex);
        const milestoneId = prefixRemoved.substring(firstUnderscoreIndex + 1);

        const property = await prisma.property.findFirst({
          where: { id: propertyId, userId },
          select: { id: true, address: true, milestones: true }
        });

        if (property) {
          const milestones = (property.milestones as any[]) || [];
          const ms = milestones.find(m => m.id === milestoneId || m.title.replace(/\s+/g, '_') === milestoneId);

          if (ms) {
            return {
              id: taskId,
              userId,
              label: ms.title,
              status: ms.status === 'pending' ? 'open' : ms.status || 'open',
              dueDate: new Date(ms.date),
              propertyId: property.id,
              source: 'milestone',
              createdAt: new Date(ms.createdAt || new Date()),
              property: { id: property.id, address: property.address },
              isVirtual: true
            };
          }
        }
      }
    }

    return await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });
  }

  /**
   * Update a task - Proxies to Property Milestone if Virtual
   */
  async updateTask(
    userId: string,
    taskId: string,
    updates: {
      label?: string;
      status?: 'open' | 'completed';
      dueDate?: Date | null;
      dealId?: string | null;
      propertyId?: string | null;
      contactId?: string | null;
    }
  ) {
    // 🛑 Check for Virtual Milestone Task
    if (taskId.startsWith('milestone_')) {
      console.log(`[TaskService] Intercepting update for Virtual Task: ${taskId}`);

      const prefixRemoved = taskId.substring(10);
      const firstUnderscoreIndex = prefixRemoved.indexOf('_');

      if (firstUnderscoreIndex > 0) {
        const propertyId = prefixRemoved.substring(0, firstUnderscoreIndex);
        const milestoneId = prefixRemoved.substring(firstUnderscoreIndex + 1);

        const property = await prisma.property.findFirst({
          where: { id: propertyId, userId }
        });

        if (!property) throw new Error('Property for milestone not found');

        const milestones = (property.milestones as any[]) || [];
        const msIndex = milestones.findIndex(m => m.id === milestoneId || m.title.replace(/\s+/g, '_') === milestoneId);

        if (msIndex === -1) throw new Error('Milestone not found');

        // Apply updates to the milestone
        if (updates.status) {
          milestones[msIndex].status = updates.status === 'open' ? 'pending' : 'completed';
        }
        if (updates.dueDate) {
          milestones[msIndex].date = updates.dueDate.toISOString();
        }
        // Label updates ignored for now to keep sync simple, or we could update title

        // Save back to Property
        await prisma.property.update({
          where: { id: propertyId },
          data: { milestones }
        });

        // Return a valid Task-like object to satisfy controller
        const ms = milestones[msIndex];
        return {
          id: taskId,
          userId,
          label: ms.title,
          status: ms.status === 'pending' ? 'open' : ms.status,
          dueDate: new Date(ms.date),
          propertyId: property.id,
          source: 'milestone',
          createdAt: new Date(ms.createdAt || new Date()),
          property: { id: property.id, address: property.address },
          isVirtual: true
        };
      }
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // If completing the task, set completedAt
    const updateData: any = { ...updates };
    if (updates.status === 'completed' && task.status !== 'completed') {
      updateData.completedAt = new Date();
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    // Create timeline event for task completion
    if (updates.status === 'completed' && task.status !== 'completed') {
      if (task.dealId) {
        await timelineService.createTaskEvent(
          userId,
          'deal',
          task.dealId,
          `Task completed: ${task.label}`,
          undefined,
          { taskId: task.id }
        );
      } else if (task.propertyId) {
        await timelineService.createTaskEvent(
          userId,
          'property',
          task.propertyId,
          `Task completed: ${task.label}`,
          undefined,
          { taskId: task.id }
        );
      } else if (task.contactId) {
        await timelineService.createTaskEvent(
          userId,
          'contact',
          task.contactId,
          `Task completed: ${task.label}`,
          undefined,
          { taskId: task.id }
        );
      }
    }

    return updatedTask;
  }

  /**
   * Delete a task - Handles Virtual Tasks mostly by ignoring or potentially removing milestone
   */
  async deleteTask(userId: string, taskId: string) {
    if (taskId.startsWith('milestone_')) {
      // Option: Delete the milestone from the property?
      // For now, let's treat "Delete" as "Cancel" (remove from list)
      // Or actually delete the milestone data.
      const prefixRemoved = taskId.substring(10);
      const firstUnderscoreIndex = prefixRemoved.indexOf('_');

      if (firstUnderscoreIndex > 0) {
        const propertyId = prefixRemoved.substring(0, firstUnderscoreIndex);
        const milestoneId = prefixRemoved.substring(firstUnderscoreIndex + 1);

        const property = await prisma.property.findFirst({ where: { id: propertyId, userId } });
        if (property) {
          const milestones = (property.milestones as any[]) || [];
          const filtered = milestones.filter(m => m.id !== milestoneId && m.title.replace(/\s+/g, '_') !== milestoneId);

          await prisma.property.update({
            where: { id: propertyId },
            data: { milestones: filtered }
          });
          return { count: 1 };
        }
      }
      return { count: 0 };
    }

    return await prisma.task.deleteMany({
      where: {
        id: taskId,
        userId,
      },
    });
  }

  /**
   * Get overdue tasks for a user
   */
  async getOverdueTasks(userId: string) {
    return await this.getTasks({
      userId,
      overdue: true,
    });
  }

  /**
   * Get tasks for a specific entity
   */
  async getEntityTasks(
    userId: string,
    entityType: 'deal' | 'property' | 'contact',
    entityId: string,
    status?: 'open' | 'completed'
  ) {
    const options: TaskQueryOptions = {
      userId,
      status,
    };

    if (entityType === 'deal') {
      options.dealId = entityId;
    } else if (entityType === 'property') {
      options.propertyId = entityId;
    } else if (entityType === 'contact') {
      options.contactId = entityId;
    }

    return await this.getTasks(options);
  }

  /**
   * Get open tasks count for an entity
   */
  async getOpenTasksCount(
    userId: string,
    entityType: 'deal' | 'property' | 'contact',
    entityId: string
  ): Promise<number> {
    // We must use getTasks to account for virtual tasks
    const tasks = await this.getEntityTasks(userId, entityType, entityId, 'open');
    return tasks.length;
  }

  /**
   * Reopen a completed task (undo functionality)
   */
  async reopenTask(userId: string, taskId: string) {
    // 🛑 Handle Virtual Tasks
    if (taskId.startsWith('milestone_')) {
      return this.updateTask(userId, taskId, { status: 'open' });
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'completed') {
      throw new Error('Task is not completed');
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'open',
        completedAt: null,
      },
    });

    // Create timeline event for task reopening
    if (task.dealId) {
      await timelineService.createTaskEvent(
        userId,
        'deal',
        task.dealId,
        `Task reopened: ${task.label}`,
        undefined,
        { taskId: task.id }
      );
    } else if (task.propertyId) {
      await timelineService.createTaskEvent(
        userId,
        'property',
        task.propertyId,
        `Task reopened: ${task.label}`,
        undefined,
        { taskId: task.id }
      );
    } else if (task.contactId) {
      await timelineService.createTaskEvent(
        userId,
        'contact',
        task.contactId,
        `Task reopened: ${task.label}`,
        undefined,
        { taskId: task.id }
      );
    }

    // Emit task.reopened event
    websocketService.broadcastToUser(userId, 'task.reopened', {
      taskId: task.id,
      label: task.label,
    });

    return updatedTask;
  }

  /**
   * 🧠 ZENA INTELLIGENCE: Detect task completions from timeline activity
   * Analyzes recent emails, calls, and timeline events to detect if tasks may have been completed
   */
  async detectTaskCompletions(userId: string): Promise<Array<{ taskId: string; confidence: number; reason: string }>> {
    try {
      // Get open tasks from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const openTasks = await prisma.task.findMany({
        where: {
          userId,
          status: 'open',
          createdAt: { gte: thirtyDaysAgo }
        },
        take: 20, // Limit to prevent large AI calls
        orderBy: { createdAt: 'desc' }
      });

      if (openTasks.length === 0) return [];

      // Get recent timeline events (emails sent, calls made, etc.)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentEvents = await prisma.timelineEvent.findMany({
        where: {
          userId,
          timestamp: { gte: sevenDaysAgo },
          type: { in: ['email', 'call', 'note', 'task'] }
        },
        take: 50,
        orderBy: { timestamp: 'desc' }
      });

      if (recentEvents.length === 0) return [];

      // Build AI prompt for completion detection
      const tasksContext = openTasks.map(t => `- Task #${t.id.substring(0, 8)}: "${t.label}"`).join('\n');
      const eventsContext = recentEvents.map(e =>
        `- [${e.type.toUpperCase()}] ${new Date(e.timestamp).toLocaleDateString()}: ${e.summary || 'No summary'}`
      ).join('\n');

      const prompt = `You are Zena's task intelligence system. Analyze if any of these OPEN TASKS may have been COMPLETED based on recent activity.

OPEN TASKS:
${tasksContext}

RECENT ACTIVITY (last 7 days):
${eventsContext}

RULES:
1. Only flag a task as potentially complete if there's STRONG evidence in the activity
2. Look for keywords like "done", "completed", "sent", "called", "scheduled", "confirmed"
3. Match task labels to activity summaries (e.g., "Call John" matches "Called John Smith")
4. Be conservative - only high-confidence matches

Return a JSON array. Each detection should have:
- taskId: string (the short task ID like "abc12345")
- confidence: number (0.7-1.0, only include if >= 0.7)
- reason: string (brief explanation)

If no completions detected, return: []`;

      const response = await askZenaService.askBrain(prompt, { jsonMode: true });

      // Parse response
      let detections: Array<{ taskId: string; confidence: number; reason: string }> = [];
      try {
        let jsonStr = response.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
        }
        detections = JSON.parse(jsonStr);
      } catch {
        return [];
      }

      // Validate and map short IDs to full IDs
      const validDetections = detections
        .filter(d => d && d.taskId && d.confidence >= 0.7)
        .map(d => {
          // Find matching task by partial ID
          const matchingTask = openTasks.find(t => t.id.startsWith(d.taskId));
          if (!matchingTask) return null;
          return {
            taskId: matchingTask.id,
            confidence: Math.min(d.confidence, 1.0),
            reason: d.reason || 'Detected from activity'
          };
        })
        .filter((d): d is { taskId: string; confidence: number; reason: string } => d !== null);

      console.log(`[TaskService] 🧠 AI detected ${validDetections.length} potential task completions`);
      return validDetections;

    } catch (error) {
      console.error('[TaskService] Error in AI completion detection:', error);
      return [];
    }
  }
}

export const taskService = new TaskService();

