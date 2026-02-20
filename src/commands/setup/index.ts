import { Command } from '@commander-js/extra-typings';
import type { GlobalOpts } from '../../lib/client';
import { cursorCommand, setupCursor } from './cursor';
import { claudeDesktopCommand, setupClaudeDesktop } from './claude-desktop';
import { claudeCodeCommand, setupClaudeCode } from './claude-code';
import { vscodeCommand, setupVscode } from './vscode';

const SETUP_FNS = {
  cursor: setupCursor,
  'claude-desktop': setupClaudeDesktop,
  'claude-code': setupClaudeCode,
  vscode: setupVscode,
} as const;

export const setupCommand = new Command('setup')
  .description('Configure a supported tool to use Resend as an MCP server')
  .addHelpText('after', `
Subcommands:
  cursor          Write ~/.cursor/mcp.json
  claude-desktop  Write Claude Desktop config
  claude-code     Register via \`claude mcp add\` (falls back to ~/.claude.json)
  vscode          Write .vscode/mcp.json in the current directory

Examples:
  $ resend setup cursor
  $ resend setup vscode --json`)
  .addCommand(cursorCommand)
  .addCommand(claudeDesktopCommand)
  .addCommand(claudeCodeCommand)
  .addCommand(vscodeCommand);
