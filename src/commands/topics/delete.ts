import { Command } from '@commander-js/extra-typings';
import type { GlobalOpts } from '../../lib/client';
import { requireClient } from '../../lib/client';
import { confirmDelete } from '../../lib/prompts';
import { createSpinner } from '../../lib/spinner';
import { outputError, outputResult, errorMessage } from '../../lib/output';
import { isInteractive } from '../../lib/tty';

export const deleteTopicCommand = new Command('delete')
  .description('Delete a topic')
  .argument('<id>', 'Topic UUID')
  .option('--yes', 'Skip the confirmation prompt (required in non-interactive mode)')
  .addHelpText(
    'after',
    `
⚠ Deleting a topic removes all contact subscriptions to that topic and may affect
  broadcasts that reference this topic_id. Contacts themselves are not deleted.

Non-interactive: --yes is required to confirm deletion when stdin/stdout is not a TTY.

Global options (defined on root):
  --api-key <key>  API key (or set RESEND_API_KEY env var)
  --json           Force JSON output (also auto-enabled when stdout is piped)

Output (--json or piped):
  {"object":"topic","id":"<uuid>","deleted":true}

Errors (exit code 1):
  {"error":{"message":"<message>","code":"<code>"}}
  Codes: auth_error | confirmation_required | delete_error

Examples:
  $ resend topics delete 78261eea-8f8b-4381-83c6-79fa7120f1cf --yes
  $ resend topics delete 78261eea-8f8b-4381-83c6-79fa7120f1cf --yes --json`
  )
  .action(async (id, opts, cmd) => {
    const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
    const resend = requireClient(globalOpts);

    if (!opts.yes) {
      await confirmDelete(
        id,
        `Delete topic ${id}? All contact subscriptions and broadcast associations will be removed.`,
        globalOpts
      );
    }

    const spinner = createSpinner('Deleting topic...');

    try {
      const { error } = await resend.topics.remove(id);

      if (error) {
        spinner.fail('Failed to delete topic');
        outputError({ message: error.message, code: 'delete_error' }, { json: globalOpts.json });
      }

      spinner.stop('Topic deleted');

      if (!globalOpts.json && isInteractive()) {
        console.log('Topic deleted.');
      } else {
        outputResult({ object: 'topic', id, deleted: true }, { json: globalOpts.json });
      }
    } catch (err) {
      spinner.fail('Failed to delete topic');
      outputError({ message: errorMessage(err, 'Unknown error'), code: 'delete_error' }, { json: globalOpts.json });
    }
  });
