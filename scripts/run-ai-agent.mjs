import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const issueTitle = process.env.ISSUE_TITLE || '';
const issueBody = process.env.ISSUE_BODY || '';
const issueNumber = process.env.ISSUE_NUMBER || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const githubToken = process.env.GITHUB_TOKEN || '';
const repoName = process.env.GITHUB_REPOSITORY || 'misterjuicebox/camascommons';

console.log(`🤖 Starting AI Agent processing for Issue #${issueNumber}: "${issueTitle}"`);

if (!geminiApiKey) {
  console.log('⚠️ GEMINI_API_KEY not found in repository secrets.');
  console.log('Posting status comment on issue asking repository owner to add GEMINI_API_KEY...');
  if (githubToken && issueNumber) {
    await postGitHubComment(
      `⚠️ **AI Agent Notice:** The \`GEMINI_API_KEY\` secret is not configured in this repository yet.\n\n` +
      `To enable automated AI code execution:\n` +
      `1. Go to **Settings > Secrets and variables > Actions** in GitHub.\n` +
      `2. Add secret \`GEMINI_API_KEY\` with your Gemini API key.\n` +
      `3. Re-open or label this issue to re-trigger execution.`
    );
  }
  process.exit(0);
}

// 1. Gather repository context (selective source files)
function getRepositoryContext() {
  const rootDir = process.cwd();
  const targetPaths = [
    'src/pages/index.astro',
    'src/pages/admin.astro',
    'astro.config.mjs',
    'public/admin/config.yml'
  ];

  let contextText = '';

  for (const relPath of targetPaths) {
    const fullPath = path.join(rootDir, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      contextText += `\n\n--- FILE: ${relPath} ---\n${content}\n`;
    }
  }

  // Also include any component files in src/components if present
  const componentsDir = path.join(rootDir, 'src/components');
  if (fs.existsSync(componentsDir)) {
    const files = fs.readdirSync(componentsDir);
    for (const f of files) {
      if (f.endsWith('.astro') || f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('.vue')) {
        const relPath = path.join('src/components', f);
        const content = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
        contextText += `\n\n--- FILE: ${relPath} ---\n${content}\n`;
      }
    }
  }

  return contextText;
}

// 2. Call Gemini 2.5 Flash API
async function generateCodeEdits(prompt, repoContext) {
  const systemInstruction = `You are an expert full-stack Astro & web developer working on the Camas Commons website (dev branch).
Your job is to read a client request and output modified code files to satisfy the user's request precisely.

Rules:
1. Output MUST be valid JSON array of file edits in the following format ONLY:
[
  {
    "filePath": "src/pages/index.astro",
    "content": "...complete updated file content..."
  }
]
2. Do not wrap JSON in markdown code blocks like \`\`\`json. Output raw JSON array only.
3. Keep changes clean, responsive, high quality, accessible, and preserve existing styles and rules.
4. Only modify relevant files. Do not modify files unnecessarily.`;

  const userPrompt = `Client Change Request Issue #${issueNumber}:
Title: ${issueTitle}
Details:
${issueBody}

Codebase Context:
${repoContext}`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.parse(textOutput);
}

// 3. Helper to post GitHub comments
async function postGitHubComment(commentText) {
  if (!githubToken || !issueNumber) return;
  try {
    await fetch(`https://api.github.com/repos/${repoName}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CamasCommons-AI-Agent'
      },
      body: JSON.stringify({ body: commentText })
    });
  } catch (e) {
    console.error('Failed to post GitHub comment:', e);
  }
}

// 4. Helper to close GitHub Issue
async function closeGitHubIssue() {
  if (!githubToken || !issueNumber) return;
  try {
    await fetch(`https://api.github.com/repos/${repoName}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CamasCommons-AI-Agent'
      },
      body: JSON.stringify({ state: 'closed' })
    });
  } catch (e) {
    console.error('Failed to close GitHub issue:', e);
  }
}

// Main Execution Loop
async function main() {
  try {
    const repoContext = getRepositoryContext();
    console.log('Sending request to Gemini AI Agent...');

    const edits = await generateCodeEdits(`${issueTitle}\n${issueBody}`, repoContext);

    if (!Array.isArray(edits) || edits.length === 0) {
      console.log('No file edits generated by AI agent.');
      await postGitHubComment(`ℹ️ **AI Agent:** Reviewed request #${issueNumber}, no file changes were generated.`);
      return;
    }

    const modifiedFiles = [];
    for (const edit of edits) {
      if (edit.filePath && edit.content) {
        const fullPath = path.join(process.cwd(), edit.filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, edit.content, 'utf8');
        modifiedFiles.push(edit.filePath);
        console.log(`Updated file: ${edit.filePath}`);
      }
    }

    // Run build check
    console.log('Verifying Astro build...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('Build succeeded! Modifications ready for git commit.');

    const fileListText = modifiedFiles.map(f => `- \`${f}\``).join('\n');
    await postGitHubComment(
      `✅ **AI Agent Task Complete!**\n\n` +
      `The following files were updated on the \`dev\` branch:\n${fileListText}\n\n` +
      `🚀 **Live Preview:** [https://dev.camascommons.org](https://dev.camascommons.org) (or [https://dev.camascommons.pages.dev](https://dev.camascommons.pages.dev))`
    );

    await closeGitHubIssue();

  } catch (err) {
    console.error('Error executing AI Agent:', err);
    await postGitHubComment(
      `❌ **AI Agent Execution Error:**\n\`\`\`\n${err.message}\n\`\`\`\n` +
      `Please check the GitHub Actions logs for details.`
    );
    process.exit(1);
  }
}

main();
