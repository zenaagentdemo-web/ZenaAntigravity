/**
 * Type definitions for the Enhanced New Page
 * 
 * These interfaces define the data models for thread management,
 * priority calculation, filtering, and batch operations.
 * 
 * Requirements: 2.1, 3.1
 */

// ============================================================================
// Thread Classification and Risk Types
// ============================================================================

/**
 * Classification of email threads based on sender/content analysis
 */
export type ThreadClassification = 'buyer' | 'vendor' | 'market' | 'lawyer_broker' | 'noise';

/**
 * Risk level assessment for threads
 */
export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

/**
 * Role of a participant in a thread
 */
export type ParticipantRole = 'buyer' | 'vendor' | 'agent' | 'lawyer' | 'broker' | 'other';

/**
 * Stage of a deal in the pipeline
 */
export type DealStage = 'inquiry' | 'viewing' | 'offer' | 'negotiation' | 'conditional' | 'unconditional' | 'settled';

// ============================================================================
// Participant Model
// ============================================================================

/**
 * Represents a participant in an email thread
 */
export interface Participant {
  id: string;
  name: string;
  email: string;
  role?: ParticipantRole;
  avatarUrl?: string;
}

// ============================================================================
// Message Preview Model
// ============================================================================

/**
 * Data structure for sending a reply
 */
export interface ReplyData {
  threadId: string;
  recipients: string[];
  subject: string;
  message: string;
  attachments?: File[];
}

/**
 * Preview of a message within a thread
 */
export interface MessagePreview {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isFromUser: boolean;
}

// ============================================================================
// Thread Model
// ============================================================================

export type ReplyStyle = 'Friendly' | 'Professional' | 'Casual';

/**
 * Represents an email thread requiring user response
 */
export interface Thread {
  id: string;
  subject: string;
  participants: Participant[];
  classification: ThreadClassification;
  riskLevel: RiskLevel;
  riskReason?: string;
  lastMessageAt: string;
  createdAt: string;
  draftResponse?: string;
  summary: string;
  aiSummary?: string;
  propertyId?: string;
  propertyAddress?: string;
  dealId?: string;
  dealStage?: DealStage;
  messageCount: number;
  unreadCount: number;
  lastMessages?: MessagePreview[];
  suggestedReplies?: string[];
  priorityScore?: number;
  snoozedUntil?: string;
  /** Folder ID for folder filtering */
  folderId?: string;
}

// ============================================================================
// Priority Calculation Models
// ============================================================================

/**
 * Configuration for priority score calculation weights
 */
export interface PriorityConfig {
  /** Weight for risk level factor (default: 0.4 = 40%) */
  riskWeight: number;
  /** Weight for age/time factor (default: 0.3 = 30%) */
  ageWeight: number;
  /** Weight for classification business value (default: 0.3 = 30%) */
  classificationWeight: number;
}

/**
 * Individual factor scores used in priority calculation
 */
export interface PriorityFactors {
  /** Score based on risk level (0-100) */
  riskScore: number;
  /** Score based on hours since last message (0-100) */
  ageScore: number;
  /** Score based on classification business value (0-100) */
  classificationScore: number;
}

/**
 * Result of priority score calculation
 */
export interface PriorityScoreResult {
  /** Final calculated priority score (0-100) */
  score: number;
  /** Individual factor scores */
  factors: PriorityFactors;
  /** Whether the thread is considered overdue (>48 hours) */
  isOverdue: boolean;
}

/**
 * Business value mapping for thread classifications
 * Higher values indicate more important business communications
 */
export const CLASSIFICATION_VALUES: Record<ThreadClassification, number> = {
  vendor: 100,      // Highest - potential listings
  buyer: 90,        // High - potential sales
  lawyer_broker: 70, // Medium-high - deal progress
  market: 40,       // Medium - opportunities
  noise: 10         // Low - spam/irrelevant
};

/**
 * Risk level to score mapping
 */
export const RISK_LEVEL_SCORES: Record<RiskLevel, number> = {
  high: 100,
  medium: 70,
  low: 30,
  none: 0
};

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Available filter types for thread list
 */
export type FilterType = 'all' | 'buyer' | 'vendor' | 'high_risk' | 'normal';

/**
 * Filter option with metadata
 */
