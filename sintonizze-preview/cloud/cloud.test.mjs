import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createCloudStore, CloudConflict, validateDocument } from './client.mjs';

const alice = '00000000-0000-0000-0000-000000000001';
const bob = '00000000-0000-0000-0000-000000000002';
const outsider = '00000000-0000-0000-0000-000000000003';
const document = { protocols: [], sessions: [{ id: 'legacy-id', baseline: { hawkins: 0 }, answers: { q: { yn: false } } }], templates: [], v42Treatments: [{ id: 't1', sessionId: 'legacy-id', focuses: [{ id: 'f1' }] }], futureField: 'preserved' };

test('Postgres: owner isolation, membership, history, conflicts and invalid documents', async () => {
  const db = new PGlite();
  try {
    // Reproduce Supabase roles and JWT subject locally; no real accounts/data.
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('${alice}'), ('${bob}'), ('${outsider}');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20260928012650_sintonizze_private_snapshots.sql', import.meta.url), 'utf8'));
    await db.exec(`insert into public.sintonizze_members values ('${alice}'), ('${bob}');`);
    async function asUser(id, role = 'authenticated') {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec(`set role ${role}`);
    }
    const save = (rev, payload = document) => db.query('select * from public.sintonizze_save_snapshot($1, $2::jsonb)', [rev, JSON.stringify(payload)]);
    await asUser(alice);
    const first = await save(0);
    assert.deepEqual(first.rows[0].payload, document);
    assert.equal(first.rows[0].revision, 1);
    await assert.rejects(save(0), e => e.code === '40001');
    await assert.rejects(save(null), e => e.code === '22023');
    await save(1, { ...document, note: 'second device accepted after reload' });
    assert.equal((await db.query('select * from public.sintonizze_snapshots')).rows.length, 2);
    await assert.rejects(db.query('update public.sintonizze_snapshots set payload = $1', [document]), e => e.code === '42501');
    await assert.rejects(db.exec('delete from public.sintonizze_snapshots'), e => e.code === '42501');
    await assert.rejects(save(2, { protocols: [], sessions: [] }), e => e.code === '23514');
    await assert.rejects(save(2, { ...document, huge: 'x'.repeat(2097152) }), e => e.code === '23514');
    await asUser(bob);
    assert.equal((await db.query('select * from public.sintonizze_snapshots')).rows.length, 0);
    await assert.rejects(db.query('insert into public.sintonizze_snapshots(owner_id, revision, payload) values ($1, 1, $2)', [alice, document]), e => e.code === '42501');
    await save(0, { ...document, note: 'bob' });
    assert.equal((await db.query('select owner_id from public.sintonizze_snapshots')).rows[0].owner_id, bob);
    await asUser(outsider);
    assert.equal((await db.query('select * from public.sintonizze_snapshots')).rows.length, 0);
    await assert.rejects(save(0), e => e.code === '42501');
    await assert.rejects(db.query('insert into public.sintonizze_members values ($1)', [outsider]), e => e.code === '42501');
    await asUser('', 'anon');
    await assert.rejects(save(0), e => e.code === '42501');
    await assert.rejects(db.query('select * from public.sintonizze_snapshots'), e => e.code === '42501');
    await asUser(alice);
    assert.deepEqual((await db.query('select payload from public.sintonizze_snapshots where revision = 1')).rows[0].payload, document);
  } finally { await db.close(); }
});

test('client keeps IDs/omissions, refuses invalid data, propagates conflict and network failures', async () => {
  assert.deepEqual(validateDocument(document), document);
  assert.notEqual(validateDocument(document), document);
  let calls = 0;
  let failure = { code: '40001' };
  const client = { auth: { getUser: async () => ({ data: { user: { id: alice } } }), signInWithOtp: async args => { assert.equal(args.options.shouldCreateUser, false); return {}; } }, rpc: async () => { calls++; return { error: failure }; } };
  const store = createCloudStore(client);
  await store.requestAccess(' person@example.com ');
  await assert.rejects(store.save({}, 0), TypeError);
  await assert.rejects(store.save(document, -1), TypeError);
  assert.equal(calls, 0);
  await assert.rejects(store.save(document, 1), CloudConflict);
  failure = new Error('offline');
  await assert.rejects(store.save(document, 1), /offline/);
  assert.deepEqual(document.sessions[0].answers.q, { yn: false });
});
