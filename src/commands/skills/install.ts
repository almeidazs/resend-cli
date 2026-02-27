import { Command } from '@commander-js/extra-typings';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { GlobalOpts } from '../../lib/client';
import { outputError, outputResult, errorMessage } from '../../lib/output';
import { isInteractive } from '../../lib/tty';
import { createSpinner } from '../../lib/spinner';
import { buildHelpText } from '../../lib/help-text';

const REPO = 'resend/resend-skills';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const TREE_API = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;

const EXCLUDED = [
  /^README\.md$/,
  /^LICENSE$/,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^tests\//,
  /^\./,  // root-level dotfiles and dot-directories (.gitignore, .github/, etc.)
];

function shouldInclude(path: string): boolean {
  return !EXCLUDED.some((re) => re.test(path));
}

// Root SKILL.md lives in its own folder so it's consistent with sub-skills
function destPath(repoPath: string): string {
  return repoPath === 'SKILL.md' ? 'resend/SKILL.md' : repoPath;
}

async function fetchTree(): Promise<string[]> {
  const res = await fetch(TREE_API, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) throw new Error(`GitHub API responded with ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { tree: Array<{ path: string; type: string }> };
  return data.tree
    .filter((item) => item.type === 'blob' && shouldInclude(item.path))
    .map((item) => item.path);
}

async function fetchContent(path: string): Promise<string> {
  const res = await fetch(`${RAW_BASE}/${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

export async function installSkills(skillsDir: string, globalOpts: GlobalOpts): Promise<void> {
  const spinner = createSpinner('Fetching skill list from GitHub...');

  let paths: string[];
  try {
    paths = await fetchTree();
  } catch (err) {
    spinner.fail('Failed to fetch skill list');
    outputError(
      { message: `Failed to fetch skill list: ${errorMessage(err, 'unknown error')}`, code: 'fetch_error' },
      { json: globalOpts.json },
    );
  }

  spinner.update(`Installing ${paths.length} files...`);

  const skillNames = new Set<string>();
  let fileCount = 0;

  for (const repoPath of paths) {
    const dest = destPath(repoPath);
    const fullPath = join(skillsDir, dest);

    let content: string;
    try {
      content = await fetchContent(repoPath);
    } catch (err) {
      spinner.fail(`Failed to fetch ${repoPath}`);
      outputError(
        { message: `Failed to fetch ${repoPath}: ${errorMessage(err, 'unknown error')}`, code: 'fetch_error' },
        { json: globalOpts.json },
      );
    }

    try {
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, 'utf8');
    } catch (err) {
      spinner.fail(`Failed to write ${dest}`);
      outputError(
        { message: `Failed to write ${dest}: ${errorMessage(err, 'unknown error')}`, code: 'write_error' },
        { json: globalOpts.json },
      );
    }

    skillNames.add(dest.split('/')[0]);
    fileCount++;
  }

  spinner.stop('Skills installed');

  const installed = Array.from(skillNames).sort();

  if (!globalOpts.json && isInteractive()) {
    for (const skill of installed) {
      console.log(`  ✔ ${skill}`);
    }
    console.log(`\n  ${fileCount} files installed → ${skillsDir}`);
  } else {
    outputResult({ installed, target: skillsDir, files: fileCount }, { json: globalOpts.json });
  }
}

export const installSkillsCommand = new Command('install')
  .description('Install Resend Agent Skills from github.com/resend/resend-skills')
  .option('--global', 'Install to ~/.claude/skills/ instead of .claude/skills/')
  .addHelpText(
    'after',
    buildHelpText({
      setup: true,
      context: `Fetches all skills from https://github.com/resend/resend-skills and writes them to:
  - Project: .claude/skills/    (default — run from your project root)
  - Global:  ~/.claude/skills/  (use --global for personal installation)

Skills installed:
  resend             Root skill — routes agent to the right sub-skill
  send-email         Transactional email, batch sends, retries, error handling
  resend-inbound     Receiving emails, webhooks, attachments
  templates          Create, publish, update, and delete email templates
  agent-email-inbox  AI agent email inbox with prompt injection protection`,
      output: `  {"installed":["agent-email-inbox","resend","resend-inbound","send-email","templates"],"target":".claude/skills","files":12}`,
      errorCodes: ['fetch_error', 'write_error'],
      examples: [
        'resend skills install',
        'resend skills install --global',
        'resend skills install --json',
      ],
    }),
  )
  .action(async (opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
    const skillsDir = opts.global
      ? join(homedir(), '.claude', 'skills')
      : join(process.cwd(), '.claude', 'skills');
    await installSkills(skillsDir, globalOpts);
  });
