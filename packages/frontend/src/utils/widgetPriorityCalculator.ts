import { UsagePattern, PersonalizationPreferences } from '../hooks/usePersonalization';

export interface WidgetPriorityContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  urgencyLevel: 'low' | 'medium' | 'high';
  dealTypes: string[];
  agentBehaviorPatterns: AgentBehaviorPattern[];
  currentWorkload: WorkloadMetrics;
}

export interface AgentBehaviorPattern {
  patternType: 'time_preference' | 'feature_usage' | 'workflow_sequence' | 'urgency_response';
  confidence: number; // 0-1
  data: Record<string, any>;
  lastUpdated: Date;
}

export interface WorkloadMetrics {
  focusThreadsCount: number;
  waitingThreadsCount: number;
  atRiskDealsCount: number;
  upcomingAppointmentsCount: number;
  overdueTasksCount: number;
}

export interface WidgetPriorityScore {
  widgetId: string;
  baseScore: number;
  urgencyBonus: number;
  timeBonus: number;
  usageBonus: number;
  behaviorBonus: number;
  workloadBonus: number;
  finalScore: number;
  reasoning: string[];
}

export interface WidgetOrderingResult {
  orderedWidgets: WidgetPriorityScore[];
  visibilityMap: Record<string, boolean>;
  sizeMap: Record<string, 'small' | 'medium' | 'large'>;
  reasoning: string;
}

/**
 * Widget Priority Calculator
 * 
 * Calculates dynamic widget ordering based on:
 * - Agent behavior patterns
 * - Current urgency level
 * - Time of day preferences
 * - Usage frequency
 * - Current workload context
 */
export class WidgetPriorityCalculator {
  private static readonly BASE_PRIORITIES: Record<string, number> = {
    'smart-summary': 10,
    'priority-notifications': 9,
    'quick-actions': 8,
    'contextual-insights': 7,
    'recent-activity': 6,
    'calendar': 5,
  };

  private static readonly URGENCY_MULTIPLIERS: Record<string, Record<string, number>> = {
    high: {
      'priority-notifications': 1.5,
      'smart-summary': 1.3,
      'quick-actions': 1.2,
      'contextual-insights': 1.0,
      'recent-activity': 0.9,
      'calendar': 1.1,
    },
    medium: {
      'priority-notifications': 1.2,
      'smart-summary': 1.1,
      'quick-actions': 1.1,
      'contextual-insights': 1.0,
      'recent-activity': 1.0,
      'calendar': 1.0,
    },
    low: {
      'priority-notifications': 0.9,
      'smart-summary': 1.0,
      'quick-actions': 1.0,
      'contextual-insights': 1.2,
      'recent-activity': 1.1,
      'calendar': 1.0,
    },
  };

  private static readonly TIME_PREFERENCES: Record<string, Record<string, number>> = {
    morning: {
      'smart-summary': 3,
      'calendar': 2,
      'priority-notifications': 2,
      'quick-actions': 1,
      'contextual-insights': 0,
      'recent-activity': 0,
    },
    afternoon: {
      'quick-actions': 3,
      'contextual-insights': 2,
      'recent-activity': 1,
      'smart-summary': 1,
      'priority-notifications': 1,
      'calendar': 1,
    },
    evening: {
      'smart-summary': 2,
      'priority-notifications': 2,
      'recent-activity': 2,
      'contextual-insights': 1,
      'quick-actions': 1,
      'calendar': 0,
    },
    night: {
      'contextual-insights': 3,
      'recent-activity': 2,
      'smart-summary': 1,
      'priority-notifications': 1,
      'quick-actions': 0,
      'calendar': 0,
    },
  };

  /**
   * Calculate widget priority scores based on current context
   */
  public static calculateWidgetPriorities(
    usagePatterns: UsagePattern[],
    preferences: PersonalizationPreferences,
    context: WidgetPriorityContext
  ): WidgetOrderingResult {
    const widgetIds = Object.keys(this.BASE_PRIORITIES);
    const priorityScores: WidgetPriorityScore[] = [];

    for (const widgetId of widgetIds) {
      const score = this.calculateIndividualWidgetScore(
        widgetId,
        usagePatterns,
        preferences,
        context
      );
      priorityScores.push(score);
    }

    // Sort by final score (descending)
    const orderedWidgets = priorityScores.sort((a, b) => b.finalScore - a.finalScore);

    // Calculate visibility and size based on scores and context
    const visibilityMap = this.calculateWidgetVisibility(orderedWidgets, context);
    const sizeMap = this.calculateWidgetSizes(orderedWidgets, context);

    // Generate reasoning for the ordering
    const reasoning = this.generateOrderingReasoning(orderedWidgets, context);

    return {
      orderedWidgets,
      visibilityMap,
      sizeMap,
      reasoning,
    };
  }

