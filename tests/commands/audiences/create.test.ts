import { describe, test, expect, spyOn, afterEach, mock, beforeEach } from 'bun:test';
import {
  setNonInteractive,
  mockExitThrow,
  captureTestEnv,
  setupOutputSpies,
  expectExit1,
} from '../../helpers';

const mockCreate = mock(async () => ({
  data: { object: 'segment' as const, id: 'aud_abc123', name: 'My Audience' },
  error: null,
}));

mock.module('resend', () => ({
  Resend: class MockResend {
    constructor(public key: string) {}
    audiences = { create: mockCreate };
  },
}));

describe('audiences create command', () => {
  const restoreEnv = captureTestEnv();
  let spies: ReturnType<typeof setupOutputSpies> | undefined;
  let errorSpy: ReturnType<typeof spyOn> | undefined;
  let stderrSpy: ReturnType<typeof spyOn> | undefined;
  let exitSpy: ReturnType<typeof spyOn> | undefined;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    mockCreate.mockClear();
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

  test('creates audience with --name flag', async () => {
    spies = setupOutputSpies();

    const { createAudienceCommand } = await import('../../../src/commands/audiences/create');
    await createAudienceCommand.parseAsync(['--name', 'My Audience'], { from: 'user' });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const args = mockCreate.mock.calls[0][0] as any;
    expect(args.name).toBe('My Audience');
  });

  test('outputs JSON with deprecated wrapper when non-interactive', async () => {
    spies = setupOutputSpies();

    const { createAudienceCommand } = await import('../../../src/commands/audiences/create');
    await createAudienceCommand.parseAsync(['--name', 'My Audience'], { from: 'user' });

    const output = spies.logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.deprecated).toBe(true);
    expect(parsed.deprecation_message).toContain('deprecated');
    expect(parsed.data.id).toBe('aud_abc123');
    expect(parsed.data.name).toBe('My Audience');
  });

  test('errors with missing_name in non-interactive mode when --name absent', async () => {
    setNonInteractive();
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { createAudienceCommand } = await import('../../../src/commands/audiences/create');
    await expectExit1(() => createAudienceCommand.parseAsync([], { from: 'user' }));

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('missing_name');
  });

  test('does not call SDK when missing_name error is raised', async () => {
    setNonInteractive();
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { createAudienceCommand } = await import('../../../src/commands/audiences/create');
    await expectExit1(() => createAudienceCommand.parseAsync([], { from: 'user' }));

    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('errors with auth_error when no API key', async () => {
    setNonInteractive();
    delete process.env.RESEND_API_KEY;
    process.env.XDG_CONFIG_HOME = '/tmp/nonexistent-resend';
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { createAudienceCommand } = await import('../../../src/commands/audiences/create');
    await expectExit1(() => createAudienceCommand.parseAsync(['--name', 'Test'], { from: 'user' }));

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('auth_error');
  });

  test('errors with create_error when SDK returns an error', async () => {
    setNonInteractive();
    mockCreate.mockResolvedValueOnce({ data: null, error: { message: 'Audience already exists', name: 'validation_error' } } as any);
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = mockExitThrow();

    const { createAudienceCommand } = await import('../../../src/commands/audiences/create');
    await expectExit1(() => createAudienceCommand.parseAsync(['--name', 'My Audience'], { from: 'user' }));

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('create_error');
  });
});
