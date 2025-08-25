import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'fix_baiji_name':
        return await fixBaijiName();
      case 'remove_duplicates':
        return await removeDuplicates();
      case 'fix_all':
        const baijiResult = await fixBaijiName();
        const duplicateResult = await removeDuplicates();
        return NextResponse.json({
          success: true,
          message: 'All fixes completed',
          baiji: baijiResult,
          duplicates: duplicateResult
        });
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Use "fix_baiji_name", "remove_duplicates", or "fix_all"'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in fix-species-issues API:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

async function fixBaijiName() {
  const BAIJI_ID = 'e23f16b7-4e18-4870-a26a-a00643c693de';
  
  console.log('🐬 Fixing Baiji → Baiji Dolphin...');
  
  // Update species name
  const { error: speciesError } = await supabase
    .from('species')
    .update({ 
      common_name: 'Baiji Dolphin',
      updated_at: new Date().toISOString()
    })
    .eq('id', BAIJI_ID);

  if (speciesError) {
    throw new Error(`Failed to update Baiji species: ${speciesError.message}`);
  }

  // Update any existing media records
  const { data: mediaFiles } = await supabase
    .from('species_media')
    .select('*')
    .eq('species_id', BAIJI_ID);

  let mediaUpdated = 0;
  if (mediaFiles) {
    for (const media of mediaFiles) {
      let updateData: any = {};
      
      if (media.supabase_url && media.supabase_url.includes('baiji_e23f16b7')) {
        updateData.supabase_url = media.supabase_url.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7');
      }
      
      if (media.supabase_path && media.supabase_path.includes('baiji_e23f16b7')) {
        updateData.supabase_path = media.supabase_path.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7');
      }
      
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('species_media')
          .update(updateData)
          .eq('id', media.id);
        mediaUpdated++;
      }
    }
  }

  // Update legacy URL fields
  const { data: currentSpecies } = await supabase
    .from('species')
    .select('supabase_image_url, supabase_video_url')
    .eq('id', BAIJI_ID)
    .single();

  if (currentSpecies) {
    let legacyUpdates: any = {};
    
    if (currentSpecies.supabase_image_url && currentSpecies.supabase_image_url.includes('baiji_e23f16b7')) {
      legacyUpdates.supabase_image_url = currentSpecies.supabase_image_url.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7');
    }
    
    if (currentSpecies.supabase_video_url && currentSpecies.supabase_video_url.includes('baiji_e23f16b7')) {
      legacyUpdates.supabase_video_url = currentSpecies.supabase_video_url.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7');
    }
    
    if (Object.keys(legacyUpdates).length > 0) {
      await supabase
        .from('species')
        .update(legacyUpdates)
        .eq('id', BAIJI_ID);
    }
  }

  console.log('✅ Baiji name fixed');
  return {
    success: true,
    message: `Baiji updated to "Baiji Dolphin", ${mediaUpdated} media records updated`
  };
}

async function removeDuplicates() {
  console.log('🔍 Finding and removing duplicates...');
  
  // Get all species grouped by common_name
  const { data: allSpecies } = await supabase
    .from('species')
    .select('id, common_name, scientific_name, species_list_id, created_at')
    .order('common_name')
    .order('created_at');

  if (!allSpecies) {
    throw new Error('Failed to fetch species');
  }

  // Group by common_name
  const grouped = allSpecies.reduce((acc: any, species) => {
    if (!acc[species.common_name]) {
      acc[species.common_name] = [];
    }
    acc[species.common_name].push(species);
    return acc;
  }, {});

  // Find duplicates
  const duplicates = Object.entries(grouped).filter(([_, species]: [string, any]) => species.length > 1);
  
  let removedCount = 0;
  const removedSpecies = [];

  for (const [commonName, speciesList] of duplicates) {
    const speciesArray = speciesList as any[];
    console.log(`🔄 Processing duplicate: ${commonName} (${speciesArray.length} entries)`);
    
    // Sort by created_at to keep the oldest one
    const sortedSpecies = speciesArray.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Keep the first (oldest), remove the rest
    const toKeep = sortedSpecies[0];
    const toRemove = sortedSpecies.slice(1);
    
    for (const species of toRemove) {
      console.log(`🗑️ Removing duplicate: ${species.common_name} (${species.id})`);
      
      // Remove any media associated with this species
      await supabase
        .from('species_media')
        .delete()
        .eq('species_id', species.id);
      
      // Remove the species
      const { error: deleteError } = await supabase
        .from('species')
        .delete()
        .eq('id', species.id);
      
      if (!deleteError) {
        removedCount++;
        removedSpecies.push({
          id: species.id,
          common_name: species.common_name,
          kept_id: toKeep.id
        });
      }
    }
  }

  console.log(`✅ Removed ${removedCount} duplicate species`);
  return {
    success: true,
    message: `Removed ${removedCount} duplicate species`,
    removed: removedSpecies,
    duplicatesFound: duplicates.length
  };
}