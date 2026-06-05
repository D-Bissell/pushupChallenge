import { useState } from 'react';
import { Medal } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useParticipants } from '@/hooks/useChallengeData';
import { topBy } from '@/lib/analytics';
import { formatCurrency, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

type Metric = 'totalPushUps' | 'fundraising';

const MEDAL_COLOR = ['text-amber-400', 'text-zinc-400', 'text-amber-700'];

export default function Leaderboard() {
  const { data: participants = [], isLoading } = useParticipants();
  const [metric, setMetric] = useState<Metric>('totalPushUps');

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="Who's leading the team — by push-ups or dollars."
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>
            <TabsTrigger value="totalPushUps">Push-ups</TabsTrigger>
            <TabsTrigger value="fundraising">Fundraising</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs defaultValue="5">
        <TabsList>
          <TabsTrigger value="5">Top 5</TabsTrigger>
          <TabsTrigger value="10">Top 10</TabsTrigger>
          <TabsTrigger value="all">Full table</TabsTrigger>
        </TabsList>
        {(['5', '10', 'all'] as const).map((view) => (
          <TabsContent key={view} value={view}>
            <Card>
              <LeaderboardTable
                rows={topBy(
                  participants,
                  metric,
                  view === 'all' ? participants.length : Number(view)
                )}
                metric={metric}
                loading={isLoading}
              />
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LeaderboardTable({
  rows,
  metric,
  loading,
}: {
  rows: ReturnType<typeof topBy>;
  metric: Metric;
  loading?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Total push-ups</TableHead>
          <TableHead className="text-right">Raised</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={4}>
                <Skeleton className="h-6 w-full" />
              </TableCell>
            </TableRow>
          ))}
        {!loading && rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
              No data yet.
            </TableCell>
          </TableRow>
        )}
        {rows.map((p, i) => (
          <TableRow key={p.participantId}>
            <TableCell>
              <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                {i < 3 ? <Medal className={cn('size-4', MEDAL_COLOR[i])} /> : null}
                {i + 1}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar name={p.name} src={p.avatarUrl} />
                <span className="font-medium">{p.name}</span>
              </div>
            </TableCell>
            <TableCell
              className={cn(
                'text-right tabular-nums',
                metric === 'totalPushUps' && 'font-semibold text-foreground'
              )}
            >
              {formatNumber(p.totalPushUps)}
            </TableCell>
            <TableCell
              className={cn(
                'text-right tabular-nums',
                metric === 'fundraising' && 'font-semibold text-foreground'
              )}
            >
              {formatCurrency(p.fundraising)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
