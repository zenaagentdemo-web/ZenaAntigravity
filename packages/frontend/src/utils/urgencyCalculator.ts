/**
 * Utility functions for calculating urgency levels and determining priority indicators
 * Based on business metrics and workload analysis
 */

export interface BusinessMetrics {
  focusThreadsCount: number;
  waitingThreadsCount: number;
  atRiskDealsCount: number;
  overdueTasksCount?: number;
  responseTimeAverage?: number; // in hours
}

export type UrgencyLevel = 'low' | 'medium' | 'high';

/**
 * Determines the overall urgency level based on business metrics
 */
export function calculateUrgencyLevel(metrics: BusinessMetrics): UrgencyLevel {
  const {
    focusThreadsCount,
    waitingThreadsCount,
    atRiskDealsCount,
    overdueTasksCount = 0,
    responseTimeAverage = 0
  } = metrics;

  // Critical indicators that immediately trigger high urgency
  if (atRiskDealsCount > 0) {
    return 'high';
  }

  if (focusThreadsCount > 5 || overdueTasksCount > 3) {
    return 'high';
  }

  // Response time degradation indicates high urgency
  if (responseTimeAverage > 24) { // More than 24 hours average response time
    return 'high';
  }

  // Medium urgency indicators
  const totalUrgentItems = focusThreadsCount + overdueTasksCount;
  if (totalUrgentItems > 2 || waitingThreadsCount > 8) {
    return 'medium';
  }

  if (focusThreadsCount > 0 || waitingThreadsCount > 3) {
    return 'medium';
  }

  // Low urgency - everything is under control
  return 'low';
}

/**
 * Generates contextual messaging based on workload and urgency
 */
export function generateContextualMessage(
  metrics: BusinessMetrics,
  urgencyLevel: UrgencyLevel
): string {
  const { focusThreadsCount, waitingThreadsCount, atRiskDealsCount } = metrics;
  const totalUrgent = focusThreadsCount + atRiskDealsCount;

  // High urgency messages
  if (urgencyLevel === 'high') {
    if (atRiskDealsCount > 0) {
      return `Critical: ${atRiskDealsCount} deals need immediate attention to prevent loss.`;
    }
    if (focusThreadsCount > 5) {
      return `High priority: ${focusThreadsCount} focus threads require urgent responses.`;
    }
    return "Multiple high-priority items need your immediate attention.";
  }

  // Medium urgency messages
  if (urgencyLevel === 'medium') {
    if (totalUrgent > 2) {
      return "You have several important items to address. Focus on priority threads first.";
    }
    if (waitingThreadsCount > 8) {
      return `${waitingThreadsCount} threads are waiting for responses. Consider batch processing.`;
    }
    return "Some items need your attention. Stay focused on priorities.";
  }

  // Low urgency messages
  if (totalUrgent === 0 && waitingThreadsCount === 0) {
    return "Excellent work! You're all caught up. Consider reaching out to prospects.";
  }

  if (totalUrgent === 0) {
    return "Great job staying on top of priorities! Keep monitoring waiting threads.";
  }

  return "Looking good! Maintain your current pace and stay responsive.";
}

/**
 * Determines if a metric should have urgency styling
 */
export function shouldShowUrgencyIndicator(
  metricType: 'focus' | 'waiting' | 'at-risk',
  count: number,
  urgencyLevel: UrgencyLevel
): boolean {
  switch (metricType) {
    case 'at-risk':
      return count > 0; // Any at-risk deals are urgent
    case 'focus':
      return count > 5 || (count > 0 && urgencyLevel === 'high');
    case 'waiting':
      return count > 8 || (count > 5 && urgencyLevel === 'high');
    default:
      return false;
  }
}

/**
 * Gets the appropriate CSS class for urgency styling
 */
export function getUrgencyClass(
  metricType: 'focus' | 'waiting' | 'at-risk',
  count: number,
  urgencyLevel: UrgencyLevel
): string {
  if (!shouldShowUrgencyIndicator(metricType, count, urgencyLevel)) {
    return '';
  }

  switch (metricType) {
    case 'at-risk':
      return 'smart-summary-metric--critical';
    case 'focus':
      return count > 8 ? 'smart-summary-metric--critical' : 'smart-summary-metric--urgent';
    case 'waiting':
      return count > 12 ? 'smart-summary-metric--urgent' : 'smart-summary-metric--warning';
    default:
      return '';
  }
}

/**
 * Calculates priority score for sorting and display purposes
 */
export function calculatePriorityScore(metrics: BusinessMetrics): number {
  const { focusThreadsCount, waitingThreadsCount, atRiskDealsCount } = metrics;
  
  let score = 0;
  
  // At-risk deals have highest weight
  score += atRiskDealsCount * 10;
  
  // Focus threads have high weight
  score += focusThreadsCount * 3;
  
  // Waiting threads have moderate weight
  score += waitingThreadsCount * 1;
  
  return score;
}