import {
  Home,
  TrendingUp,
  Users,
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
  { to: '/', label: 'Overview', icon: Home },
  { to: '/challenge', label: 'The Challenge', icon: TrendingUp },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/fundraising', label: 'Fundraising', icon: DollarSign },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];
