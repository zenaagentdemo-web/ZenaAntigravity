/**
 * Thread Priority Calculator
 * 
 * Calculates priority scores for email threads based on:
 * - Risk level (40% weight)
 * - Age/time since last message (30% weight)
 * - Classification business value (30% weight)
 * 
 * Requirements: 2.1, 2.2
 */

import {
  Thread,
  PriorityConfig,
  PriorityFactors,
  PriorityScoreResult,
  CLASSIFICATION_VALUES,
  RISK_LEVEL_SCORES
} from '../models/newPage.types';

/**
 * Default priority configuration with standard weights
 */
export const DEFAULT_PRIORITY_CONFIG: PriorityConfig = {
  riskWeight: 0.4,      // 40% weight for risk level
  ageWeight: 0.3,       // 30% weight for age/time
  classificationWeight: 0.3  // 30% weight for classification
};

/**
 * Threshold in hours after which a thread is considered overdue
 */
export const OVERDUE_THRESHOLD_HOURS = 48;

/**
 * Maximum age in hours for age score calculation
 * Threads older than this get maximum age score
 */
const MAX_AGE_HOURS = 72;

/**
 * Calculate the age score based on hours since last message
 * 
 * Score increases as the thread gets older:
 * - 0 hours = 0 score
 * - 72+ hours = 100 score (maximum)
 * 
 * @param lastMessageAt - ISO timestamp of the last message
 * @returns Age score between 0-100
 */
export function calculateAgeScore(lastMessageAt: string): number {
  const lastMessageTime = new Date(lastMessageAt).getTime();
  const now = Date.now();
  const hoursSinceLastMessage = (now - lastMessageTime) / (1000 * 60 * 60);
  
  // Clamp to 0-MAX_AGE_HOURS range and normalize to 0-100
  const clampedHours = Math.max(0, Math.min(hoursSinceLastMessage, MAX_AGE_HOURS));
  return (clampedHours / MAX_AGE_HOURS) * 100;
}

/**
 * Check if a thread is overdue (more than 48 hours since last message)
 * 
 * @param lastMessageAt - ISO timestamp of the last message
 * @returns true if the thread is overdue
 */
export function isThreadOverdue(lastMessageAt: string): boolean {
  const lastMessageTime = new Date(lastMessageAt).getTime();
  const now = Date.now();
  const hoursSinceLastMessage = (now - lastMessageTime) / (1000 * 60 * 60);
  
  return hoursSinceLastMessage > OVERDUE_THRESHOLD_HOURS;
}

/**
 * Calculate the priority score for a thread
 * 
 * The score is calculated as a weighted sum of three factors:
 * - Risk score: Based on the thread's risk level (high=100, medium=70, low=30, none=0)
 * - Age score: Based on hours since last message (0-72 hours mapped to 0-100)
 * - Classification score: Based on business value (vendor=100, buyer=90, etc.)
 * 
 * Formula: score = (riskScore × riskWeight) + (ageScore × ageWeight) + (classificationScore × classificationWeight)
 * 
 * @param thread - The thread to calculate priority for
 * @param config - Optional custom priority configuration
 * @returns Priority score result with score, factors, and overdue status
 */
export function calculatePriorityScore(
  thread: Thread,
  config: PriorityConfig = DEFAULT_PRIORITY_CONFIG
): PriorityScoreResult {
  // Calculate individual factor scores
  const riskScore = RISK_LEVEL_SCORES[thread.riskLevel];
  const classificationScore = CLASSIFICATION_VALUES[thread.classification];
  const ageScore = calculateAgeScore(thread.lastMessageAt);
  
  const factors: PriorityFactors = {
    riskScore,
    ageScore,
    classificationScore
  };
  
  // Calculate weighted sum
  const score = 
    (riskScore * config.riskWeight) +
    (ageScore * config.ageWeight) +
    (classificationScore * config.classificationWeight);
  
  // Check if thread is overdue
  const isOverdue = isThreadOverdue(thread.lastMessageAt);
  
  return {
    score,
    factors,
    isOverdue
  };
}

/**
 * Sort threads by priority score in descending order
 * 
 * Threads with higher priority scores appear first.
 * This ensures the most important threads are at the top of the list.
 * 
 * @param threads - Array of threads to sort
 * @param config - Optional custom priority configuration
 * @returns New array of threads sorted by priority (highest first)
 */
export function sortThreadsByPriority(
  threads: Thread[],
  config: PriorityConfig = DEFAULT_PRIORITY_CONFIG
): Thread[] {
  return [...threads].sort((a, b) => {
    const scoreA = calculatePriorityScore(a, config).score;
    const scoreB = calculatePriorityScore(b, config).score;
    return scoreB - scoreA; // Descending order
  });
}

/**
 * Get threads with priority scores attached
 * 
 * @param threads - Array of threads
 * @param config - Optional custom priority configuration
 * @returns Array of threads with priorityScore property set
 */
export function attachPriorityScores(
  threads: Thread[],
  config: PriorityConfig = DEFAULT_PRIORITY_CONFIG
): Thread[] {
  return threads.map(thread => ({
    ...thread,
    priorityScore: calculatePriorityScore(thread, config).score
  }));
}

/**
 * Filter threads by minimum priority score
 * 
 * @param threads - Array of threads
 * @param minScore - Minimum priority score threshold
 * @param config - Optional custom priority configuration
 * @returns Filtered array of threads meeting the minimum score
 */
export function filterByMinPriority(
  threads: Thread[],
  minScore: number,
  config: PriorityConfig = DEFAULT_PRIORITY_CONFIG
): Thread[] {
  return threads.filter(thread => 
    calculatePriorityScore(thread, config).score >= minScore
  );
}

/**
 * Get overdue threads
 * 
 * @param threads - Array of threads
 * @returns Array of threads that are overdue (>48 hours since last message)
 */
export function getOverdueThreads(threads: Thread[]): Thread[] {
  return threads.filter(thread => isThreadOverdue(thread.lastMessageAt));
}

/**
 * Get high-risk threads
 * 
 * @param threads - Array of threads
 * @returns Array of threads with high risk level
 */
export function getHighRiskThreads(threads: Thread[]): Thread[] {
  return threads.filter(thread => thread.riskLevel === 'high');
}

/**
 * Count threads by urgency level
 * 
 * @param threads - Array of threads
 * @returns Object with counts for each urgency category
 */
export function countByUrgency(threads: Thread[]): {
  high: number;
  medium: number;
  low: number;
  overdue: number;
} {
  return {
    high: threads.filter(t => t.riskLevel === 'high').length,
    medium: threads.filter(t => t.riskLevel === 'medium').length,
    low: threads.filter(t => t.riskLevel === 'low' || t.riskLevel === 'none').length,
    overdue: threads.filter(t => isThreadOverdue(t.lastMessageAt)).length
  };
}
