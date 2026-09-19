import type { ReactNode } from 'react';
import { Card, CardHeader } from './Card';

/** Recharts theme shared by every chart in the product. */
export const CHART_COLORS = {
  accent: '#34e27a',
  inkSoft: '#9aa39d',
  line: '#2a2e2c',
  surface2: '#121514',
  up: '#34e27a',
  down: '#f4744c',
} as const;

export const AXIS_PROPS = {
  stroke: CHART_COLORS.inkSoft,
  tick: { fill: '#9aa39d', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHART_COLORS.line },
} as const;

export const GRID_PROPS = {
  stroke: CHART_COLORS.line,
  strokeDasharray: '3 3',
  vertical: false,
} as const;

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className="px-2.5 pb-3 pt-4 sm:px-4">{children}</div>
    </Card>
  );
}
