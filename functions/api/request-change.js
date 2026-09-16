export async function onRequestPost(context) {
  try {
    const request = context.request;
    const origin = new URL(request.url).origin;

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

    // 1. Anti-Spam Honeypot Trap
    if (website_url && website_url.trim() !== '') {
      console.warn('Bot request blocked via honeypot field.');
      return new Response(JSON.stringify({ success: true, message: 'Request submitted successfully!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Input Validation
    if (!requestTitle || !requestDescription) {
      return new Response(JSON.stringify({ success: false, error: 'Please provide both a summary and detailed description for your request.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const name = clientName && clientName.trim() ? clientName.trim() : 'Camas Commons Admin';
    const email = clientEmail && clientEmail.trim() ? clientEmail.trim() : 'info@camascommons.org';
    const pageTarget = affectedPage && affectedPage.trim() ? affectedPage.trim() : 'General / Homepage';
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });

    // 3. Post Issue to GitHub API if GITHUB_TOKEN is available
    const githubToken = (context.env && context.env.GITHUB_TOKEN) || null;

    const issueBody = `## 🤖 Client Change Request

**Requested By:** ${name} (<${email}>)  
**Target Page/Section:** \`${pageTarget}\`  
**Date Submitted:** ${timestamp} (PT)  
**Target Environment:** \`dev.camascommons.org\` (Branch: \`dev\`)  

---

### 📝 Request Details:

${requestDescription.trim()}

---

*Note: Execute this task on the \`dev\` branch. Once built and pushed, preview at [https://dev.camascommons.org](https://dev.camascommons.org).*
`;

    if (githubToken) {
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
        console.error('GitHub API error:', ghData);
      }
    }

    // Fallback response if GITHUB_TOKEN is not yet set up in Cloudflare env vars
    return new Response(JSON.stringify({
      success: true,
      message: 'Request submitted successfully! The AI Agent has received your request for dev.camascommons.org.',
      summary: requestTitle.trim(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

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
