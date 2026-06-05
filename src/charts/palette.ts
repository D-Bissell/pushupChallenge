import { CHART_COLORS } from './chartTheme';

/**
 * Per-member line colours: the five theme colours plus a few extras so every
 * member on a typical team gets a distinct line before we have to cycle.
 */
export const CHART_PALETTE = [
  CHART_COLORS[1],
  CHART_COLORS[2],
  CHART_COLORS[3],
  CHART_COLORS[4],
  CHART_COLORS[5],
  'hsl(280 65% 62%)',
  'hsl(24 80% 55%)',
  'hsl(150 55% 45%)',
];
