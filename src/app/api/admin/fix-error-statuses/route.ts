import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting error status cleanup...');

    // Get all species with error status
    const { data: errorSpecies, error: fetchError } = await supabase
      .from('species')
      .select('id, common_name, generation_status, image_url, video_url, supabase_image_url, supabase_video_url')
      .eq('generation_status', 'error');

    if (fetchError) {
      console.error('Error fetching species with error status:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch species' }, { status: 500 });
    }

    if (!errorSpecies || errorSpecies.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No species with error status found',
        fixed: 0 
      });
    }

    console.log(`Found ${errorSpecies.length} species with error status`);

    let fixedCount = 0;
    const errors: string[] = [];

    for (const species of errorSpecies) {
      try {
        // Check if species has any media
        const hasImage = species.image_url || species.supabase_image_url;
        const hasVideo = species.video_url || species.supabase_video_url;

        if (hasImage || hasVideo) {
          // Species has media but is marked as error - fix it
          const { error: updateError } = await supabase
            .from('species')
            .update({ 
              generation_status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', species.id);

          if (updateError) {
            console.error(`Error updating species ${species.common_name}:`, updateError);
            errors.push(`Failed to update ${species.common_name}: ${updateError.message}`);
          } else {
            console.log(`✅ Fixed status for ${species.common_name} (has ${hasImage ? 'image' : ''}${hasImage && hasVideo ? ' and ' : ''}${hasVideo ? 'video' : ''})`);
            fixedCount++;
          }
        } else {
          console.log(`⚠️  ${species.common_name} has no media - keeping error status`);
        }
      } catch (error) {
        console.error(`Error processing species ${species.common_name}:`, error);
        errors.push(`Error processing ${species.common_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`🎉 Fixed ${fixedCount} species with error status`);

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} species with error status`,
      fixed: fixedCount,
      totalChecked: errorSpecies.length,
      errors: errors
    });

  } catch (error) {
    console.error('Error in fix-error-statuses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}