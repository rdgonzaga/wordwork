import { useState, type ChangeEvent } from 'react'
import { auth } from '../../auth/index.ts'
import { db } from '../../db/schema.ts'
import { buildExport, exportFileName, parseExport, type ExportFile } from '../../io/format.ts'
import { importData, type ImportMode } from '../../io/importer.ts'
import { syncNow } from '../../sync/index.ts'

/** A backup bigger than this isn't ours; reading it would only freeze the tab. */
const MAX_FILE_BYTES = 50 * 1024 * 1024

function download(file: ExportFile) {
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName(new Date(file.exportedAt))
  a.click()
  // Some browsers drop the download if the URL goes away in the same tick.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function describe(file: ExportFile): string {
  const live = (rows: { deleted?: boolean }[]) => rows.filter((r) => !r.deleted).length
  const { cards, reviews, minutes, diary, songs } = file.tables
  return `${live(cards)} cards, ${live(reviews)} reviews, ${live(minutes)} time entries, ${live(diary)} sentences, ${live(songs)} songs`
}

export default function DataTransfer() {
  const [pending, setPending] = useState<ExportFile>()
  const [mode, setMode] = useState<ImportMode>('merge')
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  function report(text: string, isError = false) {
    setMessage(text)
    setFailed(isError)
  }

  async function exportAll() {
    setBusy(true)
    try {
      download(await buildExport(db, new Date()))
      report('Exported.')
    } catch {
      report("Couldn't export.", true)
    } finally {
      setBusy(false)
    }
  }

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const file = input.files?.[0]
    input.value = ''
    setPending(undefined)
    setConfirm(false)
    if (!file) return
    if (file.size > MAX_FILE_BYTES) return report('That file is too big to be a backup.', true)

    const parsed = parseExport(await file.text())
    if (!parsed.ok) return report(parsed.error, true)
    setPending(parsed.data)
    report('')
  }

  async function apply() {
    if (!pending) return
    if (mode === 'replace' && !confirm) {
      setConfirm(true)
      return
    }
    setBusy(true)
    try {
      // Replace has to win against the server too, so catch up with it first.
      if (mode === 'replace' && auth.getState().status === 'signedIn') {
        try {
          await syncNow()
        } catch {
          report(
            "Couldn't reach the server to sync first. Try Replace again when you're online.",
            true,
          )
          return
        }
      }
      const s = await importData(db, pending, mode, new Date())
      const removed = s.removed ? `, removed ${s.removed}` : ''
      report(`Imported: ${s.added} added, ${s.updated} updated${removed}.`)
      setPending(undefined)
    } catch {
      report("Couldn't import that file. Nothing was changed.", true)
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }

  return (
    <>
      <h2>Backup</h2>
      <p className="muted">
        A JSON copy of your cards, reviews, time log, sentences and songs. Keep one somewhere safe.
      </p>
      <div className="data-actions">
        <button type="button" disabled={busy} onClick={() => void exportAll()}>
          Export
        </button>
        <label className="data-pick">
          Import…
          <input type="file" accept="application/json,.json" onChange={(e) => void pick(e)} />
        </label>
      </div>

      {pending && (
        <div className="data-pending">
          <p>
            File has {describe(pending)}
            {pending.exportedAt > 0 && (
              <span className="muted">
                {' '}
                · from {new Date(pending.exportedAt).toLocaleDateString()}
              </span>
            )}
            .
          </p>
          <div className="segmented" role="group" aria-label="Import mode">
            <button
              type="button"
              aria-pressed={mode === 'merge'}
              onClick={() => {
                setMode('merge')
                setConfirm(false)
              }}
            >
              Merge
            </button>
            <button
              type="button"
              aria-pressed={mode === 'replace'}
              onClick={() => setMode('replace')}
            >
              Replace
            </button>
          </div>
          <p className="muted">
            {mode === 'merge'
              ? 'Keeps whichever copy of each item was edited last. Nothing is removed.'
              : 'Makes this device match the file. Anything not in the file is deleted, and that syncs to your other devices.'}
          </p>
          {confirm && (
            <p role="alert">
              Replace everything on this device with the file? This can’t be undone.
            </p>
          )}
          <button type="button" disabled={busy} onClick={() => void apply()}>
            {mode === 'replace' ? (confirm ? 'Yes, replace' : 'Replace…') : 'Import'}
          </button>
        </div>
      )}

      {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
    </>
  )
}
