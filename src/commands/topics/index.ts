import { Command } from '@commander-js/extra-typings';
import { createTopicCommand } from './create';
import { getTopicCommand } from './get';
import { listTopicsCommand } from './list';
import { updateTopicCommand } from './update';
import { deleteTopicCommand } from './delete';

export const topicsCommand = new Command('topics')
  .description('Manage topics for contact subscription preferences')
  .addHelpText(
    'after',
    `
Topics enable fine-grained subscription management beyond the global unsubscribe flag.
A contact can opt in or out of individual topics independently.

Broadcasts can target a topic_id so only contacts who have opted into that topic
receive the email. Contacts with no subscription record use the topic's
default_subscription setting.

Subscription states:
  opt_in   Contact will receive broadcasts for this topic
  opt_out  Contact will NOT receive broadcasts for this topic

Contact topic subscriptions are managed via the contacts namespace:
  resend contacts topics <contactId>
  resend contacts update-topics <contactId> --topic-id <id> --subscription opt_in

Global options (defined on root):
  --api-key <key>  API key (or set RESEND_API_KEY env var)
  --json           Force JSON output (also auto-enabled when stdout is piped)

Examples:
  $ resend topics list
  $ resend topics create --name "Product Updates"
  $ resend topics create --name "Weekly Digest" --default-subscription opt_out
  $ resend topics get 78261eea-8f8b-4381-83c6-79fa7120f1cf
  $ resend topics update 78261eea-8f8b-4381-83c6-79fa7120f1cf --name "Security Alerts"
  $ resend topics delete 78261eea-8f8b-4381-83c6-79fa7120f1cf --yes`
  )
  .addCommand(createTopicCommand)
  .addCommand(getTopicCommand)
  .addCommand(listTopicsCommand)
  .addCommand(updateTopicCommand)
  .addCommand(deleteTopicCommand);
