// Core chart component
export { Chart } from './Chart';
export type { ChartProps, ChartDataPoint } from './Chart';

// Specialized chart components
export { DealPipelineChart } from './DealPipelineChart';
export type { DealPipelineChartProps, DealStage } from './DealPipelineChart';

export { ResponseTimeTrendChart } from './ResponseTimeTrendChart';
export type { ResponseTimeTrendChartProps, ResponseTimeData } from './ResponseTimeTrendChart';

// Chart type selection utilities
export {
  selectAppropriateChartType,
  analyzeDataCharacteristics,
  validateChartTypeForData,
  getRecommendedColorScheme
} from './chartTypeSelector';

export type {
  ChartType,
  ChartTypeRecommendation,
  DataCharacteristics
} from './chartTypeSelector';