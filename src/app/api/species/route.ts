import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side operations to ensure we can read all data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('Fetching species from database...');
    
    // Check if environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({
        error: 'Server configuration error: Missing database credentials'
      }, { status: 500 });
    }

    const { data: species, error } = await supabase
      .from('species')
      .select('*')
      .order('common_name', { ascending: true });

    if (error) {
      console.error('Error fetching species:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`,
        details: error
      }, { status: 500 });
    }

    console.log(`Successfully fetched ${species?.length || 0} species`);
    
    return NextResponse.json({
      species: species || [],
      count: species?.length || 0
    });
    
  } catch (error) {
    console.error('Error in species API:', error);
    return NextResponse.json({
      error: 'Failed to fetch species',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}