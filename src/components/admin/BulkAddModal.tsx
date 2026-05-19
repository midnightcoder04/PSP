import { useEffect, useRef, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import type { SessionInvite } from '@/types/database'
import styles from './BulkAddModal.module.css'

interface Participant {
  email: string
  display_name: string
}

interface RowResult {
  email: string
  success: boolean
  error?: string
}

interface InviteRow extends SessionInvite {
  sessions?: { title: string } | null
}

interface BulkAddModalProps {
  sessionId: string
  sessionTitle: string
  maxBulkAdd?: number
  onClose: () => void
  onAdded: () => void
}

type Tab = 'file' | 'paste' | 'invite'

function emailPrefix(email: string) {
  return email.split('@')[0]
}

function parseRows(raw: unknown[][]): Participant[] {
  if (raw.length === 0) return []

  // Detect header row
  const headers = (raw[0] as string[]).map((h) => String(h ?? '').toLowerCase().trim())
  const emailIdx = headers.findIndex((h) => h === 'email')
  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'display_name' || h === 'display name')

  const dataRows = emailIdx >= 0 ? raw.slice(1) : raw

  return dataRows
    .map((row) => {
      const arr = row as string[]
      const email = String(arr[emailIdx >= 0 ? emailIdx : 0] ?? '').trim().toLowerCase()
      const display_name =
        nameIdx >= 0
          ? String(arr[nameIdx] ?? '').trim() || emailPrefix(email)
          : emailPrefix(email)
      return { email, display_name }
    })
    .filter((p) => p.email.includes('@'))
}

