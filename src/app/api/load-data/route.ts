import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SupabaseService } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Read the CSV file from the data directory
    const csvPath = join(process.cwd(), 'data', 'extinct_species_database.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    const species = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const values = line.split(',');
        species.push({
          scientific_name: values[0]?.replace(/"/g, '').trim() || '',
          common_name: values[1]?.replace(/"/g, '').trim() || '',
          year_extinct: values[2]?.replace(/"/g, '').trim() || '',
          last_location: values[3]?.replace(/"/g, '').trim() || '',
          extinction_cause: values[4]?.replace(/"/g, '').trim() || '',
          generation_status: 'pending' as const,
          display_order: i
        });
      }
    }
    
    // Clear existing data and insert new data
    await SupabaseService.deleteAllSpecies();
    const insertedSpecies = await SupabaseService.insertSpecies(species);
    
    // Update system state
    await SupabaseService.updateSystemState({
      total_species: insertedSpecies.length,
      completed_species: 0,
      is_cycling: false,
      current_species_id: insertedSpecies[0]?.id
    });
    
    return NextResponse.json({
      success: true,
      message: `Successfully loaded ${insertedSpecies.length} species into database`,
      species_count: insertedSpecies.length,
      first_species: insertedSpecies[0]
    });
    
  } catch (error) {
    console.error('Error loading data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}