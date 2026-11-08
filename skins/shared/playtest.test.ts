import { describe, expect, it } from 'vitest';
import { createGame } from '@engine/index';
import { dental } from '@content/scenarios/dental';
import { applyPlaytest, hasPlaytest, readPlaytest } from './playtest';

describe('playtest hooks', () => {
  it('parses fix, auto and debug', () => {
    const p = readPlaytest('?fix=q1:wifi-password,router-admin;q3:xray-usb&auto=blended&debug=1');
    expect(p.fixes[0]).toEqual(['wifi-password', 'router-admin']);
    expect(p.fixes[1]).toBeUndefined();
    expect(p.fixes[2]).toEqual(['xray-usb']);
    expect(p.auto).toBe('blended');
    expect(p.debug).toBe(true);
    expect(hasPlaytest(p)).toBe(true);
    expect(hasPlaytest(readPlaytest('?b=dental'))).toBe(false);
    expect(readPlaytest('?auto=nonsense').auto).toBeUndefined();
  });

  it('replays scripted quarters, skips unknown or unaffordable ids, and stops at the first unscripted quarter', () => {
    const p = readPlaytest('?fix=q1:wifi-password,nope,pms-eol-os,router-admin;q2:xray-usb');
    const g = applyPlaytest(createGame(dental, 3), dental, p);
    expect(g.state.round).toBe(3);
    expect(g.state.phase).toBe('choose');
    // Greedy in the given order: wifi-password (1) fits, nope is unknown, pms-eol-os (4) fits, router-admin (1) no longer does.
    expect(g.state.history[0]!.fixedIds).toEqual(['wifi-password', 'pms-eol-os']);
    expect(g.state.history[1]!.fixedIds).toEqual(['xray-usb']);
  });

  it('autoplays to the end with a strategy', () => {
    const g = applyPlaytest(createGame(dental, 3), dental, readPlaytest('?auto=threatFirst'));
    expect(g.state.phase).toBe('finished');
    expect(g.state.history).toHaveLength(4);
  });

  it('ignores a repeated id inside one quarter instead of throwing', () => {
    const p = readPlaytest('?fix=q1:wifi-password,wifi-password');
    const g = applyPlaytest(createGame(dental, 3), dental, p);
    expect(g.state.history[0]!.fixedIds).toEqual(['wifi-password']);
  });
});

describe('readPlaytest fix round bounds', () => {
  it('accepts rounds 1 through 20 and ignores 0 and 21+', () => {
    const p = readPlaytest('?fix=q0:a;q1:b;q20:c;q21:d;q99:e');
    expect(p.fixes[0]).toEqual(['b']);
    expect(p.fixes[19]).toEqual(['c']);
    expect(p.fixes).toHaveLength(20);
    expect(p.fixes.flat()).toEqual(['b', 'c']);
  });

  it('skips malformed parts without dropping the good ones', () => {
    const p = readPlaytest('?fix=garbage;q1.5:a;qx:b;q2:c;:d');
    expect(p.fixes[1]).toEqual(['c']);
    expect(p.fixes.flat()).toEqual(['c']);
  });

  it('leaves earlier unscripted quarters empty and lets a later part overwrite the same quarter', () => {
    const p = readPlaytest('?fix=q3:a;q3:b');
    expect(p.fixes[0]).toBeUndefined();
    expect(p.fixes[1]).toBeUndefined();
    expect(p.fixes[2]).toEqual(['b']);
  });

  it('trims ids and drops blanks', () => {
    const p = readPlaytest('?fix=q1: a , ,b ,');
    expect(p.fixes[0]).toEqual(['a', 'b']);
  });
});
