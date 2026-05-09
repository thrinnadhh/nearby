#!/usr/bin/env node
/**
 * Setup Test Data - Direct SQL Approach
 * Bypasses Supabase ORM to avoid FK constraint issues
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n🌱 Setting up test data via direct SQL...\n');

  try {
    // Delete old test data first
    console.log('🗑️  Clearing old test data...');
    const { error: deleteError } = await supabase.rpc('execute_sql', {
      sql: `
        DELETE FROM public.profiles WHERE phone IN (
          '+919876543210', '+919876543211', '+919876543212', '+919876543213', '+919876543214',
          '+919988776655', '+919988776656', '+919988776657',
          '+919876543220', '+919876543221'
        );
      `
    });

    if (deleteError) {
      // RPC might not exist, try direct delete instead
      await supabase
        .from('profiles')
        .delete()
        .in('phone', [
          '+919876543210', '+919876543211', '+919876543212', '+919876543213', '+919876543214',
          '+919988776655', '+919988776656', '+919988776657',
          '+919876543220', '+919876543221'
        ]);
    }

    console.log('✅ Old data cleared\n');

    // Now insert fresh test data
    console.log('📱 Creating test customers...');
    const customers = [
      { id: uuidv4(), phone: '+919876543210', name: 'Rajesh Kumar' },
      { id: uuidv4(), phone: '+919876543211', name: 'Priya Singh' },
      { id: uuidv4(), phone: '+919876543212', name: 'Amit Patel' },
      { id: uuidv4(), phone: '+919876543213', name: 'Neha Sharma' },
      { id: uuidv4(), phone: '+919876543214', name: 'Vikram Desai' },
    ];

    for (const customer of customers) {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: customer.id,
          phone: customer.phone,
          role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      console.log(`  ✅ ${customer.name} (${customer.phone})`);
    }

    console.log('\n🏪 Creating test shops...');
    
    const adminId = uuidv4(); // Temporary admin to own shops
    
    // Create admin profile first (no shop_id requirement for non-shop_owner roles)
    const { error: adminError } = await supabase
      .from('profiles')
      .insert({
        id: adminId,
        phone: '+919199999999', // Valid Indian phone
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (adminError) throw adminError;

    // Generate UUIDs for shop owners
    const shopOwners = [
      { id: uuidv4(), phone: '+919988776655', name: 'Shop Owner 1' },
      { id: uuidv4(), phone: '+919988776656', name: 'Shop Owner 2' },
      { id: uuidv4(), phone: '+919988776657', name: 'Shop Owner 3' },
    ];

    // Generate UUIDs for shops
    const shops = [
      { id: uuidv4(), name: 'Fresh Kirana Hub', category: 'kirana', ownerPhone: '+919988776655', lat: 17.3850, long: 78.4867 },
      { id: uuidv4(), name: 'Vegetable Paradise', category: 'vegetables', ownerPhone: '+919988776656', lat: 17.3860, long: 78.4875 },
      { id: uuidv4(), name: 'MedPlus Pharmacy', category: 'pharmacy', ownerPhone: '+919988776657', lat: 17.3870, long: 78.4885 },
    ];

    // Create shops with admin as temporary owner
    for (let i = 0; i < shops.length; i++) {
      const { error } = await supabase
        .from('shops')
        .insert({
          id: shops[i].id,
          owner_id: adminId,
          name: shops[i].name,
          phone: shops[i].ownerPhone,
          category: shops[i].category,
          city: 'Hyderabad',
          latitude: shops[i].lat,
          longitude: shops[i].long,
          is_open: true,
          is_verified: true,
          trust_score: 85.0,
          kyc_status: 'approved',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    }

    // Now create real shop owner profiles
    for (let i = 0; i < shopOwners.length; i++) {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: shopOwners[i].id,
          phone: shopOwners[i].phone,
          role: 'shop_owner',
          shop_id: shops[i].id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    }

    // Update shops to point to real owners
    for (let i = 0; i < shops.length; i++) {
      const { error } = await supabase
        .from('shops')
        .update({ owner_id: shopOwners[i].id, updated_at: new Date().toISOString() })
        .eq('id', shops[i].id);
      if (error) throw error;
      console.log(`  ✅ ${shops[i].name} (${shops[i].ownerPhone})`);
    }

    // Clean up: delete the temporary admin profile
    const { error: adminDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', adminId);
    if (adminDeleteError) {
      console.log(`  ⚠️  Could not delete temp admin: ${adminDeleteError.message}`);
    }

    console.log('\n🚗 Creating test delivery partners...');
    const partners = [
      { id: uuidv4(), phone: '+919876543220', name: 'Rohan Kumar' },
      { id: uuidv4(), phone: '+919876543221', name: 'Sneha Gupta' },
    ];

    for (const partner of partners) {
      // Create profile
      const { error: pError } = await supabase
        .from('profiles')
        .insert({
          id: partner.id,
          phone: partner.phone,
          role: 'delivery',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (pError) throw pError;

      // Create delivery partner record
      const { error: dpError } = await supabase
        .from('delivery_partners')
        .insert({
          id: uuidv4(),
          user_id: partner.id,
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
      console.log(`  ✅ ${partner.name} (${partner.phone})`);
    }

    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST DATA SETUP COMPLETE');
    console.log('═'.repeat(60));

    console.log('\n📊 Created:');
    console.log(`  • 5 Customers`);
    console.log(`  • 3 Shops with owners`);
    console.log(`  • 2 Delivery Partners`);

    console.log('\n🧪 Test Credentials:');
    console.log(`  Customers: +919876543210 to +919876543214`);
    console.log(`  Shops: +919988776655, +919988776656, +919988776657`);
    console.log(`  Delivery: +919876543220, +919876543221`);
    console.log(`  OTP: 000000 (for all)`);

    console.log('\n✨ Next: Start backend and begin device testing!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
