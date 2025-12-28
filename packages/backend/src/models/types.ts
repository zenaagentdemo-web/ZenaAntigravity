// Type definitions for Zena AI Real Estate PWA
// These types complement the Prisma-generated types

// ===========================================
// DEAL FLOW TYPES
// ===========================================

// Pipeline type - determines which stage set to use
export type PipelineType = 'buyer' | 'seller';

// Sale method - NZ-specific sale types
export type SaleMethod = 'negotiation' | 'auction' | 'tender' | 'deadline_sale';

// Buyer pipeline stages
export type BuyerStage =
  | 'buyer_consult'
  | 'shortlisting'
  | 'viewings'
  | 'offer_made'
  | 'conditional'
  | 'unconditional'
  | 'pre_settlement'
  | 'settled'
  | 'nurture';

// Seller pipeline stages
export type SellerStage =
  | 'appraisal'
  | 'listing_signed'
  | 'marketing'
  | 'offers_received'
  | 'conditional'
  | 'unconditional'
  | 'pre_settlement'
  | 'settled'
  | 'nurture';

// Combined deal stage type
export type DealStage = BuyerStage | SellerStage;

// Risk level with critical for urgent deadlines
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

// Condition types for NZ real estate
export type ConditionType =
  | 'finance'
  | 'building_report'
  | 'lim'
  | 'solicitor'
  | 'insurance'
  | 'other';

// Condition status tracking
export type ConditionStatus = 'pending' | 'satisfied' | 'waived' | 'failed';

// Deal condition stored in conditions JSON field
export interface DealCondition {
  id: string;
  type: ConditionType;
  label: string;
  dueDate: string; // ISO date string
  status: ConditionStatus;
  notes?: string;
  satisfiedAt?: string; // ISO date string when satisfied
}

// Commission tier for tiered commission structures
export interface CommissionTier {
  minPrice: number;
  maxPrice: number | null; // null = unlimited (e.g., "$1M+")
  rate: number; // e.g., 0.04 for 4%
  fixedFee?: number; // Optional flat fee component
}

// ===========================================
// THREAD AND CONTACT TYPES
// ===========================================

export type ThreadClassification =
  | 'buyer'
  | 'vendor'
  | 'market'
  | 'lawyer_broker'
  | 'noise';

export type ThreadCategory = 'focus' | 'waiting';

export type ActionOwner = 'agent' | 'other';

export type ContactRole = 'buyer' | 'vendor' | 'market' | 'other';

export type EmailProvider = 'gmail' | 'outlook' | 'icloud' | 'yahoo' | 'imap';

export type CalendarProvider = 'google' | 'microsoft' | 'icloud';

export type TimelineEventType =
  | 'email'
  | 'call'
  | 'meeting'
  | 'task'
  | 'note'
  | 'voice_note';

export type EntityType = 'thread' | 'contact' | 'property' | 'deal';

export type TaskStatus = 'open' | 'completed';

export type TaskSource = 'email' | 'voice_note' | 'manual' | 'ai_suggested';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type CRMProvider =
  | 'mri_vault'
  | 'salesforce'
  | 'top_producer'
  | 'kvcore'
  | 'follow_up_boss';

export type ExportType = 'contacts' | 'properties' | 'deals';

export type ExportFormat = 'csv' | 'xlsx' | 'vcard';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';


// Participant in email thread
export interface Participant {
  name: string;
  email: string;
  role?: ContactRole | 'agent' | 'lawyer' | 'broker';
}

// Relationship note for contacts
export interface RelationshipNote {
  id: string;
  content: string;
  source: 'email' | 'voice_note' | 'manual';
  createdAt: Date;
}

// Campaign milestone for properties
export interface CampaignMilestone {
  id: string;
  type: 'listing' | 'first_open' | 'offer_received' | 'conditional' | 'unconditional' | 'settled';
  date: Date;
  notes?: string;
}

// Extracted entity from voice notes
export interface ExtractedEntity {
  type: 'contact' | 'property' | 'task' | 'note';
  data: any;
  confidence: number;
}

// User preferences
export interface UserPreferences {
  notificationSettings: NotificationSettings;
  voiceSettings: VoiceSettings;
  uiSettings: UISettings;
}

export interface NotificationSettings {
  enabled: boolean;
  highPriorityThreads: boolean;
  riskDeals: boolean;
  calendarReminders: boolean;
  taskReminders: boolean;
}

export interface VoiceSettings {
  sttProvider: 'openai' | 'google';
  ttsProvider: 'openai' | 'google';
  ttsVoice: string;
  autoPlayResponses: boolean;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  focusListSize: number;
  defaultView: 'focus' | 'waiting' | 'ask_zena';
}

// CRM sync configuration
export interface CRMSyncConfig {
  syncContacts: boolean;
  syncProperties: boolean;
  syncDeals: boolean;
  syncDirection: 'push' | 'pull' | 'bidirectional';
}