export interface FilterOption {
  type: FilterType;
  label: string;
  count: number;
  icon?: string;
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Available actions that can be performed on a thread
 */
export type ThreadAction = 'view' | 'snooze' | 'send_draft' | 'archive' | 'mark_read';

/**
 * Batch actions for multiple items (threads, contacts, etc.)
 */
export type BatchAction = 'snooze_all' | 'archive_all' | 'mark_read' | 'delete_all' | 'compose' | 'tag';

/**
 * Snooze duration options
 */
export interface SnoozeOptions {
  duration: '1h' | '4h' | 'tomorrow' | 'next_week' | 'custom';
  customDate?: string;
}

/**
 * Result of an action execution
 */
export interface ActionResult {
  success: boolean;
  threadId: string;
  action: ThreadAction;
  error?: string;
  timestamp: string;
}

// ============================================================================
// Swipe Gesture Types
// ============================================================================

/**
 * Direction of a swipe gesture
 */
export type SwipeDirection = 'left' | 'right';

/**
 * State of an active swipe gesture
 */
export interface SwipeState {
  /** ID of the thread being swiped, null if no active swipe */
  threadId: string | null;
  /** Starting X coordinate of the swipe */
  startX: number;
  /** Current X coordinate during swipe */
  currentX: number;
  /** Calculated swipe direction */
  direction: SwipeDirection | null;
  /** Whether a swipe is currently in progress */
  isSwiping: boolean;
  /** Threshold in pixels to trigger action (default: 80) */
  threshold: number;
}

/**
 * Default swipe state
 */
export const DEFAULT_SWIPE_STATE: SwipeState = {
  threadId: null,
  startX: 0,
  currentX: 0,
  direction: null,
  isSwiping: false,
  threshold: 80
};

// ============================================================================
// Sync and Cache Types
// ============================================================================

/**
 * Status of data synchronization
 */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

/**
 * Cache entry with TTL
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Queued action for offline support
 */
export interface QueuedAction {
  id: string;
  threadId: string;
  action: ThreadAction;
  payload?: unknown;
  timestamp: string;
  retryCount: number;
}

// ============================================================================
// Reply Template Types
// ============================================================================

/**
 * Category of reply template for organization
 */
export type TemplateCategory = 'greeting' | 'followup' | 'scheduling' | 'closing' | 'information' | 'negotiation';

/**
 * Variable type for template substitution
 */
export type TemplateVariableType = 'text' | 'date' | 'amount' | 'property_address';

/**
 * Variable definition for template substitution
 */
export interface TemplateVariable {
  /** Variable name for substitution (e.g., "client_name") */
  name: string;
  /** Type of variable for validation */
  type: TemplateVariableType;
  /** Whether this variable is required */
  required: boolean;
  /** Default value if not provided */
  default_value?: string;
}

/**
 * Reply template for quick responses
 */
export interface ReplyTemplate {
  /** Unique template identifier */
  id: string;
  /** Display name for the template */
  name: string;
  /** Template content with variable placeholders */
  content: string;
  /** Thread classification this template applies to */
  classification: ThreadClassification;
  /** Category for organization */
  category: TemplateCategory;
  /** Variables that can be substituted in content */
  variables: TemplateVariable[];
  /** Number of times this template has been used */
  usage_count: number;
  /** Effectiveness score based on response rates (0-1) */
  effectiveness_score: number;
}

/**
 * Data for composing a reply
 */
export interface ReplyData {
  /** Thread ID being replied to */
  threadId: string;
  /** Recipient email addresses */
  recipients: string[];
  /** Email subject line */
  subject: string;
  /** Message content */
  message: string;
  /** Template ID if using a template */
  templateId?: string;
}

/**
 * State of reply sending operation
 */
export type SendingState = 'idle' | 'sending' | 'success' | 'error';

// ============================================================================
// Component State Types
// ============================================================================

/**
 * State for the New Page container
 */
export interface NewPageState {
  threads: Thread[];
  filteredThreads: Thread[];
  isLoading: boolean;
  error: Error | null;
  activeFilters: FilterType[];
  searchQuery: string;
  batchMode: boolean;
  selectedThreadIds: Set<string>;
  newThreadsAvailable: number;
  syncStatus: SyncStatus;
  expandedThreadId: string | null;
}

/**
 * Default state for New Page
 */
export const DEFAULT_NEW_PAGE_STATE: NewPageState = {
  threads: [],
  filteredThreads: [],
  isLoading: true,
  error: null,
  activeFilters: ['all'],
  searchQuery: '',
  batchMode: false,
  selectedThreadIds: new Set(),
  newThreadsAvailable: 0,
  syncStatus: 'idle',
  expandedThreadId: null
};

// ============================================================================
// Thread View Page Types
// ============================================================================

/**
 * Attachment metadata for messages
 */
export interface AttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  messageId: string;
}

/**
 * Full message with attachments for thread view
 */
export interface MessageWithAttachments {
  id: string;
  externalId: string;
  threadId: string;
  from: {
    name: string;
    email: string;
  };
  to: Array<{
    name: string;
    email: string;
  }>;
  cc?: Array<{
    name: string;
    email: string;
  }>;
  bcc?: Array<{
    name: string;
    email: string;
  }>;
  subject: string;
  body: string;
  bodyHtml?: string;
  sentAt: string;
  receivedAt: string;
  isFromUser: boolean;
  isRead: boolean;
  attachments: AttachmentMeta[];
}

/**
 * AI-generated insights for a thread
 */
export interface AIThreadInsights {
  summary: string;
  keyPoints: string[];
  suggestedNextActions: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  riskAnalysis?: {
    level: RiskLevel;
    reasons: string[];
  };
  extractedDates?: Array<{
    date: string;
    context: string;
  }>;
  extractedAmounts?: Array<{
    amount: string;
    context: string;
  }>;
}

/**
 * Extended thread data for the detailed view page
 */
export interface ThreadDetailedView extends Thread {
  messages: MessageWithAttachments[];
  aiInsights?: AIThreadInsights;
  attachments: AttachmentMeta[];
  linkedProperty?: {
    id: string;
    address: string;
    price?: string;
    imageUrl?: string;
  };
  linkedDeal?: {
    id: string;
    stage: DealStage;
    riskLevel: RiskLevel;
    nextAction?: string;
    nextActionOwner?: 'agent' | 'other';
  };
  /** Whether the user has replied to this thread */
  hasReplied: boolean;
  /** Last time the user viewed this thread */
  lastViewedAt?: string;
}

/**
 * State for message expand/collapse in thread view
 */
export interface MessageExpandState {
  expandedIds: Set<string>;
  allExpanded: boolean;
}

/**
 * Default message expand state (all collapsed)
 */
export const DEFAULT_MESSAGE_EXPAND_STATE: MessageExpandState = {
  expandedIds: new Set(),
  allExpanded: false
};
