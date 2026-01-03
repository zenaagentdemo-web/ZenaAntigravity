import React, { useState, useEffect } from 'react';
import { Chart, DealPipelineChart, ResponseTimeTrendChart } from './index';
import {
  selectAppropriateChartType,
  analyzeDataCharacteristics,
  ChartDataPoint,
  DealStage,
  ResponseTimeData
} from './index';

/**
 * Demo component showing data visualization components in action
 * This demonstrates the drill-down functionality and appropriate chart type selection
 */
export const DataVisualizationDemo: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Sample business metrics data
  const businessMetrics: ChartDataPoint[] = [
    { label: 'Active Deals', value: 24, color: '#3B82F6' },
    { label: 'Pending Responses', value: 8, color: '#F59E0B' },
    { label: 'Completed This Week', value: 12, color: '#10B981' },
    { label: 'At Risk', value: 3, color: '#EF4444' }
  ];

  // Sample deal pipeline data
  const dealPipelineStages: DealStage[] = [
    {
      id: 'leads',
      name: 'Leads',
      count: 45,
      value: 2250000,
      color: '#3B82F6',
      deals: [
        { id: '1', title: 'Downtown Condo', value: 450000, probability: 20 },
        { id: '2', title: 'Suburban Home', value: 320000, probability: 25 },
        { id: '3', title: 'Commercial Space', value: 850000, probability: 15 }
      ]
    },
    {
      id: 'qualified',
      name: 'Qualified',
      count: 28,
      value: 1680000,
      color: '#10B981',
      deals: [
        { id: '4', title: 'Luxury Villa', value: 750000, probability: 60 },
        { id: '5', title: 'Office Building', value: 1200000, probability: 45 }
      ]
    },
    {
      id: 'proposal',
      name: 'Proposal',
      count: 15,
      value: 1125000,
      color: '#F59E0B',
      deals: [
        { id: '6', title: 'Waterfront Property', value: 950000, probability: 75 }
      ]
    },
    {
      id: 'negotiation',
      name: 'Negotiation',
      count: 8,
      value: 720000,
      color: '#8B5CF6',
      deals: [
        { id: '7', title: 'Historic Home', value: 420000, probability: 85 }
      ]
    },
    {
      id: 'closing',
      name: 'Closing',
      count: 4,
      value: 480000,
      color: '#EF4444',
      deals: [
        { id: '8', title: 'New Construction', value: 380000, probability: 95 }
      ]
    }
  ];

  // Sample response time trend data
  const responseTimeData: ResponseTimeData[] = [
    { date: new Date('2024-01-01'), averageResponseTime: 1.2, responseCount: 45 },
    { date: new Date('2024-01-02'), averageResponseTime: 0.8, responseCount: 52 },
    { date: new Date('2024-01-03'), averageResponseTime: 2.1, responseCount: 38 },
    { date: new Date('2024-01-04'), averageResponseTime: 1.5, responseCount: 41 },
    { date: new Date('2024-01-05'), averageResponseTime: 0.9, responseCount: 48 },
    { date: new Date('2024-01-06'), averageResponseTime: 1.8, responseCount: 35 },
    { date: new Date('2024-01-07'), averageResponseTime: 1.1, responseCount: 44 }
  ];

  const handleMetricClick = (dataPoint: ChartDataPoint, index: number) => {
    setSelectedMetric(dataPoint.label);
    console.log('Drill down into:', dataPoint.label, dataPoint);
  };

  const handleStageClick = (stage: DealStage) => {
    setSelectedMetric(`${stage.name} Stage`);
    console.log('Drill down into stage:', stage);
  };

  const handleStageDrillDown = (stageId: string) => {
    const stage = dealPipelineStages.find(s => s.id === stageId);
    if (stage) {
      setSelectedMetric(`All ${stage.name} Deals`);
      console.log('View all deals in stage:', stage);
    }
  };

  const handleResponseTimeClick = (data: ResponseTimeData) => {
    setSelectedMetric(`Response Time - ${data.date.toDateString()}`);
    console.log('Drill down into response time data:', data);
  };

  // Demonstrate automatic chart type selection
  const characteristics = analyzeDataCharacteristics(businessMetrics);
  const recommendation = selectAppropriateChartType(characteristics);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Data Visualization Components Demo</h1>

      {selectedMetric && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px'
        }}>
          <strong>Selected for drill-down:</strong> {selectedMetric}
          <button
            onClick={() => setSelectedMetric(null)}
            style={{ marginLeft: '12px', padding: '4px 8px', fontSize: '12px' }}
          >
            Clear
          </button>
        </div>
      )}

      <div style={{ marginBottom: '32px' }}>
        <h2>Business Metrics Overview</h2>
        <p>
          <strong>Recommended chart type:</strong> {recommendation.type}
          (confidence: {Math.round(recommendation.confidence * 100)}%)
          <br />
          <strong>Reason:</strong> {recommendation.reason}
        </p>
        <Chart
          data={businessMetrics}
          type={recommendation.type}
          title="Key Business Metrics"
          width={600}
          height={300}
          showLabels={true}
          showValues={true}
          onDataPointClick={handleMetricClick}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2>Deal Pipeline Visualization</h2>
        <DealPipelineChart
          stages={dealPipelineStages}
          viewType="count"
          onStageClick={handleStageClick}
          onDrillDown={handleStageDrillDown}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2>Response Time Trends</h2>
        <ResponseTimeTrendChart
          data={responseTimeData}
          timeframe="week"
          targetResponseTime={2}
          onDataPointClick={handleResponseTimeClick}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2>Chart Type Examples</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <Chart
            data={businessMetrics.slice(0, 3)}
            type="pie"
            title="Pie Chart Example"
            width={300}
            height={200}
            showLabels={true}
            showValues={true}
            colorScheme="success"
          />
          <Chart
            data={businessMetrics}
            type="bar"
            title="Bar Chart Example"
            width={300}
            height={200}
            showLabels={true}
            showValues={true}
            colorScheme="info"
          />
          <Chart
            data={businessMetrics.map(point => ({ ...point, metadata: { target: point.value * 1.5 } }))}
            type="progress"
            title="Progress Chart Example"
            width={300}
            height={200}
            showLabels={true}
            showValues={true}
            colorScheme="warning"
          />
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2>Professional Design Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div>
            <h3>Loading State</h3>
            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 2000);
              }}
              style={{ marginBottom: '16px', padding: '8px 16px' }}
            >
              Simulate Loading
            </button>
            <Chart
              data={businessMetrics}
              type="line"
              title="Loading State Demo"
              width={300}
              height={200}
              loading={isLoading}
            />
          </div>

          <div>
            <h3>Error State</h3>
            <button
              onClick={() => setHasError(!hasError)}
              style={{ marginBottom: '16px', padding: '8px 16px' }}
            >
              Toggle Error
            </button>
            <Chart
              data={businessMetrics}
              type="bar"
              title="Error State Demo"
              width={300}
              height={200}
              error={hasError ? "Failed to load chart data" : null}
            />
          </div>

          <div>
            <h3>Empty State</h3>
            <Chart
              data={[]}
              type="pie"
              title="Empty State Demo"
              width={300}
              height={200}
              emptyMessage="No data to display"
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2>Colour Scheme Variations</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {(['default', 'success', 'warning', 'danger', 'info'] as const).map(scheme => (
            <Chart
              key={scheme}
              data={businessMetrics.slice(0, 3)}
              type="bar"
              title={`${scheme.charAt(0).toUpperCase() + scheme.slice(1)} Scheme`}
              width={250}
              height={150}
              showLabels={false}
              showValues={true}
              colorScheme={scheme}
            />
          ))}
        </div>
      </div>
    </div>
  );
};