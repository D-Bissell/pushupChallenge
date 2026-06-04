import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dumbbell } from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Total push-ups" value="48,210" icon={Dumbbell} hint="all time" />);
    expect(screen.getByText('Total push-ups')).toBeInTheDocument();
    expect(screen.getByText('48,210')).toBeInTheDocument();
    expect(screen.getByText('all time')).toBeInTheDocument();
  });

  it('shows a skeleton instead of value while loading', () => {
    render(<KpiCard label="Funds" value="$0" loading />);
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
  });

  it('renders a positive delta', () => {
    render(<KpiCard label="x" value="1" delta={{ value: '+12%', positive: true }} />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });
});
