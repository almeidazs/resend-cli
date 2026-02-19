import { Command } from '@commander-js/extra-typings';
import type { GlobalOpts } from '../../lib/client';
import { requireClient } from '../../lib/client';
import { createSpinner } from '../../lib/spinner';
import { outputError, outputResult, errorMessage } from '../../lib/output';
import { isInteractive } from '../../lib/tty';
import { renderBroadcastsTable } from './utils';

export const listBroadcastsCommand = new Command('list')
  .description('List broadcasts — returns summary objects (use "get <id>" for full details including html/text)')
  .option('--limit <n>', 'Maximum number of results to return (1–100, default 20)', '20')
  .option('--after <cursor>', 'Cursor for forward pagination — list items after this ID')
  .option('--before <cursor>', 'Cursor for backward pagination — list items before this ID')
  .addHelpText(
    'after',
    `
Note: List results include name, status, created_at, and id only.
To retrieve full details (html, from, subject), use: resend broadcasts get <id>

Global options (defined on root):
  --api-key <key>  API key (or set RESEND_API_KEY env var)
  --json           Force JSON output (also auto-enabled when stdout is piped)

Output (--json or piped):
  {"object":"list","has_more":false,"data":[{"id":"...","name":"...","status":"draft|queued|sent","created_at":"..."}]}

Errors (exit code 1):
  {"error":{"message":"<message>","code":"<code>"}}
  Codes: auth_error | invalid_limit | list_error

Examples:
  $ resend broadcasts list
  $ resend broadcasts list --limit 5
  $ resend broadcasts list --after bcast_abc --limit 10
  $ resend broadcasts list --json`
  )
  .action(async (opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
    const resend = requireClient(globalOpts);

    const spinner = createSpinner('Fetching broadcasts...', 'braille');

    try {
      const limit = parseInt(opts.limit, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        outputError(
          { message: '--limit must be an integer between 1 and 100', code: 'invalid_limit' },
          { json: globalOpts.json }
        );
      }
      const paginationOpts = opts.after
        ? { limit, after: opts.after }
        : opts.before
          ? { limit, before: opts.before }
          : { limit };
      const { data, error } = await resend.broadcasts.list(paginationOpts);

      if (error) {
        spinner.fail('Failed to list broadcasts');
        outputError({ message: error.message, code: 'list_error' }, { json: globalOpts.json });
      }

      spinner.stop('Broadcasts fetched');

      if (!globalOpts.json && isInteractive()) {
        console.log(renderBroadcastsTable(data!.data));
        if (data!.has_more && data!.data.length > 0) {
          const last = data!.data[data!.data.length - 1];
          console.log(`\nMore results available. Use --after ${last.id} to fetch the next page.`);
        }
      } else {
        outputResult(data, { json: globalOpts.json });
      }
    } catch (err) {
      spinner.fail('Failed to list broadcasts');
      outputError(
        { message: errorMessage(err, 'Unknown error'), code: 'list_error' },
        { json: globalOpts.json }
      );
    }
  });