  /**
   * Calculate priority score for an individual widget
   */
  private static calculateIndividualWidgetScore(
    widgetId: string,
    usagePatterns: UsagePattern[],
    preferences: PersonalizationPreferences,
    context: WidgetPriorityContext
  ): WidgetPriorityScore {
    const reasoning: string[] = [];
    
    // Base score from preferences or defaults
    const baseScore = preferences.widgetPriorities[widgetId] || this.BASE_PRIORITIES[widgetId] || 5;
    reasoning.push(`Base priority: ${baseScore}`);

    // Urgency bonus
    const urgencyMultiplier = this.URGENCY_MULTIPLIERS[context.urgencyLevel][widgetId] || 1.0;
    const urgencyBonus = (baseScore * urgencyMultiplier) - baseScore;
    if (urgencyBonus !== 0) {
      reasoning.push(`Urgency (${context.urgencyLevel}) adjustment: ${urgencyBonus > 0 ? '+' : ''}${urgencyBonus.toFixed(1)}`);
    }

    // Time of day bonus
    const timeBonus = this.TIME_PREFERENCES[context.timeOfDay][widgetId] || 0;
    if (timeBonus > 0) {
      reasoning.push(`Time of day (${context.timeOfDay}) bonus: +${timeBonus}`);
    }

    // Usage frequency bonus
    const usageBonus = this.calculateUsageBonus(widgetId, usagePatterns);
    if (usageBonus > 0) {
      reasoning.push(`Recent usage bonus: +${usageBonus.toFixed(1)}`);
    }

    // Agent behavior pattern bonus
    const behaviorBonus = this.calculateBehaviorBonus(widgetId, context.agentBehaviorPatterns);
    if (behaviorBonus !== 0) {
      reasoning.push(`Behavior pattern adjustment: ${behaviorBonus > 0 ? '+' : ''}${behaviorBonus.toFixed(1)}`);
    }

    // Workload context bonus
    const workloadBonus = this.calculateWorkloadBonus(widgetId, context.currentWorkload);
    if (workloadBonus !== 0) {
      reasoning.push(`Workload context adjustment: ${workloadBonus > 0 ? '+' : ''}${workloadBonus.toFixed(1)}`);
    }

    const finalScore = baseScore + urgencyBonus + timeBonus + usageBonus + behaviorBonus + workloadBonus;

    return {
      widgetId,
      baseScore,
      urgencyBonus,
      timeBonus,
      usageBonus,
      behaviorBonus,
      workloadBonus,
      finalScore: Math.max(0, finalScore), // Ensure non-negative
      reasoning,
    };
  }

  /**
   * Calculate usage frequency bonus for a widget
   */
  private static calculateUsageBonus(widgetId: string, usagePatterns: UsagePattern[]): number {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsage = usagePatterns.filter(
      pattern => pattern.actionId === widgetId && pattern.timestamp >= oneWeekAgo
    );

    // Weight recent usage more heavily
    let weightedUsage = 0;
    const now = Date.now();

    recentUsage.forEach(pattern => {
      const daysAgo = (now - pattern.timestamp.getTime()) / (24 * 60 * 60 * 1000);
      const weight = Math.max(0.1, 1 - (daysAgo / 7)); // Linear decay over 7 days
      weightedUsage += weight;
    });

    // Convert to bonus points (max 5 points)
    return Math.min(weightedUsage * 0.5, 5);
  }

