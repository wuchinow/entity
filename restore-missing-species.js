const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreMissingSpecies() {
  console.log('🔄 Restoring missing species to get back to 132...');
  
  try {
    // Get the active species list
    const { data: activeList } = await supabase
      .from('species_lists')
      .select('id, name')
      .eq('is_active', true)
      .single();

    if (!activeList) {
      throw new Error('No active species list found');
    }

    console.log(`📋 Active list: ${activeList.name} (${activeList.id})`);

    // Get current species
    const { data: currentSpecies } = await supabase
      .from('species')
      .select('common_name')
      .eq('species_list_id', activeList.id);

    const currentCount = currentSpecies?.length || 0;
    console.log(`📊 Current species count: ${currentCount}`);

    if (currentCount >= 132) {
      console.log('✅ Species count is already correct or higher');
      return;
    }

    // Read the original CSV file
    const csvPath = path.join(__dirname, 'data', '133 extinct species.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log(`📖 Found ${lines.length - 1} species in CSV`);

    // Parse CSV data
    const allSpeciesFromCSV = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length >= headers.length) {
        const species = {};
        headers.forEach((header, index) => {
          species[header] = values[index] || '';
        });
        allSpeciesFromCSV.push(species);
      }
    }

    // Find missing species
    const currentNames = new Set(currentSpecies?.map(s => s.common_name) || []);
    const missingSpecies = allSpeciesFromCSV.filter(species => 
      !currentNames.has(species['Common Name']) && species['Common Name'] !== 'Levuana Moth'
    );

    console.log(`🔍 Found ${missingSpecies.length} missing species`);

    // Add missing species back
    let restored = 0;
    for (const species of missingSpecies) {
      if (restored >= (132 - currentCount)) break; // Only restore what we need

      const speciesData = {
        species_list_id: activeList.id,
        common_name: species['Common Name'] === 'Baiji' ? 'Baiji Dolphin' : species['Common Name'],
        scientific_name: species['Scientific Name'] || '',
        year_extinct: species['Year Extinct'] || '',
        last_location: species['Last Known Location'] || '',
        extinction_cause: species['Primary Cause of Extinction'] || '',
        type: species['Type'] || '',
        region: species['Region'] || '',
        habitat: species['Habitat'] || '',
        description: species['Description'] || '',
        generation_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('species')
        .insert(speciesData);

      if (!error) {
        console.log(`✅ Restored: ${speciesData.common_name}`);
        restored++;
      } else {
        console.warn(`⚠️ Failed to restore ${speciesData.common_name}:`, error.message);
      }
    }

    // Final count check
    const { data: finalSpecies } = await supabase
      .from('species')
      .select('id')
      .eq('species_list_id', activeList.id);

    const finalCount = finalSpecies?.length || 0;
    console.log(`🎉 Restoration complete! Final count: ${finalCount}`);
    console.log(`📈 Restored ${restored} species`);

    if (finalCount === 132) {
      console.log('✅ Perfect! We now have exactly 132 species (133 - 1 duplicate)');
    } else {
      console.log(`⚠️ Expected 132, got ${finalCount}`);
    }

  } catch (error) {
    console.error('❌ Error during restoration:', error);
    process.exit(1);
  }
}

// Run the restoration
restoreMissingSpecies();