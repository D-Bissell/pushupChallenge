/** Realistic Funraisin-style API fixtures used across the backend tests. */

export const teamApiResponse = {
  results: 1,
  data: {
    team_id: 12345,
    team_name: 'A23 Office Warriors',
    total_pushups: 48210,
    total_raised: '3,275.50',
    goal: 5000,
    member_count: 6,
    team_rank: 14,
    daily_target: 88,
  },
};

export const teamLeaderboardPage1 = {
  results: 6,
  data: [
    {
      fundraiser_id: 1001,
      first_name: 'Dana',
      last_name: 'Bissell',
      total_pushups: 12050,
      today_pushups: 88,
      total_raised: '1,200.00',
      rank: 1,
      slug: 'dana-b',
    },
    {
      fundraiser_id: 1002,
      name: 'Sam Carter',
      total_pushups: 9800,
      today_pushups: 64,
      total_raised: 740,
      rank: 2,
    },
    {
      fundraiser_id: 1003,
      name: 'Priya Nair',
      total_pushups: 8600,
      today_pushups: 88,
      amount_raised: '$510.50',
    },
    {
      fundraiser_id: 1004,
      name: 'Leo Martins',
      pushups: 7300,
      today_pushups: 40,
      total_raised: 320,
    },
    {
      fundraiser_id: 1005,
      name: 'Mia Wong',
      total_pushups: 6450,
      today_pushups: 88,
      total_raised: 305,
    },
    {
      fundraiser_id: 1006,
      name: 'Tom Fischer',
      total_pushups: 4010,
      today_pushups: 0,
      total_raised: 200,
      active: false,
    },
  ],
};

/** A deliberately "drifted" payload to prove tolerant field mapping. */
export const driftedTeamResponse = {
  data: {
    id: 999,
    name: 'Legacy Shape Team',
    pushups: 100,
    raised: '$50.00',
    members: 2,
  },
};

/**
 * Realistic slice of the actual team page HTML. The members live in a
 * single-quoted JS string whose JSON has backslash-escaped double quotes — `\\"`
 * in this template literal produces the literal `\"` the real page contains.
 */
export const teamPageHtml = `<!DOCTYPE html><html><head>
<title>The Push-Up Challenge - A23</title></head><body>
<a href="/customcode/generateQrcodePng/team/115773?url=Y">qr</a>
<div class="col-md-4 team-leaderboard">
  <p class="mt10 mb10 p10">This team is currently ranked 1000+ out of all teams that are fundraising</p>
</div>
<script>
var teamMembers = '[{\\"name\\":\\"Dana Bissell\\",\\"m_username\\":\\"danab\\",\\"m_photo\\":\\"\\",\\"m_event_photo\\":\\"\\",\\"member_id\\":\\"1001\\",\\"member_type\\":\\"team member\\",\\"m_target\\":\\"200\\",\\"m_target_steps\\":\\"3307\\",\\"total_steps\\":\\"12050.00\\",\\"total_distance\\":\\"0.00\\",\\"m_raised\\":1200},{\\"name\\":\\"Sam O'Carter\\",\\"m_username\\":\\"samc\\",\\"member_id\\":\\"1002\\",\\"member_type\\":\\"member\\",\\"m_target_steps\\":\\"3307\\",\\"total_steps\\":\\"9800.00\\",\\"m_raised\\":740},{\\"name\\":\\"Priya Nair\\",\\"m_username\\":\\"priyan\\",\\"member_id\\":\\"1003\\",\\"m_target_steps\\":\\"3307\\",\\"total_steps\\":\\"8600.00\\",\\"m_raised\\":510.5}]';
var members2 = JSON.parse(teamMembers);
</script></body></html>`;

/** Same shape but with a concrete numeric team rank. */
export const teamPageHtmlRanked = `<title>The Push-Up Challenge - Test</title>
<p>This team is currently ranked 42 out of all teams that are fundraising</p>
<script>var teamMembers = '[{\\"name\\":\\"Solo\\",\\"member_id\\":\\"7\\",\\"total_steps\\":\\"10\\",\\"m_raised\\":5}]';</script>`;
