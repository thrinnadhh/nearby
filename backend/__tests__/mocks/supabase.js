/**
 * Supabase mock for integration tests
 * Provides in-memory implementation of common Supabase operations
 */

const storage = new Map();

const createMockQueryBuilder = (table, data = null) => {
  let filterColumn = null;
  let filterValue = null;
  let filterOp = null;
  let shouldReturnSingle = false;
  
  return {
    select: jest.fn(function(columns = '*') {
      return this;
    }),
    insert: jest.fn(async function(records) {
      const records_array = Array.isArray(records) ? records : [records];
      const inserted = records_array.map(record => ({
        id: record.id || require('uuid').v4(),
        ...record,
      }));

      if (!storage.has(table)) {
        storage.set(table, []);
      }
      const tableData = storage.get(table);
      tableData.push(...inserted);
      storage.set(table, tableData);

      return {
        data: inserted.length === 1 ? inserted[0] : inserted,
        error: null,
      };
    }),
    upsert: jest.fn(async function(records, options = {}) {
      const records_array = Array.isArray(records) ? records : [records];
      if (!storage.has(table)) {
        storage.set(table, []);
      }
      const tableData = storage.get(table);
      
      // Simple upsert: merge with existing records
      for (const record of records_array) {
        const existingIdx = tableData.findIndex(r => r.id === record.id);
        if (existingIdx >= 0) {
          tableData[existingIdx] = { ...tableData[existingIdx], ...record };
        } else {
          tableData.push({
            id: record.id || require('uuid').v4(),
            ...record,
          });
        }
      }
      storage.set(table, tableData);
      
      return {
        data: records_array.length === 1 ? records_array[0] : records_array,
        error: null,
      };
    }),
    update: jest.fn(async function(record) {
      if (!storage.has(table)) {
        storage.set(table, []);
      }
      const tableData = storage.get(table);
      if (filterColumn && filterValue !== null) {
        const idx = tableData.findIndex(r => {
          if (filterOp === 'eq') return r[filterColumn] === filterValue;
          if (filterOp === 'neq') return r[filterColumn] !== filterValue;
          return false;
        });
        if (idx >= 0) {
          tableData[idx] = { ...tableData[idx], ...record };
        }
      }
      storage.set(table, tableData);
      return {
        data: record,
        error: null,
      };
    }),
    delete: jest.fn(async function() {
      if (filterColumn && filterValue !== null) {
        if (!storage.has(table)) {
          return { data: [], error: null };
        }
        const tableData = storage.get(table);
        const filtered = tableData.filter(r => {
          if (filterOp === 'eq') return r[filterColumn] !== filterValue;
          return true;
        });
        storage.set(table, filtered);
      } else if (storage.has(table)) {
        storage.delete(table);
      }
      return {
        data: [],
        error: null,
      };
    }),
    eq: jest.fn(function(column, value) {
      filterColumn = column;
      filterValue = value;
      filterOp = 'eq';
      return this;
    }),
    neq: jest.fn(function(column, value) {
      filterColumn = column;
      filterValue = value;
      filterOp = 'neq';
      return this;
    }),
    lt: jest.fn(function(column, value) {
      filterColumn = column;
      filterValue = value;
      filterOp = 'lt';
      return this;
    }),
    lte: jest.fn(function(column, value) {
      filterColumn = column;
      filterValue = value;
      filterOp = 'lte';
      return this;
    }),
    gt: jest.fn(function(column, value) {
      filterColumn = column;
      filterValue = value;
      filterOp = 'gt';
      return this;
    }),
    gte: jest.fn(function(column, value) {
      filterColumn = column;
      filterValue = value;
      filterOp = 'gte';
      return this;
    }),
    limit: jest.fn(function(count) {
      return this;
    }),
    offset: jest.fn(function(count) {
      return this;
    }),
    order: jest.fn(function(column, options) {
      return this;
    }),
    single: jest.fn(async function() {
      if (!storage.has(table)) {
        return { data: null, error: null };
      }
      const tableData = storage.get(table) || [];
      
      if (filterColumn && filterValue !== null) {
        const found = tableData.find(record => {
          if (filterOp === 'eq') return record[filterColumn] === filterValue;
          if (filterOp === 'neq') return record[filterColumn] !== filterValue;
          if (filterOp === 'lt') return record[filterColumn] < filterValue;
          if (filterOp === 'lte') return record[filterColumn] <= filterValue;
          if (filterOp === 'gt') return record[filterColumn] > filterValue;
          if (filterOp === 'gte') return record[filterColumn] >= filterValue;
          return false;
        });
        return {
          data: found || null,
          error: found ? null : { message: 'No rows found' },
        };
      }
      
      return { data: tableData[0] || null, error: null };
    }),
  };
};

const supabase = {
  from: jest.fn((table) => {
    return createMockQueryBuilder(table);
  }),

  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'mock-user' } } },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'mock-user' } },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({
      error: null,
    }),
  },

  // Helper to insert test data
  __insertTestData: (table, records) => {
    if (!storage.has(table)) {
      storage.set(table, []);
    }
    const tableData = storage.get(table);
    const with_ids = (Array.isArray(records) ? records : [records]).map(r => ({
      id: r.id || require('uuid').v4(),
      ...r,
    }));
    tableData.push(...with_ids);
    storage.set(table, tableData);
  },

  // Helper to clear test data
  __clear: () => storage.clear(),

  // Helper to get test data
  __getStorage: () => storage,
};

export { supabase };
