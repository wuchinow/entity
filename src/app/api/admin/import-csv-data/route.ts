import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRecord {
  common_name: string;
  scientific_name: string;
  extinction_date: string;
  type: string;
  region: string;
  habitat: string;
  extinction_cause: string;
  last_seen: string;
  description: string;
  sources: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'data', '133 extinct species.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records: CSVRecord[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Found ${records.length} species in CSV`);

    let updated = 0;
    let errors = 0;

    // Update each species in the database
    for (const record of records) {
      try {
        // Find the species by common_name or scientific_name
        const { data: existingSpecies, error: findError } = await supabase
          .from('species')
          .select('id, common_name, scientific_name')
          .or(`common_name.eq.${record.common_name},scientific_name.eq.${record.scientific_name}`)
          .single();

        if (findError || !existingSpecies) {
          console.log(`Species not found: ${record.common_name} (${record.scientific_name})`);
          continue;
        }

        // Update the species with CSV data
        const { error: updateError } = await supabase
          .from('species')
          .update({
            type: record.type, // Animal or Plant
            region: record.region,
            habitat: record.habitat,
            extinction_cause: record.extinction_cause,
            last_seen: record.last_seen,
            description: record.description,
            sources: record.sources,
            extinction_date: record.extinction_date
          })
          .eq('id', existingSpecies.id);

        if (updateError) {
          console.error(`Error updating ${record.common_name}:`, updateError);
          errors++;
        } else {
          updated++;
          console.log(`Updated: ${record.common_name}`);
        }
      } catch (err) {
        console.error(`Error processing ${record.common_name}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `CSV import completed. Updated: ${updated}, Errors: ${errors}`,
      updated,
      errors,
      total: records.length
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to import CSV data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}