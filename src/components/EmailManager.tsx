import { useState, useEffect, useCallback } from 'react'
import { Mail, Send, Loader2, Users, CheckCircle2, XCircle, BarChart3, Search, Trash2, Eye, ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react'

interface EmailManagerProps {
  token: string | null
}

export default function EmailManager({ token }: EmailManagerProps) {
  const [tab, setTab] = useState<'compose' | 'subscribers' | 'logs' | 'test'>('compose')
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null)
  const [smtpInfo, setSmtpInfo] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])

  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string; sent?: number; failed?: number } | null>(null)

  const [subscribers, setSubscribers] = useState<any[]>([])
  const [subTotal, setSubTotal] = useState(0)
  const [subPage, setSubPage] = useState(1)
  const [subTotalPages, setSubTotalPages] = useState(1)
  const [subSearch, setSubSearch] = useState('')
  const [subStatus, setSubStatus] = useState<'all' | 'active' | 'unsubscribed'>('all')
  const [subLoading, setSubLoading] = useState(false)

  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const getHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }, [token])

  useEffect(() => {
    const headers = getHeaders()
    Promise.all([
      fetch('/api/admin/email/smtp-status', { headers }).then(r => r.json()),
      fetch('/api/admin/email/logs', { headers }).then(r => r.json()),
    ]).then(([smtp, emailLogs]) => {
      setSmtpConfigured(smtp.configured)
      setSmtpInfo(smtp)
      setLogs(emailLogs.logs ?? [])
    }).catch(() => {})
  }, [getHeaders])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/newsletter/stats', { headers: getHeaders() })
      const data = await res.json()
      setStats(data)
    } catch {}
  }

  const loadSubscribers = useCallback(async (page = 1, search = subSearch, status = subStatus) => {
    setSubLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`/api/admin/email/subscribers?${params}`, { headers: getHeaders() })
      const data = await res.json()
      setSubscribers(data.subscribers ?? [])
      setSubTotal(data.total ?? 0)
      setSubPage(data.page ?? 1)
      setSubTotalPages(data.totalPages ?? 1)
    } catch {}
    setSubLoading(false)
  }, [getHeaders, subSearch, subStatus])

  const deleteSubscriber = async (id: string) => {
    try {
      await fetch(`/api/admin/email/subscribers/${id}`, { method: 'DELETE', headers: getHeaders() })
      loadSubscribers(subPage)
      setSubTotal(p => Math.max(0, p - 1))
    } catch {}
  }

  useEffect(() => {
    if (tab === 'subscribers') { loadStats(); loadSubscribers(1) }
  }, [tab, loadSubscribers])

  const handleSend = async () => {
    if (!subject.trim() || !htmlBody.trim()) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/admin/email/broadcast', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ subject: subject.trim(), htmlBody: htmlBody.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setSendResult({ ok: false, message: data.error || 'Failed to send' })
      } else {
        setSendResult({
          ok: true,
          message: `Broadcast sent to ${data.sent} subscriber${data.sent !== 1 ? 's' : ''}${data.failed ? ` (${data.failed} failed)` : ''}`,
          sent: data.sent,
          failed: data.failed,
        })
        setSubject('')
        setHtmlBody('')
        const logsRes = await fetch('/api/admin/email/logs', { headers: getHeaders() })
        const logsData = await logsRes.json()
        setLogs(logsData.logs ?? [])
      }
    } catch {
      setSendResult({ ok: false, message: 'Network error' })
    }
    setSending(false)
  }

  const handleTestEmail = async () => {
    if (!testEmail.trim()) return
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ to: testEmail.trim() }),
      })
      const data = await res.json()
      setTestResult({ ok: !!data.ok && res.ok, message: data.message || data.error || 'Failed' })
      if (data.ok) {
        const logsRes = await fetch('/api/admin/email/logs', { headers: getHeaders() })
        const logsData = await logsRes.json()
        setLogs(logsData.logs ?? [])
      }
    } catch {
      setTestResult({ ok: false, message: 'Network error' })
    }
    setTestSending(false)
  }

  return (
    <div className="space-y-6">
      {/* SMTP Warning */}
      {smtpConfigured === false && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-yellow-400 text-sm">
          <p className="font-bold mb-1">Email not configured</p>
          <p className="text-yellow-400/70 text-xs">Set <code className="bg-yellow-500/10 px-1 rounded">RESEND_API_KEY</code> in your environment variables to start sending emails.</p>
        </div>
      )}

      {smtpConfigured === true && smtpInfo && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-sm">
          <p className="font-bold">Email Connected</p>
          <p className="text-emerald-400/70 text-xs mt-1">Resend API · From: {smtpInfo.from}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-800 rounded-xl p-1 w-fit flex-wrap">
        {[
          { key: 'compose' as const, label: 'Compose', icon: Send },
          { key: 'subscribers' as const, label: 'Subscribers', icon: Users },
          { key: 'test' as const, label: 'Test Email', icon: FlaskConical },
          { key: 'logs' as const, label: 'Email Logs', icon: Mail },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Compose ── */}
      {tab === 'compose' && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold">Broadcast Email</h3>
          <p className="text-zinc-500 text-xs">Send an email to all active newsletter subscribers.</p>

          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. 🔥 Flash Sale — 30% Off All Car Accessories"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1 block">Email Body (HTML)</label>
            <textarea
              value={htmlBody}
              onChange={e => setHtmlBody(e.target.value)}
              placeholder={'<h2 style="color:#fff;">Flash Sale! 🔥</h2>\n<p style="color:#ccc;">For the next 48 hours, enjoy 30% off all car accessories.</p>\n<p><a href="https://drivekit.com" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Shop Now</a></p>'}
              rows={10}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors font-mono resize-y"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !htmlBody.trim()}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>

          {sendResult && (
            <div className={`rounded-xl p-4 text-sm font-medium ${
              sendResult.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {sendResult.message}
            </div>
          )}
        </div>
      )}

      {/* ── Subscribers ── */}
      {tab === 'subscribers' && (
        <div className="space-y-4">
          {/* Stats */}
          {stats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 text-center">
                <Users size={18} className="text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-black">{stats.active}</p>
                <p className="text-zinc-500 text-xs">Active</p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 text-center">
                <CheckCircle2 size={18} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-xl font-black">{stats.total}</p>
                <p className="text-zinc-500 text-xs">Total</p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 text-center">
                <XCircle size={18} className="text-red-400 mx-auto mb-1" />
                <p className="text-xl font-black">{stats.unsubscribed}</p>
                <p className="text-zinc-500 text-xs">Unsubscribed</p>
              </div>
            </div>
          ) : null}

          {/* Search + Filter */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={subSearch}
                onChange={e => setSubSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSubPage(1); loadSubscribers(1, e.currentTarget.value) } }}
                placeholder="Search by email or name..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <select
              value={subStatus}
              onChange={e => { const v = e.target.value as any; setSubStatus(v); setSubPage(1); loadSubscribers(1, subSearch, v) }}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
            <button
              onClick={() => loadSubscribers(1)}
              className="text-zinc-400 hover:text-white text-xs font-semibold px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl transition-colors"
            >
              ↻ Refresh
            </button>
          </div>

          {/* Subscriber List */}
          {subLoading ? (
            <div className="text-center py-8"><Loader2 size={20} className="text-zinc-600 animate-spin mx-auto" /></div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-12 bg-zinc-800/50 border border-zinc-700 rounded-2xl">
              <Users size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">{subSearch ? 'No subscribers match your search' : 'No subscribers yet'}</p>
            </div>
          ) : (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl overflow-hidden">
              <div className="divide-y divide-zinc-700/50">
                {subscribers.map((sub: any) => (
                  <div key={sub.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{sub.email}</p>
                      <p className="text-xs text-zinc-500">
                        {sub.name ? `${sub.name} · ` : ''}{sub.source ?? 'unknown'} · {new Date(sub.subscribedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        sub.unsubscribed ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {sub.unsubscribed ? 'unsubscribed' : 'active'}
                      </span>
                      <button
                        onClick={() => { if (confirm(`Remove subscriber ${sub.email}?`)) deleteSubscriber(sub.id) }}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                        title="Delete subscriber"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {subTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">{subTotal} total · Page {subPage} of {subTotalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { const p = Math.max(1, subPage - 1); setSubPage(p); loadSubscribers(p) }}
                  disabled={subPage <= 1}
                  className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => { const p = Math.min(subTotalPages, subPage + 1); setSubPage(p); loadSubscribers(p) }}
                  disabled={subPage >= subTotalPages}
                  className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Test Email ── */}
      {tab === 'test' && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold">Send Test Email</h3>
          <p className="text-zinc-500 text-xs">Send a test email to verify your email configuration is working before broadcasting to subscribers.</p>

          <div>
            <label className="text-xs font-semibold text-zinc-400 mb-1 block">Recipient Email</label>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && testEmail.includes('@')) handleTestEmail() }}
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestEmail}
              disabled={testSending || !testEmail.includes('@')}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              {testSending ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
              {testSending ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>

          {testResult && (
            <div className={`rounded-xl p-4 text-sm font-medium ${
              testResult.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {testResult.message}
            </div>
          )}

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-500 space-y-1">
            <p className="font-semibold text-zinc-400">What this tests:</p>
            <p>✓ Email API connection and authentication</p>
            <p>✓ Email delivery to the recipient</p>
            <p>✓ DriveKit branded HTML template rendering</p>
            <p>✓ Email logging in the system</p>
          </div>
        </div>
      )}

      {/* ── Email Logs ── */}
      {tab === 'logs' && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-12 bg-zinc-800/50 border border-zinc-700 rounded-2xl">
              <Mail size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No emails sent yet</p>
            </div>
          ) : (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl overflow-hidden">
              <div className="divide-y divide-zinc-700/50">
                {logs.map((log: any) => (
                  <div key={log.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{log.subject}</p>
                      <p className="text-xs text-zinc-500 truncate">To: {log.to}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        log.type === 'broadcast' ? 'bg-purple-500/10 text-purple-400' :
                        log.type === 'welcome' ? 'bg-emerald-500/10 text-emerald-400' :
                        log.type === 'newsletter-welcome' ? 'bg-blue-500/10 text-blue-400' :
                        log.type === 'verification' ? 'bg-yellow-500/10 text-yellow-400' :
                        log.type === 'admin-test' ? 'bg-cyan-500/10 text-cyan-400' :
                        'bg-zinc-700 text-zinc-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-xs text-zinc-600 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleDateString()} {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
