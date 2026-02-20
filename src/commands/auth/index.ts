import { Command } from '@commander-js/extra-typings';
import { buildHelpText } from '../../lib/help-text';
import { loginCommand } from './login';

export const authCommand = new Command('auth')
  .description('Manage authentication')
  .addHelpText('after', buildHelpText({
    setup: true,
    examples: [
      'resend auth login',
      'resend auth login --key re_123456789',
    ],
  }))
  .addCommand(loginCommand);
