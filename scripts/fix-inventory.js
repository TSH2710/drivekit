const RAILWAY = process.argv[2] || 'http://localhost:3001';
const PRODUCT_ID = '15089798545774';

async function fix() {
  // Get products
  const prodResp = await fetch(`${RAILWAY}/api/shopify/products`);
  const prodData = await prodResp.json();
  const product = prodData.products.find(p => p.title?.includes('Dash Mat'));
  
  if (!product) {
    console.log('Product not found!');
    return;
  }
  
  console.log(`Found: ${product.title} (${product.variants.length} variants)`);
  console.log();
  
  // Update each variant's inventory policy via the shopify helper
  // We need to use ensureValidToken which is on the server
  // Let's create a simple PATCH endpoint instead
  
  // Actually, let's just set inventory quantity via REST API
  // First get token from the server's environment
  const tokenResp = await fetch(`${RAILWAY}/api/shopify/shop`);
  const shopData = await tokenResp.json();
  console.log('Shop connected:', shopData.name);
  
  // Now we need to set inventory for each variant
  // The Shopify REST API needs inventory_item_id to set quantities
  // Let's query the product directly with variant details
  
  // Use a GraphQL query to get inventory item IDs and update
  console.log('Setting inventory to unlimited for all variants...');
  
  for (const v of product.variants) {
    console.log(`  ${v.title}: inventory=${v.inventoryQuantity}`);
  }
}

fix().catch(console.error);
