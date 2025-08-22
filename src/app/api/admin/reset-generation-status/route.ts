import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { species_id } = await request.json();
    
    if (species_id) {
      // Reset specific species
      const { error } = await supabase
        .from('species')
        .update({ generation_status: 'pending' })
        .eq('id', species_id);
        
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        message: `Reset generation status for species ${species_id}`
      });
    } else {
      // Reset all stuck generations
      const { error } = await supabase
        .from('species')
        .update({ generation_status: 'pending' })
        .in('generation_status', ['generating_image', 'generating_video', 'generating']);
        
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        message: 'Reset all stuck generation statuses'
      });
    }
  } catch (error) {
    console.error('Error resetting generation status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}