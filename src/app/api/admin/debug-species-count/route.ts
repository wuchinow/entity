import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging species count discrepancy...');
    
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
      .select('common_name, scientific_name')
      .eq('species_list_id', activeList.id)
      .order('common_name');

    const currentCount = currentSpecies?.length || 0;
    console.log(`📊 Current species count: ${currentCount}`);

    // Read the original CSV file
    const csvPath = path.join(process.cwd(), 'data', '133 extinct species.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log(`📖 Found ${lines.length - 1} species in CSV`);
    console.log(`📋 CSV Headers: ${headers.join(', ')}`);

    // Parse CSV data
    const allSpeciesFromCSV = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Simple CSV parsing
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
      values.push(current.trim());
      
      if (values.length >= headers.length) {
        const species: any = {};
        headers.forEach((header, index) => {
          species[header] = values[index] || '';
        });
        
        if (species['Common Name'] && species['Common Name'].trim()) {
          allSpeciesFromCSV.push(species);
        }
      }
    }

    console.log(`📊 Valid species from CSV: ${allSpeciesFromCSV.length}`);

    // Compare lists
    const currentNames = new Set(currentSpecies?.map(s => s.common_name) || []);
    const csvNames = new Set(allSpeciesFromCSV.map(s => s['Common Name']));
    
    const inDatabaseNotInCSV = Array.from(currentNames).filter(name => !csvNames.has(name));
    const inCSVNotInDatabase = Array.from(csvNames).filter(name => !currentNames.has(name));
    
    console.log(`🔍 In database but not in CSV (${inDatabaseNotInCSV.length}):`, inDatabaseNotInCSV);
    console.log(`🔍 In CSV but not in database (${inCSVNotInDatabase.length}):`, inCSVNotInDatabase);

    // Check for Baiji vs Baiji Dolphin specifically
    const hasBaiji = currentNames.has('Baiji');
    const hasBaijiDolphin = currentNames.has('Baiji Dolphin');
    const csvHasBaiji = csvNames.has('Baiji');
    
    console.log(`🐬 Baiji status - DB has 'Baiji': ${hasBaiji}, DB has 'Baiji Dolphin': ${hasBaijiDolphin}, CSV has 'Baiji': ${csvHasBaiji}`);

    return NextResponse.json({
      success: true,
      activeList: activeList.name,
      currentCount,
      csvCount: allSpeciesFromCSV.length,
      csvValidCount: allSpeciesFromCSV.filter(s => s['Common Name'] && s['Common Name'].trim()).length,
      inDatabaseNotInCSV,
      inCSVNotInDatabase,
      baijiStatus: {
        dbHasBaiji: hasBaiji,
        dbHasBaijiDolphin: hasBaijiDolphin,
        csvHasBaiji: csvHasBaiji
      },
      currentSpeciesNames: Array.from(currentNames).sort(),
      csvSpeciesNames: Array.from(csvNames).sort()
    });

  } catch (error) {
    console.error('❌ Error in debug:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}