import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    console.log('🚀 Starting simple import of 133 species...');
    
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    // First, get or create the species list
    console.log('📝 Getting or creating species list...');
    
    // Set all existing lists to inactive
    await supabaseAdmin
      .from('species_lists')
      .update({ is_active: false });

    // Try to get existing list first
    let { data: speciesList } = await supabaseAdmin
      .from('species_lists')
      .select('*')
      .eq('name', '133 Diverse Species')
      .single();

    if (!speciesList) {
      // Create new species list if it doesn't exist
      const { data: newList, error: listError } = await supabaseAdmin
        .from('species_lists')
        .insert({
          name: '133 Diverse Species',
          description: 'Comprehensive list of 133 extinct species including both animals and plants',
          total_species_count: 133,
          is_active: true,
        })
        .select()
        .single();

      if (listError) {
        console.error('Error creating species list:', listError);
        throw listError;
      }
      speciesList = newList;
    } else {
      // Activate existing list
      await supabaseAdmin
        .from('species_lists')
        .update({ is_active: true })
        .eq('id', speciesList.id);
    }

    console.log('✅ Species list ready:', speciesList.id);

    // Delete existing species from this list to start fresh
    console.log('🧹 Clearing existing species from list...');
    await supabaseAdmin
      .from('species')
      .delete()
      .eq('species_list_id', speciesList.id);

    // Read and parse CSV
    const csvPath = path.join(process.cwd(), 'data', '133 extinct species.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    console.log('📊 Processing CSV with', lines.length - 1, 'species...');

    // Process species data - skip header line
    const speciesData = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line properly handling quoted fields
      const values = [];
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
      
      if (values.length < 6) continue;
      
      speciesData.push({
        scientific_name: values[1] || '',
        common_name: values[0] || '',
        year_extinct: values[2] || '',
        last_location: values[4] || '',
        extinction_cause: values[6] || '',
        species_list_id: speciesList.id,
        generation_status: 'pending',
        display_order: i,
      });
    }

    console.log('💾 Inserting', speciesData.length, 'species...');

    // Insert species in batches
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < speciesData.length; i += batchSize) {
      const batch = speciesData.slice(i, i + batchSize);
      
      const { error: insertError } = await supabaseAdmin
        .from('species')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        throw insertError;
      }
      
      inserted += batch.length;
      console.log(`✅ Inserted ${inserted}/${speciesData.length} species`);
    }

    // Update species list count
    await supabaseAdmin
      .from('species_lists')
      .update({ total_species_count: inserted })
      .eq('id', speciesList.id);

    console.log('🎉 Import completed successfully!');

    return NextResponse.json({
      success: true,
      imported: inserted,
      speciesListId: speciesList.id,
      message: `Successfully imported ${inserted} species to "133 Diverse Species" list`
    });

  } catch (error) {
    console.error('❌ Import error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      imported: 0,
      message: 'Import failed'
    }, { status: 500 });
  }
}