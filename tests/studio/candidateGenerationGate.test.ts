import { describe, expect, test } from 'vitest';
import { CandidateGenerationGate } from '../../apps/studio/candidateGenerationGate';

describe('candidate generation gate', () => {
  test('allows only one active generation and releases after the matching plan finishes', () => {
    const gate = new CandidateGenerationGate();
    expect(gate.tryStart('plan-a')).toBe(true);
    expect(gate.active()).toBe('plan-a');
    expect(gate.tryStart('plan-b')).toBe(false);
    gate.finish('plan-b');
    expect(gate.active()).toBe('plan-a');
    gate.finish('plan-a');
    expect(gate.active()).toBeNull();
    expect(gate.tryStart('plan-b')).toBe(true);
  });
});
