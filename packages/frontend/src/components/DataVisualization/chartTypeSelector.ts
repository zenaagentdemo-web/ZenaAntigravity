import { ChartDataPoint } from './Chart';

export type ChartType = 'line' | 'bar' | 'pie' | 'progress' | 'pipeline';

export interface ChartTypeRecommendation {
  type: ChartType;
  confidence: number; // 0-1
  reason: string;
}

export interface DataCharacteristics {
  dataPoints: ChartDataPoint[];
  hasTimeSequence?: boolean;
  hasCategories?: boolean;
  hasProgressTarget?: boolean;
  showsComparison?: boolean;
  showsTrend?: boolean;
  isPipeline?: boolean;
}

/**
 * Analyzes data characteristics and recommends the most appropriate chart type
 */
export const selectAppropriateChartType = (characteristics: DataCharacteristics): ChartTypeRecommendation => {
  const { dataPoints, hasTimeSequence, hasCategories, hasProgressTarget, showsComparison, showsTrend, isPipeline } = characteristics;
  
  // Handle empty data
  if (!dataPoints || dataPoints.length === 0) {
    return {
      type: 'bar',
      confidence: 0.5,
      reason: 'Default chart type for empty data'
    };
  }

  // Pipeline visualization
  if (isPipeline) {
    return {
      type: 'pipeline',
      confidence: 0.95,
      reason: 'Data represents a pipeline or funnel process'
    };
  }

  // Progress visualization
  if (hasProgressTarget) {
    return {
      type: 'progress',
      confidence: 0.9,
      reason: 'Data has target values suitable for progress visualization'
    };
  }

  // Time series data
  if (hasTimeSequence || showsTrend) {
    return {
      type: 'line',
      confidence: 0.85,
      reason: 'Data shows trends over time or sequential progression'
    };
  }

  // Categorical comparison with many categories
  if (hasCategories && dataPoints.length > 6) {
    return {
      type: 'bar',
      confidence: 0.8,
      reason: 'Multiple categories are better displayed as bars for comparison'
    };
  }

  // Part-to-whole relationships
  if (showsComparison && dataPoints.length <= 6) {
    const total = dataPoints.reduce((sum, point) => sum + point.value, 0);
    const hasSignificantVariation = dataPoints.some(point => (point.value / total) > 0.05);
    
    if (hasSignificantVariation) {
      return {
        type: 'pie',
        confidence: 0.75,
        reason: 'Data shows part-to-whole relationships with significant segments'
      };
    }
  }

  // Default to bar chart for categorical data
  if (hasCategories) {
    return {
      type: 'bar',
      confidence: 0.7,
      reason: 'Categorical data is well-suited for bar charts'
    };
  }

  // Fallback recommendation
  return {
    type: 'bar',
    confidence: 0.6,
    reason: 'Bar chart is a safe default for most data types'
  };
};

/**
 * Analyzes data points to determine their characteristics
 */
export const analyzeDataCharacteristics = (
  dataPoints: ChartDataPoint[],
  context?: {
    isTimeSeries?: boolean;
    hasTargets?: boolean;
    isPipelineData?: boolean;
    showsPartToWhole?: boolean;
  }
): DataCharacteristics => {
  if (!dataPoints || dataPoints.length === 0) {
    return { dataPoints: [] };
  }

  // Check for time sequence patterns in labels
  const hasTimeSequence = context?.isTimeSeries || 
    dataPoints.some(point => {
      const label = point.label.toLowerCase();
      return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|q[1-4]|\d{1,2}\/\d{1,2}|\d{4}-\d{2})/.test(label);
    });

  // Check for categorical data
  const hasCategories = dataPoints.every(point => 
    typeof point.label === 'string' && point.label.length > 0
  );

  // Check for progress targets
  const hasProgressTarget = context?.hasTargets || 
    dataPoints.some(point => 
      point.metadata?.target !== undefined || 
      point.metadata?.maxValue !== undefined
    );

  // Check for comparison data
  const showsComparison = context?.showsPartToWhole || 
    dataPoints.length > 1 && dataPoints.every(point => point.value >= 0);

  // Check for trend data
  const showsTrend = hasTimeSequence && dataPoints.length >= 3;

  // Check for pipeline data
  const isPipeline = context?.isPipelineData || 
    dataPoints.some(point => 
      point.metadata?.stage !== undefined ||
      point.metadata?.conversionRate !== undefined
    );

  return {
    dataPoints,
    hasTimeSequence,
    hasCategories,
    hasProgressTarget,
    showsComparison,
    showsTrend,
    isPipeline
  };
};

/**
 * Validates if the selected chart type is appropriate for the given data
 */
export const validateChartTypeForData = (
  chartType: ChartType, 
  characteristics: DataCharacteristics
): { isValid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  let isValid = true;

  const { dataPoints, hasTimeSequence, hasProgressTarget, isPipeline } = characteristics;

  // Check data point count requirements
  if (chartType === 'pie' && dataPoints.length > 8) {
    warnings.push('Pie charts become hard to read with more than 8 segments');
    isValid = false;
  }

  if (chartType === 'line' && dataPoints.length < 2) {
    warnings.push('Line charts need at least 2 data points to show trends');
    isValid = false;
  }

  // Check data type compatibility
  if (chartType === 'line' && !hasTimeSequence) {
    warnings.push('Line charts are most effective with time-series or sequential data');
  }

  if (chartType === 'progress' && !hasProgressTarget) {
    warnings.push('Progress charts require target values for meaningful visualization');
  }

  if (chartType === 'pipeline' && !isPipeline) {
    warnings.push('Pipeline charts are designed for funnel or stage-based data');
  }

  // Check for negative values
  const hasNegativeValues = dataPoints.some(point => point.value < 0);
  if ((chartType === 'pie' || chartType === 'progress') && hasNegativeValues) {
    warnings.push(`${chartType} charts cannot display negative values effectively`);
    isValid = false;
  }

  return { isValid, warnings };
};

/**
 * Gets color scheme recommendations based on chart type and data characteristics
 */
export const getRecommendedColorScheme = (
  chartType: ChartType,
  characteristics: DataCharacteristics
): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  const { dataPoints } = characteristics;

  // Check if data suggests performance levels
  const hasPerformanceData = dataPoints.some(point => 
    point.metadata?.performanceLevel || 
    point.metadata?.status
  );

  if (hasPerformanceData) {
    const hasWarnings = dataPoints.some(point => 
      point.metadata?.performanceLevel === 'warning' ||
      point.metadata?.status === 'at-risk'
    );
    
    const hasErrors = dataPoints.some(point => 
      point.metadata?.performanceLevel === 'poor' ||
      point.metadata?.status === 'failed'
    );

    if (hasErrors) return 'danger';
    if (hasWarnings) return 'warning';
    return 'success';
  }

  // Chart type specific recommendations
  switch (chartType) {
    case 'progress':
      return 'success';
    case 'pipeline':
      return 'info';
    case 'line':
      return 'default';
    default:
      return 'default';
  }
};