  /**
   * Calculate behavior pattern bonus for a widget
   */
  private static calculateBehaviorBonus(
    widgetId: string,
    behaviorPatterns: AgentBehaviorPattern[]
  ): number {
    let bonus = 0;

    for (const pattern of behaviorPatterns) {
      switch (pattern.patternType) {
        case 'time_preference':
          if (pattern.data.preferredWidgets?.includes(widgetId)) {
            bonus += pattern.confidence * 2;
          }
          break;

        case 'feature_usage':
          if (pattern.data.frequentlyUsed?.includes(widgetId)) {
            bonus += pattern.confidence * 1.5;
          }
          break;

        case 'workflow_sequence':
          if (pattern.data.primaryWidgets?.includes(widgetId)) {
            bonus += pattern.confidence * 1;
          }
          break;

        case 'urgency_response':
          if (pattern.data.urgencyWidgets?.[widgetId]) {
            bonus += pattern.confidence * pattern.data.urgencyWidgets[widgetId];
          }
          break;
      }
    }

    return Math.min(bonus, 3); // Cap at 3 points
  }

  /**
   * Calculate workload context bonus for a widget
   */
  private static calculateWorkloadBonus(
    widgetId: string,
    workload: WorkloadMetrics
  ): number {
    let bonus = 0;

    switch (widgetId) {
      case 'priority-notifications':
        // Higher priority when there are urgent items
        if (workload.focusThreadsCount > 5 || workload.atRiskDealsCount > 2) {
          bonus += 2;
        } else if (workload.focusThreadsCount > 0 || workload.atRiskDealsCount > 0) {
          bonus += 1;
        }
        break;

      case 'smart-summary':
        // Higher priority when workload is high
        const totalWorkload = workload.focusThreadsCount + workload.waitingThreadsCount + 
                             workload.atRiskDealsCount + workload.overdueTasksCount;
        if (totalWorkload > 15) {
          bonus += 2;
        } else if (totalWorkload > 8) {
          bonus += 1;
        }
        break;

      case 'calendar':
        // Higher priority when appointments are coming up
        if (workload.upcomingAppointmentsCount > 3) {
          bonus += 2;
        } else if (workload.upcomingAppointmentsCount > 0) {
          bonus += 1;
        }
        break;

      case 'quick-actions':
        // Higher priority when workload is moderate (need quick access)
        const moderateWorkload = workload.focusThreadsCount + workload.waitingThreadsCount;
        if (moderateWorkload > 5 && moderateWorkload < 15) {
          bonus += 1;
        }
        break;

      case 'contextual-insights':
        // Lower priority when workload is very high (focus on urgent items)
        const urgentWorkload = workload.focusThreadsCount + workload.atRiskDealsCount + workload.overdueTasksCount;
        if (urgentWorkload > 10) {
          bonus -= 1;
        }
        break;
    }

    return bonus;
  }

  /**
   * Calculate widget visibility based on scores and context
   */
  private static calculateWidgetVisibility(
    orderedWidgets: WidgetPriorityScore[],
    context: WidgetPriorityContext
  ): Record<string, boolean> {
    const visibilityMap: Record<string, boolean> = {};
    
    // Always show top 4 widgets
    const minVisibleWidgets = 4;
    
    // Show more widgets if urgency is low (user has time to browse)
    const maxVisibleWidgets = context.urgencyLevel === 'low' ? 6 : 
                              context.urgencyLevel === 'medium' ? 5 : 4;

    orderedWidgets.forEach((widget, index) => {
      if (index < minVisibleWidgets) {
        // Always show top widgets
        visibilityMap[widget.widgetId] = true;
      } else if (index < maxVisibleWidgets && widget.finalScore > 5) {
        // Show additional widgets if they have decent scores
        visibilityMap[widget.widgetId] = true;
      } else {
        // Hide low-priority widgets
        visibilityMap[widget.widgetId] = false;
      }
    });

    return visibilityMap;
  }

