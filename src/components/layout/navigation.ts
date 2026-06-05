import {
  Target,
  Users,
  Trophy,
  DollarSign,
  TrendingUp,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: "Today's Challenge", icon: Target },
  { to: '/members', label: 'Team Members', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/fundraising', label: 'Fundraising', icon: DollarSign },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];
