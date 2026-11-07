# wordwork

A small PWA for daily language study: SRS flashcards, a minutes log with a forgiving streak, a sentence of the day, and a song of the week. German first.

Work in progress. See the [roadmap](https://github.com/users/rdgonzaga/projects/7).

## Development

```sh
npm install
npm run dev        # http://localhost:5173/wordwork/
npm run lint
npm run typecheck
npm run test
npm run build
```

## Backups

Settings has Export and Import (JSON). Merge keeps the newer copy of each item and removes nothing. Replace makes the device match the file: whatever the file lacks is deleted and, once signed in, deleted on your other devices too. Export a fresh backup before using it.

## Bundle size

Production build, 2026-11-07: JS 384 kB (122 kB gzip), CSS 16 kB (3 kB gzip), plus self-hosted font subsets that load on demand. First-card time on a real iPhone is still to be measured on the deployed site.

## Sync backend (Supabase)

Optional. Without it the app runs fully offline in guest mode.

1. Create a Supabase project.
2. Authentication > Sign In / Providers: turn **off** "Allow new users to sign up". Also check "Allow anonymous sign-ins" is off (it's a separate switch); anonymous users get the `authenticated` role and would pass RLS as themselves.
3. Authentication > Users: add your own user by hand (Add user > Create new user).
4. SQL editor: run `supabase/migrations/0001_init.sql`.
5. Authentication > Email Templates > Magic Link: the body must include `{{ .Token }}` (the 6-digit code), or sign-in emails arrive without one. Default email sending is rate-limited, so wait a minute between codes. Email OTP length (Providers > Email) can be 6 to 10 digits; the app accepts any of them.
6. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings > API).

Every table has row level security: a signed-in user can only read and write rows with their own `user_id`. Anon can't touch anything. Nothing is hard-deleted; removals are tombstones (`deleted = true`). The anon key is in the built JS by design, so RLS is the actual protection.

Sync is last-write-wins per row. A device is tied to the first account that syncs on it, and local guest data merges into that account on first sign-in. Signing in as a different account on the same device is refused until site data is cleared.
