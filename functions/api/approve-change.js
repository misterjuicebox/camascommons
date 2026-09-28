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

    // 1. Merge dev branch into main branch
    const mergeResp = await fetch('https://api.github.com/repos/misterjuicebox/camascommons/merges', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CamasCommons-Approve-Handler'
      },
      body: JSON.stringify({
        base: 'main',
        head: 'dev',
        commit_message: `Merge approved AI Agent change (Issue #${issueNumber}) from dev to main`
      })
    });

    let mergeData = {};
    if (mergeResp.status !== 204) {
      try {
        mergeData = await mergeResp.json();
      } catch (jsonErr) {
        console.warn('Could not parse merge response JSON:', jsonErr);
      }
    }

    if (!mergeResp.ok && mergeResp.status !== 204) {
      console.error('Merge error:', mergeData);
      let errorMsg = mergeData.message || 'Failed to merge dev branch to main.';
      if (mergeResp.status === 409) {
        errorMsg = 'Merge conflict detected between staging (dev) and production (main). Direct edits on main may have conflicted. Please contact developer to resolve.';
      }
      return new Response(JSON.stringify({
        success: false,
        error: errorMsg
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Automatically sync main back into dev to prevent future branch divergence & conflicts
    try {
      await fetch('https://api.github.com/repos/misterjuicebox/camascommons/merges', {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken.trim()}`,
          'Content-Type': 'application/json',
          'User-Agent': 'CamasCommons-Approve-Handler'
        },
        body: JSON.stringify({
          base: 'dev',
          head: 'main',
          commit_message: `Sync main back to dev after approving Issue #${issueNumber}`
        })
      });
    } catch (syncErr) {
      console.warn('Post-approve branch sync warning:', syncErr);
    }

    // 3. Comment on GitHub Issue
    await fetch(`https://api.github.com/repos/misterjuicebox/camascommons/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CamasCommons-Approve-Handler'
      },
      body: JSON.stringify({
        body: `Approved by @${githubUsername}! Changes merged from \`dev\` to \`main\`. Live deployment triggered on [https://camascommons.org](https://camascommons.org).`
      })
    });

    // 4. Update Issue Labels & State to closed
    await fetch(`https://api.github.com/repos/misterjuicebox/camascommons/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${githubToken.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CamasCommons-Approve-Handler'
      },
      body: JSON.stringify({
        state: 'closed',
        labels: ['client-request', 'ai-agent-task', 'approved']
      })
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Change request #${issueNumber} approved and merged to main successfully! Production build triggered.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error approving change:', err);
    return new Response(JSON.stringify({
      success: false,
      error: `An unexpected error occurred: ${err.message || err}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
