import { useState, useEffect, useCallback } from 'react';

export interface UsagePattern {
  actionId: string;
  timestamp: Date;
  context: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: number; // 0-6, Sunday = 0
    urgencyLevel?: 'low' | 'medium' | 'high';
    dealTypes?: string[];
  };
}

export interface PersonalizationPreferences {
  preferredQuickActions: string[];
  widgetPriorities: Record<string, number>;
  timeBasedPreferences: {
    morning: string[];
    afternoon: string[];
    evening: string[];
    night: string[];
  };
  dealTypeFocus: string[];
  lastUpdated: Date;
}

export interface PersonalizationData {
  usagePatterns: UsagePattern[];
  preferences: PersonalizationPreferences;
  learningEnabled: boolean;
}

const STORAGE_KEY = 'zena-personalization';
const MAX_USAGE_PATTERNS = 1000; // Limit stored patterns to prevent excessive storage

// Default preferences
const DEFAULT_PREFERENCES: PersonalizationPreferences = {
  preferredQuickActions: ['voice-note', 'ask-zena', 'focus-threads', 'property-search'],
  widgetPriorities: {
    'smart-summary': 10,        // Today's Overview - First
    'quick-actions': 9,         // Quick Actions - Second  
    'priority-notifications': 8, // Priority Notifications - Third
    'recent-activity': 7,       // Recent Activity - Fourth
    'contextual-insights': 6,   // Business Insights - Fifth
    'calendar': 5,
  },
  timeBasedPreferences: {
    morning: ['smart-summary', 'quick-actions', 'priority-notifications'],
    afternoon: ['smart-summary', 'quick-actions', 'recent-activity'],
    evening: ['smart-summary', 'priority-notifications', 'recent-activity'],
    night: ['smart-summary', 'recent-activity', 'contextual-insights'],
  },
  dealTypeFocus: [],
  lastUpdated: new Date(),
};

