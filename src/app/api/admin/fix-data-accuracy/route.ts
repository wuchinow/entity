import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NewCSVImportService } from '@/lib/new-csv-import';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('Starting data accuracy fixes...');
    
    const fixes = [];
    const errors = [];

    // 1. Check current data state
    const { data: currentSpecies, error: fetchError } = await supabase
      .from('species')
      .select('id, common_name, type, habitat, region')
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    console.log('Current species sample:', currentSpecies?.slice(0, 3));

    // 2. Get the active species list
    const activeList = await NewCSVImportService.getActiveSpeciesList();
    if (!activeList) {
      throw new Error('No active species list found');
    }

    console.log('Active species list:', activeList.name);

    // 3. Re-import CSV data to fix missing fields
    try {
      // Read the CSV file and update existing records
      const fs = require('fs');
      const path = require('path');
      const csvPath = path.join(process.cwd(), 'data', '133 extinct species.csv');
      
      if (!fs.existsSync(csvPath)) {
        throw new Error('CSV file not found at: ' + csvPath);
      }

      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');
      
      console.log('CSV headers:', headers);
      
      let updatedCount = 0;
      let plantCount = 0;
      let animalCount = 0;

      // Process each line (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',');
        if (values.length < headers.length) continue;

        const commonName = values[0]?.replace(/"/g, '').trim();
        const scientificName = values[1]?.replace(/"/g, '').trim();
        const type = values[3]?.replace(/"/g, '').trim();
        const region = values[4]?.replace(/"/g, '').trim();
        const habitat = values[5]?.replace(/"/g, '').trim();
        const extinctionCause = values[6]?.replace(/"/g, '').trim();
        const lastSeen = values[7]?.replace(/"/g, '').trim();
        const description = values[8]?.replace(/"/g, '').trim();

        if (!commonName || !scientificName) continue;

        // Count types
        if (type === 'Plant') plantCount++;
        if (type === 'Animal') animalCount++;

        // Update the species record
        const { error: updateError } = await supabase
          .from('species')
          .update({
            type: type || null,
            region: region || null,
            habitat: habitat || null,
            extinction_cause: extinctionCause || null,
            last_location: lastSeen || null,
            description: description || null
          })
          .eq('common_name', commonName)
          .eq('species_list_id', activeList.id);

        if (updateError) {
          console.error(`Error updating ${commonName}:`, updateError);
          errors.push(`Failed to update ${commonName}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      }

      fixes.push(`Updated ${updatedCount} species with CSV data`);
      fixes.push(`Found ${plantCount} plants and ${animalCount} animals in CSV`);

    } catch (csvError) {
      console.error('Error processing CSV:', csvError);
      errors.push(`CSV processing failed: ${csvError}`);
    }

    // 4. Verify the fixes
    const { data: verifySpecies, error: verifyError } = await supabase
      .from('species')
      .select('type, habitat, region')
      .eq('species_list_id', activeList.id);

    if (!verifyError && verifySpecies) {
      const plantsCount = verifySpecies.filter(s => s.type === 'Plant').length;
      const animalsCount = verifySpecies.filter(s => s.type === 'Animal').length;
      const withHabitat = verifySpecies.filter(s => s.habitat && s.habitat !== 'N/A').length;
      const withRegion = verifySpecies.filter(s => s.region && s.region !== 'N/A').length;

      fixes.push(`Verification: ${plantsCount} plants, ${animalsCount} animals`);
      fixes.push(`${withHabitat} species have habitat data`);
      fixes.push(`${withRegion} species have region data`);
    }

    console.log('Data accuracy fixes completed:', fixes);
    console.log('Data accuracy fix errors:', errors);

    return NextResponse.json({
      success: true,
      fixes,
      errors,
      message: `Applied ${fixes.length} data accuracy fixes${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });

  } catch (error) {
    console.error('Error fixing data accuracy:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix data accuracy',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}