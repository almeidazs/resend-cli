# Resend CLI — Command Namespaces Index

This `docs/` folder contains one implementation handoff per SDK namespace. Each document gives engineers everything they need to add that group of commands to the CLI.

## Status

| # | Namespace | SDK namespace | CLI prefix | Status |
|---|-----------|---------------|------------|--------|
| 1 | [Emails](./01-emails.md) | `resend.emails` | `resend emails …` | Partial — `send` done |
| 2 | [Batch](./02-batch.md) | `resend.batch` | `resend emails batch` | Not started |
| 3 | [Domains](./03-domains.md) | `resend.domains` | `resend domains …` | Not started |
| 4 | [API Keys](./04-api-keys.md) | `resend.apiKeys` | `resend api-keys …` | Not started |
| 5 | [Broadcasts](./05-broadcasts.md) | `resend.broadcasts` | `resend broadcasts …` | Not started |
| 6 | [Contacts](./06-contacts.md) | `resend.contacts` | `resend contacts …` | Not started |
| 7 | [Contact Properties](./07-contact-properties.md) | `resend.contactProperties` | `resend contact-properties …` | Not started |
| 8 | [Segments](./08-segments.md) | `resend.segments` | `resend segments …` | Not started |
| 9 | [Audiences (deprecated)](./09-audiences.md) | `resend.audiences` | `resend audiences …` | Deprecated — thin wrapper |
| 10 | [Topics](./10-topics.md) | `resend.topics` | `resend topics …` | Not started |
| 11 | [Templates](./11-templates.md) | `resend.templates` | `resend templates …` | Not started |
| 12 | [Webhooks](./12-webhooks.md) | `resend.webhooks` | `resend webhooks …` | Not started |
| 13 | [Receiving (inbound)](./13-receiving.md) | `resend.emails` (receiving sub-resource) | `resend emails receiving …` | Not started |
| 14 | [Agent Setup](./14-agent-setup.md) | _(no SDK namespace — writes tool configs)_ | `resend setup …` | Done |

## Common Patterns

All commands follow the same four-step implementation pattern:

```
1. Resolve auth          → createClient(globalOpts.apiKey)
2. Gather args           → promptForMissing() in interactive mode, or error immediately in non-interactive
3. Call the SDK          → resend.<namespace>.<method>(payload)
4. Emit output           → outputResult(data) / outputError(error)
```

### File layout for a new namespace (example: `domains`)

```
src/commands/domains/
├── index.ts          ← parent Command('domains'), registers sub-commands
├── create.ts
├── list.ts
├── get.ts
├── update.ts
├── delete.ts
└── verify.ts
```

Register the parent in `src/cli.ts`:

```typescript
import { domainsCommand } from './commands/domains/index';
program.addCommand(domainsCommand);
```

### Global options

All action callbacks access global options like this — do NOT annotate the parameters:

```typescript
.action(async (opts, cmd) => {
  const globalOpts = cmd.optsWithGlobals() as { apiKey?: string; json?: boolean };
  …
})
```

### Non-interactive guard

Every required flag must be checked before prompting:

```typescript
if (!requiredValue && !isInteractive()) {
  outputError({ message: 'Missing --flag. Required in non-interactive mode.', code: 'missing_flag' }, { json: globalOpts.json });
}
```

### Pagination flags (for `list` commands)

Use `--limit <n>` (default 10, max 100) and `--after <cursor>` / `--before <cursor>`:

```typescript
.option('--limit <n>', 'Number of results (default 10)', '10')
.option('--after <cursor>', 'Cursor for next page')
.option('--before <cursor>', 'Cursor for previous page')
```

## SDK version

All implementations target `resend` v6.9.2. Do **not** use the `react` property on email payloads — it triggers a lazy `@react-email/render` import that won't bundle with `bun build --compile`.
