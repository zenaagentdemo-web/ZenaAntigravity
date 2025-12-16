import { UsagePattern, PersonalizationPreferences } from '../hooks/usePersonalization';
import { 
  WidgetPriorityCalculator, 
  WidgetPriorityContext, 
  AgentBehaviorPattern,
  WorkloadMetrics 
} from '../utils/widgetPriorityCalculator';

export interface WidgetLayoutItem {
  widgetId: string;
  priority: number;
  visible: boolean;
  size: 'small' | 'medium' | 'large';
  position: number;
}

export interface PersonalizationInsight {
  type: 'usage_trend' | 'time_pattern' | 'efficiency_tip' | 'feature_suggestion';
  title: string;
  description: string;
  actionable: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
  confidence: number; // 0-1
}

export class PersonalizationService {
  private static instance: PersonalizationService;

  public static getInstance(): PersonalizationService {
    if (!PersonalizationService.instance) {
      PersonalizationService.instance = new PersonalizationService();
    }
    return PersonalizationService.instance;
  }

  /**
   * Calculate optimal widget layout based on usage patterns and time context
   */
  public calculateOptimalLayout(
    usagePatterns: UsagePattern[],
    preferences: PersonalizationPreferences,
    currentContext: {
      timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      urgencyLevel: 'low' | 'medium' | 'high';
      dealTypes: string[];
    },
    workloadMetrics?: WorkloadMetrics
  ): WidgetLayoutItem[] {
    // Fixed order as requested by user:
    // 1. Today's Overview (Smart Summary) - FIRST
    // 2. Quick Actions Panel - SECOND
    // 3. Priority Notifications Panel - THIRD
    // 4. Recent Activity - FOURTH
    // 5. Business Insights (Contextual Insights) - FIFTH
    
    const fixedOrder = [
      { widgetId: 'smart-summary', size: 'large' as const, priority: 15 },
      { widgetId: 'quick-actions', size: 'medium' as const, priority: 14 },
      { widgetId: 'priority-notifications', size: 'medium' as const, priority: 13 },
      { widgetId: 'recent-activity', size: 'medium' as const, priority: 12 },
      { widgetId: 'contextual-insights', size: 'medium' as const, priority: 11 },
      { widgetId: 'calendar', size: 'medium' as const, priority: 10 }
    ];

    return fixedOrder.map((widget, index) => ({
      widgetId: widget.widgetId,
      priority: widget.priority,
      visible: true,
      size: widget.size,
      position: index,
    }));
  }

  /**
   * Calculate usage scores for widgets/actions over a time period
   */
  private calculateRecentUsageScores(
    usagePatterns: UsagePattern[],
    days: number
  ): Record<string, number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentPatterns = usagePatterns.filter(pattern => pattern.timestamp >= cutoffDate);
    
    const scores: Record<string, number> = {};
    
    recentPatterns.forEach(pattern => {
      if (!scores[pattern.actionId]) {
        scores[pattern.actionId] = 0;
      }
      
      // Weight recent usage more heavily
      const daysAgo = (Date.now() - pattern.timestamp.getTime()) / (24 * 60 * 60 * 1000);
      const weight = Math.max(0.1, 1 - (daysAgo / days)); // Linear decay
      
      scores[pattern.actionId] += weight;
    });
    
