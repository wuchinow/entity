import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('Fixing stuck generation statuses...');
    
    // Get all species
    const { data: species, error: fetchError } = await supabase
      .from('species')
      .select('*');

    if (fetchError) {
      throw fetchError;
    }

    let fixedCount = 0;
    const updates = [];

    for (const spec of species || []) {
      const hasImage = spec.supabase_image_url || spec.image_url;
      const hasVideo = spec.supabase_video_url || spec.video_url;
      let newStatus = spec.generation_status;

      // Fix stuck statuses based on actual media presence
      if (hasImage && hasVideo) {
        // Has both - should be completed
        if (spec.generation_status !== 'completed') {
          newStatus = 'completed';
        }
      } else if (hasImage && !hasVideo) {
        // Has image but no video - should be generating_video or completed
        if (spec.generation_status === 'generating_image' || spec.generation_status === 'pending') {
          newStatus = 'generating_video';
        }
      } else if (!hasImage && !hasVideo) {
        // No media - should be pending
        if (spec.generation_status !== 'pending' && spec.generation_status !== 'generating_image') {
          newStatus = 'pending';
        }
      }

      // If status needs updating
      if (newStatus !== spec.generation_status) {
        updates.push({
          id: spec.id,
          common_name: spec.common_name,
          oldStatus: spec.generation_status,
          newStatus: newStatus,
          hasImage: !!hasImage,
          hasVideo: !!hasVideo
        });

        // Update in database
        const { error: updateError } = await supabase
          .from('species')
          .update({ generation_status: newStatus })
          .eq('id', spec.id);

        if (updateError) {
          console.error(`Error updating ${spec.common_name}:`, updateError);
        } else {
          fixedCount++;
          console.log(`Fixed ${spec.common_name}: ${spec.generation_status} → ${newStatus}`);
        }
      }
    }

    console.log(`Fixed ${fixedCount} species statuses`);

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} stuck generation statuses`,
      updates: updates,
      totalSpecies: species?.length || 0
    });

  } catch (error) {
    console.error('Error fixing statuses:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}