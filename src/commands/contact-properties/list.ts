import { Command } from '@commander-js/extra-typings';
import type { GlobalOpts } from '../../lib/client';
import { requireClient } from '../../lib/client';
import { createSpinner } from '../../lib/spinner';
import { outputError, outputResult, errorMessage } from '../../lib/output';
import { parseLimitOpt, buildPaginationOpts, printPaginationHint } from '../../lib/pagination';
import { isInteractive } from '../../lib/tty';
import { renderContactPropertiesTable } from './utils';
import { buildHelpText } from '../../lib/help-text';

export const listContactPropertiesCommand = new Command('list')
  .description('List all contact property definitions')
  .option('--limit <n>', 'Maximum number of contact properties to return (1-100)', '10')
  .option('--after <cursor>', 'Return contact properties after this cursor (next page)')
  .option('--before <cursor>', 'Return contact properties before this cursor (previous page)')
  .addHelpText(
    'after',
    buildHelpText({
      context: `Pagination: use --after or --before with a contact property ID as the cursor.
  Only one of --after or --before may be used at a time.
  The response includes has_more: true when additional pages exist.`,
      output: `  {
    "object": "list",
    "has_more": false,
    "data": [
      { "id": "<uuid>", "key": "company_name", "type": "string", "fallbackValue": null, "createdAt": "..." }
    ]
  }`,
      errorCodes: ['auth_error', 'invalid_limit', 'list_error'],
      examples: [
        'resend contact-properties list',
        'resend contact-properties list --limit 25 --json',
        'resend contact-properties list --after prop_abc123 --json',
      ],
    }),
  )
  .action(async (opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
    const resend = requireClient(globalOpts);

    const limit = parseLimitOpt(opts.limit, globalOpts);
    const paginationOpts = buildPaginationOpts(limit, opts.after, opts.before);

    const spinner = createSpinner('Fetching contact properties...');

    try {
      const { data, error } = await resend.contactProperties.list(paginationOpts);

      if (error) {
        spinner.fail('Failed to list contact properties');
        outputError({ message: error.message, code: 'list_error' }, { json: globalOpts.json });
      }

      spinner.stop('Contact properties fetched');

      const list = data!;
      if (!globalOpts.json && isInteractive()) {
        console.log(renderContactPropertiesTable(list.data));
        printPaginationHint(list);
      } else {
        outputResult(list, { json: globalOpts.json });
      }
    } catch (err) {
      spinner.fail('Failed to list contact properties');
      outputError({ message: errorMessage(err, 'Unknown error'), code: 'list_error' }, { json: globalOpts.json });
    }
  });
