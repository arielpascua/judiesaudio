import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

describe('Node requirement is stated once and agrees everywhere', () => {
  const RANGE = '^20.19.0 || ^22.13.0 || >=24.0.0';

  it('package.json and the lockfile root say the same range', () => {
    expect(JSON.parse(read('package.json')).engines.node).toBe(RANGE);
    expect(JSON.parse(read('package-lock.json')).packages[''].engines.node).toBe(RANGE);
  });

  it('the README names the same floor', () => {
    expect(read('README.md')).toMatch(/Requires Node 20\.19 or newer \(20\.19\+, 22\.13\+ or 24\+/);
  });
});

describe('the README is this project’s README', () => {
  const readme = read('README.md');

  it('is about Judie’s Audio and carries nothing from the rug store', () => {
    expect(readme).toContain('Judie’s Audio');
    expect(readme).not.toMatch(/taruuv|\brugs?\b|carpet/i);
  });

  it('documents the link-only checkout and how to generate and rotate the token', () => {
    expect(readme).toMatch(/CHECKOUT_LINK_TOKEN/);
    expect(readme).toMatch(/randomBytes/);
    expect(readme).toMatch(/rotate/i);
  });

  it('names both migrations and the honesty rules', () => {
    expect(readme).toContain('0001_ja_orders.sql');
    expect(readme).toContain('0002_ja_inquiries.sql');
    expect(readme).toMatch(/Honesty rules/);
  });
});
