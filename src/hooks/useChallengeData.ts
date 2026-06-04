import { useQuery } from '@tanstack/react-query';
import {
  fetchTeam,
  fetchParticipants,
  fetchTeamSnapshots,
  fetchFundraisingSnapshots,
  fetchParticipantSnapshots,
  fetchLatestSyncRun,
} from '@/services/dataService';
import { DEFAULT_TEAM_ID } from '@/services/firebase';
import type { DateRange } from '@/types';

/**
 * Data hooks. Tuned to minimise Firestore reads:
 *  - generous staleTime (the backend only writes every 5 min);
 *  - background refetch aligned to that cadence;
 *  - query keys scoped by team for future multi-team support.
 */
const FIVE_MIN = 5 * 60 * 1000;

const sharedOptions = {
  staleTime: FIVE_MIN,
  refetchInterval: FIVE_MIN,
  refetchOnWindowFocus: false,
};

export function useTeam(teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => fetchTeam(teamId),
    ...sharedOptions,
  });
}

export function useParticipants(teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['participants', teamId],
    queryFn: () => fetchParticipants(teamId),
    ...sharedOptions,
  });
}

export function useTeamSnapshots(range?: DateRange, teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['teamSnapshots', teamId, range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => fetchTeamSnapshots(teamId, range),
    ...sharedOptions,
  });
}

export function useFundraisingSnapshots(range?: DateRange, teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['fundraisingSnapshots', teamId, range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => fetchFundraisingSnapshots(teamId, range),
    ...sharedOptions,
  });
}

export function useParticipantSnapshots(range?: DateRange, teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['participantSnapshots', teamId, range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => fetchParticipantSnapshots(teamId, range),
    ...sharedOptions,
  });
}

export function useSyncStatus(teamId: string = DEFAULT_TEAM_ID) {
  return useQuery({
    queryKey: ['syncRun', teamId],
    queryFn: () => fetchLatestSyncRun(teamId),
    ...sharedOptions,
  });
}
