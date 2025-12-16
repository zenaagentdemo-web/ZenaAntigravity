import prisma from '../config/database.js';
import type { Prisma } from '@prisma/client';

/**
 * Database utility functions for common operations
 */

/**
 * Find or create a contact by email
 * Implements deduplication logic
 */
export async function findOrCreateContact(
  userId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    role: string;
  }
) {
  // Check if contact exists with this email
  const existing = await prisma.contact.findFirst({
    where: {
      userId,
      emails: {
        has: data.email,
      },
    },
  });

  if (existing) {
    // Update if needed
    const needsUpdate = 
      !existing.phones.includes(data.phone || '') ||
      existing.name !== data.name;

    if (needsUpdate) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          phones: data.phone 
            ? Array.from(new Set([...existing.phones, data.phone]))
            : existing.phones,
        },
      });
    }

    return existing;
  }

  // Create new contact
  return prisma.contact.create({
    data: {
      userId,
      name: data.name,
      emails: [data.email],
      phones: data.phone ? [data.phone] : [],
      role: data.role,
      relationshipNotes: [],
    },
  });
}

/**
 * Link a thread to a property by address
 */
export async function linkThreadToProperty(
  threadId: string,
  address: string,
  userId: string
) {
  const property = await prisma.property.findFirst({
    where: {
      userId,
      address: {
        contains: address,
        mode: 'insensitive',
      },
    },
  });

  if (property) {
    await prisma.thread.update({
      where: { id: threadId },
      data: { propertyId: property.id },
    });
    return property;
  }

  return null;
}

/**
 * Get threads for Focus list (agent owes reply)
 */
export async function getFocusThreads(
  userId: string,
  limit: number = 10
) {
  return prisma.thread.findMany({
    where: {
      userId,
      category: 'focus',
    },
    orderBy: [
      { riskLevel: 'desc' },
      { lastMessageAt: 'desc' },
    ],
    take: limit,
    include: {
      property: true,
      deal: true,
    },
  });
}

/**
 * Get threads for Waiting list (others owe reply)
 */
export async function getWaitingThreads(
  userId: string,
  limit: number = 50
) {
  return prisma.thread.findMany({
    where: {
      userId,
      category: 'waiting',
    },
    orderBy: [
      { riskLevel: 'desc' },
      { lastMessageAt: 'desc' },
    ],
    take: limit,
    include: {
      property: true,
      deal: true,
    },
  });
}

/**
 * Update thread risk level based on time since last reply
 */
export async function updateThreadRiskLevels(userId: string) {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  // High risk: no reply for 10+ days
  await prisma.thread.updateMany({
    where: {
      userId,
      category: 'waiting',
      lastReplyAt: {
        lt: tenDaysAgo,
      },
    },
    data: {
      riskLevel: 'high',
      riskReason: 'No response for 10+ days',
    },
  });

  // Medium risk: no reply for 5-10 days
  await prisma.thread.updateMany({
    where: {
      userId,
      category: 'waiting',
      lastReplyAt: {
        gte: tenDaysAgo,
        lt: fiveDaysAgo,
      },
    },
    data: {
      riskLevel: 'medium',
      riskReason: 'No response for 5+ days',
    },
  });

  // Low risk: reply within 5 days
  await prisma.thread.updateMany({
    where: {
      userId,
      category: 'waiting',
      lastReplyAt: {
        gte: fiveDaysAgo,
      },
    },
    data: {
      riskLevel: 'low',
      riskReason: null,
    },
  });
}

/**
 * Create a timeline event
 */
export async function createTimelineEvent(
  userId: string,
  data: {
    type: string;
    entityType: string;
    entityId: string;
    summary: string;
    content?: string;
    metadata?: any;
    timestamp?: Date;
  }
) {
  return prisma.timelineEvent.create({
    data: {
      userId,
      type: data.type,
      entityType: data.entityType,
      entityId: data.entityId,
      summary: data.summary,
      content: data.content,
      metadata: data.metadata,
      timestamp: data.timestamp || new Date(),
    },
  });
}

/**
 * Get timeline for an entity
 */
export async function getEntityTimeline(
  userId: string,
  entityType: string,
  entityId: string
) {
  return prisma.timelineEvent.findMany({
    where: {
      userId,
      entityType,
      entityId,
    },
    orderBy: {
      timestamp: 'desc',
    },
  });
}

/**
 * Get open tasks for a user
 */
export async function getOpenTasks(
  userId: string,
  filters?: {
    dealId?: string;
    propertyId?: string;
    contactId?: string;
  }
) {
  return prisma.task.findMany({
    where: {
      userId,
      status: 'open',
      ...filters,
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(userId: string) {
  return prisma.task.findMany({
    where: {
      userId,
      status: 'open',
      dueDate: {
        lt: new Date(),
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });
}

/**
 * Complete a task and create timeline event
 */
export async function completeTask(taskId: string, userId: string) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  // Create timeline event
  if (task.dealId) {
    await createTimelineEvent(userId, {
      type: 'task',
      entityType: 'deal',
      entityId: task.dealId,
      summary: `Completed task: ${task.label}`,
    });
  }

  return task;
}

/**
 * Search across entities
 */
export async function searchEntities(
  userId: string,
  query: string,
  options?: {
    includeThreads?: boolean;
    includeContacts?: boolean;
    includeProperties?: boolean;
    includeDeals?: boolean;
  }
) {
  const {
    includeThreads = true,
    includeContacts = true,
    includeProperties = true,
    includeDeals = true,
  } = options || {};

  const results: any = {
    threads: [],
    contacts: [],
    properties: [],
    deals: [],
  };

  const searchTerm = query.toLowerCase();

  if (includeThreads) {
    results.threads = await prisma.thread.findMany({
      where: {
        userId,
        OR: [
          { subject: { contains: searchTerm, mode: 'insensitive' } },
          { summary: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  }

  if (includeContacts) {
    results.contacts = await prisma.contact.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { emails: { has: searchTerm } },
        ],
      },
      take: 10,
    });
  }

  if (includeProperties) {
    results.properties = await prisma.property.findMany({
      where: {
        userId,
        address: { contains: searchTerm, mode: 'insensitive' },
      },
      take: 10,
    });
  }

  if (includeDeals) {
    results.deals = await prisma.deal.findMany({
      where: {
        userId,
        summary: { contains: searchTerm, mode: 'insensitive' },
      },
      take: 10,
      include: {
        property: true,
        contacts: true,
      },
    });
  }

  return results;
}
