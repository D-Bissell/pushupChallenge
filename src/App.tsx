import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import TodaysChallenge from '@/pages/TodaysChallenge';
import TeamMembers from '@/pages/TeamMembers';
import Leaderboard from '@/pages/Leaderboard';
import Fundraising from '@/pages/Fundraising';
import Trends from '@/pages/Trends';
import Insights from '@/pages/Insights';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<TodaysChallenge />} />
        <Route path="members" element={<TeamMembers />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="fundraising" element={<Fundraising />} />
        <Route path="trends" element={<Trends />} />
        <Route path="insights" element={<Insights />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
