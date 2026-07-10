import { useState } from 'react'
import { ChevronDown, ChevronRight, Gauge, HelpCircle } from 'lucide-react'

const FAQ_SECTIONS = [
  {
    category: 'Orders & Shipping',
    items: [
      {
        q: 'How long does shipping take?',
        a: 'Standard shipping takes 3–7 business days for most US addresses. Free shipping is available on orders over $99. You\'ll receive a tracking number via email once your order ships.',
      },
      {
        q: 'How do I track my order?',
        a: 'Go to Track Order in the top navigation and enter your order number and email address. You\'ll see real-time status updates from order placement through delivery.',
      },
      {
        q: 'Can I change or cancel my order?',
        a: 'We process orders quickly. If your order hasn\'t shipped yet, contact us at support.drivekit@gmail.com and we\'ll do our best to make changes. Once shipped, orders cannot be modified.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards (Visa, Mastercard, Amex, Discover) through our secure Shopify checkout. Your payment information is encrypted and never stored on our servers.',
      },
    ],
  },
  {
    category: 'Fitment & Compatibility',
    items: [
      {
        q: 'How do I know if a product fits my car?',
        a: 'Every product page has a Vehicle Compatibility Checker. Enter your year, make, and model to confirm fitment. If you\'re unsure, our support team can verify before you order.',
      },
      {
        q: 'What if a product doesn\'t fit my vehicle?',
        a: 'We offer a Fitment Guarantee — if a part doesn\'t fit your vehicle, we\'ll replace it or give you a full refund. No restocking fee, no hassle. Just send us a photo.',
      },
      {
        q: 'Do you sell universal-fit products?',
        a: 'Yes! Many of our accessories (phone holders, organizers, LED lights) are universal-fit. Check the product description and Fitment tab for compatibility details.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      {
        q: 'What is your return policy?',
        a: 'You have 14 days from delivery to initiate a return. Items must be unused and in their original packaging. Custom-painted or special-order items are non-returnable unless defective.',
      },
      {
        q: 'How do I start a return?',
        a: 'Email support.drivekit@gmail.com with your order number and the item(s) you want to return. We\'ll send you a prepaid return label within 24 hours.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Once we receive your return, we inspect it within 2 business days. Refunds are issued to your original payment method within 5–7 business days.',
      },
      {
        q: 'Can I exchange an item?',
        a: 'Absolutely. Let us know in your return email if you\'d like a different size, color, or variant. We\'ll ship the replacement as soon as your return is in transit.',
      },
    ],
  },
  {
    category: 'Account & Privacy',
    items: [
      {
        q: 'Do I need an account to place an order?',
        a: 'No, you can checkout as a guest. However, creating a free account lets you track orders, save wishlists, and get exclusive deals.',
      },
      {
        q: 'How do I create an account?',
        a: 'Click "Sign In" in the top right, then "Create one free." Enter your email and password — we\'ll send a verification code to confirm your email.',
      },
      {
        q: 'Is my personal information safe?',
        a: 'Yes. We use industry-standard encryption and never sell your data. Payment processing is handled securely through Shopify. See our Privacy Policy for full details.',
      },
    ],
  },
  {
    category: 'Products & Inventory',
    items: [
      {
        q: 'An item I want is out of stock. When will it be back?',
        a: 'Most items restock within 2–4 weeks. Join the waitlist on the product page and we\'ll email you the moment it\'s available again.',
      },
      {
        q: 'Do you offer warranties?',
        a: 'Yes. All DriveKit products are covered by a limited manufacturer\'s warranty against defects in materials and workmanship. Contact support with your proof of purchase to file a claim.',
      },
      {
        q: 'Are your product images accurate?',
        a: 'We photograph and describe every product as accurately as possible. Minor color variations may occur due to monitor settings. If an item looks significantly different from its listing, contact us.',
      },
    ],
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-zinc-900 hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-white font-semibold text-sm">{question}</span>
        <ChevronDown
          size={18}
          className={`text-zinc-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 py-5 bg-zinc-950 border-t border-zinc-800">
          <p className="text-zinc-400 text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQ({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <div className="bg-red-600 text-white text-xs font-semibold text-center py-2 tracking-wide">
        🚚 FREE SHIPPING on orders over $99 · Use code DRIVE20 for 20% off your first order
      </div>
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            <button onClick={() => onBack()} className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center"><Gauge size={20} className="text-white" /></div>
              <span className="text-xl font-black tracking-tight">DRIVE<span className="text-red-500">KIT</span></span>
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => onBack()} className="text-sm text-zinc-400 hover:text-white transition-colors">Home</button>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
          <button onClick={onBack} className="hover:text-red-400 transition-colors">Home</button>
          <ChevronRight size={14} />
          <span className="text-zinc-200">FAQ</span>
        </div>
        <div className="text-center mb-12">
          <HelpCircle size={32} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-white mb-3">Frequently Asked Questions</h1>
          <p className="text-zinc-400 text-sm">Find quick answers to common questions about orders, fitment, returns, and more.</p>
        </div>
        <div className="space-y-10">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.category}>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <FAQItem key={item.q} question={item.q} answer={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-400 text-sm mb-3">Still have questions?</p>
          <button
            onClick={() => onBack()}
            className="text-red-400 hover:text-red-300 font-bold text-sm transition-colors"
          >
            Contact Our Team →
          </button>
        </div>
      </div>
    </div>
  )
}
