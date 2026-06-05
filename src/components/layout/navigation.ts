import {
  Target,
  TrendingUp,
  Users,
  Trophy,
  DollarSign,
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
  { to: '/challenge', label: 'The Challenge', icon: TrendingUp },
  { to: '/members', label: 'Team Members', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/fundraising', label: 'Fundraising', icon: DollarSign },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];
