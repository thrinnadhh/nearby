/**
 * Supabase mock for integration tests
 * Provides in-memory implementation of common Supabase operations
 * 
 * Key improvements:
 * - Clear storage before each test via setupEnv.js beforeEach hook
 * - Proper state tracking for filter chaining (eq, neq, lt, gt, gte, lte)
 * - RPC method support with JSON-RPC style responses
 * - Async/await for all operations (mimics real Supabase behavior)
 * - Proper handling of .insert().select() chains
 */

const storage = new Map();

/**
 * Create a stateful query builder that tracks filters across method chains
 * Each builder instance has its own filter state, preventing cross-test pollution
 */
const createMockQueryBuilder = (table) => {
  // State for this specific query builder instance
  const filters = []; // Array of {column, value, op} to support multiple chained filters
  let selectedColumns = null;
  let isDelete = false;
  let rangeFrom = null;
  let rangeTo = null;
  let operationType = null; // 'insert', 'update', 'upsert', or null for queries
  let operationData = null; // parameters for the operation
  let sortColumn = null;
  let sortAscending = true;
  let pendingInsertData = null; // Track if insert().select() is chained
  
  const applyFilters = (tableData) => {
    // Apply all filters in sequence (AND logic)
    return tableData.filter(row => {
      return filters.every(filter => {
        const { column, value, op } = filter;
        const cellValue = row[column];
        
        if (op === 'eq') return cellValue === value;
        if (op === 'neq') return cellValue !== value;
        if (op === 'lt') return cellValue < value;
        if (op === 'lte') return cellValue <= value;
        if (op === 'gt') return cellValue > value;
        if (op === 'gte') return cellValue >= value;
        if (op === 'is') return value === null ? cellValue === null : cellValue !== null;
        return true;
      });
    });
  };
  
  const applySort = (tableData) => {
    // Apply sorting if set
    if (sortColumn) {
      return tableData.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return sortAscending ? comparison : -comparison;
      });
    }
    return tableData;
  };

  const applyPagination = (tableData) => {
    // Apply range limits if set
    if (rangeFrom !== null && rangeTo !== null) {
      return tableData.slice(rangeFrom, rangeTo + 1);
    }
    return tableData;
  };

  const executeDelete = () => {
    if (!storage.has(table)) {
      return {
        data: [],
        error: null,
      };
    }

    let tableData = storage.get(table);

    if (filters.length > 0) {
      const matchingIndices = tableData
        .map((row, idx) => {
          const matches = filters.every(filter => {
            const { column, value, op } = filter;
            const cellValue = row[column];
            
            if (op === 'eq') return cellValue === value;
            if (op === 'neq') return cellValue !== value;
            if (op === 'lt') return cellValue < value;
            if (op === 'lte') return cellValue <= value;
            if (op === 'gt') return cellValue > value;
            if (op === 'gte') return cellValue >= value;
            if (op === 'is') return value === null ? cellValue === null : cellValue !== null;
            return true;
          });
          return matches ? idx : -1;
        })
        .filter(idx => idx >= 0);

      const toDelete = matchingIndices.map(idx => tableData[idx]);
      tableData = tableData.filter((_, idx) => !matchingIndices.includes(idx));
      storage.set(table, tableData);
      return {
        data: toDelete,
        error: null,
      };
    }

    storage.delete(table);

    return {
      data: [],
      error: null,
    };
  };

  const executeSelect = () => {
    if (!storage.has(table)) {
      return { data: [], error: null };
    }

    let tableData = storage.get(table);
    
    // Add relationship joins before filtering
    if (table === 'disputes') {
      tableData = tableData.map(item => {
        if (item.order_id) {
          const order = (storage.get('orders') || []).find(o => o.id === item.order_id);
          if (order) {
            item.orders = [{ id: order.id, total_amount: order.total_amount, payment_id: order.payment_id }];
          }
        }
        return item;
      });
    }

    // Apply all filters
    if (filters.length > 0) {
      tableData = applyFilters(tableData);
    }

    // Apply sorting
    tableData = applySort(tableData);

    // Apply pagination
    tableData = applyPagination(tableData);

    // Apply column selection if specified (but preserve relationship arrays)
    if (selectedColumns) {
      tableData = tableData.map(row => {
        const selected = {};
        selectedColumns.forEach(col => {
          selected[col] = row[col];
        });
        // Always include relationship arrays even if not explicitly selected
        if (Array.isArray(row.orders)) selected.orders = row.orders;
        if (Array.isArray(row.customers)) selected.customers = row.customers;
        if (Array.isArray(row.shops)) selected.shops = row.shops;
        if (Array.isArray(row.products)) selected.products = row.products;
        if (Array.isArray(row.order_items)) selected.order_items = row.order_items;
        return selected;
      });
    }

    return {
      data: tableData,
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
    
    // Apply filters if present
    if (filters.length > 0) {
      const matchingIndices = tableData
        .map((row, idx) => {
          const matches = filters.every(filter => {
            const { column, value, op } = filter;
            const cellValue = row[column];
            
            if (op === 'eq') return cellValue === value;
            if (op === 'neq') return cellValue !== value;
            if (op === 'lt') return cellValue < value;
            if (op === 'lte') return cellValue <= value;
            if (op === 'gt') return cellValue > value;
            if (op === 'gte') return cellValue >= value;
            if (op === 'is') return value === null ? cellValue === null : cellValue !== null;
            return true;
          });
          return matches ? idx : -1;
        })
        .filter(idx => idx >= 0);

      // Update all matching rows
      matchingIndices.forEach(idx => {
        tableData[idx] = { ...tableData[idx], ...updates };
      });
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
      // If there's a pending insert, we need to handle .insert().select() chain
      if (pendingInsertData !== null && operationType === 'insert') {
        // Execute insert first, then apply select to the result
        const insertResult = executeInsert(pendingInsertData);
        pendingInsertData = null;
        operationType = 'select';
        // For insert().select(), return the inserted data with selected columns
        if (selectedColumns) {
          const inserted = Array.isArray(insertResult.data) ? insertResult.data : [insertResult.data];
          const selected = inserted.map(row => {
            const result = {};
            selectedColumns.forEach(col => {
              result[col] = row[col];
            });
            return result;
          });
          return { ...this, _pendingSelectResult: { data: selected, error: null } };
        }
        return { ...this, _pendingSelectResult: insertResult };
      }
      
      operationType = 'select';
      selectedColumns = columns === '*' ? null : columns.split(',').map(c => c.trim());
      return this;
    }),

    insert: jest.fn(function(records) {
      operationType = 'insert';
      operationData = records;
      pendingInsertData = records; // Store for insert().select() chains
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
      filters.push({ column, value, op: 'eq' });
      return this;
    }),

    neq: jest.fn(function(column, value) {
      filters.push({ column, value, op: 'neq' });
      return this;
    }),

    lt: jest.fn(function(column, value) {
      filters.push({ column, value, op: 'lt' });
      return this;
    }),

    lte: jest.fn(function(column, value) {
      filters.push({ column, value, op: 'lte' });
      return this;
    }),

    gt: jest.fn(function(column, value) {
      filters.push({ column, value, op: 'gt' });
      return this;
    }),

    gte: jest.fn(function(column, value) {
      filters.push({ column, value, op: 'gte' });
      return this;
    }),

    is: jest.fn(function(column, value) {
      filters.push({ column, value, op: 'is' });
      return this;
    }),

    or: jest.fn(function(filter) {
      // Simple OR implementation - store as special filter
      // For now, ignore complex OR queries
      return this;
    }),

    order: jest.fn(function(column, options = {}) {
      sortColumn = column;
      sortAscending = !options.ascending || options.ascending !== false;
      return this;
    }),

    limit: jest.fn(function(count) {
      rangeTo = Math.max(0, count - 1);
      return this;
    }),

    range: jest.fn(function(from, to) {
      rangeFrom = from;
      rangeTo = to;
      return this;
    }),

    offset: jest.fn(function(count) {
      rangeFrom = count;
      return this;
    }),

    distinct: jest.fn(function() {
      // For now, just return this - distinct is a no-op in the mock
      // In real Supabase, this would remove duplicate rows based on selected columns
      return this;
    }),

    single: jest.fn(function() {
      // If we have a pending select result from insert().select(), use it
      if (this._pendingSelectResult) {
        const result = this._pendingSelectResult;
        delete this._pendingSelectResult;
        return Promise.resolve(result);
      }

      return new Promise((resolve) => {
        let result;
        
        // If we have an insert operation, execute it and return the inserted record
        if (operationType === 'insert') {
          const insertResult = executeInsert(operationData);
          result = {
            data: Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data,
            error: insertResult.error,
          };
        } else {
          // If we have filters applied, treat this as an implicit select
          const hasFilters = filters.length > 0;
          if (operationType === 'select' || selectedColumns || hasFilters) {
            const selectResult = executeSelect();
            const found = selectResult.data[0] || null;
            
            // Don't filter columns if we have relationships - pass through all data
            if (found) {
              result = {
                data: found,
                error: null,
              };
            } else {
              result = {
                data: null,
                error: { message: 'No rows found' },
              };
            }
          } else {
            result = {
              data: null,
              error: { message: 'No operation specified' },
            };
          }
        }

        resolve(result);
      });
    }),

    // Make the query builder thenable so it can be awaited
    // This executes any pending operation (insert, update, upsert, delete, select)
    then: function(onFulfilled, onRejected) {
      return new Promise((resolve, reject) => {
        try {
          let result;
          
          // Handle .insert().select() chain - if we have pending insert and select is next
          if (operationType === 'insert' && operationData) {
            result = executeInsert(operationData);
            pendingInsertData = null;
          } else if (operationType === 'update') {
            result = executeUpdate(operationData);
          } else if (operationType === 'upsert') {
            result = executeUpsert(operationData.records, operationData.options);
          } else if (operationType === 'select') {
            result = executeSelect();
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
    signInWithPassword: jest.fn(async () => ({ user: null, error: null })),
  },

  // Storage methods (mocked)
  storage: {
    from: jest.fn((bucket) => ({
      upload: jest.fn(async () => ({ data: null, error: null })),
      download: jest.fn(async () => ({ data: null, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/file' } })),
    })),
  },

  // Test helper methods for clearing and seeding data
  __clear: jest.fn(function() {
    storage.clear();
  }),

  __clearTable: jest.fn(function(tableName) {
    if (storage.has(tableName)) {
      storage.get(tableName).length = 0;
    }
  }),

  __insertTestData: jest.fn(function(tableName, records) {
    if (!storage.has(tableName)) {
      storage.set(tableName, []);
    }
    const table = storage.get(tableName);
    if (Array.isArray(records)) {
      table.push(...records);
    } else {
      table.push(records);
    }
  }),

  __getStorage: jest.fn(function() {
    return storage;
  }),
};

module.exports = { supabase };
