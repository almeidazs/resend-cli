import { Command } from '@commander-js/extra-typings';
import { buildHelpText } from '../../lib/help-text';
import { installSkillsCommand } from './install';

export const skillsCommand = new Command('skills')
  .description('Install and manage Resend Agent Skills')
  .addCommand(installSkillsCommand)
  .addHelpText(
    'after',
    buildHelpText({
      setup: true,
      context: `Resend Agent Skills teach AI coding agents (Claude Code, Cursor, Codex, and others)
how to work with Resend's email APIs without extra instructions in your prompt.

Source: https://github.com/resend/resend-skills`,
      examples: ['resend skills install', 'resend skills install --global'],
    }),
  );
