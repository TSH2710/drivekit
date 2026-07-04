import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Bell, Loader2, ChevronDown, Package, RefreshCw, Pencil, Sparkles } from 'lucide-react'
import SiteEditor from './SiteEditor'
import ProductEditor from './ProductEditor'
import ImageGenerator from './ImageGenerator'
import EmailManager from './EmailManager'
import OrderManagement from './OrderManagement'

interface AdminProps {
  token: string | null
  onBack: () => void
}

const ROLE_OPTIONS = ['CUSTOMER', 'ADMIN', 'OWNER']

const statusColor = (status: string) => {
  switch (status) {
    case 'completed': case 'delivered': return 'bg-emerald-500/10 text-emerald-400'
    case 'confirmed': case 'processing': return 'bg-blue-500/10 text-blue-400'
    case 'shipped': return 'bg-cyan-500/10 text-cyan-400'
    case 'pending': return 'bg-yellow-500/10 text-yellow-400'
    case 'cancelled': case 'refunded': return 'bg-red-500/10 text-red-400'
    default: return 'bg-zinc-700 text-zinc-400'
  }
}

export default function AdminDashboard({ token, onBack }: AdminProps) {
  const [tab, setTab] = useState<'overview' | 'users' | 'orders' | 'products' | 'editor' | 'generate' | 'email'>('overview')
  const [stats, setStats] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [productCount, setProductCount] = useState<number | null>(null)
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)

  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  useEffect(() => {
    const headers = getHeaders()
    Promise.all([
      fetch('/api/admin/stats', { headers }).then(r => r.json()),
      fetch('/api/admin/users', { headers }).then(r => r.json()),
      fetch('/api/admin/orders', { headers }).then(r => r.json()),
    ]).then(([s, u, o]) => {
      if (s.error) { setError(s.error); return }
      setStats(s)
      setAllUsers(u.users ?? [])
      setAllOrders(o.orders ?? [])
    }).catch(() => setError('Network error')).finally(() => setLoading(false))
  }, [token])

  const updateRole = async (userId: string, role: string) => {
    setUpdatingUser(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
        setStats((prev: any) => ({
          ...prev,
          recentUsers: (prev?.recentUsers ?? []).map((u: any) => u.id === userId ? { ...u, role } : u),
        }))
      }
    } catch {}
    setUpdatingUser(null)
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/shopify/sync', { headers: getHeaders() })
      const data = await res.json()
      if (res.ok && data.synced) {
        setProductCount(data.count)
        setSyncResult(`Synced ${data.count} products from Shopify`)
      } else {
        setSyncResult(data.error || 'Sync failed')
      }
    } catch {
      setSyncResult('Network error during sync')
    }
    setSyncing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 size={24} className="text-red-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={onBack} className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-xl text-sm">Go Home</button>
        </div>
      </div>
    )
  }

  const cards = [
    { icon: Users, label: 'Users', value: stats?.userCount ?? 0, color: 'text-blue-400' },
    { icon: Bell, label: 'Waitlist', value: stats?.waitlistCount ?? 0, color: 'text-purple-400' },
    { icon: Package, label: 'Orders', value: stats?.orderCount ?? allOrders.length, color: 'text-amber-400' },
  ]

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'orders' as const, label: 'Orders' },
    { key: 'products' as const, label: 'Products' },
    { key: 'users' as const, label: `Users (${allUsers.length})` },
    { key: 'email' as const, label: 'Email' },
    { key: 'editor' as const, label: 'Site Editor' },
    { key: 'generate' as const, label: '✨ Generate' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Store
        </button>

        <h1 className="text-3xl font-black mb-2">Admin Dashboard</h1>
        <p className="text-zinc-500 text-sm mb-6">Manage your DriveKit store</p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t.key ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Shopify Products'}
          </button>
        </div>
        {syncResult && (
          <div className={`mb-6 px-4 py-2 rounded-xl text-sm font-medium ${
            syncResult.includes('Synced') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {syncResult}
          </div>
        )}

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {cards.map((card) => (
                <div key={card.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <card.icon size={20} className={`${card.color} mb-3`} />
                  <p className="text-2xl font-black">{card.value}</p>
                  <p className="text-zinc-500 text-xs mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Recent Users</h2>
              {(!stats?.recentUsers || stats.recentUsers.length === 0) ? (
                <p className="text-zinc-600 text-sm">No users yet</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentUsers.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          user.role === 'OWNER' ? 'bg-red-600 text-white' :
                          user.role === 'ADMIN' ? 'bg-blue-600 text-white' :
                          'bg-zinc-700 text-zinc-300'
                        }`}>
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.name || 'No name'}</p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(user.role === 'OWNER' ? 'delivered' : user.role === 'ADMIN' ? 'confirmed' : 'pending')}`}>
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-4">
              <h2 className="text-lg font-bold mb-4">Recent Orders</h2>
              {allOrders.length === 0 ? (
                <p className="text-zinc-600 text-sm">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {allOrders.slice(0, 5).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Package size={14} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Order #{order.id?.slice(0, 8) ?? 'N/A'}</p>
                          <p className="text-xs text-zinc-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(order.status ?? 'pending')}`}>
                        {order.status ?? 'pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'orders' && (
          <OrderManagement token={token} />
        )}

        {tab === 'products' && (
          <ProductEditor token={token} />
        )}

        {tab === 'users' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {allUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={40} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">No users yet</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {allUsers.map((user: any) => (
                  <div key={user.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        user.role === 'OWNER' ? 'bg-red-600 text-white' :
                        user.role === 'ADMIN' ? 'bg-blue-600 text-white' :
                        'bg-zinc-700 text-zinc-300'
                      }`}>
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name || 'No name'}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <select
                        value={user.role}
                        disabled={updatingUser === user.id}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        className="appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-300 focus:outline-none focus:border-red-500 cursor-pointer disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'editor' && (
          <SiteEditor token={token} />
        )}

        {tab === 'email' && (
          <EmailManager token={token} />
        )}

        {tab === 'generate' && (
          <ImageGenerator onBack={() => setTab('overview')} />
        )}
      </div>
    </div>
  )
}
