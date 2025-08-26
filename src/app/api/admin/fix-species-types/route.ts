import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CSVRow {
  common_name: string;
  scientific_name: string;
  extinction_date: string;
  type: 'Animal' | 'Plant';
  region: string;
  habitat: string;
  extinction_cause: string;
  last_seen: string;
  description: string;
  sources: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting species type fix from 133 species CSV...');

    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'data', '133 extinct species.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({
        success: false,
        error: 'CSV file not found at: ' + csvPath
      });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CSVRow[];

    console.log(`Parsed ${records.length} records from CSV`);

    // Get all current species from database
    const { data: currentSpecies, error: fetchError } = await supabase
      .from('species')
      .select('id, common_name, scientific_name, type');

    if (fetchError) {
      console.error('Error fetching current species:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch current species: ' + fetchError.message
      });
    }

    console.log(`Found ${currentSpecies?.length || 0} species in database`);

    let updatedCount = 0;
    let matchedCount = 0;
    const updateResults = [];

    // Match CSV records with database species and update types
    for (const csvRecord of records) {
      // Try to find matching species by common name first, then scientific name
      let matchedSpecies = currentSpecies?.find(s =>
        s.common_name?.toLowerCase().trim() === csvRecord.common_name?.toLowerCase().trim()
      );

      if (!matchedSpecies) {
        matchedSpecies = currentSpecies?.find(s =>
          s.scientific_name?.toLowerCase().trim() === csvRecord.scientific_name?.toLowerCase().trim()
        );
      }

      if (matchedSpecies) {
        matchedCount++;
        
        // Check if type needs updating
        if (matchedSpecies.type !== csvRecord.type) {
          const { error: updateError } = await supabase
            .from('species')
            .update({ type: csvRecord.type })
            .eq('id', matchedSpecies.id);

          if (updateError) {
            console.error(`Error updating species ${matchedSpecies.common_name}:`, updateError);
            updateResults.push({
              species: matchedSpecies.common_name,
              error: updateError.message
            });
          } else {
            updatedCount++;
            updateResults.push({
              species: matchedSpecies.common_name,
              oldType: matchedSpecies.type,
              newType: csvRecord.type,
              success: true
            });
            console.log(`Updated ${matchedSpecies.common_name}: ${matchedSpecies.type || 'N/A'} → ${csvRecord.type}`);
          }
        } else {
          updateResults.push({
            species: matchedSpecies.common_name,
            type: csvRecord.type,
            alreadyCorrect: true
          });
        }
      } else {
        console.log(`No match found for: ${csvRecord.common_name} (${csvRecord.scientific_name})`);
        updateResults.push({
          species: csvRecord.common_name,
          scientific_name: csvRecord.scientific_name,
          noMatch: true
        });
      }
    }

    console.log(`Species type fix completed:`);
    console.log(`- Matched: ${matchedCount}/${records.length} species`);
    console.log(`- Updated: ${updatedCount} species`);

    return NextResponse.json({
      success: true,
      message: `Species type fix completed successfully`,
      stats: {
        totalCsvRecords: records.length,
        matchedSpecies: matchedCount,
        updatedSpecies: updatedCount,
        alreadyCorrect: updateResults.filter(r => r.alreadyCorrect).length,
        noMatches: updateResults.filter(r => r.noMatch).length,
        errors: updateResults.filter(r => r.error).length
      },
      details: updateResults
    });

  } catch (error) {
    console.error('Error in species type fix:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}