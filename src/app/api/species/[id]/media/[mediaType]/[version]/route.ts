import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DELETE - Hide/delete a media version
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaType: string; version: string }> }
) {
  try {
    const { id: speciesId, mediaType, version } = await params;
    const versionNumber = parseInt(version);

    if (!speciesId || !mediaType || isNaN(versionNumber)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Delete the media version from the database
    const { error } = await supabase
      .from('species_media')
      .delete()
      .eq('species_id', speciesId)
      .eq('media_type', mediaType)
      .eq('version_number', versionNumber);

    if (error) {
      console.error('Error deleting media version:', error);
      return NextResponse.json({ error: 'Failed to delete media version' }, { status: 500 });
    }

    // Update species counters
    const { data: remainingVersions } = await supabase
      .from('species_media')
      .select('version_number, is_primary')
      .eq('species_id', speciesId)
      .eq('media_type', mediaType)
      .order('version_number', { ascending: false });

    const totalVersions = remainingVersions?.length || 0;

    // Update species table with new counts
    const updateField = mediaType === 'image' ? 'total_image_versions' : 'total_video_versions';
    const currentVersionField = mediaType === 'image' ? 'current_displayed_image_version' : 'current_displayed_video_version';
    
    const updateData: any = {
      [updateField]: totalVersions,
      updated_at: new Date().toISOString()
    };

    // If there are remaining versions, set the latest as current
    if (totalVersions > 0 && remainingVersions && remainingVersions.length > 0) {
      updateData[currentVersionField] = remainingVersions[0].version_number;
    } else {
      updateData[currentVersionField] = 1;
    }

    await supabase
      .from('species')
      .update(updateData)
      .eq('id', speciesId);

    return NextResponse.json({ success: true, message: 'Media version deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE media version:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// PATCH - Update media version (favorite/unfavorite, set as primary)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaType: string; version: string }> }
) {
  try {
    const { id: speciesId, mediaType, version } = await params;
    const versionNumber = parseInt(version);
    const body = await request.json();
    const { action, value } = body;

    if (!speciesId || !mediaType || isNaN(versionNumber) || !action) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'favorite':
        updateData.is_favorite = value === true;
        break;
      
      case 'setPrimary':
        if (value === true) {
          // First, remove primary flag from all other versions
          await supabase
            .from('species_media')
            .update({ is_primary: false })
            .eq('species_id', speciesId)
            .eq('media_type', mediaType);
          
          updateData.is_primary = true;
          
          // Update species table with new current version
          const speciesUpdateField = mediaType === 'image' 
            ? 'current_displayed_image_version' 
            : 'current_displayed_video_version';
          
          await supabase
            .from('species')
            .update({ [speciesUpdateField]: versionNumber })
            .eq('id', speciesId);
        }
        break;
      
      case 'setForExhibit':
        if (value === true) {
          // First, remove exhibit flag from all other versions
          await supabase
            .from('species_media')
            .update({ is_selected_for_exhibit: false })
            .eq('species_id', speciesId)
            .eq('media_type', mediaType);
          
          updateData.is_selected_for_exhibit = true;
        } else {
          updateData.is_selected_for_exhibit = false;
        }
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { error } = await supabase
      .from('species_media')
      .update(updateData)
      .eq('species_id', speciesId)
      .eq('media_type', mediaType)
      .eq('version_number', versionNumber);

    if (error) {
      console.error('Error updating media version:', error);
      return NextResponse.json({ error: 'Failed to update media version' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Media version updated successfully' });

  } catch (error) {
    console.error('Error in PATCH media version:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}