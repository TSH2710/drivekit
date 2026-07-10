import { useState, useEffect } from 'react'
import { ArrowLeft, Package, Loader2, ChevronDown, ChevronUp, CheckCircle, Circle, Truck, Clock, XCircle } from 'lucide-react'

interface MyOrdersProps {
  token: string | null
  onBack: () => void
}

interface OrderItem {
  id: string
  title: string
  variantTitle: string | null
  quantity: number
  price: number
  total: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  currency: string
  promoCode: string | null
  discount: number
  createdAt: string
  items: OrderItem[]
}

const TRACKING_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
]

const STATUS_ORDER: Record<string, number> = {
  pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4,
  cancelled: -1, refunded: -1,
}

const statusColor = (status: string) => {
  switch (status) {
    case 'delivered': return 'bg-emerald-500/10 text-emerald-400'
    case 'confirmed': case 'processing': return 'bg-blue-500/10 text-blue-400'
    case 'shipped': return 'bg-cyan-500/10 text-cyan-400'
    case 'pending': return 'bg-yellow-500/10 text-yellow-400'
    case 'cancelled': case 'refunded': return 'bg-red-500/10 text-red-400'
    default: return 'bg-zinc-700 text-zinc-400'
  }
}

export default function MyOrders({ token, onBack }: MyOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/my-orders', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const data = await res.json()
        setOrders(data.orders ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 size={24} className="text-red-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Store
        </button>

        <h1 className="text-3xl font-black mb-2">My Orders</h1>
        <p className="text-zinc-500 text-sm mb-8">View your order history and tracking</p>

        {orders.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <Package size={48} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg font-bold mb-2">No orders yet</p>
            <p className="text-zinc-600 text-sm">When you place an order, it will appear here.</p>
            <button onClick={onBack} className="mt-6 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-xl text-sm">
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const currentIdx = STATUS_ORDER[order.status] ?? 0
              const isCancelled = currentIdx < 0

              return (
                <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Package size={20} className="text-zinc-600" />
                      <div>
                        <p className="text-sm font-bold">{order.orderNumber}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">${order.total.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      {expandedOrder === order.id ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                    </div>
                  </div>

                  {expandedOrder === order.id && (
                    <div className="border-t border-zinc-800 p-5">
                      {!isCancelled && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between">
                            {TRACKING_STEPS.map((step, idx) => {
                              const completed = idx <= currentIdx
                              const isCurrent = idx === currentIdx
                              return (
                                <div key={step.key} className="flex flex-col items-center flex-1 relative">
                                  {idx > 0 && (
                                    <div className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${
                                      idx <= currentIdx ? 'bg-red-500' : 'bg-zinc-800'
                                    }`} />
                                  )}
                                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                                    completed ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-600'
                                  } ${isCurrent ? 'ring-2 ring-red-500/50 ring-offset-2 ring-offset-zinc-900' : ''}`}>
                                    <step.icon size={14} />
                                  </div>
                                  <p className={`text-[10px] mt-2 text-center font-medium ${
                                    completed ? 'text-zinc-300' : 'text-zinc-600'
                                  }`}>
                                    {step.label}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {isCancelled && (
                        <div className="mb-6 flex items-center gap-2 p-3 bg-red-500/10 rounded-xl">
                          <XCircle size={16} className="text-red-400" />
                          <span className="text-sm text-red-400 font-medium">This order has been {order.status}</span>
                        </div>
                      )}

                      <div className="space-y-2 mb-4">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div>
                              <span className="text-zinc-300">{item.title}</span>
                              {item.variantTitle && item.variantTitle !== 'Default Title' && (
                                <span className="text-zinc-600 ml-1">/ {item.variantTitle}</span>
                              )}
                              <span className="text-zinc-600 ml-2">× {item.quantity}</span>
                            </div>
                            <span className="text-zinc-300 font-medium">${item.total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      {order.promoCode && (
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-emerald-400">Promo ({order.promoCode})</span>
                          <span className="text-emerald-400">-${order.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-zinc-800 pt-3 mt-3 flex justify-between text-sm font-bold">
                        <span>Total</span>
                        <span>${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
