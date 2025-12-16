// Export Prisma client
export { default as prisma } from '../config/database.js';

// Export all types
export * from './types.js';

// Re-export Prisma types for convenience
export type {
  User,
  EmailAccount,
  CalendarAccount,
  Thread,
  Contact,
  Property,
  Deal,
  TimelineEvent,
  Task,
  VoiceNote,
  CRMIntegration,
  Export,
} from '@prisma/client';
