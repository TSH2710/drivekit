/**
 * Creates missing Shopify variants from CJ CSV data.
 * Run directly: node scripts/create-variants.js
 */
const TOKEN = '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';
const API = 'https://dc5byu-fy.myshopify.com/admin/api/2024-10';

const fs = require('fs');

async function sf(path) {
  const res = await fetch(API + path, { headers: { 'X-Shopify-Access-Token': TOKEN } });
  if (!res.ok) throw new Error(res.status);
  return res.json();
}
async function sput(path, body) {
  const res = await fetch(API + path, {
    method: 'PUT',
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t.slice(0, 300)); }
  return res.json();
}

// Load CJ CSV
const csv = fs.readFileSync('cj-products.csv', 'utf-8');
const lines = csv.split('\n').filter(l => l.trim()).slice(1);
const cjByTitle = {};
for (const line of lines) {
  let cols = [], cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur.trim());
  const t = cols[0] || '';
  const spec = cols[3] || '';
  if (!t || !spec) continue;
  if (!cjByTitle[t]) cjByTitle[t] = [];
  cjByTitle[t].push(spec);
}

// Manual CJ → Shopify title mappings
const mappings = {
  "Multi-Purpose Auto Seat Organizer Bag": "Premium Seatback Car Organizer",
  "Car snow block front windshield antifreeze cover winter front gear snowboard windshield snow cover frost guard": "Magnetic Windshield Snow Cover",
  "Car Scratch Remover For Autos Body Paint Scratch Care Auto Car Care Polishing And Polishing Compound Paste Car Paint Repair": "Car Scratch Remover Repair Kit",
  "Automatic Portable Handheld Digital LED Smart Car Air Compressor": "Smart LED Digital Tire Inflator",
  "Solar Auto Rotation Car Air Freshener Perfume Seat": "Kinetic Solar Car Air Freshener",
  "Car headrest pillow Sleep Adjustable Side Car Soft Travel Seat Headrest Auto Leather Support Neck Pillow Cushion car accessories": "Car Seat Neck Support Pillow",
  "Car Aromatherapy Diffuser Cloud Mist Air Freshener Auto Decoration Natural Fragrance Auto Decoration Tool For RVs Trucks Sedans": "Cloud Mist Car Aroma Diffuser",
  "Foldable Car Windshield Sun Shade Umbrella UV Protection Heat Insulation Parasol Auto Front Window Cover Interior Protector Summer Gadgets": "Foldable Windshield Sun Shade",
  "Foldable Car Cup Holder Drinking Bottle Holder Cup Stand Bracket Sunglasses Phone Organizer Stowing Tidying Car Styling": "2-in-1 Foldable Car Cup Holder",
  "Two-color Couble-sided Car Dual-use Cleaning Car Wash Towel": "Car Wash Cleaning Gloves",
  "Car Accessories For Women Aromatherapy Car Interior Accessories": "Crystal Diamond Car Air Freshener",
  "Storage bags between seats": "Car Seat Back Storage Pocket",
  "High Power Wet and Dry Vacuum Cleaner Car Vacuum Cleaner Super Suction Haipa Handheld": "Wet & Dry Car Vacuum Cleaner",
  "Car Light": "Car LED Ambient Light Strip",
  "Multifunctional car desk computer desk": "Backseat Folding Car Desk Tray",
  "Car Tracker Magnetic Mini Car Tracker GPS Real Time Tracking Locator Device Recordable Anti-lost Rechargeable Locator": "Magnetic Mini GPS Car Tracker",
  "7 IPS Car Smart Screen Wireless Carplay Auto Mobile Phone Projection Screen Navigation": "7-Inch Wireless CarPlay Display",
  "Car Humidifier Air Purifier Freshener Essential Oil Diffuser": "Mini Car Humidifier & Air Purifier",
  "Colorful Cup Holder LED Light-up Coaster Solar & USB Charging Non-slip Coaster Ambient Light For Car Automatically": "RGB LED Cup Holder Coaster Light",
  "Anti-lost tracking alarm": "Mini Anti-Lost GPS Tracker Alarm",
  "Non-Slip Car Phone Pad For 4-in-1 Car Parking Number Card Anti-Slip Mat Auto Phone Holder Sticky Anti Slide Dash Phone Mount": "4-in-1 Non-Slip Phone Dash Mat",
  "Car Diffuser Humidifier Car Humidifier Aromatherapy Diffusers Car Odor Eliminator For Car Home Office Bedroom": "Car Aromatherapy Diffuser & Purifier",
  "Car Led Strip Light For Neon Party Decoration Light Bicycle Dance Lamp 12V Waterproof USB Strips Lamps": "Car LED Ambient Light Strip",
  "Car Bumper Protector Strip Guard Corner Protection Strips Scratch Protector Crash Blade Anti-collision Auto Accessories": "Carbon Fiber Bumper Guard Strips",
  "Plug And Play ECOOBD2 Gasoline Car Fuel Economy ECO OBD2 Driver": "ECO OBD2 Fuel Saver Chip",
  "1080P HD Rearview Mirror Driving Recorder": "Mirror Dash Cam 1080P Full HD",
  "Car Cup Holders Car-styling Car Truck Drink Water Cup Bottle Can Holder Door Mount Stand ABS Rubber Drinks Holders": "Rotating Multi-Angle Door Cup Holder",
  "HQ Leather Car Seat Organizers": "Leather Car Seat Back Organizer",
  "Car Rearview Mirror Swivel Navigation Bracket": "360 Rearview Mirror Phone Mount",
  "AutoClean Tm  Wireless Portable Car Vacuum Cleaner": "AutoClean Wireless Mini Vacuum",
  "Car Storage Bag Handbag Holder Car Seat Storage Organizer Handbag Holder Auto Interior Stowing Tidying Car Middle Organizer": "Car Seat Storage Organizer Bag",
  "Helmet Motorcycle Light Riding Signal Strip Flashing Durable Kit Bar Diy Helmet Led Strip Reflector Cold Light Film": "Motorcycle Helmet LED Signal Strip",
  "Rearview Mirror Phone Holder For Car Rotatable And Retractable Car Phone Holder Multifunctional 360 Rear View Mirror Phone Holder Suitable For All Mobile Phones And All Car": "360 Rearview Mirror Phone Mount",
  "3 In 1 Car Heater Defogger Plug In Cigarette Lighter Mini Car Heater Defroster ABS Car Heaters Fan Defogger Anti-Fog": "3-in-1 Car Heater Defogger Fan",
  "PU Leather Car Storage Bag Multifunction Seat Back Tray Hanging Bag Waterproof Car Organizer Automotive Interior Accessories": "Car Seat Storage Organizer Bag",
  "Wireless Car Vacuum Cleaner Portable Handheld High-power Vacuum Cleaner For Car Home Office Keyboard Cleaning": "5000Pa Handheld Car Vacuum",
  "Cordless Snow Scraper With Battery Life Durable Electric Ice Scraper Portable Window For Auto Deicing": "Cordless Electric Ice Scraper",
  "Car Led Decoration Cold Light Interior Modification Strip USB Car Atmosphere Light Lamp Line": "Car LED Ambient Light Strip",
  "Car Vacuum Cleaner Wireless 5000Pa Handheld Mini Vaccum Cleaner For Car Home Desktop Cleaning Portable Vacuum Cleaner": "5000Pa Handheld Car Vacuum",
  "Portable Kinetic Car Air Freshener Solar Powered Double Ring Rotating Air Cleaner Perfume Fragrance Diffuser": "Kinetic Solar Car Air Freshener",
  "Car Phone Holder Long Rod Telescopic Car Dashboard Suction Cup Type": "Telescopic Dashboard Phone Mount",
  "Car Cleaning Brush Ice Scraper Detachable Snow Shovel Brush Dust Remove Brush Auto Windshield Extendable Snow Brush Foam Handle": "Extendable Snow Brush Ice Scraper",
};

