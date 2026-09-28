export async function onRequestPost(context) {
  try {
    const request = context.request;
    const authHeader = request.headers.get('Authorization') || '';
    const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!userToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Missing GitHub token.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify token with GitHub API
    const ghUserResp = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${userToken}`,
        'User-Agent': 'CamasCommons-Auth-Verifier'
      }
    });

    if (!ghUserResp.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid session token.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const authenticatedUser = await ghUserResp.json();
    const githubUsername = authenticatedUser.login;

    // Verify collaborator access
    const repoAuthResp = await fetch(`https://api.github.com/repos/misterjuicebox/camascommons/collaborators/${githubUsername}`, {
      headers: {
        'Authorization': `token ${userToken}`,
        'User-Agent': 'CamasCommons-Auth-Verifier'
      }
    });

    if (!repoAuthResp.ok && githubUsername !== 'misterjuicebox') {
      return new Response(JSON.stringify({
        success: false,
        error: `Forbidden: User @${githubUsername} does not have repository access.`
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { issueNumber } = body;

    if (!issueNumber) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing issueNumber parameter.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const githubToken = (context.env && context.env.GITHUB_TOKEN) || userToken;

    // 1. Comment on GitHub Issue
    await fetch(`https://api.github.com/repos/misterjuicebox/camascommons/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CamasCommons-Discard-Handler'
      },
      body: JSON.stringify({
        body: `Request discarded/declined by @${githubUsername}.`
      })
    });

    // 2. Update Issue Labels & State to closed
    await fetch(`https://api.github.com/repos/misterjuicebox/camascommons/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${githubToken.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CamasCommons-Discard-Handler'
      },
      body: JSON.stringify({
        state: 'closed',
        labels: ['client-request', 'ai-agent-task', 'discarded']
      })
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Change request #${issueNumber} discarded.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error discarding change:', err);
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred while discarding change.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
