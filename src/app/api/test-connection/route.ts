import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }
    
    // Test database connection
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Testing simple query...');
    const { data, error, count } = await supabase
      .from('species')
      .select('id, common_name', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: error
      }, { status: 500 });
    }
    
    console.log('Query successful:', { count, sampleData: data });
    
    return NextResponse.json({
      success: true,
      message: 'Database connection working',
      data: {
        totalSpecies: count,
        sampleSpecies: data,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}