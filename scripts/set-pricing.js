/**
 * Sets realistic pricing for products and adds compare-at-prices.
 * Each product gets a unique base price based on its category.
 */
const API = 'https://dc5byu-fy.myshopify.com/admin/api/2024-10';
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || '';

async function sf(path) {
  const res = await fetch(API + path, { headers: { 'X-Shopify-Access-Token': TOKEN } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

// Price tiers based on product complexity
const PRICING = {
  // Budget accessories ($6.99 - $12.99)
  'Car Seat Gap Felt Organizer': 8.99,
  'RGB LED Cup Holder Coaster Light': 9.99,
  'Car Armrest Box Cushion Pad': 11.99,
  'Crystal Diamond Car Air Freshener': 7.99,
  'Crystal Diamond Car Interior Decor': 8.99,
  'Car Seat Back Storage Pocket': 12.99,
  'Car Seat Storage Organizer Bag': 14.99,
  'Microfiber Car Detailing Towels': 6.99,
  'Car Wash Cleaning Gloves': 8.99,
  'Steering Wheel Tray Table': 12.99,
  'Rotate Multi-Angle Door Cup Holder': 11.99,
  'Rotating Multi-Angle Door Cup Holder': 11.99,
  'Carbon Fiber Bumper Guard Strips': 9.99,
  'LED Daytime Running Light Bar': 14.99,
  'LED Turn Signal Light Strip': 12.99,
  'Car LED Ambient Light Strip': 15.99,
  'Motorcycle Helmet LED Signal Strip': 11.99,
  'Bluetooth FM Transmitter': 14.99,
  'Car Bluetooth FM Transmitter MP3': 14.99,

  // Mid-range ($12.99 - $29.99)
  'Kinetic Solar Car Air Freshener': 14.99,
  'Solar Rotating Car Air Freshener': 14.99,
  'Mini Car Humidifier & Air Purifier': 13.99,
  'Car Aromatherapy Diffuser & Purifier': 15.99,
  'Cloud Mist Car Aroma Diffuser': 18.99,
  'Portable 12V Windshield Defroster': 14.99,
  'Cordless Electric Ice Scraper': 16.99,
  'Extendable Snow Brush Ice Scraper': 13.99,
  '3-in-1 Car Heater Defogger Fan': 18.99,
  'Car Armrest Box Cushion Pad': 11.99,
  'Telescopic Dashboard Phone Mount': 12.99,
  '360 Rearview Mirror Phone Mount': 14.99,
  'Car Phone Holder Long Rod': 12.99,
  'Car Rearview Mirror Swivel': 14.99,
  'Smartphone Heads-Up Display Mount': 19.99,
  'Backseat Folding Car Desk Tray': 16.99,
  'Premium Seatback Car Organizer': 22.99,
  'Leather Car Seat Back Organizer': 24.99,
  'Car Seat Neck Support Pillow': 19.99,

  // Performance / tech ($19.99 - $49.99)
  'Foldable Windshield Sun Shade': 16.99,
  'Magnetic Windshield Snow Cover': 19.99,
  'Emergency Snow Tire Chains': 24.99,
  'High Pressure Foam Spray Gun': 17.99,
  'Magnetic Car Windshield Cover': 19.99,
  'Car Scratch Remover Repair Kit': 13.99,
  'Headlight Restoration Repair Liquid': 14.99,
  'ECO OBD2 Fuel Saver Chip': 11.99,
  'Magnetic Mini GPS Car Tracker': 16.99,
  'Mini Anti-Lost GPS Tracker Alarm': 13.99,
  'LED Turn Signal Light Strip': 12.99,
  'Car LED Ambient Light Strip': 15.99,
  '4-in-1 Non-Slip Phone Dash Mat': 14.99,
  'Car Seat Back Storage Pocket': 12.99,
  'Smart LED Digital Tire Inflator': 22.99,
  '12V Car Seat Heating Cushion': 18.99,
  '2-in-1 Foldable Car Cup Holder': 9.99,
  'Car Seat Neck Support Pillow': 19.99,
  'Mini Dual-Purpose Car Vacuum': 19.99,
  'Cordless Car Vacuum Cleaner': 16.99,
  'Wet & Dry Car Vacuum Cleaner': 24.99,
  'AutoClean Wireless Mini Vacuum': 22.99,
  '5000Pa Handheld Car Vacuum': 29.99,
  'Mirror Dash Cam 1080P Full HD': 39.99,
  'Small Eye Wifi Dash Cam Recorder': 34.99,
  'Inflatable Car Travel Air Mattress': 29.99,
  'Cordless Car Polishing Machine': 49.99,
};

async function main() {
  let all = [], lastId;
  while (true) {
    const data = await sf(`/products.json?limit=250${lastId ? '&since_id=' + lastId : ''}`);
    all.push(...data.products);
    if (data.products.length < 250) break;
    lastId = data.products[data.products.length - 1].id;
  }
  console.log('Total products:', all.length);

  let updated = 0;
  for (const p of all) {
    const targetPrice = PRICING[p.title];
    if (!targetPrice) {
      console.log('SKIP (no price set):', p.title.substring(0, 40));
      continue;
    }

    // Set base price and compare-at (1.3x higher for sale badge)
    const compareAt = Math.ceil(targetPrice * 1.3 * 100) / 100;

    const updates = p.variants.map(v => {
      const currentPrice = parseFloat(v.price);
      // For multi-pack variants, scale proportionally
      const title = v.title.toLowerCase();
      let scale = 1;
      if (title.includes('2pcs') || title.includes('2pc')) scale = 1.8;
      else if (title.includes('3pcs') || title.includes('3pc')) scale = 2.5;
      else if (title.includes('4pcs') || title.includes('4pc')) scale = 3.1;
      else if (title.includes('5pcs')) scale = 3.6;
      else if (title.includes('10pcs')) scale = 5.5;

      const newPrice = Math.round(targetPrice * scale * 100) / 100;
      const variantCompareAt = Math.round(targetPrice * scale * 1.3 * 100) / 100;

      return {
        id: v.id,
        price: String(newPrice),
        compare_at_price: String(variantCompareAt),
      };
    });

    try {
      const res = await fetch(`${API}/products/${p.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
        body: JSON.stringify({ product: { id: p.id, variants: updates } }),
      });
      if (res.ok) {
        const minP = Math.min(...updates.map(u => parseFloat(u.price)));
        const maxP = Math.max(...updates.map(u => parseFloat(u.price)));
        const range = minP === maxP ? `$${minP.toFixed(2)}` : `$${minP.toFixed(2)}-$${maxP.toFixed(2)}`;
        console.log(`OK: ${p.title.substring(0, 40).padEnd(42)} ${range}`);
        updated++;
      } else {
        const t = await res.text();
        console.log(`FAIL: ${p.title.substring(0, 40).padEnd(42)} ${res.status}: ${t.slice(0, 80)}`);
      }
    } catch (e) {
      console.log(`ERR: ${p.title.substring(0, 40).padEnd(42)} ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }
  console.log(`\nUpdated: ${updated}/${all.length}`);
}

main().catch(e => console.error('Fatal:', e.message));
