/**
 * Validation utilities for database models
 */

import type {
  DealStage,
  RiskLevel,
  ThreadClassification,
  ThreadCategory,
  ContactRole,
  EmailProvider,
  CalendarProvider,
  TaskStatus,
  ProcessingStatus,
  CRMProvider,
  ExportType,
  ExportFormat,
} from '../models/types.js';

// Valid enum values
export const DEAL_STAGES: DealStage[] = [
  'lead',
  'qualified',
  'viewing',
  'offer',
  'conditional',
  'pre_settlement',
  'sold',
  'nurture',
];

export const RISK_LEVELS: RiskLevel[] = ['none', 'low', 'medium', 'high'];

export const THREAD_CLASSIFICATIONS: ThreadClassification[] = [
  'buyer',
  'vendor',
  'market',
  'lawyer_broker',
  'noise',
];

export const THREAD_CATEGORIES: ThreadCategory[] = ['focus', 'waiting'];

export const CONTACT_ROLES: ContactRole[] = ['buyer', 'vendor', 'market', 'other'];

export const EMAIL_PROVIDERS: EmailProvider[] = [
  'gmail',
  'outlook',
  'icloud',
  'yahoo',
  'imap',
];

export const CALENDAR_PROVIDERS: CalendarProvider[] = ['google', 'microsoft', 'icloud'];

export const TASK_STATUSES: TaskStatus[] = ['open', 'completed'];

export const PROCESSING_STATUSES: ProcessingStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
];

export const CRM_PROVIDERS: CRMProvider[] = [
  'mri_vault',
  'salesforce',
  'top_producer',
  'kvcore',
  'follow_up_boss',
];

export const EXPORT_TYPES: ExportType[] = ['contacts', 'properties', 'deals'];

export const EXPORT_FORMATS: ExportFormat[] = ['csv', 'xlsx', 'vcard'];

// Validation functions
export function isValidDealStage(stage: string): stage is DealStage {
  return DEAL_STAGES.includes(stage as DealStage);
}

export function isValidRiskLevel(level: string): level is RiskLevel {
  return RISK_LEVELS.includes(level as RiskLevel);
}

export function isValidThreadClassification(
  classification: string
): classification is ThreadClassification {
  return THREAD_CLASSIFICATIONS.includes(classification as ThreadClassification);
}

export function isValidThreadCategory(category: string): category is ThreadCategory {
  return THREAD_CATEGORIES.includes(category as ThreadCategory);
}

export function isValidContactRole(role: string): role is ContactRole {
  return CONTACT_ROLES.includes(role as ContactRole);
}

export function isValidEmailProvider(provider: string): provider is EmailProvider {
  return EMAIL_PROVIDERS.includes(provider as EmailProvider);
}

export function isValidCalendarProvider(provider: string): provider is CalendarProvider {
  return CALENDAR_PROVIDERS.includes(provider as CalendarProvider);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Basic phone validation - can be enhanced
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate user preferences structure
 */
export function validateUserPreferences(preferences: any): boolean {
  if (!preferences || typeof preferences !== 'object') return false;

  const hasNotificationSettings =
    preferences.notificationSettings &&
    typeof preferences.notificationSettings === 'object';

  const hasVoiceSettings =
    preferences.voiceSettings && typeof preferences.voiceSettings === 'object';

  const hasUiSettings = preferences.uiSettings && typeof preferences.uiSettings === 'object';

  return hasNotificationSettings && hasVoiceSettings && hasUiSettings;
}

/**
 * Validate participant structure
 */
export function validateParticipant(participant: any): boolean {
  return (
    participant &&
    typeof participant === 'object' &&
    typeof participant.name === 'string' &&
    typeof participant.email === 'string' &&
    isValidEmail(participant.email)
  );
}

/**
 * Validate campaign milestone structure
 */
export function validateCampaignMilestone(milestone: any): boolean {
  const validTypes = [
    'listing',
    'first_open',
    'offer_received',
    'conditional',
    'unconditional',
    'settled',
  ];

  return (
    milestone &&
    typeof milestone === 'object' &&
    typeof milestone.id === 'string' &&
    validTypes.includes(milestone.type) &&
    milestone.date instanceof Date
  );
}

/**
 * Validate relationship note structure
 */
export function validateRelationshipNote(note: any): boolean {
  const validSources = ['email', 'voice_note', 'manual'];

  return (
    note &&
    typeof note === 'object' &&
    typeof note.id === 'string' &&
    typeof note.content === 'string' &&
    validSources.includes(note.source) &&
    note.createdAt instanceof Date
  );
}

/**
 * Validate extracted entity structure
 */
export function validateExtractedEntity(entity: any): boolean {
  const validTypes = ['contact', 'property', 'task', 'note'];

  return (
    entity &&
    typeof entity === 'object' &&
    validTypes.includes(entity.type) &&
    entity.data !== undefined &&
    typeof entity.confidence === 'number' &&
    entity.confidence >= 0 &&
    entity.confidence <= 1
  );
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize phone number
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
}