export function BulkAddModal({ sessionId, sessionTitle, maxBulkAdd, onClose, onAdded }: BulkAddModalProps) {
  const [tab, setTab] = useState<Tab>('file')

  // File tab
  const [fileRows, setFileRows] = useState<Participant[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Paste tab
  const [pasteText, setPasteText] = useState('')
  const [pasteRows, setPasteRows] = useState<Participant[]>([])

  // Shared
  const [tempPassword, setTempPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<RowResult[] | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Invite tab
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [inviteMaxUses, setInviteMaxUses] = useState<number | ''>(Math.min(50, maxBulkAdd ?? 50))
  const [inviteExpiry, setInviteExpiry] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    if (tab === 'invite') loadInvites()
  }, [tab])

  async function loadInvites() {
    const { data } = await supabase
      .from('session_invites')
      .select('*, sessions(title)')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setInvites((data ?? []) as InviteRow[])
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(null)
    setResults(null)

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse<string[]>(file, {
        complete(result) {
          setFileRows(parseRows(result.data))
        },
        error(err) {
          setFileError(err.message)
        },
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target?.result, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
          setFileRows(parseRows(data))
        } catch (err) {
          setFileError(String(err))
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      setFileError('Unsupported file type. Upload a .csv, .xlsx, or .xls file.')
    }
  }

  function parsePaste(text: string): Participant[] {
    const seen = new Set<string>()
    return text
      .split(/[\n,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((email) => email.includes('@') && !seen.has(email) && seen.add(email))
      .map((email) => ({ email, display_name: emailPrefix(email) }))
  }

  function handlePasteChange(text: string) {
    setPasteText(text)
    setPasteRows(parsePaste(text))
    setResults(null)
  }

  const activeRows = tab === 'file' ? fileRows : tab === 'paste' ? pasteRows : []
  const overLimit = maxBulkAdd !== undefined && activeRows.length > maxBulkAdd

  async function handleSubmit() {
    if (activeRows.length === 0 || tempPassword.length < 8 || overLimit) return
    setSubmitting(true)
    setSubmitError(null)
    setResults(null)

    const { data, error: fnErr } = await supabase.functions.invoke('bulk-create-users', {
      body: { participants: activeRows, session_id: sessionId, temp_password: tempPassword },
    })

    setSubmitting(false)

    if (fnErr) {
      setSubmitError(fnErr.message)
      return
    }

    const payload = data as { error?: string; results?: RowResult[] } | null
    if (payload?.error) {
      setSubmitError(payload.error)
      return
    }

    setResults(payload?.results ?? [])
    const anySuccess = payload?.results?.some((r) => r.success)
    if (anySuccess) onAdded()
  }

  async function generateInvite() {
    setGeneratingLink(true)
    const { data: me } = await supabase.auth.getUser()
    if (!me?.user) { setGeneratingLink(false); return }

    await supabase.from('session_invites').insert({
      session_id: sessionId,
      created_by: me.user.id,
      max_uses: typeof inviteMaxUses === 'number' ? inviteMaxUses : Math.min(50, maxBulkAdd ?? 50),
      expires_at: inviteExpiry ? new Date(inviteExpiry).toISOString() : null,
    })
    setGeneratingLink(false)
    loadInvites()
  }

  async function revokeInvite(id: string) {
    setRevokingId(id)
    await supabase.from('session_invites').update({ is_active: false }).eq('id', id)
    setRevokingId(null)
    loadInvites()
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const successCount = results?.filter((r) => r.success).length ?? 0
  const failCount = results?.filter((r) => !r.success).length ?? 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-modal-title"
      >
        <h2 id="bulk-modal-title" className={styles.modalTitle}>
          Add members — {sessionTitle}
        </h2>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'file' ? styles.tabActive : ''}`}
            onClick={() => { setTab('file'); setResults(null) }}
          >
            Import file
          </button>
          <button
            className={`${styles.tab} ${tab === 'paste' ? styles.tabActive : ''}`}
            onClick={() => { setTab('paste'); setResults(null) }}
          >
            Paste emails
          </button>
          <button
            className={`${styles.tab} ${tab === 'invite' ? styles.tabActive : ''}`}
            onClick={() => setTab('invite')}
          >
            Invite link
          </button>
        </div>

        {/* ── FILE TAB ── */}
        {tab === 'file' ? (
          <div className={styles.tabContent}>
            <p className={styles.hint}>
              Upload a .csv or .xlsx file with columns: <strong>email</strong>, <strong>name</strong> (optional).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className={styles.fileInput}
              onChange={handleFile}
            />
            {fileError ? <p className={styles.error}>{fileError}</p> : null}
            {fileRows.length > 0 ? (
              <PreviewTable rows={fileRows} maxBulkAdd={maxBulkAdd} />
            ) : null}
          </div>
        ) : null}

        {/* ── PASTE TAB ── */}
        {tab === 'paste' ? (
          <div className={styles.tabContent}>
            <p className={styles.hint}>
              Paste email addresses separated by commas or new lines.
            </p>
            <textarea
              className={styles.textarea}
              rows={5}
              placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
              value={pasteText}
              onChange={(e) => handlePasteChange(e.target.value)}
            />
            {pasteRows.length > 0 ? (
              <PreviewTable
                rows={pasteRows}
                maxBulkAdd={maxBulkAdd}
                onNameChange={(idx, name) => {
                  setPasteRows((prev) => prev.map((r, i) => i === idx ? { ...r, display_name: name } : r))
                }}
              />
            ) : null}
          </div>
        ) : null}

        {/* ── INVITE LINK TAB ── */}
        {tab === 'invite' ? (
          <div className={styles.tabContent}>
            <p className={styles.hint}>
              Anyone with the link can self-register and is automatically enrolled in this session.
            </p>

            <div className={styles.inviteGenRow}>
              <label className={styles.inviteLabel}>
                Max registrations{maxBulkAdd !== undefined ? ` (limit: ${maxBulkAdd})` : ''}
                <input
                  type="number"
                  min={1}
                  max={maxBulkAdd}
                  className={styles.inviteInput}
                  value={inviteMaxUses}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '') { setInviteMaxUses(''); return }
                    const n = parseInt(v, 10)
                    if (!isNaN(n)) {
                      setInviteMaxUses(maxBulkAdd !== undefined ? Math.min(Math.max(1, n), maxBulkAdd) : Math.max(1, n))
                    }
                  }}
                  onBlur={() => {
                    if (inviteMaxUses === '' || (typeof inviteMaxUses === 'number' && inviteMaxUses < 1)) {
                      setInviteMaxUses(Math.min(50, maxBulkAdd ?? 50))
                    }
                  }}
                />
              </label>
              <label className={styles.inviteLabel}>
                Expiry (optional)
                <input
                  type="date"
                  className={styles.inviteInput}
                  value={inviteExpiry}
                  onChange={(e) => setInviteExpiry(e.target.value)}
                />
              </label>
              <Button onClick={generateInvite} loading={generatingLink} size="sm">
                Generate link
              </Button>
            </div>

            {invites.length > 0 ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Link</th>
                      <th>Uses</th>
                      <th>Expires</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <button
                            className={styles.copyBtn}
                            onClick={() => copyLink(inv.token)}
                          >
                            {copiedToken === inv.token ? 'Copied!' : 'Copy link'}
                          </button>
                        </td>
                        <td>{inv.use_count} / {inv.max_uses}</td>
                        <td>{inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '—'}</td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={revokingId === inv.id}
                            onClick={() => revokeInvite(inv.id)}
                          >
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.empty}>No active invite links for this session.</p>
            )}
          </div>
        ) : null}

        {/* ── SHARED: PASSWORD + SUBMIT (file/paste tabs only) ── */}
        {tab !== 'invite' ? (
          <>
            {activeRows.length > 0 ? (
              <div className={styles.passwordRow}>
                <label htmlFor="bulk-pass">
                  Temporary password (≥ 8 chars) — shared out-of-band
                </label>
                <input
                  id="bulk-pass"
                  type="password"
                  className={styles.input}
                  value={tempPassword}
                  placeholder="Shared password for all new accounts"
                  autoComplete="new-password"
                  onChange={(e) => setTempPassword(e.target.value)}
                />
              </div>
            ) : null}

            {overLimit ? (
              <p className={styles.error}>
                Your limit is {maxBulkAdd} participant{maxBulkAdd === 1 ? '' : 's'} per operation.
                Remove {activeRows.length - maxBulkAdd!} row{activeRows.length - maxBulkAdd! === 1 ? '' : 's'}.
              </p>
            ) : null}

            {submitError ? <p className={styles.error}>{submitError}</p> : null}

            {results ? (
              <div className={styles.results}>
                <p className={styles.resultsSummary}>
                  {successCount > 0 ? <span className={styles.ok}>{successCount} added</span> : null}
                  {failCount > 0 ? <span className={styles.fail}>{failCount} failed</span> : null}
                </p>
                {results.filter((r) => !r.success).map((r) => (
                  <p key={r.email} className={styles.error}>{r.email}: {r.error}</p>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {tab !== 'invite' && !results ? (
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={
                activeRows.length === 0 ||
                tempPassword.length < 8 ||
                overLimit ||
                submitting
              }
            >
              Add {activeRows.length > 0 ? `${activeRows.length} ` : ''}participant{activeRows.length !== 1 ? 's' : ''}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

interface PreviewTableProps {
  rows: Participant[]
  maxBulkAdd?: number
  onNameChange?: (idx: number, name: string) => void
}

function PreviewTable({ rows, maxBulkAdd, onNameChange }: PreviewTableProps) {
  const over = maxBulkAdd !== undefined && rows.length > maxBulkAdd
  return (
    <div className={`${styles.tableWrap} ${over ? styles.tableOver : ''}`}>
      <p className={styles.previewCount}>
        {rows.length} row{rows.length !== 1 ? 's' : ''} parsed
        {maxBulkAdd !== undefined ? ` (limit: ${maxBulkAdd})` : ''}
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Display name</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.email} className={i >= (maxBulkAdd ?? Infinity) ? styles.rowOver : ''}>
              <td>{r.email}</td>
              <td>
                {onNameChange ? (
                  <input
                    className={styles.nameInput}
                    value={r.display_name}
                    onChange={(e) => onNameChange(i, e.target.value)}
                  />
                ) : (
                  r.display_name
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
