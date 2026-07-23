/**
 * Adds compare-at-prices (sale pricing) to the top products.
 * Run: node scripts/add-sale-pricing.js
 */

const API = 'https://dc5byu-fy.myshopify.com/admin/api/2024-10';
const TOKEN = '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';

async function shopifyFetch(path) {
  const res = await fetch(API + path, {
    headers: { 'X-Shopify-Access-Token': TOKEN },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function main() {
  // Get all products
  let all = [], lastId;
  while (true) {
    const data = await shopifyFetch(`/products.json?limit=250${lastId ? '&since_id=' + lastId : ''}`);
    all.push(...data.products);
    if (data.products.length < 250) break;
    lastId = data.products[data.products.length - 1].id;
  }
  console.log('Total products:', all.length);

  // Sort by variant count and pick top 15
  const top = all.sort((a, b) => b.variants.length - a.variants.length).slice(0, 15);

  for (const p of top) {
    const minPrice = Math.min(...p.variants.map(v => parseFloat(v.price)));
    const multiplier = minPrice < 10 ? 1.35 : 1.25;

    // Set compare-at per variant based on its own price
    const updates = p.variants.map(v => {
      const price = parseFloat(v.price);
      const compareAt = Math.ceil(price * multiplier * 100) / 100;
      return { id: v.id, compare_at_price: String(compareAt) };
    });

    const savings = ((1 - 1 / multiplier) * 100).toFixed(0);

    try {
      const res = await fetch(`${API}/products/${p.id}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': TOKEN,
        },
        body: JSON.stringify({ product: { id: p.id, variants: updates } }),
      });
      if (res.ok) {
        const wasPrice = Math.ceil(minPrice * multiplier * 100) / 100;
        console.log(`OK: ${p.title.substring(0, 40).padEnd(42)} $${minPrice.toFixed(2)} → was $${wasPrice.toFixed(2)} (-${savings}%)`);
      } else {
        const t = await res.text();
        console.log(`FAIL: ${p.title.substring(0, 40).padEnd(42)} ${res.status}: ${t.slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`ERR: ${p.title.substring(0, 40).padEnd(42)} ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }
}

main().catch(e => console.error('Fatal:', e.message));
