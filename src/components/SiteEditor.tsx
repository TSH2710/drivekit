import { useState, useEffect } from 'react'
import { Pencil, Save, Check, Loader2, RotateCw } from 'lucide-react'

interface SiteEditorProps {
  token: string | null
}

interface EditableField {
  key: string
  label: string
  section: string
  type?: 'text' | 'textarea'
}

const FIELDS: EditableField[] = [
  { key: 'banner.text', label: 'Banner Text', section: 'Top Banner', type: 'textarea' },
  { key: 'hero.badge', label: 'Badge Text', section: 'Hero Section' },
  { key: 'hero.headline', label: 'Headline', section: 'Hero Section', type: 'textarea' },
  { key: 'hero.description', label: 'Description', section: 'Hero Section', type: 'textarea' },
  { key: 'hero.cta1', label: 'Primary Button', section: 'Hero Section' },
  { key: 'hero.cta2', label: 'Secondary Button', section: 'Hero Section' },
  { key: 'why.badge', label: 'Badge Text', section: 'Why DriveKit' },
  { key: 'why.headline', label: 'Headline', section: 'Why DriveKit' },
  { key: 'footer.copyright', label: 'Copyright Text', section: 'Footer' },
]

export default function SiteEditor({ token }: SiteEditorProps) {
  const [content, setContent] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  const fetchContent = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/site-content', { headers: getHeaders() })
      const data = await res.json()
      setContent(data.content ?? {})
    } catch {
      setError('Failed to load site content')
    }
    setLoading(false)
  }

  useEffect(() => { fetchContent() }, [token])

  const startEditing = (key: string) => {
    setEditing(key)
    setEditValue(content[key] ?? '')
  }

  const cancelEditing = () => {
    setEditing(null)
    setEditValue('')
  }

  const saveField = async (key: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/site-content', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ entries: [{ key, value: editValue }] }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setContent(prev => ({ ...prev, [key]: editValue }))
        setEditing(null)
        setEditValue('')
        setSaved(key)
        setTimeout(() => setSaved(null), 2000)
      } else {
        setError(data.error ?? 'Save failed')
      }
    } catch {
      setError('Network error')
    }
    setSaving(false)
  }

  const sections = Array.from(new Set(FIELDS.map(f => f.section)))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-red-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-sm text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-zinc-500 text-sm">Click the pencil icon ✏️ to edit any text on your site. Changes save instantly.</p>
        <button
          onClick={fetchContent}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          <RotateCw size={12} /> Refresh
        </button>
      </div>

      {sections.map(section => (
        <div key={section} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-300">{section}</h3>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {FIELDS.filter(f => f.section === section).map(field => {
              const isEditing = editing === field.key
              const justSaved = saved === field.key
              const value = content[field.key] ?? ''

              return (
                <div key={field.key} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{field.label}</label>
                    <div className="flex items-center gap-2">
                      {justSaved && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <Check size={12} /> Saved
                        </span>
                      )}
                      {!isEditing && (
                        <button
                          onClick={() => startEditing(field.key)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      {field.type === 'textarea' ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={3}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 resize-y"
                          autoFocus
                        />
                      ) : (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                          autoFocus
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveField(field.key)}
                          disabled={saving}
                          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm ${value ? 'text-zinc-300' : 'text-zinc-600 italic'}`}>
                      {value || '(not set)'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
