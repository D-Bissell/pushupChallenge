import { useQuery } from '@tanstack/react-query';
import {
  fetchTeam,
  fetchParticipants,
  fetchTeamSnapshots,
  fetchFundraisingSnapshots,
  fetchParticipantSnapshots,
  fetchChallengeSeries,
  fetchLatestSyncRun,
} from '@/services/dataService';
import { DEFAULT_TEAM_ID } from '@/services/firebase';
import type { DateRange } from '@/types';

/**
 * Data hooks. Tuned to minimise Firestore reads (the free Spark plan caps daily
 * reads, and the time-series collections grow ~288 points/day per series):
 *  - small, bounded queries (current team/participant state, latest sync) poll
 *    on the 5-minute write cadence — this is what makes the dashboard feel live;
 *  - the large, ever-growing snapshot queries are NEVER polled on an interval.
 *    Polling them re-reads the whole range every tick and torches the read
 *    quota; instead they refetch only when the range changes or the page
 *    reloads. Current totals still update live via the bounded queries above.
 */
const FIVE_MIN = 5 * 60 * 1000;

const liveOptions = {
  staleTime: FIVE_MIN,
  refetchInterval: FIVE_MIN,
  refetchOnWindowFocus: false,
};

const historyOptions = {
  staleTime: 30 * 60 * 1000,
  refetchInterval: false as const,
  refetchOnWindowFocus: false,
};

export function useTeam(teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId),
    ...liveOptions,
  });
}

export function useParticipants(teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['participants', teamId],
    queryFn: () => fetchParticipants(teamId),
    ...liveOptions,
  });
}

export function useTeamSnapshots(range?: DateRange, teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['teamSnapshots', teamId, range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => fetchTeamSnapshots(teamId, range),
    ...historyOptions,
  });
}

export function useFundraisingSnapshots(range?: DateRange, teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['fundraisingSnapshots', teamId, range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => fetchFundraisingSnapshots(teamId, range),
    ...historyOptions,
  });
}

export function useParticipantSnapshots(range?: DateRange, teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['participantSnapshots', teamId, range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => fetchParticipantSnapshots(teamId, range),
    ...historyOptions,
  });
}

/**
 * Whole-challenge series for the long-view charts (Challenge, Insights,
 * Fundraising-over-time). Reads ONE rollup doc, so it's cheap to load and safe
 * to leave on the historyOptions cadence. Pages filter it client-side for ranges.
 */
export function useChallengeSeries(teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['challengeSeries', teamId],
    queryFn: () => fetchChallengeSeries(teamId),
    ...historyOptions,
  });
}

export function useSyncStatus(teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['syncRun', teamId],
    queryFn: () => fetchLatestSyncRun(teamId),
    ...liveOptions,
  });
}
