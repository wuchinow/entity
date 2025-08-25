// Simple script to check Eastern Elk status
async function checkEasternElk() {
  try {
    console.log('🔍 Checking Eastern Elk status...');
    
    const response = await fetch('http://localhost:3000/api/species');
    const data = await response.json();
    
    if (!data.species) {
      console.error('❌ No species data found');
      return;
    }
    
    const easternElk = data.species.find(s => 
      s.common_name.toLowerCase().includes('eastern elk') ||
      s.scientific_name.toLowerCase().includes('cervus canadensis canadensis')
    );
    
    if (easternElk) {
      console.log('✅ Found Eastern Elk:');
      console.log('  Common Name:', easternElk.common_name);
      console.log('  Scientific Name:', easternElk.scientific_name);
      console.log('  Generation Status:', easternElk.generation_status);
      console.log('  Image URL:', easternElk.image_url || 'None');
      console.log('  Video URL:', easternElk.video_url || 'None');
      console.log('  Supabase Image URL:', easternElk.supabase_image_url || 'None');
      console.log('  Supabase Video URL:', easternElk.supabase_video_url || 'None');
      console.log('  Updated At:', easternElk.updated_at);
      
      // Check media table
      const mediaResponse = await fetch(`http://localhost:3000/api/species/${easternElk.id}/media`);
      const mediaData = await mediaResponse.json();
      
      if (mediaData.media) {
        console.log('  Media Versions:');
        console.log('    Images:', mediaData.media.images.length);
        console.log('    Videos:', mediaData.media.videos.length);
        
        if (mediaData.media.videos.length > 0) {
          console.log('  Video Details:');
          mediaData.media.videos.forEach(video => {
            console.log(`    Version ${video.version}: ${video.url}`);
          });
        }
      }
    } else {
      console.log('❌ Eastern Elk not found in species list');
      console.log('📊 Total species found:', data.species.length);
      
      // Show species that contain "elk"
      const elkSpecies = data.species.filter(s => 
        s.common_name.toLowerCase().includes('elk') ||
        s.scientific_name.toLowerCase().includes('elk')
      );
      
      if (elkSpecies.length > 0) {
        console.log('🦌 Found other elk species:');
        elkSpecies.forEach(elk => {
          console.log(`  - ${elk.common_name} (${elk.scientific_name})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkEasternElk();