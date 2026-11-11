import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workflow = readFileSync(resolve(import.meta.dirname, '../.github/workflows/ci.yml'), 'utf8');

describe('CI workflow', () => {
  it('pins every action to a full commit SHA with a version comment', () => {
    const uses = [...workflow.matchAll(/uses:\s*(\S+)(.*)$/gm)];
    expect(uses.length).toBeGreaterThan(0);
    for (const [, ref, rest] of uses) {
      expect(ref, ref).toMatch(/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/);
      expect(rest, ref).toMatch(/#\s*v\d+/);
    }
  });

  it('keeps the token read-only', () => {
    expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*read/);
  });
});
