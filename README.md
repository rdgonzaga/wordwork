# wordwork

A local-first PWA for daily language study. Spaced-repetition cards, a minutes log with a forgiving streak, a sentence of the day and a song of the week. German, Italian and Japanese, each with a starter deck.

Everything works offline in guest mode. Signing in syncs across devices through Supabase.

## Development

```sh
npm install
npm run dev        # http://localhost:5173/wordwork/
npm run lint
npm run typecheck
npm run test
npm run build
```

## Sync (optional)

1. Create a Supabase project.
2. Authentication > Sign In / Providers: turn off "Allow new users to sign up" and "Allow anonymous sign-ins".
3. Authentication > Users: add your own user with a password.
4. SQL editor: run `supabase/migrations/0001_init.sql`.
5. For sign-in by emailed code, the Magic Link email template must include `{{ .Token }}`.
6. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.

The anon key ships in the bundle by design. Every table has row level security, so a user only reads and writes their own rows. Removals are tombstones, and conflicts resolve last-write-wins per row.

## Deploy

GitHub Pages, from `main` via `.github/workflows/deploy.yml`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository secrets for sync to work in the build.

## Backups

Settings > Backup exports and imports JSON. Merge keeps the newer copy of each item. Replace makes the device match the file and deletes anything it lacks, on your other devices too, so export first.
