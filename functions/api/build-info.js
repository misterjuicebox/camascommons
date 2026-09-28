export async function onRequest(context) {
  const commitSha = (context.env && context.env.CF_PAGES_COMMIT_SHA) || 'local-dev';
  const branch = (context.env && context.env.CF_PAGES_BRANCH) || 'dev';
  
  return new Response(JSON.stringify({
    success: true,
    commitSha: commitSha,
    branch: branch,
    timestamp: Date.now()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
