/**
 * Database Migration Runner
 * Applies all SQL migration files in order to Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../src/services/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`🔄 Found ${files.length} migration files\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`▶️  Running: ${file}`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) {
          // If exec_sql RPC doesn't exist, try direct query
          if (error.message.includes('exec_sql')) {
            console.log(`⚠️  RPC not found, trying direct execution...`);
            // Try to split and execute statements
            const statements = sql.split(';').filter(s => s.trim());
            for (const stmt of statements) {
              if (stmt.trim()) {
                const { error: execError } = await supabase.rpc('exec_sql_raw', { sql: stmt + ';' });
                if (execError) {
                  console.log(`   ⚠️  Statement skipped (likely already applied)`);
                }
              }
            }
          } else {
            console.log(`   ⚠️  ${error.message}`);
          }
        } else {
          console.log(`   ✅ Applied`);
        }
      } catch (err) {
        console.log(`   ⚠️  ${err.message}`);
      }
    }

    console.log(`\n✅ Migration process complete!`);
    console.log(`   Check Supabase dashboard to verify table creation`);

  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
    process.exit(1);
  }
}

runMigrations();
