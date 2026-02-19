import { describe, test, expect, spyOn, afterEach, mock, beforeEach } from 'bun:test';
import {
  setNonInteractive,
  mockExitThrow,
  captureTestEnv,
  setupOutputSpies,
  expectExit1,
} from '../../helpers';

const mockList = mock(async () => ({
  data: {
    object: 'list' as const,
    data: [
      { id: 'aud_abc123', name: 'My Audience', created_at: '2026-01-01T00:00:00.000Z' },
    ],
    has_more: false,
  },
  error: null,
}));

mock.module('resend', () => ({
  Resend: class MockResend {
    constructor(public key: string) {}
    audiences = { list: mockList };
  },
}));

describe('audiences list command', () => {
  const restoreEnv = captureTestEnv();
  let spies: ReturnType<typeof setupOutputSpies> | undefined;
  let errorSpy: ReturnType<typeof spyOn> | undefined;
  let stderrSpy: ReturnType<typeof spyOn> | undefined;
  let exitSpy: ReturnType<typeof spyOn> | undefined;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    mockList.mockClear();
  });

  afterEach(() => {
    restoreEnv();
    spies?.restore();
    errorSpy?.mockRestore();
    stderrSpy?.mockRestore();
    exitSpy?.mockRestore();
    spies = undefined;
    errorSpy = undefined;
    stderrSpy = undefined;
    exitSpy = undefined;
  });

  test('calls SDK list with no arguments', async () => {
    spies = setupOutputSpies();

    const { listAudiencesCommand } = await import('../../../src/commands/audiences/list');
    await listAudiencesCommand.parseAsync([], { from: 'user' });

    expect(mockList).toHaveBeenCalledTimes(1);
  });

  test('outputs JSON with deprecated wrapper when non-interactive', async () => {
    spies = setupOutputSpies();

    const { listAudiencesCommand } = await import('../../../src/commands/audiences/list');
    await listAudiencesCommand.parseAsync([], { from: 'user' });

    const output = spies.logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.deprecated).toBe(true);
    expect(parsed.deprecation_message).toContain('deprecated');
    expect(parsed.data.object).toBe('list');
    expect(Array.isArray(parsed.data.data)).toBe(true);
    expect(parsed.data.data[0].name).toBe('My Audience');
    expect(parsed.data.has_more).toBe(false);
  });

  test('errors with auth_error when no API key', async () => {
    setNonInteractive();
    delete process.env.RESEND_API_KEY;
    process.env.XDG_CONFIG_HOME = '/tmp/nonexistent-resend';
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { listAudiencesCommand } = await import('../../../src/commands/audiences/list');
    await expectExit1(() => listAudiencesCommand.parseAsync([], { from: 'user' }));

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('auth_error');
  });

  test('errors with list_error when SDK returns an error', async () => {
    setNonInteractive();
    mockList.mockResolvedValueOnce({ data: null, error: { message: 'Server error', name: 'server_error' } } as any);
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = mockExitThrow();

    const { listAudiencesCommand } = await import('../../../src/commands/audiences/list');
    await expectExit1(() => listAudiencesCommand.parseAsync([], { from: 'user' }));

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('list_error');
  });
});
