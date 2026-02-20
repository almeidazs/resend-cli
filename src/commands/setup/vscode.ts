import { Command } from '@commander-js/extra-typings';
import { join } from 'node:path';
import type { GlobalOpts } from '../../lib/client';
import { outputError, outputResult, errorMessage } from '../../lib/output';
import { isInteractive } from '../../lib/tty';
import { mergeJsonConfig } from './utils';

const RESEND_VSCODE_ENTRY = { type: 'stdio', command: 'resend', args: ['mcp', 'serve'] };

export async function setupVscode(globalOpts: GlobalOpts): Promise<void> {
  const configPath = join(process.cwd(), '.vscode', 'mcp.json');

  try {
    mergeJsonConfig(configPath, (existing) => ({
      ...existing,
      servers: {
        ...(existing.servers as Record<string, unknown> | undefined),
        resend: RESEND_VSCODE_ENTRY,
      },
    }));
  } catch (err) {
    outputError(
      { message: `Failed to write VS Code config: ${errorMessage(err, 'unknown error')}`, code: 'config_write_error' },
      { json: globalOpts.json },
    );
  }

  if (!globalOpts.json && isInteractive()) {
    console.log(`  ✔ VS Code configured: ${configPath}`);
  } else {
    outputResult({ configured: true, tool: 'vscode', config_path: configPath }, { json: globalOpts.json });
  }
}

export const vscodeCommand = new Command('vscode')
  .description('Write .vscode/mcp.json in the current directory for VS Code MCP')
  .addHelpText('after', `
What it does:
  Writes .vscode/mcp.json in the CURRENT WORKING DIRECTORY.
  Uses the "servers" key with "type": "stdio" (VS Code format — different from Cursor/Claude Desktop).
  Existing "servers" entries are preserved (idempotent).

Config written:
  .vscode/mcp.json
  {
    "servers": {
      "resend": { "type": "stdio", "command": "resend", "args": ["mcp", "serve"] }
    }
  }

Important format differences from other tools:
  - Key: "servers" (not "mcpServers")
  - Entry requires "type": "stdio"

Note: Run this command from your project root directory.

Examples:
  $ resend setup vscode
  $ resend setup vscode --json`)
  .action((_opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
    return setupVscode(globalOpts);
  });
