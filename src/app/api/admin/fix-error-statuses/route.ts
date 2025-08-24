import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting ERROR status fix process...');
    
    // Find all species with ERROR status
    const { data: errorSpecies, error: fetchError } = await supabase
      .from('species')
      .select('id, common_name, generation_status, image_url, video_url, supabase_image_url, supabase_video_url')
      .eq('generation_status', 'error');
    
    if (fetchError) {
      console.error('Error fetching ERROR species:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch ERROR species' }, { status: 500 });
    }
    
    if (!errorSpecies || errorSpecies.length === 0) {
      console.log('✅ No ERROR species found');
      return NextResponse.json({ 
        message: 'No ERROR species found',
        resetCount: 0,
        errorSpecies: []
      });
    }
    
    console.log(`🔍 Found ${errorSpecies.length} ERROR species:`, 
      errorSpecies.map(s => s.common_name));
    
    // Reset each ERROR species to appropriate status
    const resetPromises = errorSpecies.map(async (species) => {
      let newStatus = 'pending';
      
      // Check if species has any media in the species_media table
      const { data: mediaData, error: mediaError } = await supabase
        .from('species_media')
        .select('media_type, url')
        .eq('species_id', species.id);
      
      if (!mediaError && mediaData && mediaData.length > 0) {
        const hasImages = mediaData.some(m => m.media_type === 'image');
        const hasVideos = mediaData.some(m => m.media_type === 'video');
        
        if (hasVideos) {
          newStatus = 'completed';
        } else if (hasImages) {
          newStatus = 'image_generated';
        } else {
          newStatus = 'pending';
        }
      } else {
        // Fallback to checking legacy columns
        if (species.supabase_video_url || species.video_url) {
          newStatus = 'completed';
        } else if (species.supabase_image_url || species.image_url) {
          newStatus = 'image_generated';
        } else {
          newStatus = 'pending';
        }
      }
      
      console.log(`🔄 Resetting ${species.common_name} from ERROR to ${newStatus}`);
      
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
      return { species: species.common_name, success: true, oldStatus: 'error', newStatus };
    });
    
    const results = await Promise.all(resetPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`🎉 ERROR status fix complete: ${successCount} successful, ${failureCount} failed`);
    
    return NextResponse.json({
      message: `Fixed ${successCount} ERROR species`,
      resetCount: successCount,
      failureCount,
      results,
      errorSpecies: errorSpecies.map(s => ({
        id: s.id,
        common_name: s.common_name,
        generation_status: s.generation_status
      }))
    });
    
  } catch (error) {
    console.error('❌ Error in fix-error-statuses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix ERROR statuses' },
      { status: 500 }
    );
  }
}

// GET endpoint to check ERROR statuses
export async function GET(request: NextRequest) {
  try {
    const { data: errorSpecies, error } = await supabase
      .from('species')
      .select('id, common_name, generation_status')
      .eq('generation_status', 'error');
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch ERROR species' }, { status: 500 });
    }
    
    return NextResponse.json({
      errorCount: errorSpecies?.length || 0,
      errorSpecies: errorSpecies?.map(s => ({
        id: s.id,
        common_name: s.common_name,
        generation_status: s.generation_status
      })) || []
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check ERROR statuses' },
      { status: 500 }
    );
  }
}