import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting stuck status reset process...');
    
    // Find species stuck in generating status for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuckSpecies, error: fetchError } = await supabase
      .from('species')
      .select('id, common_name, generation_status, updated_at, image_url, video_url, supabase_image_url, supabase_video_url')
      .in('generation_status', ['generating_image', 'generating_video'])
      .lt('updated_at', tenMinutesAgo);
    
    if (fetchError) {
      console.error('Error fetching stuck species:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch stuck species' }, { status: 500 });
    }
    
    if (!stuckSpecies || stuckSpecies.length === 0) {
      console.log('✅ No stuck species found');
      return NextResponse.json({ 
        message: 'No stuck species found',
        resetCount: 0,
        stuckSpecies: []
      });
    }
    
    console.log(`🔍 Found ${stuckSpecies.length} stuck species:`, 
      stuckSpecies.map(s => `${s.common_name} (${s.generation_status})`));
    
    // Reset each stuck species to appropriate status
    const resetPromises = stuckSpecies.map(async (species) => {
      let newStatus = 'pending';
      
      // Determine appropriate status based on what media exists
      if (species.supabase_video_url || species.video_url) {
        newStatus = 'completed';
      } else if (species.supabase_image_url || species.image_url) {
        newStatus = 'image_generated'; // Has image, ready for video generation
      } else {
        newStatus = 'pending'; // No media, start from beginning
      }
      
      console.log(`🔄 Resetting ${species.common_name} from ${species.generation_status} to ${newStatus}`);
      
      const { error: updateError } = await supabase
        .from('species')
        .update({
          generation_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', species.id);
      
      if (updateError) {
        console.error(`❌ Failed to reset ${species.common_name}:`, updateError);
        return { species: species.common_name, success: false, error: updateError.message };
      }
      
      console.log(`✅ Successfully reset ${species.common_name} to ${newStatus}`);
      return { species: species.common_name, success: true, oldStatus: species.generation_status, newStatus };
    });
    
    const results = await Promise.all(resetPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`🎉 Reset complete: ${successCount} successful, ${failureCount} failed`);
    
    return NextResponse.json({
      message: `Reset ${successCount} stuck species`,
      resetCount: successCount,
      failureCount,
      results,
      stuckSpecies: stuckSpecies.map(s => ({
        id: s.id,
        common_name: s.common_name,
        generation_status: s.generation_status,
        updated_at: s.updated_at,
        stuckDuration: Math.round((Date.now() - new Date(s.updated_at).getTime()) / (1000 * 60)) + ' minutes'
      }))
    });
    
  } catch (error) {
    console.error('❌ Error in reset-stuck-statuses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset stuck statuses' },
      { status: 500 }
    );
  }
}

// GET endpoint to just check for stuck statuses without resetting
export async function GET(request: NextRequest) {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuckSpecies, error } = await supabase
      .from('species')
      .select('id, common_name, generation_status, updated_at')
      .in('generation_status', ['generating_image', 'generating_video'])
      .lt('updated_at', tenMinutesAgo);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stuck species' }, { status: 500 });
    }
    
    return NextResponse.json({
      stuckCount: stuckSpecies?.length || 0,
      stuckSpecies: stuckSpecies?.map(s => ({
        id: s.id,
        common_name: s.common_name,
        generation_status: s.generation_status,
        updated_at: s.updated_at,
        stuckDuration: Math.round((Date.now() - new Date(s.updated_at).getTime()) / (1000 * 60)) + ' minutes'
      })) || []
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check stuck statuses' },
      { status: 500 }
    );
  }
}