    return scores;
  }

  /**
   * Generate personalization insights based on usage patterns
   */
  public generateInsights(
    usagePatterns: UsagePattern[],
    preferences: PersonalizationPreferences
  ): PersonalizationInsight[] {
    const insights: PersonalizationInsight[] = [];
    
    // Analyze usage trends
    const usageTrends = this.analyzeUsageTrends(usagePatterns);
    insights.push(...usageTrends);
    
    // Analyze time patterns
    const timePatterns = this.analyzeTimePatterns(usagePatterns);
    insights.push(...timePatterns);
    
    // Generate efficiency tips
    const efficiencyTips = this.generateEfficiencyTips(usagePatterns, preferences);
    insights.push(...efficiencyTips);
    
    // Suggest new features
    const featureSuggestions = this.generateFeatureSuggestions(usagePatterns, preferences);
    insights.push(...featureSuggestions);
    
    // Sort by confidence and return top insights
    return insights
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private analyzeUsageTrends(usagePatterns: UsagePattern[]): PersonalizationInsight[] {
    const insights: PersonalizationInsight[] = [];
    
    if (usagePatterns.length < 20) return insights;
    
    // Analyze weekly trends
    const thisWeek = usagePatterns.filter(p => 
      p.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const lastWeek = usagePatterns.filter(p => 
      p.timestamp >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
      p.timestamp < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (thisWeek.length > lastWeek.length * 1.5) {
      insights.push({
        type: 'usage_trend',
        title: 'Increased Activity',
        description: `Your Zena usage has increased by ${Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100)}% this week!`,
        actionable: false,
        confidence: 0.8,
      });
    }
    
    // Analyze most used features
    const actionCounts: Record<string, number> = {};
    thisWeek.forEach(pattern => {
      actionCounts[pattern.actionId] = (actionCounts[pattern.actionId] || 0) + 1;
    });
    
    const topAction = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (topAction && topAction[1] > 5) {
      insights.push({
        type: 'usage_trend',
        title: 'Top Feature',
        description: `You've been using ${topAction[0].replace('-', ' ')} frequently. Consider adding it to your quick actions.`,
        actionable: true,
        action: {
          label: 'Customize Quick Actions',
          callback: () => console.log('Open quick actions customization'),
        },
        confidence: 0.7,
      });
    }
    
    return insights;
  }

  private analyzeTimePatterns(usagePatterns: UsagePattern[]): PersonalizationInsight[] {
    const insights: PersonalizationInsight[] = [];
    
    if (usagePatterns.length < 30) return insights;
    
    // Analyze time-of-day patterns
    const timeUsage: Record<string, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };
    
    usagePatterns.forEach(pattern => {
      timeUsage[pattern.context.timeOfDay]++;
    });
    
    const peakTime = Object.entries(timeUsage)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (peakTime[1] > usagePatterns.length * 0.4) {
      insights.push({
        type: 'time_pattern',
        title: 'Peak Usage Time',
        description: `You're most active in the ${peakTime[0]}. We've optimized your dashboard for this time.`,
        actionable: false,
        confidence: 0.9,
      });
    }
    
    // Analyze day-of-week patterns
    const dayUsage: Record<number, number> = {};
    usagePatterns.forEach(pattern => {
      const day = pattern.context.dayOfWeek;
      dayUsage[day] = (dayUsage[day] || 0) + 1;
    });
    
    const weekdayUsage = [1, 2, 3, 4, 5].reduce((sum, day) => sum + (dayUsage[day] || 0), 0);
    const weekendUsage = [0, 6].reduce((sum, day) => sum + (dayUsage[day] || 0), 0);
    
    if (weekendUsage > weekdayUsage * 0.3) {
      insights.push({
        type: 'time_pattern',
        title: 'Weekend Activity',
        description: 'You\'re quite active on weekends. Consider enabling weekend-specific notifications.',
        actionable: true,
        action: {
          label: 'Configure Weekend Settings',
          callback: () => console.log('Open weekend settings'),
        },
        confidence: 0.6,
      });
    }
    
    return insights;
  }

  private generateEfficiencyTips(
    usagePatterns: UsagePattern[],
    preferences: PersonalizationPreferences
  ): PersonalizationInsight[] {
    const insights: PersonalizationInsight[] = [];
    
    // Check for keyboard shortcut usage
    const recentPatterns = usagePatterns.filter(p => 
      p.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const quickActionUsage = recentPatterns.filter(p => 
      ['voice-note', 'ask-zena', 'focus-threads', 'property-search'].includes(p.actionId)
    );
    
    if (quickActionUsage.length > 10) {
      insights.push({
        type: 'efficiency_tip',
        title: 'Keyboard Shortcuts',
        description: 'You use quick actions frequently. Try keyboard shortcuts: Alt+V for voice notes, Alt+Z for Ask Zena.',
        actionable: true,
        action: {
          label: 'View All Shortcuts',
          callback: () => console.log('Show keyboard shortcuts'),
        },
        confidence: 0.8,
      });
    }
    
    // Check for gesture usage opportunities
    const swipeableActions = recentPatterns.filter(p => 
      ['smart-summary', 'contextual-insights', 'recent-activity'].includes(p.actionId)
    );
    
    if (swipeableActions.length > 15) {
      insights.push({
        type: 'efficiency_tip',
        title: 'Gesture Navigation',
        description: 'Try swiping left on widgets for quick actions, or pull down to refresh.',
        actionable: false,
        confidence: 0.6,
      });
    }
    
    return insights;
  }

  private generateFeatureSuggestions(
    usagePatterns: UsagePattern[],
    preferences: PersonalizationPreferences
  ): PersonalizationInsight[] {
    const insights: PersonalizationInsight[] = [];
    
    // Suggest voice features for heavy voice note users
    const voiceNoteUsage = usagePatterns.filter(p => p.actionId === 'voice-note').length;
    if (voiceNoteUsage > 20) {
      insights.push({
        type: 'feature_suggestion',
        title: 'Voice Commands',
        description: 'You use voice notes frequently. Try voice commands for hands-free navigation.',
        actionable: true,
        action: {
          label: 'Enable Voice Commands',
          callback: () => console.log('Enable voice commands'),
        },
        confidence: 0.7,
      });
    }
    
    // Suggest calendar integration for appointment-heavy users
    const appointmentUsage = usagePatterns.filter(p => 
      p.context.dealTypes?.includes('appointment') || p.actionId === 'calendar'
    ).length;
    
    if (appointmentUsage > 10) {
      insights.push({
        type: 'feature_suggestion',
        title: 'Calendar Sync',
        description: 'Connect your external calendar for better appointment management.',
        actionable: true,
        action: {
          label: 'Connect Calendar',
          callback: () => console.log('Open calendar integration'),
        },
        confidence: 0.8,
      });
    }
    
    return insights;
  }

  /**
   * Predict optimal content for a given time and context
   */
  public predictOptimalContent(
    usagePatterns: UsagePattern[],
    preferences: PersonalizationPreferences,
    targetTime: Date,
    context: {
      urgencyLevel: 'low' | 'medium' | 'high';
      dealTypes: string[];
    }
  ): {
    prioritizedWidgets: string[];
    suggestedActions: string[];
    contentAdjustments: Record<string, any>;
  } {
    const hour = targetTime.getHours();
    const dayOfWeek = targetTime.getDay();
    
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Find similar historical patterns
    const similarPatterns = usagePatterns.filter(pattern => {
      const patternHour = pattern.timestamp.getHours();
      const patternDay = pattern.timestamp.getDay();
      
      return (
        pattern.context.timeOfDay === timeOfDay &&
        Math.abs(patternDay - dayOfWeek) <= 1 && // Same or adjacent day of week
        Math.abs(patternHour - hour) <= 2 // Within 2 hours
      );
    });

    // Calculate widget priorities based on historical usage
    const widgetUsage: Record<string, number> = {};
    similarPatterns.forEach(pattern => {
      widgetUsage[pattern.actionId] = (widgetUsage[pattern.actionId] || 0) + 1;
    });

    const prioritizedWidgets = Object.entries(widgetUsage)
      .sort(([, a], [, b]) => b - a)
      .map(([widgetId]) => widgetId);

    // Suggest actions based on context and patterns
    const suggestedActions = this.getSuggestedActions(timeOfDay, context, similarPatterns);

    // Content adjustments based on predictions
    const contentAdjustments = {
      smartSummary: {
        emphasizeUrgent: context.urgencyLevel === 'high',
        showAppointments: timeOfDay === 'morning',
        highlightDeals: context.dealTypes.length > 0,
      },
      quickActions: {
        prominentActions: suggestedActions.slice(0, 4),
        showUsageHints: similarPatterns.length < 5,
      },
      contextualInsights: {
        focusOnDeals: context.dealTypes.length > 0,
        showTimeComparison: timeOfDay === 'evening',
      },
    };

    return {
      prioritizedWidgets,
      suggestedActions,
      contentAdjustments,
    };
  }

  private getSuggestedActions(
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
    context: { urgencyLevel: 'low' | 'medium' | 'high'; dealTypes: string[] },
    historicalPatterns: UsagePattern[]
  ): string[] {
    const baseActions = ['voice-note', 'ask-zena', 'focus-threads', 'property-search'];
    
    // Time-based suggestions
    const timeBasedActions: Record<string, string[]> = {
      morning: ['smart-summary', 'calendar', 'priority-notifications'],
      afternoon: ['voice-note', 'property-search', 'ask-zena'],
      evening: ['contextual-insights', 'recent-activity', 'focus-threads'],
      night: ['recent-activity', 'contextual-insights', 'smart-summary'],
    };

    // Historical pattern influence
    const historicalActions = historicalPatterns
      .reduce((acc: Record<string, number>, pattern) => {
        acc[pattern.actionId] = (acc[pattern.actionId] || 0) + 1;
        return acc;
      }, {});

    const historicalSuggestions = Object.entries(historicalActions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([actionId]) => actionId);

    // Combine and deduplicate
    const allSuggestions = [
      ...timeBasedActions[timeOfDay],
      ...historicalSuggestions,
      ...baseActions,
    ];

    // Remove duplicates and return top suggestions
    return Array.from(new Set(allSuggestions)).slice(0, 6);
  }
}

export const personalizationService = PersonalizationService.getInstance();