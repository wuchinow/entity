import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'data', 'extinct_species_database.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`Parsed ${records.length} species from CSV`);

    // First, clear the system_state reference to avoid foreign key constraint
    const { error: clearStateError } = await supabase
      .from('system_state')
      .update({ current_species_id: null });

    if (clearStateError) {
      console.error('Error clearing system state reference:', clearStateError);
    }

    // Clear existing species data
    const { error: deleteError } = await supabase
      .from('species')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError) {
      console.error('Error clearing existing species:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to clear existing species: ${deleteError.message}`
        },
        { status: 500 }
      );
    }

    // Insert species data in batches
    const batchSize = 50;
    let insertedCount = 0;
    const errors = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Transform the data to match our schema
        const transformedBatch = batch.map((record: any, index: number) => ({
          scientific_name: record.scientific_name || record.Scientific_Name || '',
          common_name: record.common_name || record.Common_Name || '',
          year_extinct: record.extinction_date || record.Extinction_Date || record.year_extinct || '',
          last_location: record.habitat || record.Habitat || record.last_location || record.region || record.Region || '',
          extinction_cause: record.cause_of_extinction || record.Cause_of_Extinction || record.extinction_cause || '',
          display_order: (i * batchSize) + index + 1,
          generation_status: 'pending'
        }));
  
        const { data, error } = await supabase
          .from('species')
          .insert(transformedBatch)
          .select('id');

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        insertedCount += data?.length || 0;
        console.log(`Inserted batch ${i / batchSize + 1}: ${data?.length} records`);
      }
    }

    // Get final count
    const { count } = await supabase
      .from('species')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: `Successfully loaded ${insertedCount} species from CSV`,
      totalInDatabase: count,
      csvRecords: records.length,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('Error loading species data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}