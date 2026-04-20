/**
 * Supabase mock for integration tests
 * Provides in-memory implementation of common Supabase operations
 * 
 * Key improvements:
 * - Clear storage before each test via setupEnv.js beforeEach hook
 * - Proper state tracking for filter chaining (eq, neq, lt, gt, gte, lte)
 * - RPC method support with JSON-RPC style responses
 * - Async/await for all operations (mimics real Supabase behavior)
 */

const storage = new Map();

/**
 * Create a stateful query builder that tracks filters across method chains
 * Each builder instance has its own filter state, preventing cross-test pollution
 */
const createMockQueryBuilder = (table) => {
  // State for this specific query builder instance
  let filterColumn = null;
  let filterValue = null;
  let filterOp = null;
  let selectedColumns = null;
  let isDelete = false;
  let operationType = null; // 'insert', 'update', 'upsert', or null for queries
  let operationData = null; // parameters for the operation
  
  const executeDelete = () => {
    if (!storage.has(table)) {
      return { data: [], error: null };
    }

    const tableData = storage.get(table);

    // Apply filter if present
    if (filterColumn && filterValue !== null) {
      const filtered = tableData.filter(r => {
        if (filterOp === 'eq') return r[filterColumn] !== filterValue;
        if (filterOp === 'neq') return r[filterColumn] === filterValue;
        if (filterOp === 'lt') return r[filterColumn] >= filterValue;
        if (filterOp === 'lte') return r[filterColumn] > filterValue;
        if (filterOp === 'gt') return r[filterColumn] <= filterValue;
        if (filterOp === 'gte') return r[filterColumn] < filterValue;
        return true;
      });
      storage.set(table, filtered);
    } else {
      // No filter = clear entire table
      storage.delete(table);
    }

    return {
      data: [],
      error: null,
    };
  };

  const executeInsert = (records) => {
    const recordsArray = Array.isArray(records) ? records : [records];
    const inserted = recordsArray.map(record => ({
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
  };

  const executeUpdate = (updates) => {
    if (!storage.has(table)) {
      storage.set(table, []);
    }

    const tableData = storage.get(table);
    
    // Apply filter if present
    if (filterColumn && filterValue !== null) {
      const idx = tableData.findIndex(r => {
        if (filterOp === 'eq') return r[filterColumn] === filterValue;
        if (filterOp === 'neq') return r[filterColumn] !== filterValue;
        if (filterOp === 'lt') return r[filterColumn] < filterValue;
        if (filterOp === 'lte') return r[filterColumn] <= filterValue;
        if (filterOp === 'gt') return r[filterColumn] > filterValue;
        if (filterOp === 'gte') return r[filterColumn] >= filterValue;
        return false;
      });

      if (idx >= 0) {
        tableData[idx] = { ...tableData[idx], ...updates };
      }
    }

    storage.set(table, tableData);
    
    return {
      data: updates,
      error: null,
    };
  };

  const executeUpsert = (records, options = {}) => {
    const recordsArray = Array.isArray(records) ? records : [records];
    
    if (!storage.has(table)) {
      storage.set(table, []);
    }

    const tableData = storage.get(table);
    
    // Merge with existing records based on id
    for (const record of recordsArray) {
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
      data: recordsArray.length === 1 ? recordsArray[0] : recordsArray,
      error: null,
    };
  };

  const queryBuilder = {
    select: jest.fn(function(columns = '*') {
      selectedColumns = columns === '*' ? null : columns.split(',').map(c => c.trim());
      return this;
    }),

    insert: jest.fn(function(records) {
      operationType = 'insert';
      operationData = records;
      return this;
    }),

    upsert: jest.fn(function(records, options = {}) {
      operationType = 'upsert';
      operationData = { records, options };
      return this;
    }),

    update: jest.fn(function(updates) {
      operationType = 'update';
      operationData = updates;
      return this;
    }),

    delete: jest.fn(function() {
      isDelete = true;
      return this;
    }),

    // Filter operators - all return 'this' to enable chaining
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

    // Pagination and ordering
    limit: jest.fn(function(count) {
      return this;
    }),

    offset: jest.fn(function(count) {
      return this;
    }),

    range: jest.fn(function(from, to) {
      return this;
    }),

    order: jest.fn(function(column, options) {
      return this;
    }),

    // is() filter — handles IS NULL / IS NOT NULL checks
    is: jest.fn(function(column, value) {
      // For IS NULL check: filter out records where column is not null
      // For IS NOT NULL: filter out records where column is null
      // We store this as an additional filter (simple implementation)
      // This overrides the previous filter — limitation of single-filter mock
      if (value === null) {
        // is null — keep records where the column IS null
        filterColumn = column;
        filterValue = null;
        filterOp = 'is_null';
      }
      return this;
    }),

    // Fetch single record or null
    single: jest.fn(async function() {
      if (!storage.has(table)) {
        return { data: null, error: null };
      }

      const tableData = storage.get(table) || [];
      let filtered = tableData;

      // Apply filter if present
      if (filterColumn && filterValue !== null) {
        filtered = tableData.filter(record => {
          if (filterOp === 'eq') return record[filterColumn] === filterValue;
          if (filterOp === 'neq') return record[filterColumn] !== filterValue;
          if (filterOp === 'lt') return record[filterColumn] < filterValue;
          if (filterOp === 'lte') return record[filterColumn] <= filterValue;
          if (filterOp === 'gt') return record[filterColumn] > filterValue;
          if (filterOp === 'gte') return record[filterColumn] >= filterValue;
          return false;
        });
      }

      const found = filtered[0];

      // Apply column selection if needed
      if (found && selectedColumns) {
        const selected = {};
        selectedColumns.forEach(col => {
          if (col in found) {
            selected[col] = found[col];
          }
        });
        return {
          data: selected,
          error: null,
        };
      }

      return {
        data: found || null,
        error: found ? null : { message: 'No rows found' },
      };
    }),

    // Make the query builder thenable so it can be awaited
    // This executes any pending operation (insert, update, upsert, delete)
    then: function(onFulfilled, onRejected) {
      return new Promise((resolve, reject) => {
        try {
          let result;
          
          if (operationType === 'insert') {
            result = executeInsert(operationData);
          } else if (operationType === 'update') {
            result = executeUpdate(operationData);
          } else if (operationType === 'upsert') {
            result = executeUpsert(operationData.records, operationData.options);
          } else if (isDelete) {
            result = executeDelete();
          } else {
            result = { data: null, error: null };
          }
          
          if (onFulfilled) {
            resolve(onFulfilled(result));
          } else {
            resolve(result);
          }
        } catch (err) {
          if (onRejected) {
            reject(onRejected(err));
          } else {
            reject(err);
          }
        }
      });
    },
  };

  return queryBuilder;
};

const supabase = {
  // Main query method - creates new stateful builder
  from: jest.fn((table) => {
    return createMockQueryBuilder(table);
  }),

  // RPC method for stored procedures
  rpc: jest.fn(async (functionName, params = {}) => {
    // Simulated RPC responses
    if (functionName === 'get_top_products') {
      // For now, return empty for RPC functions
      // Tests should use fallback path in actual code
      return {
        data: null,
        error: { message: 'RPC not implemented in mock' },
      };
    }

    return {
      data: null,
      error: { message: `RPC function ${functionName} not implemented` },
    };
  }),

  // Auth methods (mocked)
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

  // Test helpers - used by setupEnv.js
  __insertTestData: (table, records) => {
    if (!storage.has(table)) {
      storage.set(table, []);
    }
    const tableData = storage.get(table);
    const withIds = (Array.isArray(records) ? records : [records]).map(r => ({
      id: r.id || require('uuid').v4(),
      ...r,
    }));
    tableData.push(...withIds);
    storage.set(table, tableData);
  },

  __clear: () => {
    storage.clear();
  },

  __clearTable: (table) => {
    storage.delete(table);
  },

  __getStorage: () => storage,
};

export { supabase };
