import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Resetting all generating statuses to pending...');
    
    // Reset all generating statuses to pending
    const { data, error } = await supabase
      .from('species')
      .update({ generation_status: 'pending' })
      .in('generation_status', ['generating_image', 'generating_video']);
    
    if (error) {
      console.error('Error resetting statuses:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('Successfully reset generating statuses');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All generating statuses reset to pending'
    });
    
  } catch (error) {
    console.error('Error in reset-statuses:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}