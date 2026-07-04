import { useState, useEffect, useMemo } from 'react'
import {
  Package, Search, Filter, ChevronDown, ChevronUp, Truck, RefreshCw,
  Download, MapPin, User, Mail, DollarSign, Calendar, ExternalLink,
  Loader2, CheckCircle, XCircle, Clock, AlertTriangle, Boxes, Trash2
} from 'lucide-react'

interface OrderItem {
  id: string
  productId: string
  variantId: string | null
  title: string
  variantTitle: string | null
  quantity: number
  price: number
  total: number
}

interface Order {
  id: string
  orderNumber: string
  email: string
  status: string
  total: number
  currency: string | null
  shippingName: string | null
  shippingAddress1: string | null
  shippingAddress2: string | null
  shippingCity: string | null
  shippingState: string | null
  shippingZip: string | null
  shippingCountry: string | null
  shopifyOrderId: string | null
  shopifyOrderNum: string | null
  promoCode: string | null
  discount: number
  createdAt: string
  items: OrderItem[]
  user?: { id: string; email: string; name: string | null } | null
}

interface ShopifyOrder {
  id: number
  order_number: number
  name: string
  email: string
  total_price: string
  currency: string
  financial_status: string
  fulfillment_status: string | null
  created_at: string
  line_items: Array<{
    id: number
    title: string
    variant_title: string | null
    quantity: number
    price: string
    sku: string | null
  }>
  shipping_address: {
    name: string
    address1: string
    city: string
    province_code: string
    zip: string
    country_code: string
  } | null
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded',
}

const statusColor = (status: string) => {
  switch (status) {
    case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    case 'confirmed': case 'processing': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    case 'shipped': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
    case 'pending': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    case 'cancelled': case 'refunded': return 'bg-red-500/10 text-red-400 border border-red-500/20'
    default: return 'bg-zinc-700 text-zinc-400 border border-zinc-600'
  }
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'delivered': return <CheckCircle size={14} />
    case 'shipped': return <Truck size={14} />
    case 'cancelled': case 'refunded': return <XCircle size={14} />
    case 'pending': return <Clock size={14} />
    case 'confirmed': case 'processing': return <Package size={14} />
    default: return <Package size={14} />
  }
}

