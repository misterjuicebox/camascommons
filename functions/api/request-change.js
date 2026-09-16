export async function onRequestPost(context) {
  try {
    const request = context.request;

    // 1. Strict Server-Side Authentication Check
    const authHeader = request.headers.get('Authorization') || '';
    const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!userToken) {
      return new Response(JSON.stringify({
        success: false,
        error: '401 Unauthorized: You must be logged into the CMS to submit requests.',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify token with GitHub API
    const ghUserResp = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${userToken}`,
        'User-Agent': 'CamasCommons-Auth-Verifier',
      },
    });

    if (!ghUserResp.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: '401 Unauthorized: Invalid or expired GitHub session token.',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authenticatedUser = await ghUserResp.json();
    const githubUsername = authenticatedUser.login;

    // Verify user has collaborator access to misterjuicebox/camascommons
    const repoAuthResp = await fetch(`https://api.github.com/repos/misterjuicebox/camascommons/collaborators/${githubUsername}`, {
      headers: {
        'Authorization': `token ${userToken}`,
        'User-Agent': 'CamasCommons-Auth-Verifier',
      },
    });

    if (!repoAuthResp.ok && authenticatedUser.login !== 'misterjuicebox') {
      return new Response(JSON.stringify({
        success: false,
        error: `403 Forbidden: GitHub user @${githubUsername} does not have repository access to Camas Commons.`,
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request payload
    let body;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }

    const {
      clientName,
      clientEmail,
      requestTitle,
      requestDescription,
      affectedPage,
      website_url // Honeypot trap
    } = body;

    // Anti-Spam Honeypot Trap
    if (website_url && website_url.trim() !== '') {
      console.warn('Bot request blocked via honeypot field.');
      return new Response(JSON.stringify({ success: true, message: 'Request submitted successfully!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Input Validation
    if (!requestTitle || !requestDescription) {
      return new Response(JSON.stringify({ success: false, error: 'Please provide both a summary and detailed description for your request.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const name = clientName && clientName.trim() ? clientName.trim() : (authenticatedUser.name || githubUsername);
    const email = clientEmail && clientEmail.trim() ? clientEmail.trim() : (authenticatedUser.email || 'info@camascommons.org');
    const pageTarget = affectedPage && affectedPage.trim() ? affectedPage.trim() : 'General / Homepage';
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });

    // 3. Post Issue to GitHub API using server token or user token
    const githubToken = (context.env && context.env.GITHUB_TOKEN) || userToken;

    const issueBody = `## 🤖 Client Change Request

**Requested By:** ${name} (@${githubUsername} <${email}>)  
**Target Page/Section:** \`${pageTarget}\`  
**Date Submitted:** ${timestamp} (PT)  
**Target Environment:** \`dev.camascommons.org\` (Branch: \`dev\`)  

---

### 📝 Request Details:

${requestDescription.trim()}

---

*Note: Execute this task on the \`dev\` branch. Once built and pushed, preview at [https://dev.camascommons.org](https://dev.camascommons.org).*
`;

    const ghResp = await fetch('https://api.github.com/repos/misterjuicebox/camascommons/issues', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CamasCommons-ClientRequest-Agent',
      },
      body: JSON.stringify({
        title: `🤖 [Client Request]: ${requestTitle.trim()}`,
        body: issueBody,
        labels: ['client-request', 'ai-agent-task'],
      }),
    });

    const ghData = await ghResp.json();

    if (ghResp.ok && ghData.html_url) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Request submitted successfully! Created task issue #' + ghData.number + '.',
        issueUrl: ghData.html_url,
        issueNumber: ghData.number,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.error('GitHub API error creating issue:', ghData);
      return new Response(JSON.stringify({
        success: false,
        error: ghData.message || 'Failed to create GitHub Issue for change request.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (err) {
    console.error('Error in request-change function:', err);
    return new Response(JSON.stringify({
      success: false,
      error: 'An unexpected error occurred while processing your request. Please try again.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