  /**
   * Calculate widget sizes based on importance and context
   */
  private static calculateWidgetSizes(
    orderedWidgets: WidgetPriorityScore[],
    context: WidgetPriorityContext
  ): Record<string, 'small' | 'medium' | 'large'> {
    const sizeMap: Record<string, 'small' | 'medium' | 'large'> = {};
    
    orderedWidgets.forEach((widget, index) => {
      if (index === 0 && widget.finalScore > 12) {
        // Top widget with high score gets large size
        sizeMap[widget.widgetId] = 'large';
      } else if (index < 2 && widget.finalScore > 10) {
        // Top 2 widgets with good scores get medium size
        sizeMap[widget.widgetId] = 'medium';
      } else if (widget.finalScore > 8) {
        // Decent scoring widgets get medium size
        sizeMap[widget.widgetId] = 'medium';
      } else {
        // Lower priority widgets get small size
        sizeMap[widget.widgetId] = 'small';
      }
    });

    // Special size adjustments based on widget type and context
    if (context.urgencyLevel === 'high') {
      // Make urgent widgets larger
      if (sizeMap['priority-notifications']) {
        sizeMap['priority-notifications'] = 'large';
      }
      if (sizeMap['smart-summary']) {
        sizeMap['smart-summary'] = 'large';
      }
    }

    return sizeMap;
  }

  /**
   * Generate human-readable reasoning for the widget ordering
   */
  private static generateOrderingReasoning(
    orderedWidgets: WidgetPriorityScore[],
    context: WidgetPriorityContext
  ): string {
    const topWidget = orderedWidgets[0];
    const contextFactors: string[] = [];

    if (context.urgencyLevel === 'high') {
      contextFactors.push('high urgency level');
    }
    
    if (context.currentWorkload.focusThreadsCount > 5) {
      contextFactors.push('many focus threads');
    }
    
    if (context.currentWorkload.atRiskDealsCount > 0) {
      contextFactors.push('at-risk deals');
    }
    
    if (context.currentWorkload.upcomingAppointmentsCount > 2) {
      contextFactors.push('upcoming appointments');
    }

    const timeContext = `${context.timeOfDay} time preferences`;
    
    let reasoning = `Prioritized ${topWidget.widgetId.replace('-', ' ')} based on `;
    
    if (contextFactors.length > 0) {
      reasoning += contextFactors.join(', ') + ' and ' + timeContext;
    } else {
      reasoning += timeContext + ' and usage patterns';
    }
    
    reasoning += `. Showing ${orderedWidgets.filter((_, i) => i < 6).length} widgets optimized for current context.`;

    return reasoning;
  }

  /**
   * Analyze agent behavior patterns from usage data
   */
  public static analyzeAgentBehaviorPatterns(
    usagePatterns: UsagePattern[],
    _preferences: PersonalizationPreferences
  ): AgentBehaviorPattern[] {
    const patterns: AgentBehaviorPattern[] = [];

    // Analyze time preferences
    const timePreferencePattern = this.analyzeTimePreferences(usagePatterns);
    if (timePreferencePattern) {
      patterns.push(timePreferencePattern);
    }

    // Analyze feature usage patterns
    const featureUsagePattern = this.analyzeFeatureUsage(usagePatterns);
    if (featureUsagePattern) {
      patterns.push(featureUsagePattern);
    }

    // Analyze workflow sequences
    const workflowPattern = this.analyzeWorkflowSequences(usagePatterns);
    if (workflowPattern) {
      patterns.push(workflowPattern);
    }

    // Analyze urgency response patterns
    const urgencyPattern = this.analyzeUrgencyResponse(usagePatterns);
    if (urgencyPattern) {
      patterns.push(urgencyPattern);
    }

    return patterns;
  }

  private static analyzeTimePreferences(usagePatterns: UsagePattern[]): AgentBehaviorPattern | null {
    if (usagePatterns.length < 20) return null;

    const timeUsage: Record<string, Record<string, number>> = {
      morning: {},
      afternoon: {},
      evening: {},
      night: {},
    };

    usagePatterns.forEach(pattern => {
      const timeOfDay = pattern.context.timeOfDay;
      if (!timeUsage[timeOfDay][pattern.actionId]) {
        timeUsage[timeOfDay][pattern.actionId] = 0;
      }
      timeUsage[timeOfDay][pattern.actionId]++;
    });

    // Find preferred widgets for each time period
    const preferredWidgets: Record<string, string[]> = {};
    Object.keys(timeUsage).forEach(timeOfDay => {
      const sortedActions = Object.entries(timeUsage[timeOfDay])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([actionId]) => actionId);
      
      if (sortedActions.length > 0) {
        preferredWidgets[timeOfDay] = sortedActions;
      }
    });

