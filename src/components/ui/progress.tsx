import * as React from 'react';
import { cn } from '@/lib/utils';
import { clampPercent } from '@/lib/format';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Values above 100 are clamped for the bar but can be shown in labels. */
  value: number;
  indicatorClassName?: string;
}

/** Lightweight progress bar (no Radix dep) with an accessible role. */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, indicatorClassName, ...props }, ref) => {
    const pct = clampPercent(value);
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn('h-2.5 w-full overflow-hidden rounded-full bg-secondary', className)}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full bg-primary transition-[width] duration-500 ease-out',
            indicatorClassName
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
