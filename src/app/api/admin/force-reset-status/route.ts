import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { species_id, new_status } = await request.json();
    
    console.log(`Force updating species ${species_id} to status: ${new_status}`);
    
    // Force update with service role key
    const { data, error } = await supabase
      .from('species')
      .update({ 
        generation_status: new_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', species_id)
      .select();
      
    if (error) {
      console.error('Force update error:', error);
      throw error;
    }
    
    console.log('Force update result:', data);
    
    return NextResponse.json({ 
      success: true, 
      message: `Force updated species ${species_id} to ${new_status}`,
      data: data
    });
    
  } catch (error) {
    console.error('Error in force reset:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}