    const confidence = Math.min(usagePatterns.length / 100, 1); // Higher confidence with more data

    return {
      patternType: 'time_preference',
      confidence,
      data: { preferredWidgets },
      lastUpdated: new Date(),
    };
  }

  private static analyzeFeatureUsage(usagePatterns: UsagePattern[]): AgentBehaviorPattern | null {
    if (usagePatterns.length < 10) return null;

    const actionCounts: Record<string, number> = {};
    usagePatterns.forEach(pattern => {
      actionCounts[pattern.actionId] = (actionCounts[pattern.actionId] || 0) + 1;
    });

    const totalUsage = Object.values(actionCounts).reduce((sum, count) => sum + count, 0);
    const frequentlyUsed = Object.entries(actionCounts)
      .filter(([, count]) => count / totalUsage > 0.15) // Used more than 15% of the time
      .map(([actionId]) => actionId);

    if (frequentlyUsed.length === 0) return null;

    const confidence = Math.min(totalUsage / 50, 1);

    return {
      patternType: 'feature_usage',
      confidence,
      data: { frequentlyUsed, actionCounts },
      lastUpdated: new Date(),
    };
  }

  private static analyzeWorkflowSequences(usagePatterns: UsagePattern[]): AgentBehaviorPattern | null {
    if (usagePatterns.length < 30) return null;

    // Sort patterns by timestamp
    const sortedPatterns = [...usagePatterns].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Find sequences (actions within 5 minutes of each other)
    const sequences: string[][] = [];
    let currentSequence: string[] = [];
    let lastTimestamp = 0;

    sortedPatterns.forEach(pattern => {
      const timeDiff = pattern.timestamp.getTime() - lastTimestamp;
      
      if (timeDiff < 5 * 60 * 1000 && currentSequence.length > 0) { // Within 5 minutes
        currentSequence.push(pattern.actionId);
      } else {
        if (currentSequence.length > 1) {
          sequences.push([...currentSequence]);
        }
        currentSequence = [pattern.actionId];
      }
      
      lastTimestamp = pattern.timestamp.getTime();
    });

    if (currentSequence.length > 1) {
      sequences.push(currentSequence);
    }

    // Find most common starting widgets
    const primaryWidgets = sequences
      .map(seq => seq[0])
      .reduce((acc: Record<string, number>, widget) => {
        acc[widget] = (acc[widget] || 0) + 1;
        return acc;
      }, {});

    const topPrimaryWidgets = Object.entries(primaryWidgets)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([widget]) => widget);

    if (topPrimaryWidgets.length === 0) return null;

    const confidence = Math.min(sequences.length / 20, 1);

    return {
      patternType: 'workflow_sequence',
      confidence,
      data: { primaryWidgets: topPrimaryWidgets, sequences },
      lastUpdated: new Date(),
    };
  }

  private static analyzeUrgencyResponse(usagePatterns: UsagePattern[]): AgentBehaviorPattern | null {
    const urgencyPatterns = usagePatterns.filter(p => p.context.urgencyLevel);
    if (urgencyPatterns.length < 15) return null;

    const urgencyWidgets: Record<string, Record<string, number>> = {
      high: {},
      medium: {},
      low: {},
    };

    urgencyPatterns.forEach(pattern => {
      const urgency = pattern.context.urgencyLevel!;
      if (!urgencyWidgets[urgency][pattern.actionId]) {
        urgencyWidgets[urgency][pattern.actionId] = 0;
      }
      urgencyWidgets[urgency][pattern.actionId]++;
    });

    // Calculate preference scores for each urgency level
    const urgencyPreferences: Record<string, Record<string, number>> = {};
    
    Object.keys(urgencyWidgets).forEach(urgency => {
      const total = Object.values(urgencyWidgets[urgency]).reduce((sum, count) => sum + count, 0);
      urgencyPreferences[urgency] = {};
      
      Object.entries(urgencyWidgets[urgency]).forEach(([widget, count]) => {
        urgencyPreferences[urgency][widget] = count / total;
      });
    });

    const confidence = Math.min(urgencyPatterns.length / 30, 1);

    return {
      patternType: 'urgency_response',
      confidence,
      data: { urgencyWidgets: urgencyPreferences },
      lastUpdated: new Date(),
    };
  }
}