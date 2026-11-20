import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// A text check of the (not yet applied) migrations: no database needed.
const root = path.resolve(__dirname, '..');
const dir = path.join(__dirname, 'migrations');
const strip = (sql: string) => sql.replace(/--.*$/gm, '');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const read = (f: string) => strip(readFileSync(path.join(dir, f), 'utf8'));

describe('migrations: privilege model', () => {
  it('ships the orders migration', () => {
    expect(files).toContain('0001_ja_orders.sql');
  });

  it.each(files)('%s creates only ja_ tables, with no catalogue tables', (file) => {
    const tables = [...read(file).matchAll(/create table(?: if not exists)?\s+([a-z_]+)/gi)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) expect(t).toMatch(/^ja_/);
    expect(tables.join(' ')).not.toMatch(/product|catalog|rug|size/);
  });

  it.each(files)('%s enables row level security on EVERY table it creates', (file) => {
    const sql = read(file);
    const tables = [...sql.matchAll(/create table(?: if not exists)?\s+([a-z_]+)/gi)].map((m) => m[1]);
    for (const t of tables) {
      expect(sql, t).toMatch(new RegExp(`alter table ${t} enable row level security`, 'i'));
    }
  });

  it.each(files)('%s has no policy and no grant to anon or authenticated', (file) => {
    const sql = read(file);
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/\bgrant\b/i);
    for (const m of sql.matchAll(/revoke ([a-z, ]+) on ([a-z_, ]+) from ([a-z, ]+);/gi)) {
      expect(m[3]).toMatch(/anon/);
    }
  });

  it('revokes everything on both order tables from anon and authenticated', () => {
    const sql = read('0001_ja_orders.sql');
    expect(sql).toMatch(/revoke all on ja_orders from anon, authenticated;/i);
    expect(sql).toMatch(/revoke all on ja_order_items from anon, authenticated;/i);
  });

  it('limits order status to pending, paid and cancelled, defaulting to pending', () => {
    const flat = read('0001_ja_orders.sql').replace(/\s+/g, ' ');
    expect(flat).toMatch(/status text not null default 'pending' check \(status in \('pending', 'paid', 'cancelled'\)\)/i);
  });

  it('keeps the B2B customer, pack and finish snapshots', () => {
    const flat = read('0001_ja_orders.sql').replace(/\s+/g, ' ');
    expect(flat).toMatch(/customer jsonb not null/i);
    for (const col of ['pack_id text not null', 'pack_label text not null', 'pack_units int not null', 'finish_name text not null']) {
      expect(flat).toContain(col);
    }
    expect(flat).toMatch(/order_id uuid not null references ja_orders \(id\) on delete cascade/i);
  });
});

describe("no application code marks an order 'paid'", () => {
  function sources(dirPath: string): string[] {
    return readdirSync(dirPath).flatMap((name) => {
      const full = path.join(dirPath, name);
      if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : sources(full);
      return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
    });
  }

  it("never writes the string 'paid' or paid_at in lib/ or app/", () => {
    const offenders = [...sources(path.join(root, 'lib')), ...sources(path.join(root, 'app'))].filter((file) => {
      // Comments may talk about it; code may not.
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      return /['"`]paid['"`]/.test(code) || /paid_at/.test(code);
    });
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
