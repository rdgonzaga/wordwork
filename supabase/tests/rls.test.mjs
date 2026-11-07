// Runs supabase/migrations/*.sql in PGlite with the Supabase pieces stubbed
// (roles, auth.users, auth.uid()), then checks RLS, LWW and the triggers.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
const migration = new URL('../migrations/0001_init.sql', import.meta.url)

let db

// Run fn as `role` with auth.uid() = uid, then drop back to the superuser.
async function as(uid, role, fn) {
  await db.exec(`set role ${role}; select set_config('request.jwt.uid', '${uid ?? ''}', false)`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
  }
}
const asA = (fn) => as(A, 'authenticated', fn)
const asB = (fn) => as(B, 'authenticated', fn)

const deck = (id, name, at) =>
  `insert into decks (id, language, name, created_at, updated_at) values ('${id}','de','${name}',1,${at})
   on conflict (user_id, id) do update set name = excluded.name, updated_at = excluded.updated_at, deleted = excluded.deleted`

const review = (id, rating, at) =>
  `insert into reviews (id,card_id,rating,reviewed_at,day,duration_ms,device_id,updated_at)
   values ('${id}','c1',${rating},1000,'2026-11-07',900,'dev',${at})`

const seqOf = async (id) =>
  Number(
    (await db.query(`select server_seq from decks where id='${id}' and user_id='${A}'`)).rows[0]
      .server_seq,
  )

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.uid', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant select on auth.users to authenticated;
    insert into auth.users values ('${A}'), ('${B}');
  `)
  await db.exec(readFileSync(migration, 'utf8'))
})

describe('access control', () => {
  it('lets the owner insert; user_id defaults to caller and seq is stamped', async () => {
    await asA(() => db.exec(deck('d1', 'mine', 100)))
    const { rows } = await db.query(`select user_id, server_seq from decks where id='d1'`)
    expect(rows[0].user_id).toBe(A)
    expect(Number(rows[0].server_seq)).toBeGreaterThan(0)
  })

  it('hides A rows from B and blocks writes to them', async () => {
    expect((await asB(() => db.query('select * from decks'))).rows).toHaveLength(0)
    await expect(
      asB(() =>
        db.exec(
          `insert into decks (user_id,id,language,name,created_at,updated_at) values ('${A}','x','de','x',1,1)`,
        ),
      ),
    ).rejects.toThrow()
    await asB(() => db.exec(`update decks set name='pwn' where id='d1'`))
    const { rows } = await db.query(`select name from decks where id='d1' and user_id='${A}'`)
    expect(rows[0].name).toBe('mine')
  })

  it('lets two users share an id', async () => {
    await asB(() => db.exec(deck('d1', 'bees', 100)))
    const { rows } = await db.query(`select count(*)::int c from decks where id='d1'`)
    expect(rows[0].c).toBe(2)
  })

  it('blocks anon and uid-less callers', async () => {
    await expect(as(null, 'anon', () => db.query('select * from decks'))).rejects.toThrow()
    await expect(as(null, 'authenticated', () => db.exec(deck('z', 'z', 1)))).rejects.toThrow()
  })

  it('denies deletes', async () => {
    await expect(asA(() => db.exec(`delete from decks where id='d1'`))).rejects.toThrow()
    const { rows } = await db.query(`select 1 from decks where id='d1' and user_id='${A}'`)
    expect(rows).toHaveLength(1)
  })

  it('cannot reassign user_id', async () => {
    await expect(
      asA(() => db.exec(`update decks set user_id='${B}' where id='d1'`)),
    ).rejects.toThrow()
  })
})

describe('last-write-wins and server_seq', () => {
  it('drops a stale write and keeps the seq', async () => {
    const seq0 = await seqOf('d1')
    await asA(() => db.exec(deck('d1', 'stale', 50)))
    const { rows } = await db.query(`select name from decks where id='d1' and user_id='${A}'`)
    expect(rows[0].name).toBe('mine')
    expect(await seqOf('d1')).toBe(seq0)
  })

  it('lets a newer write win and bumps the seq', async () => {
    const seq0 = await seqOf('d1')
    await asA(() => db.exec(deck('d1', 'newer', 200)))
    const { rows } = await db.query(`select name from decks where id='d1' and user_id='${A}'`)
    expect(rows[0].name).toBe('newer')
    expect(await seqOf('d1')).toBeGreaterThan(seq0)
  })

  it('shares one seq across tables, so a single cursor orders them', async () => {
    const seq0 = await seqOf('d1')
    await asA(() =>
      db.exec(
        `insert into minutes (id,day,minutes,source,created_at,updated_at) values ('m2','2026-11-07',10,'manual',1,1)`,
      ),
    )
    const { rows } = await asA(() =>
      db.query(`select server_seq from minutes where server_seq > ${seq0}`),
    )
    expect(rows).toHaveLength(1)
  })

  // PGlite has one connection, so real two-writer serialisation can't be shown
  // here. We check the lock is held until commit, which is what gives it.
  const holdsLock = async (uid) =>
    (
      await db.query(
        `select 1 from pg_locks where locktype = 'advisory' and classid = 1953
           and objid::bigint = (hashtext('${uid}')::bigint & 4294967295) and pid = pg_backend_pid()`,
      )
    ).rows.length === 1

  it('holds a per-user advisory lock until commit', async () => {
    await asA(async () => {
      await db.exec('begin')
      await db.exec(deck('d2', 'a', 1))
      await db.exec(deck('d3', 'b', 1))
      expect(await holdsLock(A)).toBe(true)
      expect(await holdsLock(B)).toBe(false)
      await db.exec('commit')
      expect(await holdsLock(A)).toBe(false)
    })
    expect(await seqOf('d3')).toBeGreaterThan(await seqOf('d2'))
  })

  it('takes the lock per statement, before any row is touched', async () => {
    await asA(async () => {
      await db.exec('begin')
      await db.exec(`update decks set name = 'x' where false`)
      expect(await holdsLock(A)).toBe(true)
      await db.exec('rollback')
    })
  })
})

describe('reviews are append-only', () => {
  it('reverts edits to immutable columns instead of raising', async () => {
    await asA(() => db.exec(review('r1', 3, 1000)))
    await asA(() =>
      db.exec(`update reviews set rating=1, day='2020-01-01', updated_at=2000 where id='r1'`),
    )
    const { rows } = await db.query(`select rating, day, updated_at from reviews where id='r1'`)
    expect(rows[0].rating).toBe(3)
    expect(rows[0].day).toBe('2026-11-07')
    expect(Number(rows[0].updated_at)).toBe(2000)
  })

  it('does not block a batch: an edited row and a tombstone land together', async () => {
    await asA(() => db.exec(review('r3', 2, 1000)))
    await asA(() =>
      db.exec(`
        update reviews set rating=4 where id='r1';
        update reviews set deleted=true, updated_at=3000 where id='r3';
      `),
    )
    const { rows } = await db.query(
      `select id, rating, deleted from reviews where id in ('r1','r3') order by id`,
    )
    expect(rows).toEqual([
      { id: 'r1', rating: 3, deleted: false },
      { id: 'r3', rating: 2, deleted: true },
    ])
  })

  it('keeps the id fixed', async () => {
    await asA(() => db.exec(`update reviews set id='renamed', updated_at=2500 where id='r1'`))
    const { rows } = await db.query(`select id from reviews where id in ('r1','renamed')`)
    expect(rows).toEqual([{ id: 'r1' }])
  })

  it('allows the undo tombstone and an identical re-push', async () => {
    await asA(() => db.exec(`update reviews set deleted=true, updated_at=4000 where id='r1'`))
    expect((await db.query(`select deleted from reviews where id='r1'`)).rows[0].deleted).toBe(true)
    // Same review pushed again, still tombstoned.
    await asA(() =>
      db.exec(`${review('r1', 3, 5000)}
        on conflict (user_id,id) do update set deleted = true, updated_at = excluded.updated_at`),
    )
    const { rows } = await db.query(`select deleted, updated_at from reviews where id='r1'`)
    expect(rows[0].deleted).toBe(true)
    expect(Number(rows[0].updated_at)).toBe(5000)
  })

  it('drops a stale write to a review and keeps its seq', async () => {
    const seq = async () =>
      Number((await db.query(`select server_seq from reviews where id='r1'`)).rows[0].server_seq)
    const seq0 = await seq()
    await asA(() => db.exec(`update reviews set deleted=false, updated_at=10 where id='r1'`))
    const { rows } = await db.query(`select deleted from reviews where id='r1'`)
    expect(rows[0].deleted).toBe(true)
    expect(await seq()).toBe(seq0)
  })

  it('reverts a PostgREST-style upsert that changes immutable columns', async () => {
    await asA(() =>
      db.exec(`${review('r1', 1, 6000)}
        on conflict (user_id,id) do update set card_id = excluded.card_id, rating = excluded.rating,
          reviewed_at = excluded.reviewed_at, day = excluded.day, duration_ms = excluded.duration_ms,
          device_id = excluded.device_id, deleted = excluded.deleted, updated_at = excluded.updated_at`),
    )
    const { rows } = await db.query(`select rating, deleted, updated_at from reviews where id='r1'`)
    expect(rows[0].rating).toBe(3)
    expect(rows[0].deleted).toBe(false)
    expect(Number(rows[0].updated_at)).toBe(6000)
  })
})

describe('constraints', () => {
  const rejects = (sql) => expect(asA(() => db.exec(sql))).rejects.toThrow()

  it('rejects rating 5', () => rejects(review('r2', 5, 1)))

  it('rejects a malformed day', () =>
    rejects(
      `insert into minutes (id,day,minutes,source,created_at,updated_at) values ('m1','7-11-2026',10,'manual',1,1)`,
    ))

  it('rejects settings id other than me', () =>
    rejects(
      `insert into settings (id,time_zone,rollover_hour,new_per_day,max_reviews_per_day,goal_hours,streak_minutes,updated_at)
       values ('other','Asia/Manila',4,10,100,400,10,1)`,
    ))

  it('rejects out-of-range rollover_hour', () =>
    rejects(
      `insert into settings (id,time_zone,rollover_hour,new_per_day,max_reviews_per_day,goal_hours,streak_minutes,updated_at)
       values ('me','Asia/Manila',24,10,100,400,10,1)`,
    ))

  it('rejects a diary id that is not day:language', async () => {
    await rejects(
      `insert into diary (id,day,language,text,updated_at) values ('nope','2026-11-07','de','hi',1)`,
    )
    await asA(() =>
      db.exec(
        `insert into diary (id,day,language,text,updated_at) values ('2026-11-07:de','2026-11-07','de','hi',1)`,
      ),
    )
  })

  it('rejects non-object cards.extra', async () => {
    const card = (extra) =>
      `insert into cards (id,deck_id,term,translation,extra,new_order,created_at,updated_at)
       values ('c-${Math.random()}','d1','a','b','${extra}',1,1,1)`
    await rejects(card('[1,2]'))
    await rejects(card('"str"'))
    await asA(() => db.exec(card('{"gender":"das"}')))
  })
})
