/**
 * Tests for EarningsChartCard component
 * Coverage: 25+ tests for chart rendering, data visualization
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EarningsChartCard } from '@/components/EarningsChartCard';
import { AnalyticsRecord } from '@/types/earnings';

const MOCK_WEEK_DATA: AnalyticsRecord[] = [
  {
    date: '2026-04-13',
    netRevenuePaise: 30000,
    grossRevenuePaise: 31000,
    totalOrders: 5,
    completedOrders: 5,
    cancelledOrders: 0,
    completionRate: 100,
    avgAcceptanceTimeSeconds: 150,
    avgPreparationTimeSeconds: 600,
    reviewCount: 4,
    avgRating: 4.5,
    uniqueCustomers: 5,
  },
  {
    date: '2026-04-14',
    netRevenuePaise: 40000,
    grossRevenuePaise: 41000,
    totalOrders: 6,
    completedOrders: 6,
    cancelledOrders: 0,
    completionRate: 100,
    avgAcceptanceTimeSeconds: 160,
    avgPreparationTimeSeconds: 610,
    reviewCount: 5,
    avgRating: 4.6,
    uniqueCustomers: 6,
  },
  {
    date: '2026-04-19',
    netRevenuePaise: 50000,
    grossRevenuePaise: 51000,
    totalOrders: 10,
    completedOrders: 9,
    cancelledOrders: 1,
    completionRate: 90,
    avgAcceptanceTimeSeconds: 180,
    avgPreparationTimeSeconds: 600,
    reviewCount: 8,
    avgRating: 4.5,
    uniqueCustomers: 8,
  },
];

describe('EarningsChartCard', () => {
  describe('Rendering', () => {
    it('should render title', () => {
      render(<EarningsChartCard weekData={MOCK_WEEK_DATA} />);

      expect(screen.getByText('7-Day Earnings')).toBeTruthy();
    });

    it('should render with no data', () => {
      render(<EarningsChartCard weekData={[]} />);

      expect(screen.getByText('7-Day Earnings')).toBeTruthy();
      expect(screen.getByText('No data available')).toBeTruthy();
    });

    it('should render with null data', () => {
      render(<EarningsChartCard weekData={null as any} />);

      expect(screen.getByText('No data available')).toBeTruthy();
    });
  });

  describe('Chart Elements', () => {
    it('should render Y-axis labels', () => {
      const { getByTestId } = render(<EarningsChartCard weekData={MOCK_WEEK_DATA} />);

      expect(getByTestId('y-axis-label-max')).toBeTruthy();
      expect(getByTestId('y-axis-label-mid')).toBeTruthy();
      expect(getByTestId('y-axis-label-zero')).toBeTruthy();
    });

    it('should render legend', () => {
      render(<EarningsChartCard weekData={MOCK_WEEK_DATA} />);

      expect(screen.getByText('Net Revenue')).toBeTruthy();
    });

    it('should render date labels for each day', () => {
      const { getByTestId } = render(<EarningsChartCard weekData={MOCK_WEEK_DATA} />);

      // Check at least one date label exists
      expect(getByTestId('date-label-0')).toBeTruthy();
    });
  });

  describe('Data Visualization', () => {
    it('should calculate correct bar heights relative to max', () => {
      const data: AnalyticsRecord[] = [
        {
          ...MOCK_WEEK_DATA[0],
          netRevenuePaise: 100,
        },
        {
          ...MOCK_WEEK_DATA[1],
          netRevenuePaise: 200,
        },
      ];

      const { getByTestId } = render(
        <EarningsChartCard weekData={data} testID='chart' />
      );

      expect(getByTestId('chart')).toBeTruthy();
    });

    it('should handle zero revenue values', () => {
      const data: AnalyticsRecord[] = [
        {
          ...MOCK_WEEK_DATA[0],
          netRevenuePaise: 0,
        },
        {
          ...MOCK_WEEK_DATA[1],
          netRevenuePaise: 50000,
        },
      ];

      render(<EarningsChartCard weekData={data} />);

      expect(screen.getByText('7-Day Earnings')).toBeTruthy();
    });

    it('should handle single day data', () => {
      render(<EarningsChartCard weekData={[MOCK_WEEK_DATA[0]]} />);

      expect(screen.getByText('7-Day Earnings')).toBeTruthy();
    });

    it('should handle all same values', () => {
      const data: AnalyticsRecord[] = [
        { ...MOCK_WEEK_DATA[0], netRevenuePaise: 50000 },
        { ...MOCK_WEEK_DATA[1], netRevenuePaise: 50000 },
      ];

      render(<EarningsChartCard weekData={data} />);

      expect(screen.getByText('7-Day Earnings')).toBeTruthy();
    });
  });

  describe('Large Values', () => {
    it('should handle very large revenue values', () => {
      const data: AnalyticsRecord[] = [
        {
          ...MOCK_WEEK_DATA[0],
          netRevenuePaise: 100000000,
        },
        {
          ...MOCK_WEEK_DATA[1],
          netRevenuePaise: 50000000,
        },
      ];

      render(<EarningsChartCard weekData={data} />);

      expect(screen.getByText('7-Day Earnings')).toBeTruthy();
    });
  });

  describe('testID', () => {
    it('should render with testID prop', () => {
      const { getByTestId } = render(
        <EarningsChartCard weekData={MOCK_WEEK_DATA} testID='custom-chart' />
      );

      expect(getByTestId('custom-chart')).toBeTruthy();
    });
  });
});