export const usePersonalization = () => {
  const [personalizationData, setPersonalizationData] = useState<PersonalizationData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          usagePatterns: parsed.usagePatterns?.map((p: any) => ({
            ...p,
            timestamp: new Date(p.timestamp),
          })) || [],
          preferences: {
            ...DEFAULT_PREFERENCES,
            ...parsed.preferences,
            lastUpdated: new Date(parsed.preferences?.lastUpdated || Date.now()),
          },
          learningEnabled: parsed.learningEnabled ?? true,
        };
      }
    } catch (error) {
      console.error('Failed to load personalization data:', error);
    }
    
    return {
      usagePatterns: [],
      preferences: DEFAULT_PREFERENCES,
      learningEnabled: true,
    };
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(personalizationData));
    } catch (error) {
      console.error('Failed to save personalization data:', error);
    }
  }, [personalizationData]);

  // Get current time context
  const getCurrentTimeContext = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'night';
    }

    return { timeOfDay, dayOfWeek };
  }, []);

  // Track usage pattern
  const trackUsage = useCallback((
    actionId: string, 
    additionalContext?: {
      urgencyLevel?: 'low' | 'medium' | 'high';
      dealTypes?: string[];
    }
  ) => {
    if (!personalizationData.learningEnabled) return;

    const { timeOfDay, dayOfWeek } = getCurrentTimeContext();
    
    const newPattern: UsagePattern = {
      actionId,
      timestamp: new Date(),
      context: {
        timeOfDay,
        dayOfWeek,
        ...additionalContext,
      },
    };

    setPersonalizationData(prev => {
      const updatedPatterns = [newPattern, ...prev.usagePatterns].slice(0, MAX_USAGE_PATTERNS);
      
      return {
        ...prev,
        usagePatterns: updatedPatterns,
      };
    });
  }, [personalizationData.learningEnabled, getCurrentTimeContext]);

  // Calculate action frequency for a given time period
  const getActionFrequency = useCallback((
    actionId: string, 
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): number => {
    const now = new Date();
    const timeframeDays = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const cutoffDate = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    return personalizationData.usagePatterns.filter(
      pattern => pattern.actionId === actionId && pattern.timestamp >= cutoffDate
    ).length;
  }, [personalizationData.usagePatterns]);

  // Get time-based preferences for current time
  const getCurrentTimePreferences = useCallback((): string[] => {
    const { timeOfDay } = getCurrentTimeContext();
    return personalizationData.preferences.timeBasedPreferences[timeOfDay] || [];
  }, [personalizationData.preferences.timeBasedPreferences, getCurrentTimeContext]);

  // Calculate widget priority based on usage patterns and time
  const calculateWidgetPriority = useCallback((widgetId: string): number => {
    const basePriority = personalizationData.preferences.widgetPriorities[widgetId] || 5;
    const timePreferences = getCurrentTimePreferences();
    const timeBonus = timePreferences.includes(widgetId) ? 2 : 0;
    
    // Calculate usage frequency bonus with more significant impact
    const recentUsage = getActionFrequency(widgetId, 'week');
    const usageBonus = Math.min(recentUsage * 0.5, 5); // Max 5 point bonus, more significant impact
    
    return basePriority + timeBonus + usageBonus;
  }, [
    personalizationData.preferences.widgetPriorities,
    getCurrentTimePreferences,
    getActionFrequency,
  ]);

  // Get prioritized quick actions based on usage and time
  const getPrioritizedQuickActions = useCallback((): string[] => {
    const { timeOfDay } = getCurrentTimeContext();
    
    // Include all possible action IDs, not just preferred ones
    const allPossibleActions = [
      'voice-note', 'ask-zena', 'focus-threads', 'property-search',
      'smart-summary', 'priority-notifications', 'quick-actions',
      'contextual-insights', 'recent-activity', 'calendar'
    ];
    
    // Calculate scores for each action
    const actionScores = allPossibleActions.map(actionId => {
      const frequency = getActionFrequency(actionId, 'week');
      const timePreferences = getCurrentTimePreferences();
      const timeBonus = timePreferences.includes(actionId) ? 10 : 0;
      
      // Time-of-day specific bonuses
      let timeOfDayBonus = 0;
      if (timeOfDay === 'morning' && actionId === 'smart-summary') timeOfDayBonus = 5;
      if (timeOfDay === 'afternoon' && actionId === 'quick-actions') timeOfDayBonus = 5;
      if (timeOfDay === 'evening' && actionId === 'voice-note') timeOfDayBonus = 3;
      
      return {
        actionId,
        score: frequency + timeBonus + timeOfDayBonus,
      };
    });

    // Sort by score and return action IDs
    return actionScores
      .sort((a, b) => b.score - a.score)
      .map(item => item.actionId);
  }, [
    getCurrentTimeContext,
    getActionFrequency,
    getCurrentTimePreferences,
  ]);

  // Update preferences based on learning
  const updatePreferences = useCallback((updates: Partial<PersonalizationPreferences>) => {
    setPersonalizationData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...updates,
        lastUpdated: new Date(),
      },
    }));
  }, []);

  // Learn from usage patterns and update preferences
  const learnFromPatterns = useCallback(() => {
    if (!personalizationData.learningEnabled || personalizationData.usagePatterns.length < 10) {
      return;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentPatterns = personalizationData.usagePatterns.filter(
      pattern => pattern.timestamp >= oneWeekAgo
    );

    // Analyze time-based preferences
    const timeBasedUsage: Record<string, Record<string, number>> = {
      morning: {},
      afternoon: {},
      evening: {},
      night: {},
    };

    recentPatterns.forEach(pattern => {
      const timeOfDay = pattern.context.timeOfDay;
      if (!timeBasedUsage[timeOfDay][pattern.actionId]) {
        timeBasedUsage[timeOfDay][pattern.actionId] = 0;
      }
      timeBasedUsage[timeOfDay][pattern.actionId]++;
    });

    // Update time-based preferences
    const newTimeBasedPreferences: PersonalizationPreferences['timeBasedPreferences'] = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };

    Object.keys(timeBasedUsage).forEach(timeOfDay => {
      const actions = Object.entries(timeBasedUsage[timeOfDay as keyof typeof timeBasedUsage])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3) // Top 3 actions for each time period
        .map(([actionId]) => actionId);
      
      newTimeBasedPreferences[timeOfDay as keyof typeof newTimeBasedPreferences] = actions;
    });

    // Update preferred quick actions based on overall frequency
    const actionFrequency: Record<string, number> = {};
    recentPatterns.forEach(pattern => {
      if (!actionFrequency[pattern.actionId]) {
        actionFrequency[pattern.actionId] = 0;
      }
      actionFrequency[pattern.actionId]++;
    });

    const preferredQuickActions = Object.entries(actionFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6) // Top 6 most used actions
      .map(([actionId]) => actionId);

    // Update preferences
    updatePreferences({
      timeBasedPreferences: newTimeBasedPreferences,
      preferredQuickActions: preferredQuickActions.length > 0 
        ? preferredQuickActions 
        : personalizationData.preferences.preferredQuickActions,
    });
  }, [personalizationData, updatePreferences]);

  // Run learning algorithm periodically
  useEffect(() => {
    const interval = setInterval(() => {
      learnFromPatterns();
    }, 5 * 60 * 1000); // Run every 5 minutes

    return () => clearInterval(interval);
  }, [learnFromPatterns]);

  // Toggle learning
  const toggleLearning = useCallback((enabled: boolean) => {
    setPersonalizationData(prev => ({
      ...prev,
      learningEnabled: enabled,
    }));
  }, []);

  // Reset personalization data
  const resetPersonalization = useCallback(() => {
    setPersonalizationData({
      usagePatterns: [],
      preferences: DEFAULT_PREFERENCES,
      learningEnabled: true,
    });
  }, []);

  return {
    // Data
    usagePatterns: personalizationData.usagePatterns,
    preferences: personalizationData.preferences,
    learningEnabled: personalizationData.learningEnabled,
    
    // Actions
    trackUsage,
    updatePreferences,
    toggleLearning,
    resetPersonalization,
    
    // Computed values
    getActionFrequency,
    getCurrentTimePreferences,
    calculateWidgetPriority,
    getPrioritizedQuickActions,
    
    // Learning
    learnFromPatterns,
  };
};