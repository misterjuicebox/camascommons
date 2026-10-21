// Confirms a request comes from a signed-in CMS editor: the GitHub token the CMS
// stores must belong to a collaborator on the repo (same rule as the other
// functions in functions/api). Returns { ok: true, login } or { ok: false, status, error }.

const REPO = 'misterjuicebox/camascommons';
const OWNER = 'misterjuicebox';

export async function verifyEditor(request) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'Sign in to the CMS to see analytics.' };

  const headers = { Authorization: `token ${token}`, 'User-Agent': 'CamasCommons-Auth-Verifier' };

  const userResp = await fetch('https://api.github.com/user', { headers });
  if (!userResp.ok) return { ok: false, status: 401, error: 'Your CMS sign-in has expired. Sign in again.' };
  const { login } = await userResp.json();

  if (login === OWNER) return { ok: true, login };
  const collabResp = await fetch(`https://api.github.com/repos/${REPO}/collaborators/${login}`, { headers });
  if (!collabResp.ok) return { ok: false, status: 403, error: `@${login} doesn't have access to Camas Commons.` };

  return { ok: true, login };
}