async function main() {
  // Get all Shopify products
  let all = [], lastId;
  while (true) {
    const data = await sf('/products.json?limit=250' + (lastId ? '&since_id=' + lastId : ''));
    all.push(...data.products);
    if (data.products.length < 250) break;
    lastId = data.products[data.products.length - 1].id;
  }
  const prodByTitle = {};
  all.forEach(p => prodByTitle[p.title] = p);

  let totalCreated = 0, totalFails = 0;

  for (const [cjTitle, shopifyTitle] of Object.entries(mappings)) {
    const shopify = prodByTitle[shopifyTitle];
    if (!shopify) { console.log('NOT FOUND: ' + shopifyTitle); totalFails++; continue; }

    const cjVariants = cjByTitle[cjTitle] || [];
    const existing = new Set(shopify.variants.map(v => v.title));
    const missing = cjVariants.filter(v => !existing.has(v));
    if (missing.length === 0) { console.log('SAME: ' + shopifyTitle.slice(0, 40)); continue; }

    try {
      const optName = shopify.options[0]?.name || 'Title';
      const mergedVals = [...new Set([...(shopify.options[0]?.values || []), ...missing])];
      const existingVariants = shopify.variants.map(v => ({
        id: v.id, option1: v.option1 || v.title || 'Default Title', price: v.price,
      }));
      const newVariants = missing.map(v => ({ option1: v, price: '6.00' }));

      await sput('/products/' + shopify.id + '.json', {
        product: { id: shopify.id, options: [{ name: optName, values: mergedVals }], variants: [...existingVariants, ...newVariants] },
      });
      totalCreated += missing.length;
      console.log('OK: ' + shopifyTitle.slice(0, 40).padEnd(42) + ' +' + missing.length + ' variants');
    } catch (e) {
      totalFails++;
      console.log('FAIL: ' + shopifyTitle.slice(0, 40).padEnd(42) + ' ' + e.message.slice(0, 80));
    }
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n=== Done ===');
  console.log('Created:', totalCreated, 'Fails:', totalFails);
}

main().catch(e => console.error('Fatal:', e.message));
