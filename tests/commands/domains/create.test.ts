import { describe, test, expect, spyOn, afterEach, mock, beforeEach } from 'bun:test';
import { ExitError, setNonInteractive, mockExitThrow } from '../../helpers';

const mockCreate = mock(async () => ({
  data: {
    id: 'test-domain-id',
    name: 'example.com',
    status: 'not_started',
    created_at: '2026-01-01T00:00:00.000Z',
    region: 'us-east-1',
    records: [
      { record: 'SPF', type: 'MX', name: 'send', ttl: 'Auto', status: 'not_started', value: 'feedback-smtp.us-east-1.amazonses.com', priority: 10 },
    ],
    capabilities: { sending: 'enabled', receiving: 'disabled' },
  },
  error: null,
}));

mock.module('resend', () => ({
  Resend: class MockResend {
    constructor(public key: string) {}
    domains = { create: mockCreate };
  },
}));

describe('domains create command', () => {
  const originalEnv = { ...process.env };
  const originalStdinIsTTY = process.stdin.isTTY;
  const originalStdoutIsTTY = process.stdout.isTTY;
  let logSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;
  let stderrSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    mockCreate.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinIsTTY, writable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutIsTTY, writable: true });
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
    exitSpy?.mockRestore();
    stderrSpy?.mockRestore();
  });

  test('creates domain with --name flag', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { createDomainCommand } = await import('../../../src/commands/domains/create');
    await createDomainCommand.parseAsync(['--name', 'example.com'], { from: 'user' });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const args = mockCreate.mock.calls[0][0] as any;
    expect(args.name).toBe('example.com');
  });

  test('passes region and tls flags to SDK', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { createDomainCommand } = await import('../../../src/commands/domains/create');
    await createDomainCommand.parseAsync(
      ['--name', 'example.com', '--region', 'eu-west-1', '--tls', 'enforced'],
      { from: 'user' }
    );

    const args = mockCreate.mock.calls[0][0] as any;
    expect(args.region).toBe('eu-west-1');
    expect(args.tls).toBe('enforced');
  });

  test('passes receiving capability when --receiving flag is set', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { createDomainCommand } = await import('../../../src/commands/domains/create');
    await createDomainCommand.parseAsync(['--name', 'example.com', '--receiving'], { from: 'user' });

    const args = mockCreate.mock.calls[0][0] as any;
    expect(args.capabilities?.receiving).toBe('enabled');
  });

  test('outputs JSON result when non-interactive', async () => {
    setNonInteractive();
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { createDomainCommand } = await import('../../../src/commands/domains/create');
    await createDomainCommand.parseAsync(['--name', 'example.com'], { from: 'user' });

    const output = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.id).toBe('test-domain-id');
    expect(parsed.name).toBe('example.com');
  });

  test('errors with missing_name when --name absent in non-interactive mode', async () => {
    setNonInteractive();
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { createDomainCommand } = await import('../../../src/commands/domains/create');
    try {
      await createDomainCommand.parseAsync([], { from: 'user' });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
    }

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('missing_name');
  });

  test('errors with auth_error when no API key', async () => {
    setNonInteractive();
    delete process.env.RESEND_API_KEY;
    process.env.XDG_CONFIG_HOME = '/tmp/nonexistent-resend';
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { createDomainCommand } = await import('../../../src/commands/domains/create');
    try {
      await createDomainCommand.parseAsync(['--name', 'example.com'], { from: 'user' });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
    }

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('auth_error');
  });

  test('errors with create_error when SDK returns an error', async () => {
    setNonInteractive();
    mockCreate.mockResolvedValueOnce({ data: null, error: { message: 'Domain already exists', name: 'validation_error' } } as any);
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = mockExitThrow();

    const { createDomainCommand } = await import('../../../src/commands/domains/create');
    try {
      await createDomainCommand.parseAsync(['--name', 'example.com'], { from: 'user' });
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
    }

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('create_error');
  });
});
