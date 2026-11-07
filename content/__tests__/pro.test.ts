import { describe, expect, it } from 'vitest';
import { defaultProPackId, getProPack, proPacks } from '@content/pro';

describe('pro default pack', () => {
  it('names a ready pack that getProPack resolves', () => {
    expect(getProPack(defaultProPackId)).toBeDefined();
    expect(`${defaultProPackId}-pro`).toBe(proPacks[0]!.id);
  });
});
