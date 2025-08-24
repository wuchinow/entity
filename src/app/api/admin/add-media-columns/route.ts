import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Adding missing columns to species_media table...');
    
    // Add is_hidden column
    try {
      const { error: hiddenError } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE species_media ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;'
      });
      if (hiddenError) console.log('is_hidden column may already exist:', hiddenError.message);
    } catch (e) {
      console.log('is_hidden column handling:', e);
    }
    
    // Add is_favorite column
    try {
      const { error: favoriteError } = await supabase.rpc('exec', {
        sql: 'ALTER TABLE species_media ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;'
      });
      if (favoriteError) console.log('is_favorite column may already exist:', favoriteError.message);
    } catch (e) {
      console.log('is_favorite column handling:', e);
    }
    
    // Test if columns exist by querying
    const { data: testData, error: testError } = await supabase
      .from('species_media')
      .select('is_hidden, is_favorite')
      .limit(1);
    
    if (testError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Columns still missing after attempt to add them',
        details: testError.message
      }, { status: 500 });
    }
    
    console.log('✅ Media columns added/verified successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Media columns added successfully',
      columns: ['is_hidden', 'is_favorite']
    });
    
  } catch (err) {
    console.error('Error adding media columns:', err);
    return NextResponse.json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}