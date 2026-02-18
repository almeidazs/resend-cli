import type { DomainRecords } from 'resend';

function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const top = '┌' + widths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐';
  const mid = '├' + widths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤';
  const bot = '└' + widths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘';
  const row = (cells: string[]) =>
    '│ ' + cells.map((c, i) => c.padEnd(widths[i])).join(' │ ') + ' │';
  return [top, row(headers), mid, ...rows.map(row), bot].join('\n');
}

export function renderDnsRecordsTable(records: DomainRecords[], domainName: string): string {
  if (records.length === 0) return '(no DNS records)';
  const rows = records.map((r) => {
    const displayName = r.name
      ? r.name.includes('.')
        ? r.name
        : `${r.name}.${domainName}`
      : domainName;
    return [r.type, displayName, r.ttl, r.value];
  });
  return renderTable(['Type', 'Name', 'TTL', 'Value'], rows);
}

export function renderDomainsTable(
  domains: Array<{ id: string; name: string; status: string; region: string }>
): string {
  if (domains.length === 0) return '(no domains)';
  const rows = domains.map((d) => [d.name, d.status, d.region, d.id]);
  return renderTable(['Name', 'Status', 'Region', 'ID'], rows);
}

export function statusIndicator(status: string): string {
  switch (status) {
    case 'verified':
      return '✓ Verified';
    case 'pending':
      return '⏳ Pending';
    case 'not_started':
      return '○ Not started';
    case 'failed':
    case 'temporary_failure':
      return '✗ Failed';
    default:
      return status;
  }
}
