/**
 * Test the Supabase mock implementation
 * Verify that insert and query operations work correctly
 */

// Must import this FIRST to get the mocked supabase
import '../setupEnv.js';

import { v4 as uuidv4 } from 'uuid';

// NOW import supabase after mocks are set up
const supabaseModule = require('../../src/services/supabase.js');
const { supabase } = supabaseModule;

describe('Supabase Mock - Basic Operations', () => {
  beforeEach(() => {
    supabase.__clear();
  });

  afterEach(() => {
    supabase.__clear();
  });

  it('should insert and retrieve a single record', async () => {
    const shopId = uuidv4();
    const ownerId = uuidv4();

    // Step 1: Insert a shop
    const { data: insertedShop, error: insertError } = await supabase
      .from('shops')
      .insert({
        id: shopId,
        owner_id: ownerId,
        name: 'Test Shop',
        latitude: 17.3850,
        longitude: 78.4867,
        category: 'kirana',
        is_open: true,
      });

    console.log('INSERT RESULT:', { insertedShop, insertError });
    expect(insertError).toBeNull();
    expect(insertedShop.id).toBe(shopId);

    // Step 2: Query the shop using eq and single
    const { data: foundShop, error: queryError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    console.log('QUERY RESULT:', { foundShop, queryError });
    expect(queryError).toBeNull();
    expect(foundShop).not.toBeNull();
    expect(foundShop.id).toBe(shopId);
    expect(foundShop.name).toBe('Test Shop');
  });

  it('should filter by owner_id', async () => {
    const shopId = uuidv4();
    const ownerId = uuidv4();

    // Insert shop
    await supabase.from('shops').insert({
      id: shopId,
      owner_id: ownerId,
      name: 'Owner Shop',
      latitude: 17.3850,
      longitude: 78.4867,
      category: 'kirana',
      is_open: true,
    });

    // Query by owner_id
    const { data: shop, error } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single();

    console.log('FILTER TEST:', { shop, error });
    expect(error).toBeNull();
    expect(shop.owner_id).toBe(ownerId);
  });

  it('should test storage persistence across method chains', async () => {
    const storage = supabase.__getStorage();
    console.log('Initial storage keys:', Array.from(storage.keys()));

    // Insert into shops table
    const shopId = uuidv4();
    const insertResult = await supabase.from('shops').insert({
      id: shopId,
      name: 'Chain Test Shop',
    });

    console.log('After insert, storage keys:', Array.from(storage.keys()));
    console.log('Shops in storage:', storage.get('shops'));

    // Now query
    const queryResult = await supabase
      .from('shops')
      .eq('id', shopId)
      .single();

    console.log('Query result:', queryResult);
    expect(queryResult.data).not.toBeNull();
    expect(queryResult.data.id).toBe(shopId);
  });
});
