const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BAIJI_ID = 'e23f16b7-4e18-4870-a26a-a00643c693de';

async function updateBaijiName() {
  console.log('🐬 Starting Baiji → Baiji Dolphin update process...');
  
  try {
    // 1. Update the species record in the database
    console.log('📝 Updating species record...');
    const { error: speciesError } = await supabase
      .from('species')
      .update({ 
        common_name: 'Baiji Dolphin',
        updated_at: new Date().toISOString()
      })
      .eq('id', BAIJI_ID);

    if (speciesError) {
      throw new Error(`Failed to update species: ${speciesError.message}`);
    }
    console.log('✅ Species record updated successfully');

    // 2. Get all existing media files for Baiji
    console.log('🔍 Finding existing media files...');
    const { data: mediaFiles, error: mediaError } = await supabase
      .from('species_media')
      .select('*')
      .eq('species_id', BAIJI_ID);

    if (mediaError) {
      console.warn('⚠️ Could not fetch media files:', mediaError.message);
    }

    // 3. List existing storage files to rename
    console.log('📁 Checking Supabase storage for files to rename...');
    const { data: storageFiles, error: storageError } = await supabase
      .storage
      .from('species-media')
      .list('images', { search: 'baiji_e23f16b7' });

    if (!storageError && storageFiles) {
      console.log(`Found ${storageFiles.length} image files to potentially rename`);
      
      // Rename image files
      for (const file of storageFiles) {
        if (file.name.includes('baiji_e23f16b7')) {
          const oldPath = `images/${file.name}`;
          const newPath = `images/${file.name.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7')}`;
          
          console.log(`📁 Renaming: ${oldPath} → ${newPath}`);
          
          // Copy to new name
          const { error: copyError } = await supabase
            .storage
            .from('species-media')
            .copy(oldPath, newPath);
            
          if (!copyError) {
            // Delete old file
            const { error: deleteError } = await supabase
              .storage
              .from('species-media')
              .remove([oldPath]);
              
            if (deleteError) {
              console.warn(`⚠️ Could not delete old file ${oldPath}:`, deleteError.message);
            } else {
              console.log(`✅ Successfully renamed ${oldPath}`);
            }
          } else {
            console.warn(`⚠️ Could not copy ${oldPath}:`, copyError.message);
          }
        }
      }
    }

    // Check for video files
    const { data: videoFiles, error: videoStorageError } = await supabase
      .storage
      .from('species-media')
      .list('videos', { search: 'baiji_e23f16b7' });

    if (!videoStorageError && videoFiles) {
      console.log(`Found ${videoFiles.length} video files to potentially rename`);
      
      // Rename video files
      for (const file of videoFiles) {
        if (file.name.includes('baiji_e23f16b7')) {
          const oldPath = `videos/${file.name}`;
          const newPath = `videos/${file.name.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7')}`;
          
          console.log(`📁 Renaming: ${oldPath} → ${newPath}`);
          
          // Copy to new name
          const { error: copyError } = await supabase
            .storage
            .from('species-media')
            .copy(oldPath, newPath);
            
          if (!copyError) {
            // Delete old file
            const { error: deleteError } = await supabase
              .storage
              .from('species-media')
              .remove([oldPath]);
              
            if (deleteError) {
              console.warn(`⚠️ Could not delete old file ${oldPath}:`, deleteError.message);
            } else {
              console.log(`✅ Successfully renamed ${oldPath}`);
            }
          } else {
            console.warn(`⚠️ Could not copy ${oldPath}:`, copyError.message);
          }
        }
      }
    }

    // 4. Update media records to reflect new URLs
    if (mediaFiles && mediaFiles.length > 0) {
      console.log('📝 Updating media record URLs...');
      
      for (const media of mediaFiles) {
        let updateData = {};
        
        if (media.supabase_url && media.supabase_url.includes('baiji_e23f16b7')) {
          updateData.supabase_url = media.supabase_url.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7');
        }
        
        if (media.supabase_path && media.supabase_path.includes('baiji_e23f16b7')) {
          updateData.supabase_path = media.supabase_path.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7');
        }
        
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('species_media')
            .update(updateData)
            .eq('id', media.id);
            
          if (updateError) {
            console.warn(`⚠️ Could not update media record ${media.id}:`, updateError.message);
          } else {
            console.log(`✅ Updated media record ${media.id}`);
          }
        }
      }
    }

    // 5. Update legacy URL fields in species table
    console.log('📝 Updating legacy URL fields...');
    const { data: currentSpecies } = await supabase
      .from('species')
      .select('supabase_image_url, supabase_video_url')
      .eq('id', BAIJI_ID)
      .single();

    if (currentSpecies) {
      let legacyUpdates = {};
      
      if (currentSpecies.supabase_image_url && currentSpecies.supabase_image_url.includes('baiji_e23f16b7')) {
        legacyUpdates.supabase_image_url = currentSpecies.supabase_image_url.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7');
      }
      
      if (currentSpecies.supabase_video_url && currentSpecies.supabase_video_url.includes('baiji_e23f16b7')) {
        legacyUpdates.supabase_video_url = currentSpecies.supabase_video_url.replace('baiji_e23f16b7', 'baiji_dolphin_e23f16b7');
      }
      
      if (Object.keys(legacyUpdates).length > 0) {
        const { error: legacyError } = await supabase
          .from('species')
          .update(legacyUpdates)
          .eq('id', BAIJI_ID);
          
        if (legacyError) {
          console.warn('⚠️ Could not update legacy URLs:', legacyError.message);
        } else {
          console.log('✅ Updated legacy URL fields');
        }
      }
    }

    console.log('🎉 Baiji → Baiji Dolphin update completed successfully!');
    console.log('📋 Summary:');
    console.log('  ✅ Species name updated in database');
    console.log('  ✅ Storage files renamed (if any existed)');
    console.log('  ✅ Media records updated');
    console.log('  ✅ Legacy URL fields updated');
    console.log('');
    console.log('🔄 Future video generations will now use "Baiji Dolphin" in filenames and prompts');

  } catch (error) {
    console.error('❌ Error during update process:', error);
    process.exit(1);
  }
}

// Run the update
updateBaijiName();