export default function OrderManagement({ token }: { token: string | null }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  const [fulfillingOrder, setFulfillingOrder] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [registeringWebhooks, setRegisteringWebhooks] = useState(false)
  const [webhookResult, setWebhookResult] = useState<string | null>(null)
  const [showFulfillDialog, setShowFulfillDialog] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [trackingCompany, setTrackingCompany] = useState('')
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const [showShopifyOrders, setShowShopifyOrders] = useState(false)
  const [shopifyLoading, setShopifyLoading] = useState(false)

  const [deletingOrder, setDeletingOrder] = useState<string | null>(null)
  const [deletingFake, setDeletingFake] = useState(false)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)
  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  useEffect(() => {
    fetchOrders()
  }, [token])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders', { headers: getHeaders() })
      const data = await res.json()
      setOrders(data.orders ?? [])
    } catch {}
    setLoading(false)
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      }
    } catch {}
    setUpdatingOrder(null)
  }

  const fulfillOrder = async (orderId: string) => {
    setFulfillingOrder(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          trackingNumber: trackingNumber || undefined,
          trackingCompany: trackingCompany || undefined,
          notifyCustomer: true,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o))
      }
    } catch {}
    setFulfillingOrder(null)
    setShowFulfillDialog(null)
    setTrackingNumber('')
    setTrackingCompany('')
  }

  const importShopifyOrders = async () => {
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/shopify/orders/import', {
        method: 'POST',
        headers: getHeaders(),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setImportResult(`✅ Imported ${data.imported} orders, skipped ${data.skipped} existing (${data.total} total from Shopify)`)
        await fetchOrders()
      } else {
        setImportResult(`❌ ${data.error || 'Import failed'}`)
      }
    } catch {
      setImportResult('❌ Network error during import')
    }
    setImporting(false)
  }

  const registerWebhooks = async () => {
    setRegisteringWebhooks(true)
    setWebhookResult(null)
    try {
      const res = await fetch('/api/shopify/webhooks/register', {
        method: 'POST',
        headers: getHeaders(),
      })
      const data = await res.json()
      if (data.registered?.length) {
        setWebhookResult(`✅ Registered ${data.registered.length} webhooks: ${data.registered.join(', ')}`)
      }
      if (data.errors?.length) {
        setWebhookResult(prev => `${prev ? prev + ' ' : ''}⚠️ Errors: ${data.errors.join('; ')}`)
      }
    } catch {
      setWebhookResult('❌ Network error during webhook registration')
    }
    setRegisteringWebhooks(false)
  }

  const fetchShopifyOrders = async () => {
    setShopifyLoading(true)
    setShowShopifyOrders(true)
    try {
      const res = await fetch('/api/shopify/orders?limit=50&status=any', { headers: getHeaders() })
      const data = await res.json()
      setShopifyOrders(data.orders ?? [])
    } catch {}
    setShopifyLoading(false)
  }

  const deleteOrder = async (orderId: string) => {
    setDeletingOrder(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
        if (expandedOrder === orderId) setExpandedOrder(null)
      }
    } catch {}
    setDeletingOrder(null)
  }

  const deleteAllFakeOrders = async () => {
    if (!confirm('Delete all orders that weren\'t imported from Shopify? This cannot be undone.')) return
    setDeletingFake(true)
    setDeleteResult(null)
    try {
      const res = await fetch('/api/admin/orders/fake', {
        method: 'DELETE',
        headers: getHeaders(),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setDeleteResult(`✅ Deleted ${data.deleted} fake order${data.deleted !== 1 ? 's' : ''}`)
        await fetchOrders()
      } else {
        setDeleteResult(`❌ ${data.error || 'Failed to delete'}`)
      }
    } catch {
      setDeleteResult('❌ Network error')
    }
    setDeletingFake(false)
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = search === '' ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.email.toLowerCase().includes(search.toLowerCase()) ||
        o.shippingName?.toLowerCase().includes(search.toLowerCase()) ||
        o.shopifyOrderNum?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
    const byStatus = STATUS_OPTIONS.reduce((acc, s) => {
      acc[s] = orders.filter(o => o.status === s).length
      return acc
    }, {} as Record<string, number>)
    return { totalRevenue, byStatus, count: orders.length }
  }, [orders])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-red-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Boxes size={16} className="text-blue-400" />
            <span className="text-xs text-zinc-500 font-medium">Total Orders</span>
          </div>
          <p className="text-2xl font-black">{stats.count}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-emerald-400" />
            <span className="text-xs text-zinc-500 font-medium">Revenue</span>
          </div>
          <p className="text-2xl font-black">${stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-400" />
            <span className="text-xs text-zinc-500 font-medium">Pending</span>
          </div>
          <p className="text-2xl font-black">{stats.byStatus.pending ?? 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={16} className="text-cyan-400" />
            <span className="text-xs text-zinc-500 font-medium">Shipped</span>
          </div>
          <p className="text-2xl font-black">{stats.byStatus.shipped ?? 0}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={importShopifyOrders}
          disabled={importing}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {importing ? 'Importing...' : 'Import from Shopify'}
        </button>
        <button
          onClick={fetchShopifyOrders}
          disabled={shopifyLoading}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          {shopifyLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
          {shopifyLoading ? 'Loading...' : 'View Shopify Orders'}
        </button>
        <button
          onClick={registerWebhooks}
          disabled={registeringWebhooks}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          {registeringWebhooks ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {registeringWebhooks ? 'Registering...' : 'Register Webhooks'}
        </button>
        <button
          onClick={deleteAllFakeOrders}
          disabled={deletingFake}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-red-900/50 disabled:opacity-50 border border-red-900/50 text-red-400 hover:text-red-300 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          {deletingFake ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          {deletingFake ? 'Deleting...' : 'Delete All Fake Orders'}
        </button>
      </div>

      {importResult && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          importResult.startsWith('✅')
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {importResult}
        </div>
      )}

      {webhookResult && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          webhookResult.startsWith('✅')
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        }`}>
          {webhookResult}
        </div>
      )}

      {/* Shopify Orders Preview */}
      {deleteResult && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          deleteResult.startsWith('✅')
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {deleteResult}
        </div>
      )}

      {showShopifyOrders && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ExternalLink size={14} className="text-emerald-400" />
              Shopify Orders (Live)
            </h3>
            <button onClick={() => setShowShopifyOrders(false)} className="text-zinc-500 hover:text-white text-xs">Close</button>
          </div>
          {shopifyLoading ? (
            <div className="p-8 text-center">
              <Loader2 size={20} className="text-red-500 animate-spin mx-auto" />
              <p className="text-zinc-500 text-xs mt-2">Fetching from Shopify...</p>
            </div>
          ) : shopifyOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-zinc-500 text-sm">No orders found in Shopify</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-96 overflow-y-auto">
              {shopifyOrders.map((o) => (
                <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">#{o.order_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(
                        o.fulfillment_status === 'fulfilled' ? 'shipped' :
                        o.financial_status === 'paid' ? 'confirmed' : 'pending'
                      )}`}>
                        {o.financial_status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{o.email}</p>
                    <p className="text-xs text-zinc-600">{o.line_items.length} item{o.line_items.length !== 1 ? 's' : ''} · {new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm font-bold whitespace-nowrap">${parseFloat(o.total_price).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by order #, email, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-10 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="all">All Statuses ({stats.count})</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]} ({stats.byStatus[s] ?? 0})</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-16 text-center">
            <Package size={48} className="text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">No orders found</p>
            <p className="text-zinc-600 text-xs mt-1">
              {orders.length === 0 ? 'Import orders from Shopify to get started' : 'Try adjusting your search or filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrder === order.id
              return (
                <div key={order.id}>
                  {/* Order Row */}
                  <div
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-bold">{order.orderNumber}</span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.status)}`}>
                          {statusIcon(order.status)}
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                        {order.shopifyOrderId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium">Shopify</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{order.email}{order.user?.name ? ` · ${order.user.name}` : ''}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {order.promoCode ? ` · Promo: ${order.promoCode}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">${order.total.toFixed(2)}</p>
                        {order.discount > 0 && (
                          <p className="text-xs text-emerald-500">-${order.discount.toFixed(2)} off</p>
                        )}
                      </div>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          disabled={updatingOrder === order.id}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-300 focus:outline-none focus:border-red-500 cursor-pointer disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-zinc-800/50" onClick={(e) => e.stopPropagation()}>
                      <div className="grid md:grid-cols-2 gap-5 mt-4">
                        {/* Line Items */}
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Line Items</h4>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium">{item.title}</p>
                                  {item.variantTitle && <p className="text-xs text-zinc-500">{item.variantTitle}</p>}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">${item.price.toFixed(2)} × {item.quantity}</p>
                                  <p className="text-xs text-zinc-500">${item.total.toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shipping & Details */}
                        <div className="space-y-4">
                          {order.shippingName && (
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Shipping Address</h4>
                              <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-sm">
                                <p className="font-medium flex items-center gap-1.5">
                                  <User size={12} className="text-zinc-500" />
                                  {order.shippingName}
                                </p>
                                {order.shippingAddress1 && (
                                  <p className="text-zinc-400 text-xs mt-1 flex items-start gap-1.5">
                                    <MapPin size={12} className="text-zinc-500 mt-0.5 shrink-0" />
                                    <span>
                                      {order.shippingAddress1}
                                      {order.shippingAddress2 ? `, ${order.shippingAddress2}` : ''}
                                      <br />
                                      {order.shippingCity}{order.shippingState ? `, ${order.shippingState}` : ''} {order.shippingZip}
                                      {order.shippingCountry ? ` ${order.shippingCountry}` : ''}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Order Details</h4>
                            <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-xs space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Order ID</span>
                                <span className="text-zinc-300 font-mono">{order.id.slice(0, 8)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Created</span>
                                <span className="text-zinc-300">{new Date(order.createdAt).toLocaleString()}</span>
                              </div>
                              {order.shopifyOrderId && (
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Shopify ID</span>
                                  <span className="text-zinc-300 font-mono">{order.shopifyOrderId}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Subtotal</span>
                                <span className="text-zinc-300">${order.items.reduce((s, i) => s + i.total, 0).toFixed(2)}</span>
                              </div>
                              {order.discount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-emerald-500">Discount</span>
                                  <span className="text-emerald-400">-${order.discount.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-medium border-t border-zinc-700 pt-1.5">
                                <span className="text-zinc-400">Total</span>
                                <span className="text-white">${order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Fulfillment Button */}
                          {(order.status === 'confirmed' || order.status === 'processing' || order.status === 'pending') && (
                            <button
                              onClick={() => setShowFulfillDialog(order.id)}
                              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                            >
                              <Truck size={14} />
                              Fulfill & Ship Order
                            </button>
                          )}

                          {/* Notification Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                await fetch(`/api/orders/${order.id}/notify`, {
                                  method: 'POST',
                                  headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ type: 'confirmation' }),
                                })
                              }}
                              className="flex-1 flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium py-2 rounded-lg transition-colors"
                            >
                              <Mail size={12} /> Send Confirmation
                            </button>
                            {order.status === 'shipped' && (
                              <button
                                onClick={async () => {
                                  await fetch(`/api/orders/${order.id}/notify`, {
                                    method: 'POST',
                                    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'shipped' }),
                                  })
                                }}
                                className="flex-1 flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium py-2 rounded-lg transition-colors"
                              >
                                <Mail size={12} /> Send Shipping Update
                              </button>
                            )}
                          </div>
                        </div>

                          {/* Delete Order Button */}
                          {!order.shopifyOrderId && (
                            <button
                              onClick={() => deleteOrder(order.id)}
                              disabled={deletingOrder === order.id}
                              className="w-full flex items-center justify-center gap-2 bg-red-950/50 hover:bg-red-900/50 border border-red-900/50 text-red-400 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deletingOrder === order.id ? (
                                <><Loader2 size={12} className="animate-spin" /> Deleting...</>
                              ) : (
                                <><Trash2 size={12} /> Delete Order</>
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fulfillment Dialog */}
      {showFulfillDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFulfillDialog(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Truck size={18} className="text-emerald-400" />
              Fulfill Order
            </h3>
            <p className="text-zinc-500 text-sm mb-5">
              Mark order {orders.find(o => o.id === showFulfillDialog)?.orderNumber} as shipped.
              {orders.find(o => o.id === showFulfillDialog)?.shopifyOrderId && (
                <span className="text-emerald-400"> This will sync to Shopify.</span>
              )}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Tracking Number (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 1Z999AA10123456784"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Carrier (optional)</label>
                <select
                  value={trackingCompany}
                  onChange={(e) => setTrackingCompany(e.target.value)}
                  className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="">Select carrier...</option>
                  <option value="UPS">UPS</option>
                  <option value="USPS">USPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DHL">DHL</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFulfillDialog(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => fulfillOrder(showFulfillDialog)}
                disabled={fulfillingOrder === showFulfillDialog}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {fulfillingOrder === showFulfillDialog ? (
                  <><Loader2 size={14} className="animate-spin" /> Fulfilling...</>
                ) : (
                  <><Truck size={14} /> Confirm Fulfillment</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
