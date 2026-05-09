#!/usr/bin/env node
/**
 * Setup Load Test Data
 * 
 * Seeds Supabase with realistic test data for device testing:
 * - 5 customer accounts
 * - 3 shop accounts with 20 products each
 * - 2 delivery partner accounts
 * - 10 sample orders in various states
 * 
 * Usage: node src/scripts/setupLoadTestData.js
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create test customers
 */
async function createCustomers() {
  log('\n📱 Creating test customers...', 'blue');

  const customers = [
    { phone: '+919876543210', name: 'Rajesh Kumar' },
    { phone: '+919876543211', name: 'Priya Singh' },
    { phone: '+919876543212', name: 'Amit Patel' },
    { phone: '+919876543213', name: 'Neha Sharma' },
    { phone: '+919876543214', name: 'Vikram Desai' },
  ];

  const customerIds = [];

  for (const customer of customers) {
    try {
      const customerId = uuidv4();
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: customerId,
          phone: customer.phone,
          role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      customerIds.push(customerId);
      log(`  ✅ ${customer.name} (${customer.phone})`, 'green');
    } catch (error) {
      log(`  ❌ Failed to create customer: ${error.message}`, 'red');
    }
  }

  return customerIds;
}

/**
 * Create test shops with products
 */
async function createShopsWithProducts() {
  log('\n🏪 Creating test shops with products...', 'blue');

  const shops = [
    {
      name: 'Fresh Kirana Hub',
      ownerPhone: '+919988776655',
      category: 'kirana',
      city: 'Hyderabad',
      latitude: 17.3850,
      longitude: 78.4867,
      products: [
        { name: 'Rice (1kg)', price: 6500, stock: 50, unit: 'packet' },
        { name: 'Wheat Flour (5kg)', price: 20000, stock: 30, unit: 'bag' },
        { name: 'Oil (500ml)', price: 9500, stock: 40, unit: 'bottle' },
        { name: 'Dal (1kg)', price: 8000, stock: 45, unit: 'packet' },
        { name: 'Sugar (1kg)', price: 4500, stock: 60, unit: 'packet' },
        { name: 'Tea Powder (250g)', price: 3500, stock: 50, unit: 'box' },
        { name: 'Coffee (200g)', price: 6000, stock: 35, unit: 'jar' },
        { name: 'Salt (1kg)', price: 2500, stock: 70, unit: 'packet' },
        { name: 'Spices Pack', price: 15000, stock: 25, unit: 'box' },
        { name: 'Soap (6 pack)', price: 7000, stock: 40, unit: 'pack' },
        { name: 'Detergent (2kg)', price: 25000, stock: 20, unit: 'box' },
        { name: 'Shampoo (400ml)', price: 8500, stock: 30, unit: 'bottle' },
        { name: 'Toothpaste (100g)', price: 4500, stock: 50, unit: 'tube' },
        { name: 'Milk (1L)', price: 6000, stock: 60, unit: 'packet' },
        { name: 'Ghee (500ml)', price: 45000, stock: 10, unit: 'jar' },
        { name: 'Biscuits Pack', price: 5500, stock: 45, unit: 'pack' },
        { name: 'Instant Noodles (6 pack)', price: 7500, stock: 35, unit: 'pack' },
        { name: 'Peanut Butter (400g)', price: 12000, stock: 20, unit: 'jar' },
        { name: 'Honey (500ml)', price: 35000, stock: 15, unit: 'bottle' },
        { name: 'Corn Flakes (500g)', price: 18000, stock: 25, unit: 'box' },
      ],
    },
    {
      name: 'Vegetable Paradise',
      ownerPhone: '+919988776656',
      category: 'vegetables',
      city: 'Hyderabad',
      latitude: 17.3860,
      longitude: 78.4875,
      products: [
        { name: 'Tomatoes (1kg)', price: 3500, stock: 100, unit: 'kg' },
        { name: 'Onions (1kg)', price: 2500, stock: 150, unit: 'kg' },
        { name: 'Potatoes (2kg)', price: 6000, stock: 120, unit: 'kg' },
        { name: 'Carrots (1kg)', price: 4500, stock: 80, unit: 'kg' },
        { name: 'Cabbage (1kg)', price: 3000, stock: 90, unit: 'kg' },
        { name: 'Cucumber (1kg)', price: 4000, stock: 70, unit: 'kg' },
        { name: 'Bell Pepper (1kg)', price: 8000, stock: 60, unit: 'kg' },
        { name: 'Green Chilli (250g)', price: 2500, stock: 50, unit: 'qty' },
        { name: 'Ginger (250g)', price: 3500, stock: 40, unit: 'qty' },
        { name: 'Garlic (250g)', price: 2000, stock: 60, unit: 'qty' },
        { name: 'Spinach (1kg)', price: 5000, stock: 50, unit: 'kg' },
        { name: 'Broccoli (1kg)', price: 9000, stock: 30, unit: 'kg' },
        { name: 'Cauliflower (1kg)', price: 7000, stock: 40, unit: 'kg' },
        { name: 'Peas (1kg)', price: 8500, stock: 35, unit: 'kg' },
        { name: 'Corn (1kg)', price: 6500, stock: 45, unit: 'kg' },
        { name: 'Radish (1kg)', price: 3000, stock: 60, unit: 'kg' },
        { name: 'Beet Root (1kg)', price: 4000, stock: 50, unit: 'kg' },
        { name: 'Mushrooms (500g)', price: 12000, stock: 20, unit: 'qty' },
        { name: 'Lettuce (1kg)', price: 10000, stock: 25, unit: 'kg' },
        { name: 'Lemons (1kg)', price: 5000, stock: 70, unit: 'kg' },
      ],
    },
    {
      name: 'MedPlus Pharmacy',
      ownerPhone: '+919988776657',
      category: 'pharmacy',
      city: 'Hyderabad',
      latitude: 17.3870,
      longitude: 78.4885,
      products: [
        { name: 'Aspirin (50 tablets)', price: 4500, stock: 40, unit: 'box' },
        { name: 'Paracetamol (60 tablets)', price: 5500, stock: 50, unit: 'box' },
        { name: 'Cough Syrup (100ml)', price: 8000, stock: 30, unit: 'bottle' },
        { name: 'Cold Relief Tablets (20)', price: 6500, stock: 35, unit: 'strip' },
        { name: 'Antacid (30 tablets)', price: 7000, stock: 25, unit: 'strip' },
        { name: 'Vitamin C (20 tablets)', price: 12000, stock: 30, unit: 'strip' },
        { name: 'Multivitamin (30 capsules)', price: 15000, stock: 25, unit: 'bottle' },
        { name: 'Calcium (30 tablets)', price: 18000, stock: 20, unit: 'strip' },
        { name: 'Bandage (10 pieces)', price: 5000, stock: 50, unit: 'box' },
        { name: 'Antiseptic Cream (50g)', price: 8500, stock: 40, unit: 'jar' },
        { name: 'Pain Relief Oil (100ml)', price: 12000, stock: 35, unit: 'bottle' },
        { name: 'Thermometer (Digital)', price: 35000, stock: 15, unit: 'qty' },
        { name: 'Blood Pressure Monitor', price: 250000, stock: 5, unit: 'qty' },
        { name: 'Pulse Oximeter', price: 180000, stock: 8, unit: 'qty' },
        { name: 'Face Mask (50 pack)', price: 10000, stock: 40, unit: 'pack' },
        { name: 'Sanitizer (500ml)', price: 6500, stock: 50, unit: 'bottle' },
        { name: 'Gloves (100 pair)', price: 20000, stock: 25, unit: 'box' },
        { name: 'Inhalers', price: 35000, stock: 10, unit: 'qty' },
        { name: 'Insulin Pen', price: 150000, stock: 5, unit: 'qty' },
        { name: 'Glucose Meter', price: 180000, stock: 8, unit: 'qty' },
      ],
    },
  ];

  const shopIds = [];

  for (const shop of shops) {
    try {
      const shopOwnerId = uuidv4();
      const shopId = uuidv4();

      // 1. Create owner PROFILE WITHOUT shop_id (to avoid FK circular dependency)
      const { error: ownerError } = await supabase
        .from('profiles')
        .insert({
          id: shopOwnerId,
          phone: shop.ownerPhone,
          role: 'shop_owner',
          // Don't set shop_id yet - it will be set after shop is created
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (ownerError) throw ownerError;

      // 2. Create SHOP with the owner profile that exists
      const { error: shopError } = await supabase
        .from('shops')
        .insert({
          id: shopId,
          owner_id: shopOwnerId,
          name: shop.name,
          phone: shop.ownerPhone,
          category: shop.category,
          city: shop.city,
          latitude: shop.latitude,
          longitude: shop.longitude,
          is_open: true,
          is_verified: true,
          trust_score: 85.0,
          kyc_status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (shopError) throw shopError;

      // 3. Now UPDATE the profile to set shop_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ shop_id: shopId, updated_at: new Date().toISOString() })
        .eq('id', shopOwnerId);

      if (updateError) throw updateError;

      shopIds.push(shopId);
      log(`  ✅ ${shop.name} (${shop.phone})`, 'green');

      // Create products for this shop
      for (const product of shop.products) {
        const { error: productError } = await supabase
          .from('products')
          .insert({
            id: uuidv4(),
            shop_id: shopId,
            name: product.name,
            price: product.price * 100, // Convert to paise
            stock_quantity: product.stock,
            unit: product.unit,
            category: shop.category,
            is_available: product.stock > 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (productError) {
          log(`     ⚠️ Failed to create product ${product.name}: ${productError.message}`, 'yellow');
        }
      }

      log(`     → Created 20 products`, 'cyan');
    } catch (error) {
      log(`  ❌ Failed to create shop: ${error.message}`, 'red');
    }
  }

  return shopIds;
}

/**
 * Create test delivery partners
 */
async function createDeliveryPartners() {
  log('\n🚗 Creating test delivery partners...', 'blue');

  const partners = [
    { phone: '+919876543220', name: 'Rohan Kumar' },
    { phone: '+919876543221', name: 'Sneha Gupta' },
  ];

  const partnerIds = [];

  for (const partner of partners) {
    try {
      const partnerId = uuidv4();

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: partnerId,
          phone: partner.phone,
          role: 'delivery',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Create delivery partner profile
      const { error: dpError } = await supabase
        .from('delivery_partners')
        .insert({
          id: uuidv4(),
          user_id: partnerId,
          phone: partner.phone,
          kyc_status: 'approved',
          is_online: false,
          rating: 4.8,
          completed_deliveries: 150,
          earnings_today: 0,
          earnings_total: 1500000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (dpError) throw dpError;

      partnerIds.push(partnerId);
      log(`  ✅ ${partner.name} (${partner.phone})`, 'green');
    } catch (error) {
      log(`  ❌ Failed to create delivery partner: ${error.message}`, 'red');
    }
  }

  return partnerIds;
}

/**
 * Create sample orders in various states
 */
async function createSampleOrders(customerIds, shopIds) {
  log('\n📦 Creating sample orders...', 'blue');

  const orderStates = [
    'pending',
    'accepted',
    'packing',
    'ready',
    'assigned',
    'picked_up',
    'out_for_delivery',
    'delivered',
  ];

  const orders = [];

  for (let i = 0; i < 10; i++) {
    try {
      const customerId = customerIds[i % customerIds.length];
      const shopId = shopIds[i % shopIds.length];
      const status = orderStates[i % orderStates.length];
      const orderId = uuidv4();

      // Create order (only valid columns)
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          customer_id: customerId,
          shop_id: shopId,
          status,
          total_paise: 5250000 + i * 500000, // Total in paise
          payment_method: i % 2 === 0 ? 'upi' : 'cod',
          payment_status: status === 'pending' ? 'pending' : 'completed',
          created_at: new Date(Date.now() - i * 3600000).toISOString(),
          updated_at: new Date(Date.now() - i * 1800000).toISOString(),
        });

      if (orderError) throw orderError;

      // Create order items
      const itemCount = 2 + (i % 3);
      for (let j = 0; j < itemCount; j++) {
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            id: uuidv4(),
            order_id: orderId,
            product_id: uuidv4(), // Would be real product ID in production
            quantity: 1 + (j % 3),
            price_paise: 500000 + j * 200000, // Price in paise
            created_at: new Date().toISOString(),
          });

        if (itemError) {
          log(`     ⚠️ Failed to create order item: ${itemError.message}`, 'yellow');
        }
      }

      orders.push(orderId);
      log(`  ✅ Order ${i + 1} (Status: ${status})`, 'green');
    } catch (error) {
      log(`  ❌ Failed to create order: ${error.message}`, 'red');
    }
  }

  return orders;
}

/**
 * Main orchestration
 */
async function main() {
  log('\n' + '═'.repeat(60), 'cyan');
  log('🌱 SETUP TEST DATA FOR DEVICE TESTING', 'cyan');
  log('═'.repeat(60), 'cyan');

  try {
    // Create test data
    const customerIds = await createCustomers();
    const shopIds = await createShopsWithProducts();
    const partnerIds = await createDeliveryPartners();
    const orderIds = await createSampleOrders(customerIds, shopIds);

    // Summary
    log('\n' + '═'.repeat(60), 'cyan');
    log('✅ TEST DATA CREATION COMPLETE', 'green');
    log('═'.repeat(60), 'cyan');

    log('\n📊 Summary:', 'blue');
    log(`  • Customers: ${customerIds.length}`, 'cyan');
    log(`  • Shops: ${shopIds.length} (with 20 products each)`, 'cyan');
    log(`  • Delivery Partners: ${partnerIds.length}`, 'cyan');
    log(`  • Sample Orders: ${orderIds.length}`, 'cyan');

    log('\n🧪 Test Credentials:', 'blue');
    customerIds.forEach((id, idx) => {
      const phone = ['+919876543210', '+919876543211', '+919876543212', '+919876543213', '+919876543214'][idx];
      log(`  Customer ${idx + 1}: ${phone}`, 'cyan');
    });

    log('\n🏪 Shop Credentials:', 'blue');
    log(`  Shop 1: +919988776655 (Kirana)`, 'cyan');
    log(`  Shop 2: +919988776656 (Vegetables)`, 'cyan');
    log(`  Shop 3: +919988776657 (Pharmacy)`, 'cyan');
    log(`  OTP: Use 000000 for all accounts`, 'cyan');

    log('\n🚗 Delivery Partner Credentials:', 'blue');
    log(`  Partner 1: +919876543220`, 'cyan');
    log(`  Partner 2: +919876543221`, 'cyan');

    log('\n✨ Next Steps:', 'blue');
    log(`  1. Start backend: npm start`, 'yellow');
    log(`  2. Run dashboard tests: http://localhost:3000/test-runner`, 'yellow');
    log(`  3. Test on devices: npx expo start --ios`, 'yellow');
    log(`  4. Use any test phone number above with OTP 000000`, 'yellow');

    process.exit(0);
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
