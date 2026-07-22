import { useState, useEffect, useMemo } from 'react'
import { Search, Link2, LinkIcon, ChevronDown, Check, X, Loader2, ArrowRight, Package, AlertTriangle, Trash2, Play } from 'lucide-react'

interface CjMappingPanelProps {
  token: string | null
}

interface CjProduct {
  cjTitle: string
  variants: string[]
  variantCount: number
  shopifyId: string | null
  shopifyTitle: string | null
  shopifyVariantCount: number
  missingCount: number
  missingVariants: string[]
  score: number
  isAutoMatch: boolean
  isManualMapping: boolean
}

interface ShopifyProduct {
  id: string
  title: string
  variantCount: number
}

interface RestoreJob {
  running: boolean
  progress: number
  total: number
  results: Array<{ cjTitle: string; shopifyTitle: string; created: number; errors: string[] }>
  done: boolean
  error?: string
}

export default function CjMappingPanel({ token }: CjMappingPanelProps) {
  const [cjProducts, setCjProducts] = useState<CjProduct[]>([])
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restoreJob, setRestoreJob] = useState<RestoreJob | null>(null)
  const [filter, setFilter] = useState<'all' | 'unmapped' | 'mapped' | 'suggested'>('all')

  const headers = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  // Load initial data
  useEffect(() => {
    fetch('/api/admin/cj-mapping', { headers: headers() })
      .then(r => r.json())
      .then(data => {
        if (data.error) return
        setCjProducts(data.cjProducts || [])
        setShopifyProducts(data.shopifyProducts || [])
        // Initialize mappings from existing data
        const m: Record<string, string> = {}
        data.cjProducts.forEach((p: CjProduct) => {
          if (p.shopifyId) m[p.cjTitle] = p.shopifyId
        })
        setMappings(m)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  // Poll restore job
  useEffect(() => {
    if (!restoreJob?.running) return
    const interval = setInterval(() => {
      fetch('/api/admin/cj-restore/status', { headers: headers() })
        .then(r => r.json())
        .then(data => { if (data.ok) setRestoreJob(data) })
        .catch(() => {})
    }, 3000)
    return () => clearInterval(interval)
  }, [restoreJob?.running])

  const filtered = useMemo(() => {
    let list = cjProducts
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.cjTitle.toLowerCase().includes(q) || p.variants.some(v => v.toLowerCase().includes(q)))
    }
    if (filter === 'unmapped') list = list.filter(p => !mappings[p.cjTitle])
    else if (filter === 'mapped') list = list.filter(p => !!mappings[p.cjTitle])
    else if (filter === 'suggested') list = list.filter(p => !mappings[p.cjTitle] && p.score >= 0.5)
    return list
  }, [cjProducts, search, filter, mappings])

  const stats = useMemo(() => ({
    total: cjProducts.length,
    mapped: Object.keys(mappings).length,
    unmapped: cjProducts.length - Object.keys(mappings).length,
    totalMissing: cjProducts.reduce((sum, p) => {
      const shopId = mappings[p.cjTitle]
      const shopProd = shopifyProducts.find(s => s.id === shopId)
      if (!shopProd) return sum + p.variantCount
      const existing = new Set(shopProd.title ? [] : []) // We don't have variant titles in shopifyProducts
      return sum + p.missingCount
    }, 0),
  }), [cjProducts, mappings, shopifyProducts])

  const autoMap = () => {
    const newMappings = { ...mappings }
    cjProducts.forEach(p => {
      if (!newMappings[p.cjTitle] && p.score >= 0.8 && p.shopifyId) {
        newMappings[p.cjTitle] = p.shopifyId
      }
    })
    setMappings(newMappings)
  }

  const saveMappings = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/cj-mapping', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ mappings }),
      })
    } catch {}
    setSaving(false)
  }

  const startRestore = async () => {
    try {
      const res = await fetch('/api/admin/cj-restore', { method: 'POST', headers: headers() })
      const data = await res.json()
      if (data.ok || data.status) setRestoreJob({ running: true, progress: 0, total: data.total || 0, results: [], done: false })
    } catch {}
  }

  const selectedProduct = cjProducts.find(p => p.cjTitle === selected)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-red-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2">
          <span className="text-zinc-400 text-xs">Total CJ Products</span>
          <p className="text-white font-bold">{stats.total}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
          <span className="text-emerald-400 text-xs">Mapped</span>
          <p className="text-emerald-400 font-bold">{stats.mapped}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
          <span className="text-red-400 text-xs">Unmapped</span>
          <p className="text-red-400 font-bold">{stats.unmapped}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={autoMap} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Link2 size={14} /> Auto-map High Confidence
        </button>
        <button onClick={saveMappings} disabled={saving} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Mappings
        </button>
        <button onClick={startRestore} disabled={restoreJob?.running} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          {restoreJob?.running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Create Missing Variants
        </button>
      </div>

      {/* Restore progress */}
      {restoreJob && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">
              {restoreJob.done ? 'Restore Complete' : `Restoring variants... ${restoreJob.progress}/${restoreJob.total}`}
            </span>
            {restoreJob.done && (
              <span className="text-xs text-emerald-400">
                {restoreJob.results.reduce((s, r) => s + r.created, 0)} created
              </span>
            )}
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2 mb-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${restoreJob.total > 0 ? (restoreJob.progress / restoreJob.total) * 100 : 0}%` }}
            />
          </div>
          {restoreJob.results.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
              {restoreJob.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {r.created > 0 ? (
                    <Check size={12} className="text-emerald-400 shrink-0" />
                  ) : r.errors.length > 0 ? (
                    <X size={12} className="text-red-400 shrink-0" />
                  ) : (
                    <span className="w-3" />
                  )}
                  <span className="text-zinc-400 truncate">{r.cjTitle.slice(0, 40)}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-zinc-300 truncate">{r.shopifyTitle?.slice(0, 30)}</span>
                  <span className="text-zinc-500 ml-auto">{r.created} created</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search and filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search CJ products..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
          className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="all">All ({stats.total})</option>
          <option value="unmapped">Unmapped ({stats.unmapped})</option>
          <option value="mapped">Mapped ({stats.mapped})</option>
          <option value="suggested">Suggested ({cjProducts.filter(p => !mappings[p.cjTitle] && p.score >= 0.5).length})</option>
        </select>
      </div>

      {/* Main content — list + detail */}
      <div className="flex gap-4 min-h-[500px]">
        {/* CJ products list */}
        <div className="w-full lg:w-1/2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">No products match your search</div>
            ) : (
              filtered.map(p => (
                <button
                  key={p.cjTitle}
                  onClick={() => setSelected(p.cjTitle === selected ? null : p.cjTitle)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors ${
                    selected === p.cjTitle ? 'bg-zinc-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      mappings[p.cjTitle] ? 'bg-emerald-400' :
                      p.score >= 0.5 ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.cjTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-zinc-500 text-xs">{p.variantCount} variants</span>
                        {p.shopifyTitle && (
                          <>
                            <span className="text-zinc-600 text-xs">→</span>
                            <span className="text-zinc-400 text-xs truncate">{p.shopifyTitle}</span>
                            {p.missingCount > 0 && (
                              <span className="text-yellow-400 text-xs">({p.missingCount} missing)</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {mappings[p.cjTitle] ? (
                      <LinkIcon size={12} className="text-emerald-400 shrink-0" />
                    ) : p.score >= 0.5 ? (
                      <ChevronDown size={12} className="text-yellow-400 shrink-0" />
                    ) : (
                      <AlertTriangle size={12} className="text-red-400 shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="hidden lg:block w-1/2">
          {selectedProduct ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-4">
              <h3 className="text-white font-bold text-lg mb-1 truncate">{selectedProduct.cjTitle}</h3>
              <p className="text-zinc-500 text-sm mb-4">{selectedProduct.variantCount} CJ variants</p>

              {/* Map to Shopify product */}
              <div className="mb-4">
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1 block">Map to Shopify Product</label>
                <select
                  value={mappings[selectedProduct.cjTitle] || ''}
                  onChange={e => {
                    const val = e.target.value
                    setMappings(prev => {
                      const next = { ...prev }
                      if (val) next[selectedProduct.cjTitle] = val
                      else delete next[selectedProduct.cjTitle]
                      return next
                    })
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="">— Not mapped —</option>
                  {shopifyProducts.map(sp => (
                    <option key={sp.id} value={sp.id}>
                      {sp.title} ({sp.variantCount} variants)
                    </option>
                  ))}
                </select>
              </div>

              {/* CJ Variants */}
              <div>
                <h4 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">CJ Variants</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProduct.variants.map(v => (
                    <span key={v} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-lg">
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing variants */}
              {selectedProduct.missingCount > 0 && mappings[selectedProduct.cjTitle] && (
                <div className="mt-4">
                  <h4 className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Missing on Shopify ({selectedProduct.missingCount})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.missingVariants.map(v => (
                      <span key={v} className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-lg">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex items-center justify-center h-full">
              <p className="text-zinc-600 text-sm">Select a CJ product to see details and map it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
