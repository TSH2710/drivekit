import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ShoppingCart, Search, Menu, X, ChevronDown, Star, Truck, Shield,
  RotateCcw, Zap, ChevronRight, Mail, MapPin, Instagram,
  Facebook, Youtube, ArrowRight, Check, Tag, Gauge,
  Heart, Eye, ChevronLeft, Plus, Minus, Share2, Loader2, AlertCircle,
  Bell, CheckCircle, UserRound, ArrowLeft, Package, XCircle,
  GitCompareArrows, Columns, SkipForward
} from 'lucide-react'
import AdminDashboard from './AdminDashboard'
import MyOrders from './MyOrders'
import VehicleChecker from './VehicleChecker'
import FAQ from './FAQ'
import MiniCartDrawer from './MiniCartDrawer'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShopifyImage {
  id: number
  src: string
  alt: string
  width: number
  height: number
}

interface ShopifyVariant {
  id: number
  title: string
  price: number
  compareAtPrice: number | null
  option1: string | null
  option2: string | null
  option3: string | null
  inStock: boolean
  inventoryQuantity: number
  sku: string | null
  imageId: number | null
  weight?: number
  weightUnit?: string
}

interface ShopifyOption {
  name: string
  values: string[]
}

interface Product {
  id: number
  title: string
  handle: string
  description: string
  htmlDescription: string
  vendor: string
  productType: string
  tags: string[]
  images: ShopifyImage[]
  variants: ShopifyVariant[]
  options: ShopifyOption[]
  minPrice: number
  inStock: boolean
  hidden?: boolean
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const PRODUCTS_PER_PAGE = 30

const NAV_CATEGORIES = [
  {
    label: 'Interior',
    items: ['Sun Shade', 'Seat Organizer', 'Cup Holder', 'Diffuser', 'Air Purifier'],
  },
  {
    label: 'Cleaning',
    items: ['Vacuum', 'Car Wash', 'Foam Gun', 'Glass Washer', 'Microfiber'],
  },
  {
    label: 'Electronics',
    items: ['Dash Cam', 'GPS Tracker', 'Phone Holder', 'LED', 'Air Compressor'],
  },
  {
    label: 'Performance',
    items: ['Oil Cooler', 'Antenna', 'Ice Scraper'],
  },
  {
    label: 'Shop All',
    items: ['All Products', 'Trending Now', 'Best Sellers', 'New Arrivals', 'Deals'],
  },
]

const CATEGORIES = [
  { icon: Zap, label: 'Trending Now', color: 'from-red-900/40 to-red-800/20', accent: 'text-red-400' },
  { icon: Tag, label: 'Best Sellers', color: 'from-blue-900/40 to-blue-800/20', accent: 'text-blue-400' },
  { icon: Star, label: 'Top Rated', color: 'from-yellow-900/40 to-yellow-800/20', accent: 'text-yellow-400' },
  { icon: RotateCcw, label: 'New Arrivals', color: 'from-emerald-900/40 to-emerald-800/20', accent: 'text-emerald-400' },
  { icon: Tag, label: 'Deals', color: 'from-orange-900/40 to-orange-800/20', accent: 'text-orange-400' },
]

const TRUST_ITEMS = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders over $99. Nationwide coverage with real-time tracking.', color: 'text-red-400' },
  { icon: Shield, title: 'Fitment Guarantee', desc: "If a part doesn't fit your vehicle, we'll replace or refund it. No questions asked.", color: 'text-orange-400' },
  { icon: RotateCcw, title: 'Easy 2-Week Returns', desc: 'Unused parts return within 14 days. Original packaging required.', color: 'text-blue-400' },
]

// ── Vehicle Fitment Data ─────────────────────────────────────
const VEHICLE_YEARS = Array.from({ length: 30 }, (_, i) => 2026 - i).map(String)

const VEHICLE_MAKES_ALL = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
  'Dodge', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai', 'Infiniti',
  'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln', 'Mazda',
  'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Porsche', 'Ram',
  'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
]

const VEHICLE_MAKES_BY_YEAR: Record<string, string[]> = {
  '2026': ['Acura', 'Audi', 'BMW', 'Cadillac', 'Chevrolet', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai', 'Kia', 'Lexus', 'Mazda', 'Mercedes-Benz', 'Nissan', 'Porsche', 'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'],
  '2025': ['Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'],
  '2024': ['Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'],
}

const VEHICLE_MODELS_BY_MAKE: Record<string, string[]> = {
  'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Tacoma', 'Tundra', '4Runner', 'Camry', 'GR86', 'Land Cruiser', 'Sienna', 'Venza'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Prologue', 'Civic Type R'],
  'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Bronco', 'Maverick', 'Edge', 'Transit', 'Ranger', 'Bronco Sport'],
  'Chevrolet': ['Silverado', 'Equinox', 'Traverse', 'Tahoe', 'Suburban', 'Camaro', 'Corvette', 'Blazer', 'Trailblazer', 'Colorado'],
  'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'],
  'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'X7', '4 Series', 'iX', 'i4', 'M3', 'M4'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'S-Class', 'A-Class', 'CLA', 'GLS', 'AMG GT'],
  'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Kona', 'Palisade', 'Ioniq 5', 'Ioniq 6', 'Venue'],
  'Kia': ['Sportage', 'Telluride', 'Forte', 'K5', 'Seltos', 'Sorento', 'EV6', 'Carnival', 'Seltos'],
  'Nissan': ['Rogue', 'Altima', 'Sentra', 'Pathfinder', 'Murano', 'Frontier', 'Kicks', 'Ariya', 'Maxima'],
  'Subaru': ['Outback', 'Forester', 'Crosstrek', 'Impreza', 'Ascent', 'WRX', 'Solterra', 'Legacy'],
  'Mazda': ['CX-5', 'CX-50', 'CX-90', 'Mazda3', 'Mazda6', 'CX-30', 'MX-5 Miata'],
  'Volkswagen': ['Jetta', 'Tiguan', 'Atlas', 'Taos', 'Golf', 'ID.4', 'ID.Buzz', 'Atlas Cross Sport'],
  'Audi': ['Q5', 'A4', 'A6', 'Q7', 'Q3', 'A3', 'e-tron', 'Q8', 'A5'],
  'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass', 'Gladiator', 'Renegade', 'Wagoneer'],
  'Ram': ['1500', '2500', '3500', 'ProMaster'],
  'GMC': ['Sierra', 'Terrain', 'Acadia', 'Yukon', 'Canyon'],
  'Lexus': ['RX', 'ES', 'NX', 'IS', 'GX', 'TX', 'UX', 'LC'],
  'Dodge': ['Charger', 'Challenger', 'Durango', 'Hornet'],
  'Cadillac': ['Escalade', 'XT5', 'CT5', 'XT4', 'Lyriq', 'CT4'],
  'Buick': ['Enclave', 'Encore', 'Envision', 'Envista'],
  'Lincoln': ['Navigator', 'Aviator', 'Corsair', 'Nautilus'],
  'Genesis': ['GV70', 'GV80', 'G70', 'G80', 'Electrified GV70'],
  'Infiniti': ['QX60', 'QX50', 'QX80', 'Q50', 'QX55'],
  'Mitsubishi': ['Outlander', 'Eclipse Cross', 'Outlander Sport'],
  'Jaguar': ['F-Pace', 'I-Pace', 'E-Pace', 'XF'],
  'Land Rover': ['Range Rover', 'Discovery', 'Defender', 'Range Rover Sport', 'Range Rover Velar'],
  'Porsche': ['Cayenne', 'Macan', 'Taycan', '911', 'Panamera', 'Cayenne Coupe'],
  'Mini': ['Cooper', 'Countryman', 'Clubman'],
  'Volvo': ['XC60', 'XC90', 'XC40', 'XC60 Recharge', 'EX90'],
  'Acura': ['MDX', 'RDX', 'Integra', 'ZDX'],
  'Chrysler': ['Pacifica', '300'],
}

interface ReviewData {
  id: string
  productId: string
  displayName: string
  rating: number
  title: string | null
  body: string
  verified: boolean
  createdAt: string
}

interface ReviewStats {
  reviews: ReviewData[]
  count: number
  average: number
  distribution: number[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return price.toFixed(2)
}

function getPriceRange(variants: ShopifyVariant[]): string {
  if (variants.length <= 1) return formatPrice(variants[0]?.price ?? 0)
  const prices = variants.map(v => v.price).sort((a, b) => a - b)
  const min = prices[0]
  const max = prices[prices.length - 1]
  if (min === max) return formatPrice(min)
  return `${formatPrice(min)}-${formatPrice(max)}`
}

function getCompareAtPrice(variants: ShopifyVariant[]): number | null {
  for (const v of variants) {
    if (v.compareAtPrice !== null) return v.compareAtPrice
  }
  return null
}

function getDiscountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null
  return Math.round(((compareAt - price) / compareAt) * 100)
}

function getBadgeTag(tags: string[]): string | null {
  const batchTag = tags.find((t) => /batch[- ]?[123]/i.test(t))
  if (batchTag) return batchTag
  return tags.find((t) => !/all[- ]?season/i.test(t)) ?? null
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  const words = q.split(/\s+/).filter(Boolean)
  if (words.length > 1) return words.every(w => t.includes(w))
  if (q.length < 3) return false
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductMeta({ product }: { product: Product }) {
  const variantCount = product.variants.length
  const inStockCount = product.variants.filter(v => v.inStock).length
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <span>{variantCount} variant{variantCount !== 1 ? 's' : ''}</span>
      <span>·</span>
      <span className={inStockCount > 0 ? 'text-emerald-400' : 'text-red-400'}>
        {inStockCount > 0 ? `${inStockCount} in stock` : 'Out of stock'}
      </span>
    </div>
  )
}

function ProductCard({ product, onClick, isWishlisted, onToggleWishlist, isCompared, onToggleCompare, onQuickAdd }: { product: Product; onClick: () => void; isWishlisted: boolean; onToggleWishlist: (id: number) => void; isCompared: boolean; onToggleCompare: (id: number) => void; onQuickAdd?: (product: Product) => void }) {
  const compareAt = getCompareAtPrice(product.variants)
  const discount = getDiscountPercent(product.minPrice, compareAt)
  const firstImage = product.images[0]
  const badge = getBadgeTag(product.tags)

  return (
    <div
      role="article"
      aria-label={`${product.title} - $${formatPrice(product.minPrice)}`}
      className={`group relative bg-zinc-900 border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-red-900/20 cursor-pointer ${isCompared ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-zinc-800 hover:border-red-600/50'}`}
      onClick={onClick}
    >
      {/* Image area */}
      <div className="relative bg-zinc-800 h-52 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/30 to-transparent" />
        {firstImage ? (
          <img
            src={firstImage.src}
            alt={firstImage.alt}
            className="relative z-10 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span className="text-6xl text-zinc-600 relative z-10">🏎️</span>
        )}
        {badge && (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide z-20">
            {badge}
          </span>
        )}
        {discount && discount > 0 && (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full z-20">
            -{discount}%
          </span>
        )}
        <div className="product-card-actions">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id) }}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-700 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:border-red-500 z-20"
          >
            <Heart size={14} className={isWishlisted ? 'text-red-500 fill-red-500' : 'text-zinc-400'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompare(product.id) }}
            aria-label={isCompared ? `Remove ${product.title} from comparison` : `Add ${product.title} to comparison`}
            aria-pressed={isCompared}
            className={`absolute bottom-3 left-3 w-8 h-8 rounded-full bg-zinc-900/80 border flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20 ${isCompared ? 'border-blue-500 hover:border-blue-400' : 'border-zinc-700 hover:border-blue-500'}`}
          >
            <GitCompareArrows size={14} className={isCompared ? 'text-blue-400' : 'text-zinc-400'} />
          </button>
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 bg-zinc-900/70 flex items-center justify-center z-20">
            <span className="text-zinc-300 text-sm font-semibold tracking-widest uppercase">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-red-400 font-semibold uppercase tracking-widest mb-1">{product.vendor}</p>
        <h3 className="text-white font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-red-100 transition-colors">
          {product.title}
        </h3>
        <ProductMeta product={product} />

        <div className="flex items-center gap-2 mt-3">
          <span className="text-white font-bold text-lg">${getPriceRange(product.variants)}</span>
          {compareAt && compareAt > product.minPrice && (
            <span className="text-zinc-500 text-sm line-through">${formatPrice(compareAt)}</span>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onClick() }}
            disabled={!product.inStock}
            className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-300 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-zinc-700"
          >
            <Eye size={15} />
            Details
          </button>
          {product.inStock && onQuickAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickAdd(product) }}
              className="py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              title="Add to cart"
            >
              <ShoppingCart size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Product Detail Page ──────────────────────────────────────────────────────

