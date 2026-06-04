import { CheckCircle2, AlertTriangle, XCircle, FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSyncStatus } from '@/hooks/useChallengeData';
import { isDemoMode } from '@/services/dataService';
import { timeAgo } from '@/lib/format';

export function SyncStatusBadge() {
  const { data: sync } = useSyncStatus();

  if (isDemoMode()) {
    return (
      <Badge variant="warning" className="gap-1">
        <FlaskConical className="size-3" /> Demo data
      </Badge>
    );
  }

  if (!sync) {
    return (
      <Badge variant="secondary" className="gap-1">
        Awaiting first sync
      </Badge>
    );
  }

  const updated = timeAgo(sync.finishedAt);
  if (sync.status === 'error') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3" /> Sync failed · {updated}
      </Badge>
    );
  }
  if (sync.status === 'partial') {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="size-3" /> Degraded · {updated}
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="size-3" /> Live · {updated}
    </Badge>
  );
}
