import { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTeam, useParticipants } from '@/hooks/useChallengeData';
import { participantTargetPercent } from '@/lib/analytics';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import type { Participant } from '@/types';
import { cn } from '@/lib/utils';

type SortKey = 'rank' | 'name' | 'todayPushUps' | 'totalPushUps' | 'percent' | 'fundraising';
type SortDir = 'asc' | 'desc';
type Filter = 'all' | 'active' | 'inactive';

export default function TeamMembers() {
  const { data: team } = useTeam();
  const { data: participants = [], isLoading } = useParticipants();
  const perTarget = team?.currentDay?.targetPerParticipant ?? 0;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = participants.filter((p) => {
      if (filter === 'active' && !p.active) return false;
      if (filter === 'inactive' && p.active) return false;
      if (term && !p.name.toLowerCase().includes(term)) return false;
      return true;
    });

    const valueOf = (p: Participant): number | string => {
      switch (sortKey) {
        case 'name':
          return p.name.toLowerCase();
        case 'percent':
          return participantTargetPercent(p, perTarget);
        case 'rank':
          return p.rank ?? Number.MAX_SAFE_INTEGER;
        default:
          return p[sortKey];
      }
    };

    list = [...list].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      let cmp: number;
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv);
      else cmp = Number(av) - Number(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [participants, search, filter, sortKey, sortDir, perTarget]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Names default ascending; numbers default descending (most-first).
      setSortDir(key === 'name' || key === 'rank' ? 'asc' : 'desc');
    }
  }

  const filters: Filter[] = ['all', 'active', 'inactive'];

  return (
    <div>
      <PageHeader
        title="Team Members"
        description={`${participants.length} members · sort, filter and search`}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            aria-label="Search members"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {filters.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'ghost'}
              className="capitalize"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Rank" col="rank" {...{ sortKey, sortDir, toggleSort }} />
              <SortableHead label="Name" col="name" {...{ sortKey, sortDir, toggleSort }} />
              <SortableHead
                label="Today"
                col="todayPushUps"
                align="right"
                {...{ sortKey, sortDir, toggleSort }}
              />
              <SortableHead
                label="Total"
                col="totalPushUps"
                align="right"
                {...{ sortKey, sortDir, toggleSort }}
              />
              <SortableHead
                label="% of target"
                col="percent"
                align="right"
                {...{ sortKey, sortDir, toggleSort }}
              />
              <SortableHead
                label="Raised"
                col="fundraising"
                align="right"
                {...{ sortKey, sortDir, toggleSort }}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No members match your filters.
                </TableCell>
              </TableRow>
            )}

            {rows.map((p) => {
              const pct = participantTargetPercent(p, perTarget);
              return (
                <TableRow key={p.participantId} className={cn(!p.active && 'opacity-60')}>
                  <TableCell className="font-medium tabular-nums">
                    {p.rank ? `#${p.rank}` : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={p.name} src={p.avatarUrl} />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(p.todayPushUps)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(p.totalPushUps)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {perTarget > 0 ? formatPercent(pct) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(p.fundraising)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SortableHead({
  label,
  col,
  align = 'left',
  sortKey,
  sortDir,
  toggleSort,
}: {
  label: string;
  col: SortKey;
  align?: 'left' | 'right';
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <TableHead className={align === 'right' ? 'text-right' : undefined}>
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
          active && 'text-foreground'
        )}
      >
        {label}
        {active ? (
          sortDir === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}
