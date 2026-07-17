// Standalone script to patch Shopify variant images and prices
// Run this on Railway server where the token is cached

const fs = require('fs');
const path = require('path');

const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'dc5byu-fy';
const SHOPIFY_API = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2024-01`;

const UPDATES = [
  { variantId: "54343583924590", imageId: "65606813712750", price: "9.99", name: "Red / 1PC" },
  { variantId: "54343583957358", imageId: "65606814433646", price: "16.99", name: "Red / 2PCS" },
  { variantId: "54343583990126", imageId: "65606814597486", price: "9.99", name: "White / 1PC" },
  { variantId: "54343584022894", imageId: "65606814237038", price: "16.99", name: "White / 2PCS" },
  { variantId: "54343584055662", imageId: "65606813843822", price: "9.99", name: "Black / 1PC" },
  { variantId: "54343584350574", imageId: "65606813843822", price: "16.99", name: "Black / 2PCS" },
  { variantId: "54343584383342", imageId: "65606813745518", price: "9.99", name: "Red A / 1PC" },
  { variantId: "54343584416110", imageId: "65606813647214", price: "16.99", name: "Red A / 2PCS" },
  { variantId: "54343584448878", imageId: "65606814007662", price: "9.99", name: "Cartoon / 1PC" },
  { variantId: "54343584481646", imageId: "65606814073198", price: "16.99", name: "Cartoon / 2PCS" },
  { variantId: "54343584514414", imageId: "65606814531950", price: "9.99", name: "Chinese dream / 1PC" },
  { variantId: "54343584579950", imageId: "65606814564718", price: "9.99", name: "Safe journey / 1PC" },
  { variantId: "54343584612718", imageId: "65606814499182", price: "9.99", name: "Single bracket / 1PC" },
];

async function getToken() {
  const cachePaths = [
    path.join(process.cwd(), 'data', 'shopify-token.json'),
    path.join(process.cwd(), '.shopify-token-cache.json'),
    path.join(__dirname, '..', 'data', 'shopify-token.json'),
  ];
  for (const p of cachePaths) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (data.accessToken) return data.accessToken;
    } catch {}
  }
  return process.env.SHOPIFY_ACCESS_TOKEN || '';
}

async function main() {
  const token = await getToken();
  if (!token) { console.error('ERROR: No Shopify token found'); process.exit(1); }
  console.log(`Token loaded (${token.slice(0, 8)}...)`);

  let success = 0, failed = 0;

  for (const u of UPDATES) {
    try {
      const patchBody = { id: parseInt(u.variantId) };
      if (u.price) patchBody.price = u.price;
      if (u.imageId) patchBody.image_id = parseInt(u.imageId);

      const res = await fetch(`${SHOPIFY_API}/variants/${u.variantId}.json`, {
        method: 'PATCH',
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant: patchBody }),
      });
      const text = await res.text();
      if (res.ok) {
        success++;
        console.log(`  ✅ ${u.name}: price=$${u.price}, image=${u.imageId}`);
      } else {
        failed++;
        console.log(`  ❌ ${u.name}: HTTP ${res.status} — ${text.slice(0, 120)}`);
      }
    } catch (err) {
      failed++;
      console.log(`  ❌ ${u.name}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed`);
}

main();
