import { useState, type FormEvent } from 'react'
import { auth, useAuth } from '../../auth/index.ts'
import { isSyncConfigured } from '../../auth/client.ts'

type Step = 'email' | 'code'

function SignIn() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  function sendCode(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    void run(async () => {
      await auth.requestCode(address)
      setEmail(address)
      setStep('code')
    }, "Couldn't send a code. Check the address and try again in a minute.")
  }

  function verify(e: FormEvent) {
    e.preventDefault()
    void run(() => auth.verifyCode(email, code.trim()), 'That code did not work. Try again.')
  }

  if (step === 'email') {
    return (
      <form className="account-form" onSubmit={sendCode}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>
          Send code
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    )
  }

  return (
    <form className="account-form" onSubmit={verify}>
      <label>
        Code sent to {email}
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6,10}"
          maxLength={10}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </label>
      <button type="submit" disabled={busy || code.length < 6}>
        Sign in
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setStep('email')
          setCode('')
          setError('')
        }}
      >
        Use another email
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

export default function Account() {
  const state = useAuth()

  return (
    <>
      <h2>Account</h2>
      {state.status === 'loading' && <p>Checking your session…</p>}
      {state.status === 'signedIn' && (
        <>
          <p>Signed in as {state.email}.</p>
          <button type="button" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </>
      )}
      {state.status === 'guest' &&
        (isSyncConfigured() ? (
          <>
            <p>Guest mode: your cards stay on this device. Sign in to sync.</p>
            <SignIn />
          </>
        ) : (
          <p>Guest mode: your cards stay on this device. Sync isn&apos;t set up for this build.</p>
        ))}
    </>
  )
}
