#!/bin/bash
# Quick migration helper script for Supabase

echo "🔄 Database Migration Helper"
echo "============================"
echo ""
echo "To apply database migrations to your Supabase project:"
echo ""
echo "Option 1: Using Supabase Dashboard (Recommended - Easiest)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Go to https://app.supabase.com → Your Project → SQL Editor"
echo "2. Click 'New Query'"
echo "3. Copy the SQL from migrations in this order:"
echo ""

cd "$(dirname "$0")/../../supabase/migrations" || exit 1

for file in *.sql; do
  echo "   $(basename "$file")"
done

echo ""
echo "4. Paste SQL content into the editor and click 'Run'"
echo "5. Repeat for each migration file in order"
echo ""
echo "Option 2: Using psql (If you have PostgreSQL tools)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "psql postgresql://<user>:<password>@<host>:5432/<database> < 001_profiles.sql"
echo "psql postgresql://<user>:<password>@<host>:5432/<database> < 002_shops.sql"
echo "# ... etc for all migrations"
echo ""
echo "Option 3: Using Supabase CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "brew install supabase/tap/supabase"
echo "supabase link --project-ref <your-project-ref>"
echo "supabase db push"
echo ""
echo "After applying migrations, verify:"
echo "cd /Users/trinadh/projects/nearby/backend"
echo "NODE_ENV=development node --require dotenv/config -e \"
import { supabase } from './src/services/supabase.js';
const { data, error } = await supabase.from('shops').select('count');
console.log('Shops table:', error ? 'ERROR: ' + error.message : 'OK - Ready for testing');
\""
echo ""
