import { useState, useEffect, useMemo } from 'react'
import { Search, Save, X, Eye, EyeOff, Loader2, ChevronLeft, ChevronRight, Tag, Sparkles } from 'lucide-react'

interface ProductEditorProps {
  token: string | null
}

interface Product {
  id: number
  title: string
  handle: string
  description: string
  vendor: string
  productType: string
  tags: string[]
  images: Array<{ id: number; src: string; alt: string }>
  variants: Array<{ id: number; title: string; price: number; compareAtPrice: number | null; inStock: boolean }>
  minPrice: number
  inStock: boolean
  hidden?: boolean
  hasOverride?: boolean
  isNew?: boolean
}

const ITEMS_PER_PAGE = 20

interface EditForm {
  title: string
  description: string
  vendor: string
  productType: string
  tags: string
  hidden: boolean
}

const EMPTY_FORM: EditForm = { title: '', description: '', vendor: '', productType: '', tags: '', hidden: false }

export default function ProductEditor({ token }: ProductEditorProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [showHidden, setShowHidden] = useState(true)

  const [markingKnown, setMarkingKnown] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products', { headers: getHeaders() })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to load'); return }
      setProducts(data.products ?? [])
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  const fetchKnownCount = async () => {
    try {
      const res = await fetch('/api/admin/known-products', { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setKnownCount(data.count ?? 0)
    } catch {}
  }

  useEffect(() => { fetchKnownCount() }, [])

  const markAllAsKnown = async () => {
    setMarkingKnown(true)
    try {
      const res = await fetch('/api/admin/known-products/mark-all', {
        method: 'POST',
        headers: getHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setKnownCount(data.marked ?? 0)
        setProducts(prev => prev.map(p => ({ ...p, isNew: false })))
      }
    } catch {}
    setMarkingKnown(false)
  }

  const filtered = useMemo(() => {
    let list = products
    if (!showHidden) list = list.filter(p => !p.hidden)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        p.productType.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [products, search, showHidden])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const pageProducts = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => { setPage(1) }, [search, showHidden])

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setEditForm({
      title: product.title,
      description: product.description,
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags.join(', '),
      hidden: product.hidden ?? false,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }

  const saveEdit = async (productId: number) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setProducts(prev => prev.map(p => {
          if (p.id !== productId) return p
          return {
            ...p,
            title: editForm.title ?? p.title,
            description: editForm.description ?? p.description,
            vendor: editForm.vendor ?? p.vendor,
            productType: editForm.productType ?? p.productType,
            tags: editForm.tags ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : p.tags,
            hidden: editForm.hidden ?? p.hidden,
            hasOverride: true,
          }
        }))
        setSavedId(productId)
        setTimeout(() => setSavedId(null), 2000)
      }
    } catch {}
    setSaving(false)
    cancelEdit()
  }

  const toggleHidden = async (product: Product) => {
    const newHidden = !product.hidden
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ hidden: newHidden }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setProducts(prev => prev.map(p =>
          p.id === product.id ? { ...p, hidden: newHidden, hasOverride: true } : p
        ))
      }
    } catch {}
  }

  const resetProduct = async (productId: number) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })
      if (res.ok) {
        setProducts(prev => prev.map(p =>
          p.id === productId ? { ...p, hidden: false, hasOverride: false } : p
        ))
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-red-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={fetchProducts} className="mt-3 text-xs text-red-400 underline hover:text-red-300">Retry</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, vendor, type, or tag..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>
        <button
          onClick={() => setShowHidden(!showHidden)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            showHidden
              ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              : 'bg-red-600/10 border-red-500/20 text-red-400 hover:bg-red-600/20'
          }`}
        >
          {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          {showHidden ? 'Showing All' : 'Hidden Only'}
        </button>
      </div>
        {knownCount > 0 && (
          <button
            onClick={markAllAsKnown}
            disabled={markingKnown}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
          >
            <Sparkles size={14} />
            {markingKnown ? 'Marking...' : `Mark ${knownCount} as Known`}
          </button>
        )}

      <p className="text-zinc-500 text-xs mb-4">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>

      <div className="space-y-3">
        {pageProducts.map((product) => {
          const isEditing = editingId === product.id
          const justSaved = savedId === product.id
          const thumbnail = product.images?.[0]?.src

          return (
            <div
              key={product.id}
              className={`bg-zinc-800/50 border rounded-xl overflow-hidden transition-colors ${
                product.hidden ? 'border-zinc-700/50 opacity-60' :
                product.hasOverride ? 'border-amber-500/20' :
                'border-zinc-700/50'
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                {thumbnail && (
                  <img src={thumbnail} alt={product.title} className="w-14 h-14 rounded-lg object-cover bg-zinc-700 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{product.title}</p>
                    {product.isNew && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-1"><Sparkles size={8} /> NEW</span>
                    )}
                    {product.hasOverride && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Edited</span>
                    )}
                    {product.hidden && (
                      <span className="text-[10px] bg-zinc-600/50 text-zinc-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Hidden</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <span>{product.vendor}</span>
                    <span>·</span>
                    <span>${product.minPrice.toFixed(2)}</span>
                    <span>·</span>
                    <span>{product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{product.tags.slice(0, 3).join(', ')}{product.tags.length > 3 ? '...' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {justSaved && <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>}
                  <button
                    onClick={() => toggleHidden(product)}
                    className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    title={product.hidden ? 'Show product' : 'Hide product'}
                  >
                    {product.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {product.hasOverride && (
                    <button
                      onClick={() => resetProduct(product.id)}
                      className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-orange-400 transition-colors"
                      title="Reset to Shopify defaults"
                    >
                      <span className="text-xs font-bold">↺</span>
                    </button>
                  )}
                  <button
                    onClick={() => isEditing ? cancelEdit() : startEdit(product)}
                    className={`p-2 rounded-lg transition-colors ${
                      isEditing
                        ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        : 'hover:bg-zinc-700 text-zinc-400 hover:text-red-400'
                    }`}
                    title={isEditing ? 'Cancel' : 'Edit product'}
                  >
                    {isEditing ? <X size={14} /> : <span className="text-sm">✏️</span>}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="border-t border-zinc-700/50 p-4 bg-zinc-900/50 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 font-medium mb-1 block">Title</label>
                      <input
                        value={editForm.title ?? ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 font-medium mb-1 block">Vendor</label>
                      <input
                        value={editForm.vendor ?? ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, vendor: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 font-medium mb-1 block">Product Type</label>
                      <input
                        value={editForm.productType ?? ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, productType: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 font-medium mb-1 block">Tags (comma-separated)</label>
                      <input
                        value={editForm.tags ?? ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-medium mb-1 block">Description</label>
                    <textarea
                      value={editForm.description ?? ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-y"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.hidden ?? false}
                        onChange={(e) => setEditForm(prev => ({ ...prev, hidden: e.target.checked }))}
                        className="rounded border-zinc-600 bg-zinc-800 text-red-500 focus:ring-red-500"
                      />
                      Hide from storefront
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(product.id)}
                        disabled={saving}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                      >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Tag size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No products found</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0) }}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0) }}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
