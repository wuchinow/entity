import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Restoring species to exactly 132...');
    
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
      return NextResponse.json({
        success: true,
        message: `Species count is already correct: ${currentCount}`,
        currentCount,
        restored: 0
      });
    }

    // Read the original CSV file
    const csvPath = path.join(process.cwd(), 'data', '133 extinct species.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log(`📋 CSV Headers: ${headers.join(', ')}`);
    
    console.log(`📖 Found ${lines.length - 1} species in CSV`);

    // Parse CSV data with proper CSV handling
    const allSpeciesFromCSV = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Simple CSV parsing - split by comma but handle quoted values
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add the last value
      
      if (values.length >= headers.length) {
        const species: any = {};
        headers.forEach((header, index) => {
          species[header] = values[index] || '';
        });
        
        // Only add species with valid common names (using correct header)
        if (species['common_name'] && species['common_name'].trim()) {
          allSpeciesFromCSV.push(species);
        }
      }
    }

    // Find missing species (exclude Levuana Moth duplicate)
    const currentNames = new Set(currentSpecies?.map(s => s.common_name) || []);
    const missingSpecies = allSpeciesFromCSV.filter(species =>
      species['common_name'] &&
      species['common_name'].trim() &&
      !currentNames.has(species['common_name']) &&
      species['common_name'] !== 'Levuana Moth'
    );

    console.log(`🔍 Found ${missingSpecies.length} missing species`);

    // Add missing species back (only what we need to reach 132)
    const needed = 132 - currentCount;
    let restored = 0;
    
    for (const species of missingSpecies.slice(0, needed)) {
      const commonName = species['common_name'] === 'Baiji' ? 'Baiji Dolphin' : species['common_name'];
      
      if (!commonName || !commonName.trim()) {
        console.warn(`⚠️ Skipping species with empty common name`);
        continue;
      }

      const speciesData = {
        species_list_id: activeList.id,
        common_name: commonName,
        scientific_name: species['scientific_name'] || '',
        year_extinct: species['extinction_date'] || '',
        last_location: species['last_seen'] || '',
        extinction_cause: species['extinction_cause'] || '',
        type: species['type'] || '',
        region: species['region'] || '',
        habitat: species['habitat'] || '',
        description: species['description'] || '',
        generation_status: 'pending',
        display_order: 999 + restored, // Add display_order to avoid constraint violation
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

    return NextResponse.json({
      success: true,
      message: `Species restored: ${currentCount} → ${finalCount}`,
      currentCount: finalCount,
      restored,
      targetReached: finalCount === 132
    });

  } catch (error) {
    console.error('❌ Error in species restoration:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}