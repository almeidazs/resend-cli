import { describe, test, expect, spyOn, afterEach, mock, beforeEach } from 'bun:test';
import {
  setNonInteractive,
  mockExitThrow,
  captureTestEnv,
  setupOutputSpies,
  expectExit1,
} from '../../helpers';

const mockRemove = mock(async () => ({
  data: { object: 'segment' as const, id: 'aud_abc123', deleted: true },
  error: null,
}));

mock.module('resend', () => ({
  Resend: class MockResend {
    constructor(public key: string) {}
    audiences = { remove: mockRemove };
  },
}));

describe('audiences delete command', () => {
  const restoreEnv = captureTestEnv();
  let spies: ReturnType<typeof setupOutputSpies> | undefined;
  let errorSpy: ReturnType<typeof spyOn> | undefined;
  let stderrSpy: ReturnType<typeof spyOn> | undefined;
  let exitSpy: ReturnType<typeof spyOn> | undefined;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    mockRemove.mockClear();
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

  test('deletes audience with --yes flag', async () => {
    spies = setupOutputSpies();

    const { deleteAudienceCommand } = await import('../../../src/commands/audiences/delete');
    await deleteAudienceCommand.parseAsync(['aud_abc123', '--yes'], { from: 'user' });

    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove.mock.calls[0][0]).toBe('aud_abc123');
  });

  test('outputs JSON with deprecated wrapper and synthesized data when non-interactive', async () => {
    spies = setupOutputSpies();

    const { deleteAudienceCommand } = await import('../../../src/commands/audiences/delete');
    await deleteAudienceCommand.parseAsync(['aud_abc123', '--yes'], { from: 'user' });

    const output = spies.logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.deprecated).toBe(true);
    expect(parsed.deprecation_message).toContain('deprecated');
    expect(parsed.data.object).toBe('audience');
    expect(parsed.data.id).toBe('aud_abc123');
    expect(parsed.data.deleted).toBe(true);
  });

  test('errors with confirmation_required when --yes absent in non-interactive mode', async () => {
    setNonInteractive();
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { deleteAudienceCommand } = await import('../../../src/commands/audiences/delete');
    await expectExit1(() => deleteAudienceCommand.parseAsync(['aud_abc123'], { from: 'user' }));

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('confirmation_required');
  });

  test('does not call SDK when confirmation_required error is raised', async () => {
    setNonInteractive();
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { deleteAudienceCommand } = await import('../../../src/commands/audiences/delete');
    await expectExit1(() => deleteAudienceCommand.parseAsync(['aud_abc123'], { from: 'user' }));

    expect(mockRemove).not.toHaveBeenCalled();
  });

  test('errors with auth_error when no API key', async () => {
    setNonInteractive();
    delete process.env.RESEND_API_KEY;
    process.env.XDG_CONFIG_HOME = '/tmp/nonexistent-resend';
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = mockExitThrow();

    const { deleteAudienceCommand } = await import('../../../src/commands/audiences/delete');
    await expectExit1(() => deleteAudienceCommand.parseAsync(['aud_abc123', '--yes'], { from: 'user' }));

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('auth_error');
  });

  test('errors with delete_error when SDK returns an error', async () => {
    setNonInteractive();
    mockRemove.mockResolvedValueOnce({ data: null, error: { message: 'Audience not found', name: 'not_found' } } as any);
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    stderrSpy = spyOn(process.stderr, 'write').mockImplementation(() => true);
    exitSpy = mockExitThrow();

    const { deleteAudienceCommand } = await import('../../../src/commands/audiences/delete');
    await expectExit1(() => deleteAudienceCommand.parseAsync(['aud_nonexistent', '--yes'], { from: 'user' }));

    const output = errorSpy.mock.calls.map((c) => c[0]).join(' ');
    expect(output).toContain('delete_error');
  });
});
