import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import Overview from '@/pages/Overview';
import Challenge from '@/pages/Challenge';
import Team from '@/pages/Team';
import Fundraising from '@/pages/Fundraising';
import Insights from '@/pages/Insights';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="challenge" element={<Challenge />} />
        <Route path="team" element={<Team />} />
        {/* Leaderboard and Members were merged into Team — keep old links working. */}
        <Route path="members" element={<Navigate to="/team" replace />} />
        <Route path="leaderboard" element={<Navigate to="/team" replace />} />
        <Route path="fundraising" element={<Fundraising />} />
        <Route path="insights" element={<Insights />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