function ShareMenu({ product, isOpen, onClose }: { product: Product; isOpen: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  if (!isOpen) return null

  const productUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = `Check out ${product.title} on DriveKit!`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl)
      setCopied(true)
      setTimeout(() => { setCopied(false); onClose() }, 1200)
    } catch {
      const input = document.createElement('input')
      input.value = productUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => { setCopied(false); onClose() }, 1200)
    }
  }

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, text: shareText, url: productUrl })
      } catch {}
      onClose()
    }
  }

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500')
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl py-2 z-[91]">
        <button
          onClick={copyLink}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} className="text-zinc-400" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={nativeShare}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <Share2 size={16} className="text-zinc-400" />
            Share…
          </button>
        )}
        <div className="border-t border-zinc-700 my-1" />
        <button
          onClick={() => openUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <span className="text-lg leading-none">𝕏</span>
          Share on X
        </button>
        <button
          onClick={() => openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <Facebook size={16} className="text-blue-400" />
          Share on Facebook
        </button>
        <button
          onClick={() => openUrl(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <span className="text-lg leading-none">💬</span>
          Share on WhatsApp
        </button>
        <button
          onClick={() => openUrl(`mailto:?subject=${encodeURIComponent(product.title)}&body=${encodeURIComponent(`${shareText}\n\n${productUrl}`)}`)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <Mail size={16} className="text-zinc-400" />
          Share via Email
        </button>
      </div>
    </>
  )
}

function ProductDetail({ product, onBack, addToCart, onCheckout, waitlistSubmitted, waitlistEmail, setWaitlistEmail, waitlistError, setWaitlistError, waitlistLoading, waitlistCounts, joinWaitlist, isWishlisted, onToggleWishlist, allProducts, onViewProduct }: {
  product: Product
  onBack: () => void
  addToCart: (product: Product, qty: number, variantId?: number, variantPrice?: number) => void
  onCheckout: () => void
  waitlistSubmitted: Record<string, boolean>
  waitlistEmail: string
  setWaitlistEmail: (v: string) => void
  waitlistError: string
  setWaitlistError: (v: string) => void
  waitlistLoading: boolean
  waitlistCounts: Record<string, number>
  joinWaitlist: (product: Product) => void
  isWishlisted: boolean
  onToggleWishlist: (id: number) => void
  allProducts: Product[]
  onViewProduct: (p: Product) => void
}) {
  const [qty, setQty] = useState(1)
  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'specs' | 'fitment' | 'reviews'>('specs')
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHoverRating, setReviewHoverRating] = useState(0)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewBody, setReviewBody] = useState('')
  const [reviewName, setReviewName] = useState('')
  const [reviewEmail, setReviewEmail] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [lightBoxOpen, setLightBoxOpen] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [isZooming, setIsZooming] = useState(false)
  const [addedToCart, setAddedToCart] = useState<number | null>(null)
  const [fitmentYear, setFitmentYear] = useState('')
  const [fitmentMake, setFitmentMake] = useState('')
  const [fitmentModel, setFitmentModel] = useState('')
  const [fitmentResult, setFitmentResult] = useState<{ fits: boolean } | null>(null)
  const zoomContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (addedToCart === null) return
    const t = setTimeout(() => setAddedToCart(null), 2000)
    return () => clearTimeout(t)
  }, [addedToCart])

  useEffect(() => {
    if (activeTab !== 'reviews') return
    setReviewLoading(true)
    fetch(`/api/reviews/product/${product.id}`)
      .then(r => r.json())
      .then(data => setReviewStats(data))
      .catch(() => setReviewStats({ reviews: [], count: 0, average: 0, distribution: [0, 0, 0, 0, 0] }))
      .finally(() => setReviewLoading(false))
  }, [activeTab, product.id])

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const opt of product.options) {
      if (opt.values.length > 0) initial[opt.name] = opt.values[0]
    }
    return initial
  })

  const matchedVariant = useMemo(() => {
    return product.variants.find((v) => {
      return product.options.every((opt, i) => {
        const selected = selectedOptions[opt.name]
        const vOption = i === 0 ? v.option1 : i === 1 ? v.option2 : v.option3
        return !selected || vOption === selected
      })
    })
  }, [product, selectedOptions])

  useEffect(() => {
    if (!matchedVariant || product.images.length === 0) return

    // 1) Exact imageId match (variant has a dedicated image in Shopify)
    if (matchedVariant.imageId) {
      const imgIdx = product.images.findIndex((img) => img.id === matchedVariant.imageId)
      if (imgIdx >= 0) { setActiveImgIdx(imgIdx); return }
    }

    // 2) Try to match variant option values against image alt text or src filename
    const variantWords = [
      matchedVariant.option1,
      matchedVariant.option2,
      matchedVariant.option3,
      matchedVariant.title,
    ].filter(Boolean).join(' ').toLowerCase().split(/[\s/\\-]+/).filter(w => w.length > 2)

    if (variantWords.length > 0) {
      // Skip lifestyle image (index 0) for matching — it's usually a composite
      const searchStart = product.images.length > 1 ? 1 : 0
      for (let i = searchStart; i < product.images.length; i++) {
        const img = product.images[i]
        const haystack = `${img.alt || ''} ${img.src || ''}`.toLowerCase()
        if (variantWords.some(w => haystack.includes(w))) {
          setActiveImgIdx(i)
          return
        }
      }
    }

    // 3) No match found — keep the current image index (don't change)
  }, [matchedVariant?.id, product.images, product.variants])

  const displayPrice = matchedVariant?.price ?? product.minPrice
  const displayCompareAt = matchedVariant?.compareAtPrice ?? getCompareAtPrice(product.variants)
  const displayInStock = matchedVariant?.inStock ?? product.inStock
  const displaySku = matchedVariant?.sku ?? product.variants[0]?.sku ?? 'N/A'

  const activeImage = product.images[activeImgIdx] ?? product.images[0]

  // Dynamic SEO: update title, meta tags, and inject JSON-LD
  useEffect(() => {
    const prevTitle = document.title
    document.title = `${product.title} — DriveKit`
    const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement
    const prevDesc = metaDesc?.content
    if (metaDesc) metaDesc.content = product.description?.slice(0, 160) || `${product.title} — Premium car accessory from DriveKit`
    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement
    const prevOgTitle = ogTitle?.content
    if (ogTitle) ogTitle.content = product.title
    const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement
    const prevOgDesc = ogDesc?.content
    if (ogDesc) ogDesc.content = product.description?.slice(0, 160) || `${product.title} — Shop at DriveKit`
    const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement
    const prevOgImage = ogImage?.content
    if (ogImage && product.images[0]) ogImage.content = product.images[0].src
    const twTitle = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement
    const prevTwTitle = twTitle?.content
    if (twTitle) twTitle.content = product.title

    // JSON-LD structured data
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'product-jsonld'
    const avgRating = reviewStats?.average ?? 0
    const reviewCount = reviewStats?.count ?? 0
    const ldData: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description?.slice(0, 500),
      image: product.images.map(img => img.src),
      brand: { '@type': 'Brand', name: product.vendor },
      sku: displaySku,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: displayPrice.toFixed(2),
        availability: displayInStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: window.location.href,
      },
    }
    if (avgRating > 0 && reviewCount > 0) {
      ldData.aggregateRating = { '@type': 'AggregateRating', ratingValue: avgRating, reviewCount }
    }
    script.textContent = JSON.stringify(ldData)
    document.head.appendChild(script)

    return () => {
      document.title = prevTitle
      if (metaDesc && prevDesc !== undefined) metaDesc.content = prevDesc
      if (ogTitle && prevOgTitle !== undefined) ogTitle.content = prevOgTitle
      if (ogDesc && prevOgDesc !== undefined) ogDesc.content = prevOgDesc
      if (ogImage && prevOgImage !== undefined) ogImage.content = prevOgImage
      if (twTitle && prevTwTitle !== undefined) twTitle.content = prevTwTitle
      script.remove()
    }
  }, [product.id, product.title, product.description, product.vendor, displayPrice, displayInStock, displaySku, reviewStats])

  return (
    <>
      <div className="min-h-screen bg-zinc-950 text-white">
      {/* Breadcrumb */}
      <div className="bg-zinc-900 border-b border-zinc-800 py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 text-sm text-zinc-400">
          <button onClick={onBack} className="hover:text-red-400 transition-colors">Home</button>
          <ChevronRight size={14} />
          <span className="hover:text-red-400 cursor-pointer transition-colors">{product.productType || 'Products'}</span>
          <ChevronRight size={14} />
          <span className="text-zinc-200 line-clamp-1">{product.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-colors mb-8 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div
              ref={zoomContainerRef}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl aspect-square flex items-center justify-center overflow-hidden mb-4 cursor-zoom-in relative"
              onClick={() => setLightBoxOpen(true)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = ((e.clientX - rect.left) / rect.width) * 100
                const y = ((e.clientY - rect.top) / rect.height) * 100
                setZoomPos({ x, y })
                setIsZooming(true)
              }}
              onMouseLeave={() => setIsZooming(false)}
            >
              {activeImage ? (
                <img
                  src={activeImage.src}
                  alt={activeImage.alt}
                  className="w-full h-full object-contain p-6 transition-transform duration-200 ease-out"
                  style={{
                    transform: isZooming ? 'scale(2.2)' : 'scale(1)',
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  }}
                />
              ) : (
                <span className="text-8xl text-zinc-600">🏎️</span>
              )}
              {activeImage && (
                <div className={`absolute bottom-3 right-3 bg-zinc-900/80 border border-zinc-700 rounded-lg px-2.5 py-1 text-[10px] text-zinc-400 font-medium transition-opacity ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
                  <span className="hidden md:inline">Hover to zoom · Click to expand</span>
                  <span className="md:hidden">Tap to expand</span>
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImgIdx(i)}
                    className={`flex-shrink-0 w-20 h-20 bg-zinc-900 border-2 rounded-xl overflow-hidden transition-all ${
                      activeImgIdx === i ? 'border-red-500' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <img src={img.src} alt={img.alt} className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lightbox */}
          {lightBoxOpen && activeImage && (
            <div
              className="fixed inset-0 z-[200] bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
              onClick={() => setLightBoxOpen(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setLightBoxOpen(false) }}
              tabIndex={0}
              ref={(el) => el?.focus()}
            >
              <button
                onClick={() => setLightBoxOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors z-[201]"
              >
                <X size={22} />
              </button>
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImgIdx((activeImgIdx - 1 + product.images.length) % product.images.length) }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-800/80 border border-zinc-700 text-white hover:bg-zinc-700 transition-colors z-[201]"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImgIdx((activeImgIdx + 1) % product.images.length) }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-800/80 border border-zinc-700 text-white hover:bg-zinc-700 transition-colors z-[201]"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              {product.images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-[201]">
                  {product.images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={(e) => { e.stopPropagation(); setActiveImgIdx(i) }}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImgIdx === i ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <img src={img.src} alt="" className="w-full h-full object-contain p-0.5 bg-zinc-800" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <p className="text-red-400 font-bold text-sm uppercase tracking-widest">{product.vendor}</p>
              <div className="relative">
                <button
                  onClick={() => setShareOpen(!shareOpen)}
                  className={`p-2 rounded-lg transition-colors ${shareOpen ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Share2 size={18} />
                </button>
                <ShareMenu product={product} isOpen={shareOpen} onClose={() => setShareOpen(false)} />
              </div>
            </div>
            <h1 className="text-3xl font-black text-white leading-tight mb-3">{product.title}</h1>
            <ProductMeta product={product} />

            {/* Social proof */}
            <div className="flex items-center gap-4 mt-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <div className="flex -space-x-1.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-red-400 to-orange-500 border border-zinc-900 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">⚡</span>
                    </div>
                  ))}
                </div>
                <span><span className="text-red-400 font-bold">{9 + (product.id % 7)}</span> people are viewing this</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-zinc-500">
                <Check size={14} className="text-emerald-400" />
                <span>Low stock — <span className="text-emerald-400 font-semibold">{7 + (product.id % 5)}</span> in cart</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 mb-5">
              <span className="text-4xl font-black text-white">${formatPrice(displayPrice)}</span>
              {displayCompareAt && displayCompareAt > displayPrice && (
                <>
                  <span className="text-zinc-500 text-xl line-through">${formatPrice(displayCompareAt)}</span>
                  <span className="bg-red-600/20 text-red-400 text-sm font-bold px-3 py-1 rounded-full border border-red-600/30">
                    SAVE ${(displayCompareAt - displayPrice).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            <p className="text-zinc-400 leading-relaxed mb-6">{product.description}</p>

            {/* SKU */}
            <p className="text-xs text-zinc-600 mb-5">SKU: <span className="text-zinc-400">{displaySku}</span></p>

            {/* Variant selectors */}
            {product.options.length > 0 && (() => {
              // Filter out "Default Title" when there are real variants
              const visibleOptions = product.options.map(opt => ({
                ...opt,
                values: opt.values.filter(v => {
                  if (v === 'Default Title' || v === 'Default') return opt.values.length > 1
                  return true
                }),
              })).filter(opt => opt.values.length > 0)

              if (visibleOptions.length === 0) return null

              return (
                <div className="space-y-4 mb-6">
                  {visibleOptions.map((opt) => (
                    <div key={opt.name}>
                      <p className="text-sm text-zinc-400 font-semibold mb-2">
                        {opt.name}: <span className="text-white">{selectedOptions[opt.name] ?? 'Select'}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {opt.values.map((val) => (
                          <button
                            key={val}
                            onClick={() => setSelectedOptions((prev) => ({ ...prev, [opt.name]: val }))}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                              selectedOptions[opt.name] === val
                                ? 'border-red-500 bg-red-600/20 text-white'
                                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Stock indicator */}
            <div className={`flex items-center gap-2 mb-6 text-sm font-semibold ${displayInStock ? 'text-emerald-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${displayInStock ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {displayInStock ? 'In Stock — Ships within 24 hours' : 'Out of Stock — Join Waitlist'}
            </div>

            {/* Vehicle Fitment Checker — only for universal-fit products */}
            {(() => {
              // Only show fitment checker for products that are truly universal
              const t = product.title.toLowerCase()
              const isUniversal = !t.includes('obd') && !t.includes('fuel saver') && !t.includes('ecoo')
                && !t.includes('tire chain') && !t.includes('tire inflator')
                && !t.includes('dash cam') && !t.includes('gps tracker')
                && !t.includes('mirror') && !t.includes('bumper guard')
                && !t.includes('heating cushion') && !t.includes('defogger')

              if (!isUniversal) return null

              return (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck size={16} className="text-red-400" />
                    <span className="text-white text-sm font-bold">Does this fit my car?</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={fitmentYear}
                      onChange={(e) => { setFitmentYear(e.target.value); setFitmentMake(''); setFitmentModel(''); setFitmentResult(null) }}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 appearance-none"
                    >
                      <option value="">Year</option>
                      {VEHICLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                      value={fitmentMake}
                      onChange={(e) => { setFitmentMake(e.target.value); setFitmentModel(''); setFitmentResult(null) }}
                      disabled={!fitmentYear}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 appearance-none disabled:opacity-40"
                    >
                      <option value="">Make</option>
                      {(VEHICLE_MAKES_BY_YEAR[fitmentYear] || VEHICLE_MAKES_ALL).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={fitmentModel}
                      onChange={(e) => { setFitmentModel(e.target.value); setFitmentResult(null) }}
                      disabled={!fitmentMake}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 appearance-none disabled:opacity-40"
                    >
                      <option value="">Model</option>
                      {(VEHICLE_MODELS_BY_MAKE[fitmentMake] || []).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {fitmentResult && (
                    <div className={`mt-3 flex items-center gap-2 text-sm font-semibold ${fitmentResult.fits ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fitmentResult.fits ? <Check size={14} /> : <X size={14} />}
                      {fitmentResult.fits
                        ? `Yes — this fits your ${fitmentYear} ${fitmentMake} ${fitmentModel}`
                        : `Not compatible — this product is not designed for ${fitmentYear} ${fitmentMake} ${fitmentModel}`
                      }
                    </div>
                  )}
                  {!fitmentResult && fitmentYear && fitmentMake && fitmentModel && (
                    <button
                      onClick={() => setFitmentResult({ fits: true })}
                      className="mt-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Check Fitment
                    </button>
                  )}
                </div>
              )
            })()}

            {displayInStock && (
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-5 py-2.5 bg-zinc-900 font-semibold min-w-[3rem] text-center">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-zinc-500 text-sm">Max 10 per order</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              {displayInStock ? (
                <>
                  <button
                    onClick={() => { addToCart(product, qty, matchedVariant?.id, displayPrice); setAddedToCart(product.id) }}
                    className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-base transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={18} />
                    {addedToCart === product.id ? '✓ Added!' : `Add to Cart — $${(displayPrice * qty).toFixed(2)}`}
                  </button>
                  <button
                    onClick={() => onToggleWishlist(product.id)}
                    className={`px-6 py-4 rounded-xl border-2 font-bold transition-colors ${isWishlisted ? 'border-red-500 bg-red-600/20 text-red-400' : 'border-zinc-700 hover:border-zinc-500 text-zinc-300'}`}
                  >
                    <Heart size={18} className={isWishlisted ? 'fill-red-500' : ''} />
                  </button>
                </>
              ) : waitlistSubmitted[product.id] ? (
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle size={20} className="text-emerald-400" />
                    <span className="text-emerald-400 font-bold text-base">You're on the list!</span>
                  </div>
                  <p className="text-emerald-300/70 text-sm">
                    We'll notify you at <span className="font-semibold text-emerald-300">{waitlistEmail}</span> as soon as it's back.
                  </p>
                  {waitlistCounts[product.id] !== undefined && (
                    <p className="text-zinc-500 text-xs mt-2">
                      <span className="text-zinc-400 font-bold">{waitlistCounts[product.id]}</span> people are waiting
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell size={18} className="text-amber-400" />
                    <span className="text-white font-bold text-sm">Get notified when back in stock</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={waitlistEmail}
                      onChange={(e) => { setWaitlistEmail(e.target.value); setWaitlistError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') joinWaitlist(product) }}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <button
                      onClick={() => joinWaitlist(product)}
                      disabled={waitlistLoading}
                      className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap"
                    >
                      {waitlistLoading ? 'Joining…' : 'Notify Me'}
                    </button>
                  </div>
                  {waitlistError && <p className="text-red-400 text-xs mt-2">{waitlistError}</p>}
                  <p className="text-zinc-600 text-xs mt-2">No spam — one email when it's available.</p>
                </div>
              )}
            </div>

            {/* Mini trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Truck, text: 'Free Shipping' },
                { icon: Shield, text: 'Fitment Guarantee' },
                { icon: RotateCcw, text: '2-Week Returns' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center text-center gap-1.5 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <Icon size={18} className="text-red-400" />
                  <span className="text-xs text-zinc-400 leading-tight">{text}</span>
                </div>
              ))}
            </div>

            {/* Vehicle Compatibility Checker */}
            <div className="mt-4">
              <VehicleChecker productTags={product.tags} productType={product.productType} productVendor={product.vendor} />
            </div>
          </div>
        </div>

        {/* Tabs: Specs / Fitment / Reviews */}
        <div className="mt-14">
          <div className="flex gap-0 border-b border-zinc-800 mb-8">
            {(['specs', 'fitment', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 font-semibold text-sm uppercase tracking-widest capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-red-500 text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'specs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Brand', value: product.vendor },
                { label: 'Product Type', value: product.productType || 'Automotive Part' },
                { label: 'SKU', value: displaySku },
                ...product.options.map((o) => ({ label: o.name, value: selectedOptions[o.name] ?? o.values.join(' / ') })),
                { label: 'Weight', value: matchedVariant?.weight ? `${matchedVariant.weight} ${matchedVariant.weightUnit}` : 'N/A' },
                ...(product.tags.length > 0 ? [{ label: 'Tags', value: product.tags.join(', ') }] : []),
              ].filter((s) => s.value && s.value !== 'N/A').map((s) => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-white font-bold text-lg">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'fitment' && (
            <div className="max-w-xl">
              <p className="text-zinc-400 mb-5 text-sm">This product is confirmed to fit the following vehicles. For custom fitment, contact our tech team.</p>
              <ul className="space-y-3">
                {(product.tags.length > 0 ? product.tags : ['Universal Fit']).map((f) => (
                  <li key={f} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
                    <Check size={16} className="text-emerald-400 shrink-0" />
                    <span className="text-white text-sm font-medium">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-3xl">
              {/* Rating Summary */}
              {reviewStats && reviewStats.count > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-4xl font-black text-white">{reviewStats.average}</p>
                      <div className="flex gap-0.5 mt-1 justify-center">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={14} className={s <= Math.round(reviewStats.average) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'} />
                        ))}
                      </div>
                      <p className="text-zinc-500 text-xs mt-1">{reviewStats.count} review{reviewStats.count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = reviewStats.distribution[star - 1]
                        const pct = reviewStats.count > 0 ? (count / reviewStats.count) * 100 : 0
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="text-zinc-500 w-3 text-right">{star}</span>
                            <Star size={11} className="text-yellow-400 fill-yellow-400" />
                            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-zinc-600 w-6 text-right">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Write a Review Button */}
              {!showReviewForm && !reviewSuccess && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="mb-6 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors"
                >
                  <Star size={16} /> Write a Review
                </button>
              )}

              {/* Review Form */}
              {showReviewForm && !reviewSuccess && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
                  <h3 className="text-white font-bold text-base mb-4">Write a Review</h3>
                  {reviewError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-sm">{reviewError}</p>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button
                            key={s}
                            onClick={() => setReviewRating(s)}
                            onMouseEnter={() => setReviewHoverRating(s)}
                            onMouseLeave={() => setReviewHoverRating(0)}
                            className="p-0.5 transition-transform hover:scale-110"
                          >
                            <Star
                              size={24}
                              className={
                                s <= (reviewHoverRating || reviewRating)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-zinc-600 hover:text-zinc-500'
                              }
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Your Name</label>
                      <input
                        type="text"
                        placeholder="Display name"
                        value={reviewName}
                        onChange={e => setReviewName(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Email (optional)</label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={reviewEmail}
                        onChange={e => setReviewEmail(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Review Title (optional)</label>
                      <input
                        type="text"
                        placeholder="Summarize your experience"
                        value={reviewTitle}
                        onChange={e => setReviewTitle(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Your Review</label>
                      <textarea
                        rows={4}
                        placeholder="Tell others what you liked (or didn't)..."
                        value={reviewBody}
                        onChange={e => setReviewBody(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          if (!reviewRating) { setReviewError('Please select a rating'); return }
                          if (!reviewName.trim()) { setReviewError('Please enter your name'); return }
                          setReviewError('')
                          setReviewSubmitting(true)
                          try {
                            const res = await fetch(`/api/reviews/product/${product.id}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                rating: reviewRating,
                                displayName: reviewName.trim(),
                                email: reviewEmail.trim() || undefined,
                                title: reviewTitle.trim() || undefined,
                                body: reviewBody.trim(),
                              }),
                            })
                            const data = await res.json()
                            if (!res.ok) { setReviewError(data.error ?? 'Failed to submit'); return }
                            setReviewSuccess(true)
                            setShowReviewForm(false)
                            setReviewStats(null)
                            setTimeout(() => setActiveTab('reviews'), 500)
                          } catch {
                            setReviewError('Network error — please try again')
                          } finally {
                            setReviewSubmitting(false)
                          }
                        }}
                        disabled={reviewSubmitting}
                        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors flex items-center gap-2"
                      >
                        {reviewSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Review'}
                      </button>
                      <button
                        onClick={() => { setShowReviewForm(false); setReviewError('') }}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {reviewSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6 text-center">
                  <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 font-bold text-sm">Thanks for your review!</p>
                  <p className="text-emerald-300/60 text-xs mt-1">Your review has been submitted and is now visible below.</p>
                  <button
                    onClick={() => { setReviewSuccess(false); setReviewRating(0); setReviewTitle(''); setReviewBody(''); setReviewName(''); setReviewEmail('') }}
                    className="mt-3 text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
                  >
                    Write another review
                  </button>
                </div>
              )}

              {/* Reviews List */}
              {reviewLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={24} className="text-red-500 animate-spin" />
                </div>
              ) : reviewStats && reviewStats.reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviewStats.reviews.map((r) => (
                    <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-900/40 border border-red-800/50 flex items-center justify-center text-xs font-bold text-red-300">
                            {r.displayName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">{r.displayName}</span>
                              {r.verified && (
                                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20 uppercase">Verified Purchase</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-zinc-600 text-xs">
                          {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex mb-2">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={13} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'} />
                        ))}
                      </div>
                      {r.title && <p className="text-white font-semibold text-sm mb-1">{r.title}</p>}
                      {r.body && <p className="text-zinc-400 text-sm leading-relaxed">{r.body}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
                  <Star size={32} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm font-medium">No reviews yet</p>
                  <p className="text-zinc-600 text-xs mt-1">Be the first to review this product</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related Products */}
        {(() => {
          const related = allProducts
            .filter((p) => p.id !== product.id && (p.productType === product.productType || p.tags.some((t) => product.tags.includes(t))))
            .slice(0, 4)
          if (related.length === 0) return null
          return (
            <div className="mt-12">
              <h2 className="text-2xl font-black text-white mb-6">You May Also Like</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {related.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onViewProduct(p)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-red-600/50 transition-all text-left group"
                  >
                    <div className="h-40 bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {p.images[0] ? (
                        <img src={p.images[0].src} alt={p.images[0].alt} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <span className="text-4xl text-zinc-600">🏎️</span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">{p.vendor}</p>
                      <p className="text-white text-sm font-medium line-clamp-2 group-hover:text-red-100 transition-colors">{p.title}</p>
                      <p className="text-white font-bold text-lg mt-2">${formatPrice(p.minPrice)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Frequently Bought Together */}
        {(() => {
          const related = allProducts
            .filter((p) => p.id !== product.id && p.minPrice < 40 && p.inStock)
            .sort((a, b) => (a.id * 31 + b.id * 7) % 11 - 5)
            .slice(0, 2)
          if (related.length === 0 || !displayInStock) return null
          const bundleTotal = displayPrice + related.reduce((s, p) => s + p.minPrice, 0)
          const bundleSave = Math.round(bundleTotal * 0.1)
          return (
            <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-white font-bold text-lg mb-4">Frequently Bought Together</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {product.images[0] ? <img src={product.images[0].src} alt="" className="w-full h-full object-contain p-1" /> : <span className="text-xl">🏎️</span>}
                  </div>
                  <span className="text-zinc-500 text-lg font-bold">+</span>
                  {related.map((p) => (
                    <div key={p.id} className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {p.images[0] ? <img src={p.images[0].src} alt="" className="w-full h-full object-contain p-1" /> : <span className="text-xl">🏎️</span>}
                    </div>
                  ))}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 line-through text-sm">${bundleTotal.toFixed(2)}</span>
                    <span className="text-white font-black text-xl">${(bundleTotal - bundleSave).toFixed(2)}</span>
                  </div>
                  <p className="text-emerald-400 text-xs font-semibold mt-0.5">Save ${bundleSave.toFixed(2)} with bundle</p>
                  <button
                    onClick={() => {
                      addToCart(product, 1, matchedVariant?.id, displayPrice)
                      related.forEach((p) => addToCart(p, 1))
                    }}
                    className="mt-2 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Add Bundle to Cart
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Out of Stock ETA */}
        {!displayInStock && (
          <div className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Bell size={20} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-amber-400 font-bold text-sm">Expected Restock: 2–4 Weeks</p>
                <p className="text-amber-300/60 text-xs mt-1">This item is currently being restocked. Join the waitlist above to get notified the moment it's available again.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    </>
  )
}

// ─── Main Store Component ─────────────────────────────────────────────────────

export default function DriveKitStore() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const trackRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id)
      return [product, ...filtered].slice(0, 10)
    })
  }, [])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [siteContent, setSiteContent] = useState<Record<string, string>>({})
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false)
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [newsletterError, setNewsletterError] = useState('')
  const [mobileExpandedNav, setMobileExpandedNav] = useState<string | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string | null; role: string } | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authEmailOptIn, setAuthEmailOptIn] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [signupStep, setSignupStep] = useState<1 | 2>(1)
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSentTo, setCodeSentTo] = useState('')
  const [currentView, setCurrentView] = useState<'home' | 'products' | 'order-tracking' | 'contact' | 'returns' | 'checkout' | 'admin' | 'my-orders' | 'terms' | 'privacy' | 'sitemap' | 'order-confirmation' | 'faq' | 'not-found'>('home')
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<{ product: Product; quantity: number; variantId?: number; variantPrice?: number }[]>(() => {
    try {
      const saved = localStorage.getItem('drivekit_cart')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; label: string } | null>(null)
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [checkoutFirstName, setCheckoutFirstName] = useState('')
  const [checkoutLastName, setCheckoutLastName] = useState('')
  const [checkoutEmail, setCheckoutEmail] = useState('')
  const [checkoutAddress, setCheckoutAddress] = useState('')
  const [checkoutCity, setCheckoutCity] = useState('')
  const [checkoutState, setCheckoutState] = useState('')
  const [checkoutZip, setCheckoutZip] = useState('')
  const [checkoutPhone, setCheckoutPhone] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistSubmitted, setWaitlistSubmitted] = useState<Record<string, boolean>>({})
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>({})
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistError, setWaitlistError] = useState('')
  const [wishlistedIds, setWishlistedIds] = useState<Set<number>>(new Set())
  const [trackOrderNum, setTrackOrderNum] = useState('')
  const [trackEmail, setTrackEmail] = useState('')
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState('')
  const [trackResult, setTrackResult] = useState<any>(null)
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'newest' | 'best-selling' | 'rating'>('default')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200])
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [vendorFilter, setVendorFilter] = useState<string | null>(null)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [ratingFilter, setRatingFilter] = useState<number>(0)
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('drivekit_recently_viewed')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [searchFocused, setSearchFocused] = useState(false)
  const [comparedIds, setComparedIds] = useState<Set<number>>(new Set())
  const [showComparison, setShowComparison] = useState(false)

  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactSubject, setContactSubject] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactSending, setContactSending] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const [contactError, setContactError] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [miniCartOpen, setMiniCartOpen] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allReviewStats, setAllReviewStats] = useState<Record<string, { average: number; count: number }>>({})

  useEffect(() => {
    let cancelled = false
    async function fetchProducts() {
      try {
        const res = await fetch('/api/shopify/products')
        const body = await res.json().catch(() => ({}))
        if (!res.ok) { setError(body.error ?? `HTTP ${res.status}`); return }
        if (!cancelled) setProducts(body.products ?? [])
      } catch (e) {
        if (!cancelled) setError('Failed to load products')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchProducts()

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    fetch('/api/reviews/stats/all')
      .then(r => r.json())
      .then(data => { if (data.stats) setAllReviewStats(data.stats) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const path = window.location.pathname.split('/').filter(Boolean).join('/').toLowerCase()
    const knownViews = ['products', 'checkout', 'order-tracking', 'contact', 'returns', 'admin', 'my-orders', 'terms', 'privacy', 'sitemap', 'faq'] as const
    if (path.startsWith('product/') && products.length > 0) {
      const slug = path.replace('product/', '')
      const found = products.find(p => p.handle === slug || String(p.id) === slug)
      if (found) { setSelectedProduct(found); setCurrentView('home') }
      else setCurrentView('not-found')
    } else if (path && !knownViews.some((v) => path.startsWith(v)) && !/^\d+$/.test(path)) {
      setCurrentView('not-found')
    }
    const onPop = () => {
      const p = window.location.pathname.split('/').filter(Boolean).join('/').toLowerCase()
      if (p.startsWith('product/')) {
        const slug = p.replace('product/', '')
        const found = products.find(pr => pr.handle === slug || String(pr.id) === slug)
        if (found) { setSelectedProduct(found); setCurrentView('home') }
      } else if (p === '' || p === '/') {
        setSelectedProduct(null); setCurrentView('home')
      } else if (['products','checkout','order-tracking','contact','returns','admin','my-orders','terms','privacy','sitemap','faq'].some(v => p.startsWith(v))) {
        setSelectedProduct(null); setCurrentView(p.replace(/-/g, '-') as any)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [products])
  const toggleWishlist = useCallback((productId: number) => {
    setWishlistedIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }, [])

  const authHeaders = authToken ? { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' } : {}
  const toggleCompare = useCallback((productId: number) => {
    setComparedIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        if (next.size >= 4) return prev
        next.add(productId)
      }
      return next
    })
  }, [])


  useEffect(() => {
    const savedToken = localStorage.getItem('drivekit_token')
    const savedUser = localStorage.getItem('drivekit_user')
    if (savedToken && savedUser) {
      try {
        setAuthToken(savedToken)
        setCurrentUser(JSON.parse(savedUser))
      } catch { localStorage.removeItem('drivekit_token'); localStorage.removeItem('drivekit_user') }
    }
  }, [])

  useEffect(() => {
    if (selectedProduct) trackRecentlyViewed(selectedProduct)
  }, [selectedProduct])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedProduct) {
      window.history.pushState({}, '', `/product/${selectedProduct.handle || selectedProduct.id}`)
    } else if (currentView === 'home') {
      window.history.pushState({}, '', '/')
    } else if (currentView === 'products') {
      window.history.pushState({}, '', '/products')
    } else {
      window.history.pushState({}, '', `/${currentView.replace(/-/g, '-')}`)
    }
  }, [selectedProduct?.id, currentView])

  useEffect(() => {
    try { localStorage.setItem('drivekit_recently_viewed', JSON.stringify(recentlyViewed)) } catch {}
  }, [recentlyViewed])

  const resetAuthForm = () => { setAuthEmail(''); setAuthPassword(''); setAuthName(''); setAuthEmailOptIn(true); setAuthError(''); setSignupStep(1); setVerificationCode(''); setCodeSentTo('') }

  const handleNewsletterSubscribe = async () => {
    if (!newsletterEmail.includes('@')) return
    setNewsletterLoading(true)
    setNewsletterError('')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setNewsletterError(data.error || 'Failed to subscribe'); return }
      setNewsletterSubmitted(true)
    } catch {
      setNewsletterError('Network error. Please try again.')
    } finally {
      setNewsletterLoading(false)
    }
  }

  const handleSignIn = async () => {
    setAuthLoading(true); setAuthError('')
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setAuthError(data.error || 'Sign in failed'); return }
      setAuthToken(data.token); setCurrentUser(data.user)
      localStorage.setItem('drivekit_token', data.token)
      localStorage.setItem('drivekit_user', JSON.stringify(data.user))
      setSignInOpen(false); resetAuthForm()
    } catch { setAuthError('Network error. Please try again.') }
    finally { setAuthLoading(false) }
  }

  const handleSignUp = async () => {
    setAuthLoading(true); setAuthError('')
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword, name: authName || undefined, emailOptIn: authEmailOptIn }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setAuthError(data.error || 'Failed to send verification code'); return }
      setCodeSentTo(data.email || authEmail)
      setSignupStep(2)
    } catch { setAuthError('Network error. Please try again.') }
    finally { setAuthLoading(false) }
  }

  const handleConfirmSignup = async () => {
    setAuthLoading(true); setAuthError('')
    try {
      const res = await fetch('/api/auth/confirm-signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, code: verificationCode }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setAuthError(data.error || 'Verification failed'); return }
      setAuthToken(data.token); setCurrentUser(data.user)
      localStorage.setItem('drivekit_token', data.token)
      localStorage.setItem('drivekit_user', JSON.stringify(data.user))
      setSignUpOpen(false); resetAuthForm()
    } catch { setAuthError('Network error. Please try again.') }
    finally { setAuthLoading(false) }
  }

  const handleSignOut = async () => {
    if (authToken) {
      try { await fetch('/api/auth/signout', { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } }) } catch {}
    }
    setCurrentUser(null); setAuthToken(null)
    localStorage.removeItem('drivekit_token'); localStorage.removeItem('drivekit_user')
  }

  const FREE_SHIPPING_THRESHOLD = 99
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const getCartItemPrice = (item: { product: Product; variantPrice?: number }) => item.variantPrice ?? item.product.minPrice
  const cartTotal = cartItems.reduce((sum, item) => sum + getCartItemPrice(item) * item.quantity, 0)
  const freeShippingProgress = Math.min(cartTotal / FREE_SHIPPING_THRESHOLD, 1)
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - cartTotal, 0)

  const addToCart = useCallback((product: Product, quantity: number = 1, variantId?: number, variantPrice?: number) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.variantId === variantId)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.variantId === variantId
            ? { ...item, quantity: Math.min(item.quantity + quantity, 10) }
            : item
        )
      }
      return [...prev, { product, quantity: Math.min(quantity, 10), variantId, variantPrice }]
    })
  }, [])

  const removeFromCart = useCallback((productId: number, variantId?: number) => {
    setCartItems((prev) => prev.filter((item) =>
      variantId !== undefined && item.variantId !== undefined
        ? !(item.product.id === productId && item.variantId === variantId)
        : item.product.id !== productId
    ))
  }, [])

  const updateCartQuantity = useCallback((productId: number, quantity: number, variantId?: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) =>
        variantId !== undefined && item.variantId !== undefined
          ? !(item.product.id === productId && item.variantId === variantId)
          : item.product.id !== productId
      ))
      return
    }
    setCartItems((prev) =>
      prev.map((item) =>
        (item.product.id === productId && (variantId === undefined || item.variantId === variantId))
          ? { ...item, quantity: Math.min(quantity, 10) }
          : item
      )
    )
  }, [])

  const joinWaitlist = useCallback(async (product: Product) => {
    const email = waitlistEmail.trim()
    if (!email) { setWaitlistError('Please enter your email'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setWaitlistError('Invalid email address'); return }
    setWaitlistLoading(true)
    setWaitlistError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), productId: String(product.id), productTitle: product.title }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { setWaitlistError(body.error ?? `Failed (${res.status})`); return }
      setWaitlistSubmitted((prev) => ({ ...prev, [product.id]: true }))
      setWaitlistCounts((prev) => ({ ...prev, [product.id]: body.waitlistCount ?? 0 }))
    } catch {
      setWaitlistError('Network error — please try again')
    } finally {
      setWaitlistLoading(false)
    }
  }, [waitlistEmail])

  useEffect(() => {
    if (products.length === 0) return
    const productIds = new Set(products.map(p => p.id))
    setRecentlyViewed(prev => {
      const filtered = prev.filter(p => productIds.has(p.id))
      return filtered.length === prev.length ? prev : filtered
    })
  }, [products])

  useEffect(() => { setCurrentPage(1) }, [searchQuery, activeCategory, priceRange, vendorFilter, inStockOnly, ratingFilter])

  useEffect(() => {
    if (currentView === 'checkout' && currentUser && !checkoutEmail) {
      const parts = (currentUser.name || '').split(' ')
      if (parts.length >= 1 && !checkoutFirstName) setCheckoutFirstName(parts[0])
      if (parts.length >= 2 && !checkoutLastName) setCheckoutLastName(parts.slice(1).join(' '))
      if (!checkoutEmail) setCheckoutEmail(currentUser.email)
    }
  }, [currentView, currentUser])

  useEffect(() => {
    try { localStorage.setItem('drivekit_cart', JSON.stringify(cartItems)) } catch {}
  }, [cartItems])


  useEffect(() => {
    fetch('/api/site-content').then(r => r.json()).then(d => {
      if (d.content) setSiteContent(d.content)
    }).catch(() => {})
  }, [])

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => !p.hidden)
    if (activeCategory === 'Trending Now') list = [...list].sort((a, b) => (a.id * 13 + b.id * 17) % 7 - 3).slice(0, 12)
    else if (activeCategory === 'Best Sellers') list = [...list].sort((a, b) => { const aInv = a.variants.reduce((s, v) => s + v.inventoryQuantity, 0); const bInv = b.variants.reduce((s, v) => s + v.inventoryQuantity, 0); if (aInv !== bInv) return bInv - aInv; return (allReviewStats[String(b.id)]?.count ?? 0) - (allReviewStats[String(a.id)]?.count ?? 0) }).slice(0, 15)
    else if (activeCategory === 'Top Rated') list = [...list].filter(p => p.inStock).sort((a, b) => { const aStats = allReviewStats[String(a.id)] ?? { average: 0, count: 0 }; const bStats = allReviewStats[String(b.id)] ?? { average: 0, count: 0 }; if (aStats.average !== bStats.average) return bStats.average - aStats.average; return bStats.count - aStats.count }).slice(0, 12)
    else if (activeCategory === 'New Arrivals') list = [...list].sort((a, b) => b.id - a.id).slice(0, 12)
    else if (activeCategory === 'Deals') list = list.filter((p) => {
      const compareAt = getCompareAtPrice(p.variants)
      return compareAt !== null && compareAt > p.minPrice
    })
    else if (activeCategory) {
      const catLower = activeCategory.toLowerCase()
      const subCatItems = NAV_CATEGORIES.find((c) => c.label === activeCategory)?.items ?? []
      list = list.filter((p) => {
        const haystack = [
          p.title,
          p.vendor,
          p.description,
          p.productType || '',
          ...p.tags,
        ].join(' ').toLowerCase()
        if (haystack.includes(catLower)) return true
        return subCatItems.some((item) => haystack.includes(item.toLowerCase()))
      })
    }
    list = list.filter((p) => p.minPrice >= priceRange[0] && p.minPrice <= priceRange[1])
    if (vendorFilter) list = list.filter((p) => p.vendor === vendorFilter)
    if (inStockOnly) list = list.filter((p) => p.inStock)
    if (ratingFilter > 0) list = list.filter((p) => { const stats = allReviewStats[String(p.id)]; return stats ? stats.average >= ratingFilter : false })
    if (sortBy === 'price-asc') list = [...list].sort((a, b) => a.minPrice - b.minPrice)
    else if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.minPrice - a.minPrice)
    else if (sortBy === 'newest') list = [...list].reverse()
    else if (sortBy === 'best-selling') list = [...list].sort((a, b) => b.variants.reduce((s, v) => s + v.inventoryQuantity, 0) - a.variants.reduce((s, v) => s + v.inventoryQuantity, 0))
    const q = (searchQuery || '').toLowerCase().trim()
    if (!q) return list
    const words = q.split(/\s+/)
    return list.filter(
      (p) => {
        const haystack = [
          p.title,
          p.vendor,
          p.description,
          p.productType || '',
          ...p.tags,
        ].join(' ').toLowerCase()
        return words.every((w) => haystack.includes(w)) || fuzzyMatch(q, haystack)
      }
    )
  }, [products, activeCategory, allReviewStats, priceRange, vendorFilter, inStockOnly, ratingFilter, sortBy, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE))
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE)
  const allVendors = useMemo(() => {
    const vendorSet = new Set<string>()
    products.forEach((p) => { if (p.vendor) vendorSet.add(p.vendor) })
    return [...vendorSet].sort()
  }, [products])

  const searchSuggestions = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim()
    if (!q || q.length < 2) return []
    const words = q.split(/\s+/)
    const matches = products.filter((p) => {
      if (p.hidden) return false
      const haystack = [p.title, p.vendor, p.productType || '', ...p.tags].join(' ').toLowerCase()
      return words.every((w) => haystack.includes(w)) || fuzzyMatch(q, haystack)
    })
    return matches.slice(0, 8)
  }, [searchQuery, products])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [selectedProduct?.id])

  if (selectedProduct) {
    return <>
      <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} addToCart={addToCart} onCheckout={() => { setSelectedProduct(null); setCurrentView('checkout') }} waitlistSubmitted={waitlistSubmitted} waitlistEmail={waitlistEmail} setWaitlistEmail={setWaitlistEmail} waitlistError={waitlistError} setWaitlistError={setWaitlistError} waitlistLoading={waitlistLoading} waitlistCounts={waitlistCounts} joinWaitlist={joinWaitlist} isWishlisted={wishlistedIds.has(selectedProduct.id)} onToggleWishlist={toggleWishlist} allProducts={products} onViewProduct={(p) => setSelectedProduct(p)} />
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-[80] w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 flex items-center justify-center transition-all duration-300 hover:scale-110"
          aria-label="Back to top"
        >
          <ChevronLeft size={20} className="rotate-90" />
        </button>
      )}
    </>
  }

  if (currentView === 'order-tracking') {
    const TRACKING_STEPS = [
      { key: 'pending', label: 'Order Placed', icon: Package },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
      { key: 'processing', label: 'Processing', icon: Package },
      { key: 'shipped', label: 'Shipped', icon: Truck },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle },
    ]

    const handleTrackOrder = async () => {
      if (!trackOrderNum.trim() || !trackEmail.trim()) {
        setTrackError('Please enter both order number and email.')
        return
      }
      setTrackLoading(true)
      setTrackError('')
      setTrackResult(null)
      try {
        const params = new URLSearchParams({ order_number: trackOrderNum.trim(), email: trackEmail.trim() })
        const res = await fetch(`/api/track-order?${params}`)
        const data = await res.json()
        if (!res.ok) {
          setTrackError(data.error ?? 'Order not found.')
          return
        }
        setTrackResult(data.order)
      } catch {
        setTrackError('Network error — please try again.')
      } finally {
        setTrackLoading(false)
      }
    }

    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans">
        <div className="bg-red-600 text-white text-xs font-semibold text-center py-2 tracking-wide">
          🚚 FREE SHIPPING on orders over $99 · Use code <span className="underline cursor-pointer">DRIVE20</span> for 20% off your first order
        </div>
        <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16 gap-4">
              <button onClick={() => setCurrentView('home')} className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center"><Gauge size={20} className="text-white" /></div>
                <span className="text-xl font-black tracking-tight">DRIVE<span className="text-red-500">KIT</span></span>
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('home')} className="text-sm text-zinc-400 hover:text-white transition-colors">Home</button>
                <button onClick={() => setCurrentView('products')} className="text-sm text-zinc-400 hover:text-white transition-colors">Shop</button>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-20">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
            <button onClick={() => setCurrentView('home')} className="hover:text-red-400 transition-colors">Home</button>
            <ChevronRight size={14} />
            <span className="text-zinc-200">Order Tracking</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Truck size={28} className="text-red-400" />
              <h1 className="text-3xl font-black text-white">Track Your Order</h1>
            </div>
            <p className="text-zinc-400 text-sm mb-8">Enter your order number and email to see real-time shipping updates.</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Order Number</label>
                <input
                  type="text"
                  placeholder="e.g. #1001"
                  value={trackOrderNum}
                  onChange={(e) => { setTrackOrderNum(e.target.value); setTrackError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrackOrder()}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Email Address</label>
                <input
                  type="email"
                  placeholder="The email used for your order"
                  value={trackEmail}
                  onChange={(e) => { setTrackEmail(e.target.value); setTrackError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrackOrder()}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <button
                onClick={handleTrackOrder}
                disabled={trackLoading}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {trackLoading ? <><Loader2 size={16} className="animate-spin" /> Looking up...</> : 'Track Order'}
              </button>
            </div>
            {trackError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{trackError}</p>
              </div>
            )}
            {trackResult && (
              <div className="mt-6 border-t border-zinc-800 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold">{trackResult.orderNumber}</p>
                    <p className="text-xs text-zinc-500">{new Date(trackResult.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    trackResult.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                    trackResult.status === 'shipped' ? 'bg-cyan-500/10 text-cyan-400' :
                    trackResult.status === 'cancelled' || trackResult.status === 'refunded' ? 'bg-red-500/10 text-red-400' :
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {trackResult.status.charAt(0).toUpperCase() + trackResult.status.slice(1)}
                  </span>
                </div>

                {!trackResult.isCancelled ? (
                  <div className="flex items-center justify-between mb-6 relative">
                    {TRACKING_STEPS.map((step, idx) => {
                      const completed = trackResult.trackingSteps?.[idx]?.completed
                      const isCurrent = completed && (idx === TRACKING_STEPS.length - 1 || !trackResult.trackingSteps?.[idx + 1]?.completed)
                      return (
                        <div key={step.key} className="flex flex-col items-center flex-1 relative">
                          {idx > 0 && (
                            <div className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${completed ? 'bg-red-500' : 'bg-zinc-800'}`} />
                          )}
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                            completed ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-600'
                          } ${isCurrent ? 'ring-2 ring-red-500/50 ring-offset-2 ring-offset-zinc-900' : ''}`}>
                            <step.icon size={14} />
                          </div>
                          <p className={`text-[10px] mt-2 text-center font-medium ${completed ? 'text-zinc-300' : 'text-zinc-600'}`}>
                            {step.label}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mb-6 flex items-center gap-2 p-3 bg-red-500/10 rounded-xl">
                    <XCircle size={16} className="text-red-400" />
                    <span className="text-sm text-red-400 font-medium">This order has been {trackResult.status}</span>
                  </div>
                )}

                <div className="space-y-2 mb-3">
                  {trackResult.items?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{item.title}{item.variantTitle && item.variantTitle !== 'Default Title' ? ` / ${item.variantTitle}` : ''} × {item.quantity}</span>
                      <span className="text-zinc-300 font-medium">${item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-800 pt-3 mt-3 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>${trackResult.total.toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <p className="text-zinc-500 text-sm mb-3">Need help?</p>
              <p className="text-zinc-400 text-sm">Email us at <button onClick={() => setCurrentView('contact')} className="text-red-400 hover:text-red-300 transition-colors">support.drivekit@gmail.com</button> with your order details.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'contact') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans">
        <div className="bg-red-600 text-white text-xs font-semibold text-center py-2 tracking-wide">
          🚚 FREE SHIPPING on orders over $99 · Use code <span className="underline cursor-pointer">DRIVE20</span> for 20% off your first order
        </div>
        <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16 gap-4">
              <button onClick={() => setCurrentView('home')} className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center"><Gauge size={20} className="text-white" /></div>
                <span className="text-xl font-black tracking-tight">DRIVE<span className="text-red-500">KIT</span></span>
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('home')} className="text-sm text-zinc-400 hover:text-white transition-colors">Home</button>
                <button onClick={() => setCurrentView('products')} className="text-sm text-zinc-400 hover:text-white transition-colors">Shop</button>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-20">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
            <button onClick={() => setCurrentView('home')} className="hover:text-red-400 transition-colors">Home</button>
            <ChevronRight size={14} />
            <span className="text-zinc-200">Contact Us</span>
          </div>
          <div className="text-center mb-12">
            <Mail size={32} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-3xl font-black text-white mb-3">Get in Touch</h1>
            <p className="text-zinc-400 text-sm">Have a question about an order, a product, or just want to say hi? We'd love to hear from you.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            {[
              { icon: Mail, title: 'Email', value: 'support.drivekit@gmail.com', href: 'mailto:support.drivekit@gmail.com', desc: 'We reply within 24 hours' },
              { icon: MapPin, title: 'Location', value: 'United States', href: null, desc: 'Ships nationwide' },
            ].map(({ icon: Icon, title, value, href, desc }) => (
              <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                <Icon size={22} className="text-red-400 mx-auto mb-3" />
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">{title}</p>
                {href ? (
                  <a href={href} className="text-white font-bold hover:text-red-400 transition-colors">{value}</a>
                ) : (
                  <p className="text-white font-bold">{value}</p>
                )}
                <p className="text-zinc-500 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-xl font-black text-white mb-6">Send Us a Message</h2>
            {contactSent ? (
              <div className="text-center py-8">
                <CheckCircle size={40} className="text-emerald-400 mx-auto mb-4" />
                <p className="text-emerald-400 font-bold text-lg mb-2">Message sent!</p>
                <p className="text-zinc-400 text-sm">We'll get back to you within 24 hours.</p>
                <button onClick={() => { setContactSent(false); setContactName(''); setContactEmail(''); setContactSubject(''); setContactMessage('') }} className="mt-4 text-red-400 hover:text-red-300 text-sm font-semibold">Send another message</button>
              </div>
            ) : (
              <div className="space-y-4">
                {contactError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-red-400 text-sm">{contactError}</p></div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Name</label>
                    <input type="text" placeholder="Your name" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Email</label>
                    <input type="email" placeholder="your@email.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Subject</label>
                  <input type="text" placeholder="How can we help?" value={contactSubject} onChange={(e) => setContactSubject(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Message</label>
                  <textarea rows={4} placeholder="Tell us more..." value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-none" />
                </div>
                <button
                  onClick={async () => {
                    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) { setContactError('Name, email, and message are required.'); return }
                    setContactError(''); setContactSending(true)
                    try {
                      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: contactName.trim(), email: contactEmail.trim(), subject: contactSubject.trim(), message: contactMessage.trim() }) })
                      const data = await res.json().catch(() => ({}))
                      if (!res.ok) { setContactError(data.error ?? 'Failed to send message.'); return }
                      setContactSent(true)
                    } catch { setContactError('Network error — please try again.') } finally { setContactSending(false) }
                  }}
                  disabled={contactSending}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {contactSending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send Message'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'returns') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans">
        <div className="bg-red-600 text-white text-xs font-semibold text-center py-2 tracking-wide">
          🚚 FREE SHIPPING on orders over $99 · Use code <span className="underline cursor-pointer">DRIVE20</span> for 20% off your first order
        </div>
        <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16 gap-4">
              <button onClick={() => setCurrentView('home')} className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center"><Gauge size={20} className="text-white" /></div>
                <span className="text-xl font-black tracking-tight">DRIVE<span className="text-red-500">KIT</span></span>
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('home')} className="text-sm text-zinc-400 hover:text-white transition-colors">Home</button>
                <button onClick={() => setCurrentView('products')} className="text-sm text-zinc-400 hover:text-white transition-colors">Shop</button>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-20">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
            <button onClick={() => setCurrentView('home')} className="hover:text-red-400 transition-colors">Home</button>
            <ChevronRight size={14} />
            <span className="text-zinc-200">Returns & Refunds</span>
          </div>
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <RotateCcw size={28} className="text-red-400" />
              <h1 className="text-3xl font-black text-white">Returns & Refunds</h1>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">We want you to love your purchase. If something isn't right, we've made returns simple.</p>
          </div>
          <div className="space-y-6">
            {[
              { title: '2-Week Return Window', desc: 'You have 14 days from the delivery date to initiate a return. Items must be unused, in their original packaging, and in resellable condition.' },
              { title: 'How to Start a Return', desc: 'Email support.drivekit@gmail.com with your order number and the item(s) you would like to return. We will send you a prepaid return label within 24 hours.' },
              { title: 'Fitment Guarantee', desc: 'If a part does not fit your vehicle, we will replace it or give you a full refund -- no restocking fee, no hassle. Just send us a photo and we will take care of it.' },
              { title: 'Refund Timeline', desc: 'Once we receive your return, we inspect it within 2 business days. Refunds are issued to your original payment method within 5-7 business days.' },
              { title: 'Exchanges', desc: 'Need a different size, color, or variant? Let us know in your return email and we will ship the replacement as soon as the return is in transit.' },
              { title: 'Non-Returnable Items', desc: 'Custom-painted items, special-order parts, and clearance items marked "Final Sale" cannot be returned unless defective.' },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <p className="text-zinc-400 text-sm mb-3">Still have questions about returns?</p>
            <button
              onClick={() => setCurrentView('contact')}
              className="text-red-400 hover:text-red-300 font-bold text-sm transition-colors"
            >
              Contact Our Team →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'checkout') {
    const shippingCost = cartTotal >= 99 || (appliedPromo?.code === 'FREEBIE') ? 0 : 9.99
    const discountAmount = appliedPromo ? cartTotal * appliedPromo.discount : 0
    const discountedSubtotal = cartTotal - discountAmount
    const tax = discountedSubtotal * 0.08
    const orderTotal = discountedSubtotal + shippingCost + tax
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans">
        <div className="bg-red-600 text-white text-xs font-semibold text-center py-2 tracking-wide">
          🚚 FREE SHIPPING on orders over $99 · Use code <span className="underline cursor-pointer">DRIVE20</span> for 20% off your first order
        </div>
        <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16 gap-4">
              <button onClick={() => setCurrentView('home')} className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center"><Gauge size={20} className="text-white" /></div>
                <span className="text-xl font-black tracking-tight">DRIVE<span className="text-red-500">KIT</span></span>
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentView('home')} className="text-sm text-zinc-400 hover:text-white transition-colors">Home</button>
                <button onClick={() => setCurrentView('products')} className="text-sm text-zinc-400 hover:text-white transition-colors">Shop</button>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
            <button onClick={() => setCurrentView('home')} className="hover:text-red-400 transition-colors">Home</button>
            <ChevronRight size={14} />
            <span className="text-zinc-200">Checkout</span>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingCart size={48} className="text-zinc-700 mx-auto mb-4" />
              <h1 className="text-2xl font-black text-white mb-2">Your cart is empty</h1>
              <p className="text-zinc-500 text-sm mb-6">Add some products before checking out.</p>
              <button
                onClick={() => setCurrentView('products')}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Shipping Form */}
              <div className="lg:col-span-3">
                <h1 className="text-3xl font-black text-white mb-2">Checkout</h1>
                <p className="text-zinc-500 text-sm mb-8">Fill in your shipping details to complete your order.</p>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
                  <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Truck size={18} className="text-red-400" /> Shipping Information
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">First Name</label>
                        <input type="text" placeholder="John" value={checkoutFirstName} onChange={(e) => setCheckoutFirstName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Last Name</label>
                        <input type="text" placeholder="Doe" value={checkoutLastName} onChange={(e) => setCheckoutLastName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Email</label>
                      <input type="email" placeholder="john@example.com" value={checkoutEmail} onChange={(e) => setCheckoutEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Address</label>
                      <input type="text" placeholder="123 Main St" value={checkoutAddress} onChange={(e) => setCheckoutAddress(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">City</label>
                        <input type="text" placeholder="Ankeny" value={checkoutCity} onChange={(e) => setCheckoutCity(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">State</label>
                        <input type="text" placeholder="IA" value={checkoutState} onChange={(e) => setCheckoutState(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">ZIP</label>
                        <input type="text" placeholder="50021" value={checkoutZip} onChange={(e) => setCheckoutZip(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Phone (optional)</label>
                      <input type="tel" placeholder="(555) 123-4567" value={checkoutPhone} onChange={(e) => setCheckoutPhone(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors" />
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Tag size={18} className="text-red-400" /> Promo Code
                  </h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { /* trigger apply */ } }}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <button
                      onClick={async () => {
                        const code = promoInput.trim().toUpperCase()
                        if (!code) { setPromoError('Please enter a code'); return }
                        if (appliedPromo?.code === code) { setPromoError('Code already applied'); return }
                        setPromoLoading(true)
                        setPromoError('')
                        try {
                          const res = await fetch('/api/promos/validate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code }),
                          })
                          const data = await res.json()
                          if (data.valid) {
                            setAppliedPromo({ code: data.code, discount: data.discount, label: data.label })
                            setPromoError('')
                          } else {
                            setPromoError(data.error || 'Invalid promo code')
                            setAppliedPromo(null)
                          }
                        } catch {
                          setPromoError('Network error — please try again')
                        } finally {
                          setPromoLoading(false)
                        }
                      }}
                      disabled={promoLoading}
                      className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 disabled:opacity-50 text-zinc-300 font-bold px-5 py-3 rounded-xl text-sm transition-colors whitespace-nowrap"
                    >
                      {promoLoading ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                  {promoError && <p className="text-red-400 text-xs mt-2">{promoError}</p>}
                  {appliedPromo && (
                    <div className="flex items-center justify-between mt-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-semibold">{appliedPromo.code}</span>
                        <span className="text-emerald-300/70 text-xs">— {appliedPromo.label}</span>
                      </div>
                      <button
                        onClick={() => { setAppliedPromo(null); setPromoInput(''); setPromoError(''); }}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
                  <h2 className="text-white font-bold mb-4">Order Summary</h2>
                  {/* Free Shipping Progress Bar */}
                  {cartCount > 0 && (
                    <div className="mb-6 bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                      {freeShippingProgress >= 1 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center"><Check size={14} className="text-emerald-400" /></div>
                          <span className="text-emerald-400 text-sm font-semibold">You've unlocked FREE shipping! 🎉</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-zinc-400">Add <span className="text-white font-bold">${amountToFreeShipping.toFixed(2)}</span> for FREE shipping</span>
                            <span className="text-zinc-500 text-xs">${cartTotal.toFixed(2)} / ${FREE_SHIPPING_THRESHOLD}</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${freeShippingProgress * 100}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <Truck size={12} className="text-zinc-500" />
                            <span className="text-zinc-600 text-xs">Free shipping on orders over ${FREE_SHIPPING_THRESHOLD}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="space-y-4 mb-6 max-h-72 overflow-y-auto pr-1">
                    {cartItems.map(({ product, quantity, variantPrice, variantId: cartVariantId }) => {
                      const itemPrice = variantPrice ?? product.minPrice
                      return (
                      <div key={product.id} className="flex gap-3 items-start">
                        <div className="w-14 h-14 bg-zinc-800 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <img src={product.images[0].src} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">🏎️</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{product.title}</p>
                          <p className="text-zinc-500 text-xs">${itemPrice.toFixed(2)} each</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              onClick={() => updateCartQuantity(product.id, quantity - 1, cartVariantId)}
                              className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 flex items-center justify-center text-xs transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-white text-xs font-bold w-5 text-center">{quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(product.id, quantity + 1, cartVariantId)}
                              className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 flex items-center justify-center text-xs transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-white text-sm font-bold">${(itemPrice * quantity).toFixed(2)}</p>
                          <button
                            onClick={() => removeFromCart(product.id, cartVariantId)}
                            className="text-zinc-600 hover:text-red-400 transition-colors p-0.5"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    )})}
                  </div>
                  <div className="border-t border-zinc-800 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Subtotal</span>
                      <span className="text-zinc-200">${cartTotal.toFixed(2)}</span>
                    </div>
                    {appliedPromo && appliedPromo.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400">Discount ({appliedPromo.code})</span>
                        <span className="text-emerald-400 font-semibold">-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Shipping</span>
                      <span className="text-zinc-200">{shippingCost === 0 ? <span className="text-emerald-400 font-semibold">FREE</span> : `$${shippingCost.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Tax (est.)</span>
                      <span className="text-zinc-200">${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-800">
                      <span className="text-white">Total</span>
                      <span className="text-white">${orderTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (checkoutLoading) return
                      if (!checkoutFirstName.trim() || !checkoutLastName.trim() || !checkoutEmail.trim() || !checkoutAddress.trim() || !checkoutCity.trim() || !checkoutState.trim() || !checkoutZip.trim()) {
                        setCheckoutError('Please fill in all required shipping fields.')
                        return
                      }
                      setCheckoutError('')
                      setCheckoutLoading(true)
                      try {
                        const orderItems = cartItems.map((item) => ({
                          productId: String(item.product.id),
                          variantId: item.variantId ? String(item.variantId) : null,
                          title: item.product.title,
                          variantTitle: item.product.variants.find((v) => v.id === item.variantId)?.title ?? null,
                          quantity: item.quantity,
                          price: item.variantPrice ?? item.product.minPrice,
                        }))
                        const shipping = {
                          name: `${checkoutFirstName} ${checkoutLastName}`.trim(),
                          address1: checkoutAddress,
                          city: checkoutCity,
                          state: checkoutState,
                          zip: checkoutZip,
                          country: 'US',
                          phone: checkoutPhone || undefined,
                        }
                        const orderEmail = checkoutEmail.trim()
                        let placedOrderNumber: string | null = null
                        try {
                          const res = await fetch('/api/orders/place', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
                            body: JSON.stringify({
                              email: orderEmail,
                              items: orderItems,
                              shipping,
                              promoCode: appliedPromo?.code,
                              discount: discountAmount,
                              total: orderTotal,
                            }),
                          })
                          const orderData = await res.json()
                          placedOrderNumber = orderData?.order?.orderNumber ?? orderData?.orderNumber ?? null
                        } catch {}
                        const cart = cartItems
                          .filter((item) => item.variantId)
                          .map((item) => ({ variantId: item.variantId!, quantity: item.quantity }))
                        if (cart.length > 0) {
                          const promoParam = appliedPromo ? `&promo=${encodeURIComponent(appliedPromo.code)}` : ''
                          try {
                            const res = await fetch(`/api/shopify/checkout?cart=${encodeURIComponent(JSON.stringify(cart))}${promoParam}`)
                            const body = await res.json()
                            if (body.url) {
                              const width = 700, height = 700
                              const left = (window.screen.width - width) / 2, top = (window.screen.height - height) / 2
                              const popup = window.open(body.url, 'drivekit_checkout', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`)
                              if (popup) {
                                const checkPopup = setInterval(() => {
                                  if (popup.closed) {
                                    clearInterval(checkPopup)
                                    setLastOrderNumber(placedOrderNumber)
                                    setCartItems([])
                                    setAppliedPromo(null)
                                    setPromoInput('')
                                    setCheckoutLoading(false)
                                    setCurrentView('order-confirmation')
                                  }
                                }, 500)
                                return
                              }
                              window.location.href = body.url
                              return
                            }
                          } catch {} // Shopify checkout URL failed, but order was still placed — proceed to confirmation
                        }
                        // Only clear cart now that order + checkout URL succeeded
                        setLastOrderNumber(placedOrderNumber)
                        setCartItems([])
                        setAppliedPromo(null)
                        setPromoInput('')
                        setCurrentView('order-confirmation')
                      } catch {
                        setCheckoutError('Something went wrong. Please try again.')
                      } finally {
                        setCheckoutLoading(false)
                      }
                    }}
                    disabled={checkoutLoading}
                    className="w-full mt-6 py-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-wait text-white font-bold text-base transition-colors flex items-center justify-center gap-2"
                  >
                    {checkoutLoading ? (
                      <><Loader2 size={18} className="animate-spin" /> Processing...</>
                    ) : (
                      <><Check size={18} /> Pay Securely</>
                    )}
                  </button>
                  {checkoutError && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-red-400 text-sm text-center">{checkoutError}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-zinc-800">
                    <Shield size={16} className="text-zinc-600" />
                    <p className="text-zinc-600 text-xs">Secure checkout · SSL encrypted</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {[
                      { name: 'Visa', color: '#1A1F71', letters: 'VISA' },
                      { name: 'Mastercard', color: '#EB001B', letters: 'MC' },
                      { name: 'Amex', color: '#006FCF', letters: 'AMEX' },
                      { name: 'Discover', color: '#FF6000', letters: 'DISC' },
                    ].map((card) => (
                      <div
                        key={card.name}
                        className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 flex items-center justify-center"
                        title={card.name}
                      >
                        <span className="text-[10px] font-black tracking-wider" style={{ color: card.color }}>{card.letters}</span>
                      </div>
                    ))}
                    <div className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 flex items-center justify-center" title="Apple Pay">
                      <span className="text-[10px] font-bold text-zinc-300"> Pay</span>
                    </div>
                    <div className="bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 flex items-center justify-center" title="Google Pay">
                      <span className="text-[10px] font-bold text-zinc-300">GPay</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (currentView === 'order-confirmation') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans">
        <div className="bg-red-600 text-white text-xs font-semibold text-center py-2 tracking-wide">
          🚚 FREE SHIPPING on orders over $99 · Use code <span className="underline cursor-pointer">DRIVE20</span> for 20% off your first order
        </div>
        <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16 gap-4">
              <button onClick={() => setCurrentView('home')} className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center"><Gauge size={20} className="text-white" /></div>
                <span className="text-xl font-black tracking-tight">DRIVE<span className="text-red-500">KIT</span></span>
              </button>
            </div>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Order Confirmed!</h1>
          <p className="text-zinc-400 text-lg mb-2">Thank you for your purchase.</p>
          {lastOrderNumber && (
            <p className="text-zinc-500 text-sm mb-8">
              Your order number is <span className="text-white font-bold">{lastOrderNumber}</span>
            </p>
          )}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 text-left">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              <Mail size={16} className="text-red-400" /> What happens next?
            </h2>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-3">
                <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                <span>You'll receive an order confirmation email shortly</span>
              </li>
              <li className="flex items-start gap-3">
                <Package size={16} className="text-blue-400 mt-0.5 shrink-0" />
                <span>We'll process your order within 1-2 business days</span>
              </li>
              <li className="flex items-start gap-3">
                <Truck size={16} className="text-cyan-400 mt-0.5 shrink-0" />
                <span>You'll get tracking info once your order ships</span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setCurrentView('order-tracking')}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              <Truck size={16} /> Track Order
            </button>
            <button
              onClick={() => setCurrentView('my-orders')}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              <Package size={16} /> My Orders
            </button>
            <button
              onClick={() => { setCurrentView('products'); setCartItems([]); setAppliedPromo(null); setPromoInput(''); }}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Continue Shopping
            </button>
          </div>
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <Star size={24} className="text-yellow-400 mx-auto mb-3" />
            <h3 className="text-white font-bold text-base mb-1">Love your purchase?</h3>
            <p className="text-zinc-500 text-sm mb-4">Share your experience — help other drivers make the right choice.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {cartItems.map(({ product }) => (
                <button
                  key={product.id}
                  onClick={() => { setSelectedProduct(product); setCurrentView('home'); }}
                  className="text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-red-500 text-zinc-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Review {product.title.length > 30 ? product.title.slice(0, 30) + '…' : product.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'admin') {
    return <AdminDashboard token={authToken} onBack={() => setCurrentView('home')} />
  }

  if (currentView === 'my-orders') {
    return <MyOrders token={authToken} onBack={() => setCurrentView('home')} />
  }

  if (currentView === 'terms') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <button onClick={() => setCurrentView('home')} className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft size={16} /> Back to Store
          </button>
          <h1 className="text-3xl font-black mb-6">Terms of Service</h1>
          <div className="space-y-6 text-zinc-400 text-sm leading-relaxed">
            <p><strong className="text-zinc-200">Last updated:</strong> June 9, 2026</p>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">1. Acceptance of Terms</h2>
              <p>By accessing and using DriveKit ("the Site"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Site.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">2. Products and Purchases</h2>
              <p>All products displayed on DriveKit are automotive lighting and accessories. Prices are listed in USD and are subject to change without notice. We reserve the right to limit the quantities of any products we offer. All descriptions, images, and pricing are subject to change at any time without notice.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">3. Orders and Payment</h2>
              <p>By placing an order, you represent that all information provided is accurate. We reserve the right to refuse or cancel any order for any reason. Payment is processed through Shopify's secure checkout system. We do not store your credit card information.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">4. Shipping and Delivery</h2>
              <p>Free shipping is available on orders over $99. Standard shipping times vary by location. DriveKit is not responsible for delays caused by shipping carriers or customs processing for international orders.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">5. Returns and Exchanges</h2>
              <p>Products may be returned within 14 days of purchase in their original packaging. Items must be unused and in resalable condition. Custom or special-order items are non-returnable. To initiate a return, contact our support team.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">6. Warranty</h2>
              <p>DriveKit products are covered by a limited manufacturer's warranty against defects in materials and workmanship. Warranty claims must be filed through our support team with proof of purchase.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">7. User Accounts</h2>
              <p>When you create an account, you are responsible for maintaining the confidentiality of your credentials. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss arising from unauthorized use.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">8. Limitation of Liability</h2>
              <p>DriveKit shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Site or purchase of products. Our total liability shall not exceed the purchase price of the product in question.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">9. Changes to Terms</h2>
              <p>We reserve the right to update these Terms of Service at any time. Changes will be posted on this page with an updated revision date. Continued use of the Site after changes constitutes acceptance of the new terms.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">10. Contact</h2>
              <p>Questions about these Terms? Contact us at <span className="text-red-400">support.drivekit@gmail.com</span>.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'privacy') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <button onClick={() => setCurrentView('home')} className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft size={16} /> Back to Store
          </button>
          <h1 className="text-3xl font-black mb-6">Privacy Policy</h1>
          <div className="space-y-6 text-zinc-400 text-sm leading-relaxed">
            <p><strong className="text-zinc-200">Last updated:</strong> June 9, 2026</p>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">1. Information We Collect</h2>
              <p>We collect information you provide directly: name, email address, shipping address, and payment information (processed securely via Shopify). We also collect automatic data: IP address, browser type, device information, and browsing activity on our Site.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">2. How We Use Your Information</h2>
              <p>We use your information to: process and fulfill orders, send order confirmations and updates, provide customer support, improve our products and services, send marketing communications (with your consent), and comply with legal obligations.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">3. Information Sharing</h2>
              <p>We do not sell your personal information. We share data only with: Shopify (for payment processing and order fulfillment), shipping carriers (for delivery), analytics providers (to improve our services), and when required by law.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">4. Cookies</h2>
              <p>We use cookies and similar technologies to maintain your session, remember your preferences, and analyze site traffic. You can control cookies through your browser settings.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">5. Data Security</h2>
              <p>We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">6. Your Rights</h2>
              <p>You have the right to: access your personal data, correct inaccurate data, request deletion of your data, opt out of marketing communications, and export your data. Contact us to exercise these rights.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">7. Data Retention</h2>
              <p>We retain your information for as long as your account is active or as needed to provide services. Order-related data is retained for tax and legal compliance purposes.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">8. Children's Privacy</h2>
              <p>Our Site is not intended for individuals under 13. We do not knowingly collect personal information from children under 13.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">9. Changes to This Policy</h2>
              <p>We may update this Privacy Policy periodically. Changes will be posted on this page with an updated revision date. Your continued use of the Site after changes constitutes acceptance.</p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">10. Contact</h2>
              <p>Questions about this policy? Contact us at <span className="text-red-400">support.drivekit@gmail.com</span>.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'sitemap') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <button onClick={() => setCurrentView('home')} className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft size={16} /> Back to Store
          </button>
          <h1 className="text-3xl font-black mb-2">Sitemap</h1>
          <p className="text-zinc-500 text-sm mb-8">Find your way around DriveKit</p>

          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Shop</h2>
              <div className="space-y-2">
                {['All Products', 'Trending Now', 'Best Sellers', 'New Arrivals', 'Deals'].map((item) => (
                  <button
                    key={item}
                    onClick={() => { setSearchQuery(''); setActiveCategory(item === 'All Products' ? null : item); setCurrentView('products'); window.scrollTo(0, 0) }}
                    className="block text-sm text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Pages</h2>
              <div className="space-y-2">
                {[
                  { label: 'Home', view: 'home' as const },
                  { label: 'Order Tracking', view: 'order-tracking' as const },
                  { label: 'Contact Us', view: 'contact' as const },
                  { label: 'Returns & Exchanges', view: 'returns' as const },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setCurrentView(item.view); window.scrollTo(0, 0) }}
                    className="block text-sm text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Account</h2>
              <div className="space-y-2">
                {[
                  currentUser ? { label: 'My Orders', view: 'my-orders' as const } : { label: 'Sign In', view: 'home' as const },
                  { label: 'Privacy Policy', view: 'privacy' as const },
                  { label: 'Terms of Service', view: 'terms' as const },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setCurrentView(item.view); window.scrollTo(0, 0) }}
                    className="block text-sm text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Support</h2>
              <div className="space-y-2">
                <p className="text-sm text-zinc-500">Email: <span className="text-zinc-300">support.drivekit@gmail.com</span></p>
                <p className="text-sm text-zinc-500">Hours: <span className="text-zinc-300">Mon–Fri, 8am–6pm CST</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'faq') {
    return <FAQ onBack={() => setCurrentView('home')} />
  }

  if (currentView === 'not-found') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center">
        <div className="text-center px-4 max-w-md">
          <div className="text-[120px] font-black text-zinc-800 leading-none select-none">404</div>
          <h1 className="text-2xl font-black text-white mb-2 -mt-4">Page Not Found</h1>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">The page you're looking for doesn't exist or has been moved. Let's get you back on track.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => { setCurrentView('home'); window.history.pushState({}, '', '/') }}
              className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors w-full sm:w-auto"
            >
              ← Back to Home
            </button>
            <button
              onClick={() => { setCurrentView('products'); window.history.pushState({}, '', '/products') }}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors w-full sm:w-auto"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[300] focus:bg-red-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm"
      >
        Skip to main content
      </a>

      {/* ── Top Banner ── */}
      <div className="bg-red-600 text-white text-xs font-semibold text-center py-2 tracking-wide" role="banner">
        {siteContent['banner.text'] || '🚚 FREE SHIPPING on orders over $99 · Use code DRIVE20 for 20% off your first order'}
      </div>

      {/* ── Header / Nav ── */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <button onClick={() => setCurrentView('home')} className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
                <Gauge size={20} className="text-white" />
              </div>
              <span className="text-xl font-black tracking-tight">
                DRIVE<span className="text-red-500">KIT</span>
              </span>
            </button>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0 h-full" aria-label="Main navigation">
              <button
                onClick={() => setCurrentView('home')}
                className={`px-4 h-full text-sm font-semibold transition-colors hover:text-red-400 ${
                  currentView === 'home' ? 'text-red-400' : 'text-zinc-300'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => { setCurrentView('products'); setActiveCategory(null); setSearchQuery('') }}
                className={`px-4 h-full text-sm font-semibold transition-colors hover:text-red-400 ${
                  currentView === 'products' ? 'text-red-400' : 'text-zinc-300'
                }`}
              >
                Shop
              </button>
              {NAV_CATEGORIES.map((cat) => (
                <div key={cat.label} className="relative h-full flex items-center">
                  <button
                    onMouseEnter={() => setActiveNav(cat.label)}
                    onMouseLeave={() => setActiveNav(null)}
                    className={`flex items-center gap-1 px-4 h-full text-sm font-semibold transition-colors hover:text-red-400 ${
                      activeNav === cat.label ? 'text-red-400' : 'text-zinc-300'
                    }`}
                  >
                    {cat.label}
                    <ChevronDown size={13} className={`transition-transform ${activeNav === cat.label ? 'rotate-180' : ''}`} />
                  </button>
                  {activeNav === cat.label && (
                    <div
                      onMouseEnter={() => setActiveNav(cat.label)}
                      onMouseLeave={() => setActiveNav(null)}
                      className="absolute top-full left-0 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-50"
                    >
                      {cat.items.map((item) => (
                        <button
                          key={item}
                          onClick={() => {
                            setSearchQuery('')
                            if (item === 'All Products') {
                              setActiveCategory(null)
                            } else {
                              setActiveCategory(item)
                            }
                            setCurrentView('products')
                            setActiveNav(null)
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => setCurrentView('order-tracking')}
                className={`px-4 h-full text-sm font-semibold transition-colors hover:text-red-400 text-zinc-300`}
              >
                Track Order
              </button>
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label={searchOpen ? 'Close search' : 'Open search'}
                aria-expanded={searchOpen}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <Search size={19} />
              </button>
              <button
                onClick={() => { setMiniCartOpen(true) }}
                aria-label={`Shopping cart, ${cartCount} items`}
                className="relative p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ShoppingCart size={19} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
              </button>
              {currentUser ? (
                <div className="hidden lg:flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                    <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                      <UserRound size={13} className="text-white" />
                    </div>
                    <span className="text-sm text-zinc-300 font-medium max-w-[120px] truncate">{currentUser.name || currentUser.email}</span>
                  </div>
                  <button
                    onClick={() => setCurrentView('my-orders')}
                    className="text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors"
                  >
                    My Orders
                  </button>
                  {(currentUser.role === 'OWNER' || currentUser.role === 'ADMIN') && (
                    <button
                      onClick={() => setCurrentView('admin')}
                      className="text-zinc-500 hover:text-red-400 text-sm font-medium transition-colors"
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="text-zinc-500 hover:text-red-400 text-sm font-medium transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { resetAuthForm(); setSignInOpen(true) }}
                  className="hidden lg:block bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          {searchOpen && (
            <div className="pb-4 pt-1 relative">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value && currentView !== 'products') setCurrentView('products') }}
                  onInput={(e) => { const v = (e.target as HTMLInputElement).value; setSearchQuery(v); if (v && currentView !== 'products') setCurrentView('products') }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  placeholder="Search parts, brands, or vehicle model…"
                  aria-label="Search products, brands, or vehicle model"
                  aria-autocomplete="list"
                  aria-controls={searchSuggestions.length > 0 ? 'search-suggestions' : undefined}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              {searchFocused && searchSuggestions.length > 0 && (
                <div id="search-suggestions" role="listbox" aria-label="Search suggestions" className="absolute left-4 right-4 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-2 z-50 max-h-80 overflow-y-auto">
                  <p className="px-4 py-1.5 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Suggestions</p>
                  {searchSuggestions.map((p) => (
                    <button
                      key={p.id}
                      role="option"
                      onMouseDown={() => { setSelectedProduct(p); setSearchOpen(false); setSearchQuery(''); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-zinc-800 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                        {p.images[0] ? (
                          <img src={p.images[0].src} alt="" className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <span className="text-sm">🏎️</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.title}</p>
                        <p className="text-zinc-500 text-xs">{p.vendor} · ${formatPrice(p.minPrice)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-800 bg-zinc-900">
            <div className="px-4 py-3 border-b border-zinc-800/50">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setCurrentView('products')
                      setMobileMenuOpen(false)
                    }
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={() => { setCurrentView('home'); setMobileMenuOpen(false) }}
              className="w-full text-left px-5 py-4 text-sm font-semibold text-zinc-200 border-b border-zinc-800/50 hover:bg-zinc-800"
            >
              Home
            </button>
            <button
              onClick={() => { setCurrentView('products'); setActiveCategory(null); setSearchQuery(''); setMobileMenuOpen(false) }}
              className="w-full text-left px-5 py-4 text-sm font-semibold text-zinc-200 border-b border-zinc-800/50 hover:bg-zinc-800"
            >
              Shop All Products
            </button>
            {NAV_CATEGORIES.map((cat) => (
              <div key={cat.label} className="border-b border-zinc-800/50 last:border-0">
                <button
                  onClick={() => setMobileExpandedNav(mobileExpandedNav === cat.label ? null : cat.label)}
                  className="w-full text-left px-5 py-4 text-sm font-semibold text-zinc-200 flex items-center justify-between"
                >
                  {cat.label}
                  <ChevronDown size={15} className={`text-zinc-500 transition-transform ${mobileExpandedNav === cat.label ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpandedNav === cat.label && (
                  <div className="bg-zinc-950 border-t border-zinc-800/50 px-5 py-2">
                    {cat.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setSearchQuery('')
                          if (item === 'All Products') {
                            setActiveCategory(null)
                          } else {
                            setActiveCategory(item)
                          }
                          setCurrentView('products')
                          setMobileMenuOpen(false)
                        }}
                        className="w-full text-left py-2.5 text-sm text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── Mobile Filter Drawer ── */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileFilterOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-zinc-900 border-r border-zinc-800 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Filters</h3>
              <button onClick={() => setMobileFilterOpen(false)} className="p-2 text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-6">
              {/* Price Range */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3 block">Price Range</label>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-zinc-400 text-sm w-10">${priceRange[0]}</span>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="flex-1 h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-red-500"
                  />
                  <span className="text-zinc-400 text-sm w-10">${priceRange[1]}</span>
                </div>
                {priceRange[1] < 200 && (
                  <button onClick={() => setPriceRange([0, 200])} className="text-red-400 text-xs font-semibold mt-1">
                    Reset price
                  </button>
                )}
              </div>

              {/* Brand */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3 block">Brand</label>
                <select
                  value={vendorFilter || ''}
                  onChange={(e) => setVendorFilter(e.target.value || null)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value="">All Brands</option>
                  {allVendors.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3 block">Minimum Rating</label>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                >
                  <option value={0}>Any Rating</option>
                  <option value={4}>★★★★ & Up</option>
                  <option value={3}>★★★ & Up</option>
                  <option value={2}>★★ & Up</option>
                </select>
              </div>

              {/* In Stock Toggle */}
              <div>
                <button
                  onClick={() => setInStockOnly(!inStockOnly)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-colors border ${
                    inStockOnly
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${inStockOnly ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'}`}>
                      {inStockOnly && <Check size={12} className="text-white" />}
                    </div>
                    In Stock Only
                  </span>
                </button>
              </div>

              {/* Category pills */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                      activeCategory === null ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.map(({ label }) => (
                    <button
                      key={label}
                      onClick={() => setActiveCategory(activeCategory === label ? null : label)}
                      className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                        activeCategory === label ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Apply button */}
            <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-5">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Show {filteredProducts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      {currentView === 'home' && (
      <section className="relative overflow-hidden bg-zinc-950 min-h-[580px] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(220,38,38,0.15),transparent_60%)]" />
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-zinc-900 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-[0.07]">
          <svg viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M400 100 C200 100, 50 250, 50 380 C50 480, 150 520, 250 530 L350 535 L380 580 L420 580 L450 535 L550 530 C650 520, 750 480, 750 380 C750 250, 600 100, 400 100Z" stroke="currentColor" strokeWidth="2" className="text-red-500"/>
            <circle cx="250" cy="540" r="50" stroke="currentColor" strokeWidth="2" className="text-red-500"/>
            <circle cx="550" cy="540" r="50" stroke="currentColor" strokeWidth="2" className="text-red-500"/>
            <line x1="280" y1="200" x2="520" y2="200" stroke="currentColor" strokeWidth="1.5" className="text-red-500" opacity="0.5"/>
            <line x1="200" y1="300" x2="600" y2="300" stroke="currentColor" strokeWidth="1.5" className="text-red-500" opacity="0.5"/>
          </svg>
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-4 py-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-8 h-0.5 bg-red-500" />
              <span className="text-red-400 text-xs font-bold uppercase tracking-[0.3em]">{siteContent['hero.badge'] || 'Performance. Precision. Power.'}</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6 whitespace-pre-line">
              {(siteContent['hero.headline'] || 'BUILT FOR\nSERIOUS\nDRIVERS.').split('\n').map((line, i, arr) => (
                i === 1 ? (
                  <span key={i}>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
                      {line}
                    </span>
                    <br />
                  </span>
                ) : (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                )
              ))}
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-lg">
              {siteContent['hero.description'] || "Premium car accessories for every ride. From interior comfort to exterior style, we've got what your car needs."}
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setCurrentView('products')}
                className="group bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl text-base transition-all flex items-center gap-2"
              >
                {siteContent['hero.cta1'] || 'Shop Now'}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => { setSearchOpen(true); setCurrentView('products') }}
                className="border-2 border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-bold px-8 py-4 rounded-xl text-base transition-all"
              >
                {siteContent['hero.cta2'] || 'Browse Catalog'}
              </button>
            </div>

            <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-zinc-800/50">
              {[
                { value: `${products.length}`, label: 'Products Available' },
                { value: `${products.filter(p => p.inStock).length}`, label: 'In Stock Now' },
                { value: '100%', label: 'Fitment Guarantee' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-white font-black text-2xl">{value}</p>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── Promo Banner Strip ── */}
      {currentView === 'home' && (
      <div className="bg-zinc-900 border-y border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-center py-4 gap-12 px-4 max-w-7xl mx-auto">
          {[
            '🚚 FREE SHIPPING on Orders Over $99',
            '✅ Fitment Guaranteed — We Verify Before We Ship',
            '🔄 2-Week Hassle-Free Returns',
          ].map((item) => (
            <span key={item} className="text-zinc-400 text-sm whitespace-nowrap flex items-center gap-2">
              {item}
            </span>
          ))}
            </div>
            <div className="border-t border-zinc-800 px-5 py-4">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center">
                      <UserRound size={12} className="text-white" />
                    </div>
                    <span className="text-sm text-zinc-300 font-medium truncate">{currentUser.name || currentUser.email}</span>
                  </div>
                  <button
                    onClick={() => { setCurrentView('my-orders'); setMobileMenuOpen(false) }}
                    className="w-full text-left py-2.5 text-sm text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    My Orders
                  </button>
                  {(currentUser.role === 'OWNER' || currentUser.role === 'ADMIN') && (
                    <button
                      onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false) }}
                      className="w-full text-left py-2.5 text-sm text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      Admin Dashboard
                    </button>
                  )}
                  <button
                    onClick={() => { handleSignOut(); setMobileMenuOpen(false) }}
                    className="w-full text-left py-2.5 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => { resetAuthForm(); setSignInOpen(true); setMobileMenuOpen(false) }}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { resetAuthForm(); setSignUpOpen(true); setMobileMenuOpen(false) }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    Create Account
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ── Shop By Category ── */}
      {currentView === 'home' && (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-red-400 text-xs font-bold uppercase tracking-[0.3em] mb-2">Browse</p>
            <h2 className="text-3xl font-black text-white">Shop by Category</h2>
          </div>
          <button
            onClick={() => { setActiveCategory(null); setSearchQuery(''); setCurrentView('products') }}
            className="hidden sm:flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-colors text-sm font-semibold group"
          >
            All Categories <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(({ icon: Icon, label, color, accent }) => (
            <button
              key={label}
              onClick={() => {
                setActiveCategory(activeCategory === label ? null : label)
                setCurrentView('products')
              }}
              className={`group relative bg-gradient-to-br ${color} border ${activeCategory === label ? 'border-red-500' : 'border-zinc-800 hover:border-zinc-600'} rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg overflow-hidden`}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-white/5 to-transparent transition-opacity" />
              <Icon size={32} className={`${accent} mb-4`} />
              <h3 className="text-white font-bold text-lg leading-tight">{label}</h3>
              <p className="text-zinc-500 text-sm mt-1">Explore →</p>
              <ChevronRight size={16} className="absolute bottom-5 right-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>

        {/* Quick Shop Links */}
        <div className="mt-6 bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <Zap size={24} className="text-red-400" />
              <div>
                <p className="text-white font-bold">Quick Shop</p>
                <p className="text-zinc-500 text-sm">Jump straight to what you need</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Sun Shade', 'Dash Cam', 'Vacuum', 'Phone Holder', 'Oil Cooler', 'Air Compressor'].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setSearchQuery(item)
                    setCurrentView('products')
                  }}
                  className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-white text-sm font-medium transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── New Arrivals ── */}
      {currentView === 'home' && products.length > 0 && (() => {
        const newArrivals = [...products].filter(p => !p.hidden).sort((a, b) => b.id - a.id).slice(0, 6)
        if (newArrivals.length === 0) return null
        return (
          <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-emerald-400 text-xs font-bold uppercase tracking-[0.3em] mb-2">Just Dropped</p>
                <h2 className="text-3xl font-black text-white">New Arrivals</h2>
              </div>
              <button
                onClick={() => { setActiveCategory('New Arrivals'); setCurrentView('products'); window.scrollTo(0, 0) }}
                className="hidden sm:flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition-colors text-sm font-semibold group"
              >
                View All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {newArrivals.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-600/50 transition-all text-left group"
                >
                  <div className="h-32 bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {p.images[0] ? (
                      <img src={p.images[0].src} alt={p.images[0].alt} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <span className="text-3xl text-zinc-600">🏎️</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-0.5">{p.vendor}</p>
                    <p className="text-white text-xs font-medium line-clamp-2 group-hover:text-emerald-100 transition-colors">{p.title}</p>
                    <p className="text-white font-bold text-sm mt-1">${formatPrice(p.minPrice)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )
      })()}

      {/* ── Top Rated ── */}
      {currentView === 'home' && products.length > 0 && (() => {
        const topRated = [...products].filter(p => !p.hidden && p.inStock).sort((a, b) => {
          const aStats = allReviewStats[String(a.id)] ?? { average: 0, count: 0 }
          const bStats = allReviewStats[String(b.id)] ?? { average: 0, count: 0 }
          if (aStats.average !== bStats.average) return bStats.average - aStats.average
          return bStats.count - aStats.count
        }).slice(0, 6)
        if (topRated.length === 0) return null
        return (
          <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-yellow-400 text-xs font-bold uppercase tracking-[0.3em] mb-2">Customer Favorites</p>
                <h2 className="text-3xl font-black text-white">Top Rated</h2>
              </div>
              <button
                onClick={() => { setActiveCategory('Top Rated'); setCurrentView('products'); window.scrollTo(0, 0) }}
                className="hidden sm:flex items-center gap-2 text-zinc-400 hover:text-yellow-400 transition-colors text-sm font-semibold group"
              >
                View All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {topRated.map((p) => {
                const compareAt = getCompareAtPrice(p.variants)
                const discount = getDiscountPercent(p.minPrice, compareAt)
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-yellow-600/50 transition-all text-left group"
                  >
                    <div className="relative h-32 bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {p.images[0] ? (
                        <img src={p.images[0].src} alt={p.images[0].alt} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <span className="text-3xl text-zinc-600">🏎️</span>
                      )}
                      {discount && discount > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">-{discount}%</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider mb-0.5">{p.vendor}</p>
                      <p className="text-white text-xs font-medium line-clamp-2 group-hover:text-yellow-100 transition-colors">{p.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-white font-bold text-sm">${formatPrice(p.minPrice)}</span>
                        {compareAt && compareAt > p.minPrice && (
                          <span className="text-zinc-600 text-[10px] line-through">${formatPrice(compareAt)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* ── Recently Viewed ── */}
      {currentView === 'home' && recentlyViewed.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-red-400 text-xs font-bold uppercase tracking-[0.3em] mb-2">Continue Browsing</p>
            <h2 className="text-2xl font-black text-white">Recently Viewed</h2>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {recentlyViewed.slice(0, 6).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              className="flex-shrink-0 w-48 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-red-600/50 transition-all text-left group"
            >
              <div className="h-32 bg-zinc-800 flex items-center justify-center overflow-hidden">
                {p.images[0] ? (
                  <img src={p.images[0].src} alt={p.images[0].alt} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform" loading="lazy" />
                ) : (
                  <span className="text-3xl text-zinc-600">🏎️</span>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-0.5">{p.vendor}</p>
                <p className="text-white text-sm font-medium line-clamp-2 group-hover:text-red-100 transition-colors">{p.title}</p>
                <p className="text-white font-bold text-sm mt-1">${formatPrice(p.minPrice)}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      )}

      {/* ── Featured Products ── */}
      {currentView === 'products' && (
      <section id="main-content" className="max-w-7xl mx-auto px-4 py-10">
        {/* Products page breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-zinc-400">
            <li>
              <button onClick={() => setCurrentView('home')} className="hover:text-red-400 transition-colors">Home</button>
            </li>
            <li aria-hidden="true"><ChevronRight size={14} /></li>
            <li aria-current="page">
              <span className="text-zinc-200">{activeCategory ?? 'All Products'}</span>
            </li>
          </ol>
        </nav>

        {/* Search bar on products page */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-12 pr-10 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeCategory === null ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
            }`}
          >
            All Products
          </button>
          {CATEGORIES.map(({ label }) => (
            <button
              key={label}
              onClick={() => setActiveCategory(activeCategory === label ? null : label)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeCategory === label ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort + Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold whitespace-nowrap">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value="default">Default</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="newest">Newest First</option>
              <option value="best-selling">Best Selling</option>
            </select>
          </div>
          <div className="hidden sm:flex items-center gap-3 flex-1 min-w-0">
            <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold whitespace-nowrap">Price</label>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-zinc-400 text-sm">${priceRange[0]}</span>
              <input
                type="range"
                min={0}
                max={200}
                step={5}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="flex-1 h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-red-500"
              />
              <span className="text-zinc-400 text-sm">${priceRange[1]}</span>
            </div>
            {priceRange[1] < 200 && (
              <button
                onClick={() => setPriceRange([0, 200])}
                className="text-zinc-500 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {/* Mobile filter button */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="sm:hidden flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-red-500 transition-colors ml-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters
            {(vendorFilter || inStockOnly || ratingFilter > 0 || priceRange[1] < 200) && (
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            )}
          </button>
          {/* Active filters count (desktop) */}
          {(vendorFilter || inStockOnly || ratingFilter > 0 || priceRange[1] < 200) && (
            <div className="hidden sm:flex items-center gap-2 ml-auto">
              <span className="text-xs text-zinc-500">
                {[vendorFilter, inStockOnly, ratingFilter > 0, priceRange[1] < 200].filter(Boolean).length} filter(s) active
              </span>
              <button
                onClick={() => { setVendorFilter(null); setInStockOnly(false); setRatingFilter(0); setPriceRange([0, 200]) }}
                className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Desktop advanced filters */}
        <div className="hidden sm:flex flex-wrap gap-4 mb-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold whitespace-nowrap">Brand</label>
            <select
              value={vendorFilter || ''}
              onChange={(e) => setVendorFilter(e.target.value || null)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors max-w-[180px]"
            >
              <option value="">All Brands</option>
              {allVendors.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold whitespace-nowrap">Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value={0}>Any Rating</option>
              <option value={4}>★★★★ & Up</option>
              <option value={3}>★★★ & Up</option>
              <option value={2}>★★ & Up</option>
            </select>
          </div>
          <button
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
              inStockOnly
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${inStockOnly ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'}`}>
              {inStockOnly && <Check size={10} className="text-white" />}
            </div>
            In Stock Only
          </button>
        </div>

        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-red-400 text-xs font-bold uppercase tracking-[0.3em] mb-2">
              {activeCategory ?? 'All Products'}
            </p>
            <h2 className="text-3xl font-black text-white">
              {activeCategory ?? 'All Products'}
            </h2>
            {searchQuery && (
              <p className="text-zinc-500 text-sm mt-1">
                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "{searchQuery}"
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="text-zinc-400 hover:text-red-400 transition-colors text-sm font-semibold flex items-center gap-1"
              >
                <X size={14} /> Clear Filter
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-zinc-400 hover:text-red-400 transition-colors text-sm font-semibold"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
                <div className="h-52 bg-zinc-800" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-zinc-800 rounded w-1/4" />
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                  <div className="h-6 bg-zinc-800 rounded w-1/3 mt-2" />
                  <div className="h-10 bg-zinc-800 rounded-lg w-full mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-red-400 text-sm font-semibold">{error}</p>
            <p className="text-zinc-500 text-xs">Check your Shopify connection and try again.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Search size={32} className="text-zinc-600" />
            <p className="text-zinc-400 text-sm">No products found.</p>
          </div>
        ) : (
          <>
          <div key={`grid-${searchQuery}-${activeCategory}-${currentPage}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedProducts.map((p) => (
              <ProductCard key={p.handle || `product-${p.id}`} product={p} onClick={() => setSelectedProduct(p)} isWishlisted={wishlistedIds.has(p.id)} onToggleWishlist={toggleWishlist} isCompared={comparedIds.has(p.id)} onToggleCompare={toggleCompare} onQuickAdd={(prod) => { addToCart(prod, 1); setMiniCartOpen(true) }} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                    page === currentPage
                      ? 'bg-red-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <p className="text-center text-zinc-600 text-xs mt-3">
              Page {currentPage} of {totalPages} · Showing {paginatedProducts.length} of {filteredProducts.length} products
            </p>
          )}
          </>
        )}
      </section>
      )}

      {/* ── Trust / Features Strip ── */}
      {currentView === 'home' && (
      <section className="bg-zinc-900 border-y border-zinc-800 py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-red-400 text-xs font-bold uppercase tracking-[0.3em] mb-2">{siteContent['why.badge'] || 'Why DriveKit'}</p>
            <h2 className="text-3xl font-black text-white">{siteContent['why.headline'] || 'The DriveKit Difference'}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_ITEMS.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="text-center p-6 rounded-2xl bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-5">
                  <Icon size={26} className={color} />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── Newsletter ── */}
      {currentView === 'home' && (
      <section className="bg-gradient-to-br from-red-950/40 to-zinc-900 border-y border-zinc-800 py-14">
        <div className="max-w-xl mx-auto px-4 text-center">
          <Tag size={28} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Get Exclusive Deals</h2>
          <p className="text-zinc-400 text-sm mb-6">Get early access to new products, exclusive discounts, and car accessory inspiration.</p>
          {newsletterSubmitted ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold py-3">
              <Check size={18} /> You're on the list! Check your inbox.
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newsletterEmail.includes('@')) handleNewsletterSubscribe() }}
                placeholder="Your email address"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              <button
                onClick={handleNewsletterSubscribe}
                disabled={!newsletterEmail.includes('@') || newsletterLoading}
                className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                {newsletterLoading ? 'Subscribing…' : 'Subscribe'}
              </button>
            </div>
          )}
          {newsletterError && <p className="text-red-400 text-xs mt-2">{newsletterError}</p>}
          <p className="text-zinc-600 text-xs mt-3">No spam. Unsubscribe anytime.</p>
        </div>
      </section>
      )}



      {/* ── Footer ── */}
      <footer className="bg-zinc-950 border-t border-zinc-800 pt-14 pb-8" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <Gauge size={17} className="text-white" />
                </div>
                <span className="font-black tracking-tight text-lg">DRIVE<span className="text-red-500">KIT</span></span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed mb-4">
                Premium car accessories for every build. From interior upgrades to exterior enhancements.
              </p>
              <div className="flex gap-3">
                {[Instagram, Facebook, Youtube].map((Icon, i) => (
                  <button key={i} className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Shop', links: ['Trending Now', 'Best Sellers', 'Top Rated', 'New Arrivals', 'All Products'] },
              { title: 'Help', links: ['Order Tracking', 'Returns & Refunds', 'Contact Us', 'FAQ'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-4">{title}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <button
                        onClick={() => {
                          if (title === 'Shop') {
                            if (link === 'All Products') { setActiveCategory(null); setSearchQuery('') }
                            else setActiveCategory(link)
                            setCurrentView('products')
                          } else if (link === 'Order Tracking') {
                            setCurrentView('order-tracking')
                          } else if (link === 'Returns & Refunds') {
                            setCurrentView('returns')
                          } else if (link === 'Contact Us') {
                            setCurrentView('contact')
                          } else if (link === 'FAQ') {
                            setCurrentView('faq')
                          }
                        }}
                        className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors text-left"
                      >{link}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="flex flex-wrap gap-6 py-6 border-t border-zinc-800 border-b mb-6">
            {[
              { icon: Mail, text: 'support.drivekit@gmail.com', href: 'mailto:support.drivekit@gmail.com' },
              { icon: MapPin, text: 'Based in the U.S. — Ships Nationwide', href: null },
            ].map(({ icon: Icon, text, href }) => (
              href ? (
                <a key={text} href={href} className="flex items-center gap-2.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                  <Icon size={15} className="text-red-400" />
                  {text}
                </a>
              ) : (
                <div key={text} className="flex items-center gap-2.5 text-zinc-500 text-sm">
                  <Icon size={15} className="text-red-400" />
                  {text}
                </div>
              )
            ))}
          </div>

          {/* Bottom */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
            <p>{siteContent['footer.copyright'] || '© 2026 DriveKit. All rights reserved.'}</p>
            <div className="flex gap-5">
              {['Privacy Policy', 'Terms of Service', 'Sitemap'].map((link) => (
                <button
                  key={link}
                  onClick={() => {
                    if (link === 'Privacy Policy') setCurrentView('privacy')
                    else if (link === 'Terms of Service') setCurrentView('terms')
                    else if (link === 'Sitemap') setCurrentView('sitemap')
                    window.scrollTo(0, 0)
                  }}
                  className="hover:text-zinc-400 transition-colors"
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── Sign In Modal ── */}
      {signInOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setSignInOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <button onClick={() => setSignInOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors">
              <X size={20} />
            </button>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center"><Gauge size={16} className="text-white" /></div>
              <span className="font-black tracking-tight">DRIVE<span className="text-red-500">KIT</span></span>
            </div>
            <h2 className="text-2xl font-black text-white mb-1">Welcome back</h2>
            <p className="text-zinc-500 text-sm mb-6">Sign in to track orders, save builds, and get exclusive deals.</p>
            {authError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{authError}</p>
              </div>
            )}
            <div className="space-y-3">
              <input
                type="email" placeholder="Email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              <input
                type="password" placeholder="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              <button
                onClick={handleSignIn} disabled={authLoading}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {authLoading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </div>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-600 text-xs">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <p className="text-center text-zinc-500 text-sm">
              Don't have an account?{' '}
              <button
                onClick={() => { setSignInOpen(false); resetAuthForm(); setSignUpOpen(true) }}
                className="text-red-400 hover:text-red-300 font-semibold transition-colors"
              >
                Create one free
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Sign Up Modal ── */}
      {signUpOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setSignUpOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <button onClick={() => setSignUpOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors">
              <X size={20} />
            </button>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center"><Gauge size={16} className="text-white" /></div>
              <span className="font-black tracking-tight">DRIVE<span className="text-red-500">KIT</span></span>
            </div>

            {signupStep === 1 ? (
              <>
                <h2 className="text-2xl font-black text-white mb-1">Create your account</h2>
                <p className="text-zinc-500 text-sm mb-6">Join DriveKit for exclusive deals, order tracking, and custom builds.</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-white mb-1">Check your email ✉️</h2>
                <p className="text-zinc-500 text-sm mb-6">We sent a 6-digit code to <span className="text-zinc-300 font-medium">{codeSentTo}</span>. Enter it below to verify your account.</p>
              </>
            )}

            {authError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{authError}</p>
              </div>
            )}

            {signupStep === 1 ? (
              <div className="space-y-3">
                <input
                  type="text" placeholder="Your name (optional)" value={authName} onChange={(e) => setAuthName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
                <input
                  type="email" placeholder="Email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
                <input
                  type="password" placeholder="Password (min 6 characters)" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                />
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={authEmailOptIn}
                    onChange={(e) => setAuthEmailOptIn(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                    Send me exclusive deals, new product announcements, and car accessory tips. You can unsubscribe anytime.
                  </span>
                </label>
                <button
                  onClick={handleSignUp} disabled={authLoading}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {authLoading ? <><Loader2 size={16} className="animate-spin" /> Sending code...</> : 'Continue'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit code" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmSignup()}
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                />
                <button
                  onClick={handleConfirmSignup} disabled={authLoading || verificationCode.length !== 6}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {authLoading ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : 'Verify & Create Account'}
                </button>
                <button
                  onClick={() => { setSignupStep(1); setVerificationCode(''); setAuthError('') }}
                  className="w-full text-center text-zinc-500 hover:text-zinc-300 text-xs font-medium transition-colors py-1"
                >
                  ← Back to sign up form
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-600 text-xs">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <p className="text-center text-zinc-500 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => { setSignUpOpen(false); resetAuthForm(); setSignInOpen(true) }}
                className="text-red-400 hover:text-red-300 font-semibold transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── Mini Cart Drawer ── */}
      <MiniCartDrawer
        open={miniCartOpen}
        onClose={() => setMiniCartOpen(false)}
        cartItems={cartItems}
        updateQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        onCheckout={() => setCurrentView('checkout')}
      />

      {/* ── Comparison Bar ── */}
      {comparedIds.size > 0 && !showComparison && (
        <div className="fixed bottom-0 left-0 right-0 z-[75] bg-zinc-900/95 backdrop-blur border-t border-zinc-800 shadow-2xl" role="complementary" aria-label="Product comparison bar">
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-2.5 md:py-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <GitCompareArrows size={18} className="text-blue-400 shrink-0" />
                <span className="text-xs sm:text-sm text-zinc-300 font-medium">
                  <span className="text-white font-bold">{comparedIds.size}</span> product{comparedIds.size !== 1 ? 's' : ''} selected
                  {comparedIds.size < 2 && <span className="text-zinc-500 hidden sm:inline"> — select at least 2</span>}
                </span>
                <div className="hidden sm:flex items-center gap-2 ml-2">
                  {Array.from(comparedIds).map((id) => {
                    const p = products.find((x) => x.id === id)
                    if (!p) return null
                    return (
                      <div key={id} className="relative group/chip">
                        <div className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center overflow-hidden">
                          {p.images[0] ? <img src={p.images[0].src} alt="" className="w-full h-full object-contain p-0.5" /> : <span className="text-sm">🏎️</span>}
                        </div>
                        <button
                          onClick={() => toggleCompare(id)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/chip:opacity-100 transition-opacity"
                          aria-label={`Remove ${p.title} from comparison`}
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    )
                  })}
                  {comparedIds.size < 4 && (
                    <span className="text-zinc-600 text-xs">+{4 - comparedIds.size}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setComparedIds(new Set())}
                  className="text-zinc-500 hover:text-zinc-300 text-xs sm:text-sm font-medium px-2 sm:px-3 py-2 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowComparison(true)}
                  disabled={comparedIds.size < 2}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-2"
                >
                  <Columns size={15} /> Compare
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Comparison Modal ── */}
      {showComparison && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto" role="dialog" aria-modal="true" aria-label="Product comparison">
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm" onClick={() => setShowComparison(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl my-4 md:my-8 mx-2 md:mx-4 shadow-2xl">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-2 md:gap-3">
                <Columns size={18} className="text-blue-400" />
                <h2 className="text-base md:text-xl font-black text-white">Compare</h2>
                <span className="text-zinc-500 text-xs md:text-sm">({comparedIds.size})</span>
              </div>
              <button
                onClick={() => setShowComparison(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                aria-label="Close comparison"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-3 md:p-6 overflow-x-auto -mx-2 md:mx-0 px-2 md:px-6">
              {(() => {
                const compared = Array.from(comparedIds).map((id) => products.find((x) => x.id === id)).filter(Boolean) as Product[]
                if (compared.length === 0) return <p className="text-zinc-500 text-sm text-center py-8">No products selected.</p>
                const allSpecs = ['Price', 'Brand', 'Product Type', 'SKU', 'In Stock', 'Variants', 'Weight', 'Tags']
                const getSpecValue = (p: Product, spec: string) => {
                  switch (spec) {
                    case 'Price': return `$${formatPrice(p.minPrice)}`
                    case 'Brand': return p.vendor
                    case 'Product Type': return p.productType || 'N/A'
                    case 'SKU': return p.variants[0]?.sku ?? 'N/A'
                    case 'In Stock': return p.inStock ? 'Yes' : 'No'
                    case 'Variants': return `${p.variants.length}`
                    case 'Weight': return p.variants[0]?.weight ? `${p.variants[0].weight} ${p.variants[0].weightUnit}` : 'N/A'
                    case 'Tags': return p.tags.join(', ') || 'None'
                    default: return 'N/A'
                  }
                }
                return (
                  <table className="w-full text-xs md:text-sm" role="table">
                    <thead>
                      <tr>
                        <th className="text-left text-zinc-500 uppercase tracking-widest text-[10px] md:text-xs font-bold py-2 md:py-3 pr-2 md:pr-4 w-16 md:w-32" scope="col">Spec</th>
                        {compared.map((p) => (
                          <th key={p.id} className="text-center py-2 md:py-3 px-2 md:px-3 min-w-[130px] md:min-w-[180px]" scope="col">
                            <div className="space-y-1.5 md:space-y-2">
                              <div className="w-14 h-14 md:w-20 md:h-20 bg-zinc-800 border border-zinc-700 rounded-lg md:rounded-xl mx-auto flex items-center justify-center overflow-hidden">
                                {p.images[0] ? <img src={p.images[0].src} alt={p.images[0].alt} className="w-full h-full object-contain p-0.5 md:p-1" /> : <span className="text-lg md:text-2xl">🏎️</span>}
                              </div>
                              <p className="text-white font-bold text-[10px] md:text-xs leading-tight line-clamp-2">{p.title}</p>
                              <button
                                onClick={() => { setSelectedProduct(p); setShowComparison(false) }}
                                className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors"
                              >
                                View Details →
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allSpecs.map((spec, idx) => (
                        <tr key={spec} className={idx % 2 === 0 ? 'bg-zinc-800/30' : ''}>
                          <td className="text-zinc-400 font-semibold py-2 md:py-3 pr-2 md:pr-4 text-[10px] md:text-xs uppercase tracking-wider">{spec}</td>
                          {compared.map((p) => {
                            const val = getSpecValue(p, spec)
                            const isLowest = spec === 'Price' && compared.every((x) => x.minPrice >= p.minPrice)
                            const isHighest = spec === 'Price' && compared.every((x) => x.minPrice <= p.minPrice)
                            return (
                              <td key={p.id} className="text-center py-2 md:py-3 px-2 md:px-3">
                                <span className={`font-medium ${
                                  spec === 'In Stock' ? (val === 'Yes' ? 'text-emerald-400' : 'text-red-400') :
                                  isLowest && compared.length > 1 ? 'text-emerald-400 font-bold' :
                                  isHighest && compared.length > 1 ? 'text-red-400' :
                                  'text-zinc-200'
                                }`}>
                                  {val}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Back to Top ── */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed right-4 md:right-6 z-[80] w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 flex items-center justify-center transition-all duration-300 hover:scale-110 ${comparedIds.size > 0 && !showComparison ? 'bottom-20 md:bottom-24' : 'bottom-4 md:bottom-6'}`}
          aria-label="Back to top"
        >
          <ChevronLeft size={20} className="rotate-90" />
        </button>
      )}
    </div>
  )
}
