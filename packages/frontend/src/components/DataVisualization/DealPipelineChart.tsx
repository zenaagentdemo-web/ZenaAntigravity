import React from 'react';
import { Chart, ChartDataPoint } from './Chart';
import './DealPipelineChart.css';

export interface DealStage {
  id: string;
  name: string;
  count: number;
  value: number; // Total value of deals in this stage
  color?: string;
  deals?: Array<{
    id: string;
    title: string;
    value: number;
    probability: number;
  }>;
}

export interface DealPipelineChartProps {
  stages: DealStage[];
  viewType: 'count' | 'value';
  onStageClick?: (stage: DealStage) => void;
  onDrillDown?: (stageId: string) => void;
  className?: string;
}

export const DealPipelineChart: React.FC<DealPipelineChartProps> = ({
  stages,
  viewType,
  onStageClick,
  onDrillDown,
  className = ''
}) => {
  const getStageColors = (): string[] => {
    return [
      'var(--color-primary-500)',   // Lead - Blue
      'var(--color-success-500)',   // Qualified - Green
      'var(--color-warning-500)',   // Proposal - Amber
      'var(--color-primary-700)',   // Negotiation - Purple
      'var(--color-error-500)',     // Closing - Red
      'var(--color-neutral-500)'    // Won/Lost - Gray
    ];
  };

  const formatValue = (value: number, type: 'count' | 'value'): string => {
    if (type === 'count') {
      return value.toString();
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getConversionRate = (currentIndex: number): number => {
    if (currentIndex === 0) return 100;
    const previousStage = stages[currentIndex - 1];
    const currentStage = stages[currentIndex];
    if (!previousStage || previousStage.count === 0) return 0;
    return Math.round((currentStage.count / previousStage.count) * 100);
  };

  const chartData: ChartDataPoint[] = stages.map((stage, index) => ({
    label: stage.name,
    value: viewType === 'count' ? stage.count : stage.value,
    color: stage.color || getStageColors()[index % getStageColors().length],
    metadata: {
      stage,
      conversionRate: getConversionRate(index),
      deals: stage.deals || []
    }
  }));

  const handleDataPointClick = (dataPoint: ChartDataPoint, index: number) => {
    const stage = dataPoint.metadata?.stage as DealStage;
    if (stage && onStageClick) {
      onStageClick(stage);
    }
  };

  const totalValue = stages.reduce((sum, stage) => sum + stage.value, 0);
  const totalCount = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className={`deal-pipeline-chart ${className}`} data-testid="deal-pipeline-chart">
      <div className="deal-pipeline-chart__header">
        <div className="deal-pipeline-chart__title">
          <h3>Deal Pipeline</h3>
          <div className="deal-pipeline-chart__summary">
            <span className="summary-item">
              <strong>{totalCount}</strong> Total Deals
            </span>
            <span className="summary-item">
              <strong>{formatValue(totalValue, 'value')}</strong> Total Value
            </span>
          </div>
        </div>
        <div className="deal-pipeline-chart__controls">
          <button
            className={`view-toggle ${viewType === 'count' ? 'active' : ''}`}
            onClick={() => {/* View type toggle would be handled by parent */}}
            aria-label="View by deal count"
          >
            Count
          </button>
          <button
            className={`view-toggle ${viewType === 'value' ? 'active' : ''}`}
            onClick={() => {/* View type toggle would be handled by parent */}}
            aria-label="View by deal value"
          >
            Value
          </button>
        </div>
      </div>

      <div className="deal-pipeline-chart__visualization">
        <Chart
          data={chartData}
          type="pipeline"
          width={600}
          height={300}
          showLabels={true}
          showValues={true}
          colorScheme="default"
          onDataPointClick={handleDataPointClick}
          className="pipeline-chart"
        />
      </div>

      <div className="deal-pipeline-chart__stages">
        {stages.map((stage, index) => {
          const conversionRate = getConversionRate(index);
          const stageColor = stage.color || getStageColors()[index % getStageColors().length];
          
          return (
            <div
              key={stage.id}
              className="pipeline-stage"
              onClick={() => onStageClick?.(stage)}
              role="button"
              tabIndex={0}
              aria-label={`${stage.name}: ${stage.count} deals, ${formatValue(stage.value, 'value')} total value`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onStageClick?.(stage);
                }
              }}
            >
              <div className="pipeline-stage__header">
                <div 
                  className="pipeline-stage__indicator"
                  style={{ backgroundColor: stageColor }}
                />
                <h4 className="pipeline-stage__name">{stage.name}</h4>
                {index > 0 && (
                  <div className="pipeline-stage__conversion">
                    {conversionRate}% conversion
                  </div>
                )}
              </div>
              
              <div className="pipeline-stage__metrics">
                <div className="pipeline-stage__metric">
                  <span className="metric-value">{stage.count}</span>
                  <span className="metric-label">Deals</span>
                </div>
                <div className="pipeline-stage__metric">
                  <span className="metric-value">{formatValue(stage.value, 'value')}</span>
                  <span className="metric-label">Value</span>
                </div>
              </div>

              {stage.deals && stage.deals.length > 0 && (
                <div className="pipeline-stage__deals">
                  <div className="stage-deals__header">
                    <span>Top Deals</span>
                    {onDrillDown && (
                      <button
                        className="stage-deals__drill-down"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDrillDown(stage.id);
                        }}
                        aria-label={`View all deals in ${stage.name}`}
                      >
                        View All →
                      </button>
                    )}
                  </div>
                  <div className="stage-deals__list">
                    {stage.deals.slice(0, 3).map((deal) => (
                      <div key={deal.id} className="stage-deal">
                        <div className="stage-deal__title">{deal.title}</div>
                        <div className="stage-deal__details">
                          <span className="stage-deal__value">
                            {formatValue(deal.value, 'value')}
                          </span>
                          <span className="stage-deal__probability">
                            {deal.probability}% prob.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};