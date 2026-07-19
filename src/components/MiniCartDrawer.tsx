import { ShoppingCart, X, Plus, Minus, Trash2, Truck, ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface MiniCartProduct {
  id: number
  title: string
  minPrice: number
  images: { src: string; alt: string }[]
}

interface CartItem {
  product: MiniCartProduct
  quantity: number
  variantId?: number
  variantPrice?: number
}

interface MiniCartDrawerProps {
  open: boolean
  onClose: () => void
  cartItems: CartItem[]
  updateQuantity: (productId: number, qty: number) => void
  removeFromCart: (productId: number) => void
  onCheckout: () => void
  freeShippingThreshold?: number
}

export default function MiniCartDrawer({
  open,
  onClose,
  cartItems,
  updateQuantity,
  removeFromCart,
  onCheckout,
  freeShippingThreshold = 99,
}: MiniCartDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => {
    const price = item.variantPrice ?? item.product.minPrice
    return sum + price * item.quantity
  }, 0)
  const freeShippingProgress = Math.min(cartTotal / freeShippingThreshold, 1)
  const amountToFreeShipping = Math.max(freeShippingThreshold - cartTotal, 0)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-[160] w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={20} className="text-red-400" />
            <h2 className="text-white font-bold text-lg">Your Cart</h2>
            <span className="text-zinc-500 text-sm">({cartCount} item{cartCount !== 1 ? 's' : ''})</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div className="px-5 py-3 border-b border-zinc-800/50">
          {freeShippingProgress >= 1 ? (
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-semibold">FREE shipping unlocked! 🎉</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-zinc-400">Add <span className="text-white font-bold">${amountToFreeShipping.toFixed(2)}</span> for free shipping</span>
                <span className="text-zinc-600">${cartTotal.toFixed(2)} / ${freeShippingThreshold}</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                  style={{ width: `${freeShippingProgress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
              <ShoppingCart size={40} className="text-zinc-700" />
              <div className="text-center">
                <p className="text-zinc-400 font-medium">Your cart is empty</p>
                <p className="text-zinc-600 text-sm mt-1">Add some gear to get started</p>
              </div>
              <button
                onClick={onClose}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const price = item.variantPrice ?? item.product.minPrice
                return (
                  <div key={`${item.product.id}-${item.variantId}`} className="flex gap-3 bg-zinc-800/50 border border-zinc-800 rounded-xl p-3">
                    <div className="w-16 h-16 bg-zinc-800 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                      {item.product.images?.[0] ? (
                        <img src={item.product.images[0].src} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-xl">🏎️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate pr-2">{item.product.title}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">${price.toFixed(2)} each</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-3 py-1 bg-zinc-900 text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="text-white text-sm font-bold ml-auto">${(price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1 self-start"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-zinc-800 px-5 py-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Subtotal</span>
              <span className="text-white font-bold">${cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={() => { onClose(); onCheckout() }}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              Checkout — ${cartTotal.toFixed(2)} <ArrowRight size={16} />
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-xs font-medium transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}
