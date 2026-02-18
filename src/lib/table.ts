export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const top = '┌' + widths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐';
  const mid = '├' + widths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤';
  const bot = '└' + widths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘';
  const row = (cells: string[]) =>
    '│ ' + cells.map((c, i) => c.padEnd(widths[i])).join(' │ ') + ' │';
  return [top, row(headers), mid, ...rows.map(row), bot].join('\n');
}
