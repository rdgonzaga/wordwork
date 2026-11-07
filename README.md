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

## Sync backend (Supabase)

Optional. Without it the app runs fully offline in guest mode.

1. Create a Supabase project.
2. Authentication > Sign In / Providers: turn **off** "Allow new users to sign up". Also check "Allow anonymous sign-ins" is off (it's a separate switch); anonymous users get the `authenticated` role and would pass RLS as themselves.
3. Authentication > Users: add your own user by hand (Add user > Create new user).
4. SQL editor: run `supabase/migrations/0001_init.sql`.
5. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (Project Settings > API).

Every table has row level security: a signed-in user can only read and write rows with their own `user_id`. Anon can't touch anything. Nothing is hard-deleted; removals are tombstones (`deleted = true`). The anon key is in the built JS by design, so RLS is the actual protection.
