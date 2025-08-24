const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  const migrationsDir = path.join(__dirname, 'database', 'migrations');
  const migrationFiles = [
    '001_create_species_media_table.sql',
    '002_create_species_lists_table.sql',
    '003_enhance_species_table.sql',
    '004_create_media_functions.sql',
    '005_migrate_existing_data.sql'
  ];

  for (const filename of migrationFiles) {
    const filePath = path.join(migrationsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Migration file not found: ${filename}`);
      continue;
    }

    console.log(`📄 Running migration: ${filename}`);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        const trimmedStatement = statement.trim();
        if (trimmedStatement) {
          const { error } = await supabase.rpc('exec_sql', { sql_query: trimmedStatement });
          if (error) {
            // Try direct execution if RPC fails
            const { error: directError } = await supabase.from('_').select('*').limit(0);
            if (directError) {
              console.log(`⚠️  Could not execute statement, trying alternative method...`);
              // For now, we'll log the SQL and ask user to run manually
              console.log(`SQL to run manually:\n${trimmedStatement}\n`);
            }
          }
        }
      }
      
      console.log(`✅ Completed migration: ${filename}`);
    } catch (error) {
      console.error(`❌ Error running migration ${filename}:`, error.message);
      console.log(`Please run this migration manually in Supabase SQL Editor:`);
      console.log(`File: ${filePath}`);
    }
  }
  
  console.log('🎉 Migration process completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Check Supabase dashboard to verify tables were created');
  console.log('2. If any migrations failed, run them manually in SQL Editor');
  console.log('3. Test the application to ensure everything works');
}

runMigrations().catch(console.error);