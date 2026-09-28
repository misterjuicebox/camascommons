export async function onRequestGet(context) {
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
        error: 'Unauthorized: Invalid or expired GitHub session token.'
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
        error: `Forbidden: GitHub user @${githubUsername} does not have repository access.`
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch issues tagged client-request
    const issuesResp = await fetch('https://api.github.com/repos/misterjuicebox/camascommons/issues?labels=client-request&state=all&per_page=50', {
      headers: {
        'Authorization': `token ${userToken}`,
        'User-Agent': 'CamasCommons-Request-Lister'
      }
    });

    if (!issuesResp.ok) {
      const errData = await issuesResp.json();
      return new Response(JSON.stringify({
        success: false,
        error: errData.message || 'Failed to fetch change requests from GitHub.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const issues = await issuesResp.json();
    const formattedRequests = [];

    for (const issue of issues) {
      let status = 'Pending';
      const labels = (issue.labels || []).map(l => l.name);

      if (labels.includes('approved')) {
        status = 'Approved';
      } else if (labels.includes('discarded') || labels.includes('declined')) {
        status = 'Discarded';
      } else if (issue.state === 'closed') {
        status = 'Approved';
      } else if (issue.comments > 0) {
        // Fetch comments to check AI completion status
        const commentsResp = await fetch(issue.comments_url, {
          headers: {
            'Authorization': `token ${userToken}`,
            'User-Agent': 'CamasCommons-Request-Lister'
          }
        });
        if (commentsResp.ok) {
          const comments = await commentsResp.json();
          const hasComplete = comments.some(c => c.body && (c.body.includes('AI Agent Task Complete') || c.body.includes('Live Preview')));
          const hasError = comments.some(c => c.body && c.body.includes('AI Agent Execution Error'));
          if (hasComplete) {
            status = 'Ready for Review';
          } else if (hasError) {
            status = 'Error';
          }
        }
      }

      // Parse metadata from body if available
      let requestedBy = issue.user?.login || 'Unknown';
      let targetSection = 'General';

      if (issue.body) {
        const reqMatch = issue.body.match(/\*\*Requested By:\*\*\s*([^\n]+)/);
        if (reqMatch) requestedBy = reqMatch[1].trim();

        const secMatch = issue.body.match(/\*\*Target Page\/Section:\*\*\s*`?([^`\n]+)`?/);
        if (secMatch) targetSection = secMatch[1].trim();
      }

      formattedRequests.push({
        id: issue.number,
        title: issue.title.replace(/^🤖\s*\[Client Request\]:\s*/i, ''),
        description: issue.body,
        status: status,
        requestedBy: requestedBy,
        targetSection: targetSection,
        createdAt: issue.created_at,
        issueUrl: issue.html_url,
        devUrl: 'https://dev.camascommons.org'
      });
    }

    return new Response(JSON.stringify({
      success: true,
      requests: formattedRequests
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error listing AI requests:', err);
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred while listing requests.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
