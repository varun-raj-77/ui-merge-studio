import { describe, expect, test } from 'vitest';
import { CandidateGenerationGate } from '../../apps/studio/candidateGenerationGate';

describe('candidate generation gate', () => {
  test('allows only one active generation and keeps the active plan identity isolated', () => {
    const gate = new CandidateGenerationGate();
    expect(gate.acquire()).toBe(true);
    gate.bind('plan-v2-aaaaaaaa');
    expect(gate.planIdentity).toBe('plan-v2-aaaaaaaa');
    expect(gate.acquire()).toBe(false);
    expect(gate.planIdentity).toBe('plan-v2-aaaaaaaa');
    gate.release();
    expect(gate.isActive).toBe(false);
    expect(gate.planIdentity).toBeNull();
  });

  test('releases cleanly so a later generation can start with a different identity', () => {
    const gate = new CandidateGenerationGate();
    expect(gate.acquire()).toBe(true);
    gate.bind('plan-v2-aaaaaaaa');
    gate.release();
    expect(gate.acquire()).toBe(true);
    gate.bind('plan-v2-bbbbbbbb');
    expect(gate.planIdentity).toBe('plan-v2-bbbbbbbb');
  });

  test('refuses identity binding when no generation owns the gate', () => {
    const gate = new CandidateGenerationGate();
    expect(() => gate.bind('plan-v2-aaaaaaaa')).toThrow('not active');
  });
});
