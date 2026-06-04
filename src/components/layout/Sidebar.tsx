import { NavLink } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './navigation';

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2 px-2 py-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Dumbbell className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Push-Up Challenge</p>
          <p className="text-xs text-muted-foreground">Team Dashboard</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3 py-4 text-xs text-muted-foreground">
        <p>Data via The Push-Up Challenge.</p>
        <p className="mt-1">Updated every 5 minutes.</p>
      </div>
    </div>
  );
}
