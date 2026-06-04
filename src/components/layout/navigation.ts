import {
  LayoutDashboard,
  Target,
  Users,
  Trophy,
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
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/today', label: "Today's Challenge", icon: Target },
  { to: '/members', label: 'Team Members', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
];
