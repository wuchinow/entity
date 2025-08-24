import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { NewSpeciesCSVRow, Species, SpeciesList, ImportResult, ValidationResult } from '@/types';
import { supabaseAdmin } from './supabase';

export class NewCSVImportService {
  static async parseNewCSVFile(file: File): Promise<NewSpeciesCSVRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
            return;
          }
          
          const data = results.data as NewSpeciesCSVRow[];
          
          // Validate required columns for new format
          const requiredColumns = [
            'common_name', 'scientific_name', 'extinction_date', 'type', 
            'region', 'habitat', 'extinction_cause', 'last_seen', 'description', 'sources'
          ];
          const firstRow = data[0];
          
          if (!firstRow) {
            reject(new Error('CSV file is empty'));
            return;
          }
          
          const missingColumns = requiredColumns.filter(col => !(col in firstRow));
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }
          
          resolve(data);
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  }

  static convertNewCSVToSpecies(
    csvData: NewSpeciesCSVRow[],
    speciesListId: string
  ): Omit<Species, 'id' | 'created_at'>[] {
    return csvData.map((row, index) => ({
      scientific_name: row.scientific_name?.trim() || '',
      common_name: row.common_name?.trim() || '',
      year_extinct: row.extinction_date?.trim() || '', // Map extinction_date to year_extinct for compatibility
      last_location: row.region?.trim() || '', // Map region to last_location for compatibility
      extinction_cause: row.extinction_cause?.trim() || '',
      
      // New enhanced fields (only include if they exist in schema)
      species_list_id: speciesListId,
      extinction_date: row.extinction_date?.trim() || '',
      type: (row.type?.trim() as 'Animal' | 'Plant') || 'Animal',
      region: row.region?.trim() || '',
      habitat: row.habitat?.trim() || '',
      last_seen: row.last_seen?.trim() || '',
      description: row.description?.trim() || '',
      sources: row.sources?.trim() || '',
      
      // Legacy fields for compatibility
      image_url: undefined,
      video_url: undefined,
      supabase_image_path: undefined,
      supabase_video_path: undefined,
      supabase_image_url: undefined,
      supabase_video_url: undefined,
      image_generated_at: undefined,
      video_generated_at: undefined,
      generation_status: 'pending' as const,
      display_order: index + 1,
    }));
  }

  static validateNewSpeciesData(species: Omit<Species, 'id' | 'created_at'>[]): ValidationResult {
    const errors: string[] = [];
    
    species.forEach((spec, index) => {
      const rowNum = index + 1;
      
      if (!spec.scientific_name) {
        errors.push(`Row ${rowNum}: Missing scientific name`);
      }
      
      if (!spec.common_name) {
        errors.push(`Row ${rowNum}: Missing common name`);
      }
      
      if (!spec.extinction_date) {
        errors.push(`Row ${rowNum}: Missing extinction date`);
      }
      
      if (!spec.type || !['Animal', 'Plant'].includes(spec.type)) {
        errors.push(`Row ${rowNum}: Invalid or missing type (must be 'Animal' or 'Plant')`);
      }
      
      if (!spec.region) {
        errors.push(`Row ${rowNum}: Missing region`);
      }
      
      if (!spec.habitat) {
        errors.push(`Row ${rowNum}: Missing habitat`);
      }
      
      if (!spec.extinction_cause) {
        errors.push(`Row ${rowNum}: Missing extinction cause`);
      }
      
      if (!spec.description) {
        errors.push(`Row ${rowNum}: Missing description`);
      }
      
      if (!spec.sources) {
        errors.push(`Row ${rowNum}: Missing sources`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async createSpeciesList(
    name: string, 
    description: string, 
    csvFilename: string,
    totalSpecies: number
  ): Promise<SpeciesList> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    // First, set all existing lists to inactive
    await supabaseAdmin
      .from('species_lists')
      .update({ is_active: false });

    // Create new species list
    const { data, error } = await supabaseAdmin
      .from('species_lists')
      .insert({
        name,
        description,
        csv_filename: csvFilename,
        total_species_count: totalSpecies,
        is_active: true, // Make this the active list
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async importNewSpeciesToDatabase(
    csvData: NewSpeciesCSVRow[],
    listName: string,
    listDescription: string,
    csvFilename: string,
    options: {
      onProgress?: (progress: number, message: string) => void;
    } = {}
  ): Promise<ImportResult> {
    const { onProgress } = options;
    
    try {
      onProgress?.(0, 'Creating species list...');
      
      // Create species list
      const speciesList = await this.createSpeciesList(
        listName, 
        listDescription, 
        csvFilename,
        csvData.length
      );
      
      onProgress?.(20, 'Converting CSV data...');
      
      // Convert CSV to species format
      const speciesData = this.convertNewCSVToSpecies(csvData, speciesList.id);
      
      onProgress?.(40, 'Validating species data...');
      
      // Validate data
      const validation = this.validateNewSpeciesData(speciesData);
      if (!validation.isValid) {
        return {
          success: false,
          imported: 0,
          errors: validation.errors,
          message: 'Validation failed'
        };
      }
      
      onProgress?.(60, 'Importing species to database...');
      
      // Insert species data
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not initialized');
      }

      const { data: insertedSpecies, error } = await supabaseAdmin
        .from('species')
        .insert(speciesData)
        .select();

      if (error) throw error;
      
      onProgress?.(90, 'Finalizing import...');
      
      // Update species list with actual count
      await supabaseAdmin
        .from('species_lists')
        .update({ 
          total_species_count: insertedSpecies?.length || 0,
        })
        .eq('id', speciesList.id);
      
      onProgress?.(100, 'Import completed successfully!');
      
      return {
        success: true,
        imported: insertedSpecies?.length || 0,
        errors: [],
        speciesListId: speciesList.id,
        message: `Successfully imported ${insertedSpecies?.length || 0} species to "${listName}" list`
      };
      
    } catch (error) {
      console.error('Import error:', error);
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown import error'],
        message: 'Import failed'
      };
    }
  }

  static async importFromFile(
    file: File,
    listName: string,
    listDescription: string,
    options: {
      onProgress?: (progress: number, message: string) => void;
    } = {}
  ): Promise<ImportResult> {
    try {
      options.onProgress?.(0, 'Reading CSV file...');
      
      const csvData = await this.parseNewCSVFile(file);
      
      options.onProgress?.(10, `Found ${csvData.length} species records...`);
      
      return await this.importNewSpeciesToDatabase(
        csvData, 
        listName, 
        listDescription,
        file.name,
        options
      );
      
    } catch (error) {
      console.error('File import error:', error);
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Failed to read CSV file'],
        message: 'File import failed'
      };
    }
  }

  static async getSpeciesLists(): Promise<SpeciesList[]> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    const { data, error } = await supabaseAdmin
      .from('species_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async setActiveSpeciesList(listId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    // First get all species lists to deactivate them
    const { data: allLists, error: fetchError } = await supabaseAdmin
      .from('species_lists')
      .select('id');

    if (fetchError) throw fetchError;

    // Set all lists to inactive
    if (allLists && allLists.length > 0) {
      const { error: deactivateError } = await supabaseAdmin
        .from('species_lists')
        .update({ is_active: false })
        .in('id', allLists.map(list => list.id));

      if (deactivateError) throw deactivateError;
    }

    // Set the specified list to active with updated timestamp
    const { error: activateError } = await supabaseAdmin
      .from('species_lists')
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', listId);

    if (activateError) throw activateError;
  }

  static async getActiveSpeciesList(): Promise<SpeciesList | null> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    const { data, error } = await supabaseAdmin
      .from('species_lists')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }

  // Analyze overlap between species lists
  static async analyzeSpeciesOverlap(list1Id: string, list2Id: string): Promise<{
    list1Only: number;
    list2Only: number;
    overlap: number;
    overlapSpecies: Array<{scientific_name: string, common_name: string}>;
  }> {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    const { data: list1Species, error: error1 } = await supabaseAdmin
      .from('species')
      .select('scientific_name, common_name')
      .eq('species_list_id', list1Id);

    const { data: list2Species, error: error2 } = await supabaseAdmin
      .from('species')
      .select('scientific_name, common_name')
      .eq('species_list_id', list2Id);

    if (error1) throw error1;
    if (error2) throw error2;

    const list1Names = new Set((list1Species || []).map(s => s.scientific_name.toLowerCase()));
    const list2Names = new Set((list2Species || []).map(s => s.scientific_name.toLowerCase()));

    const overlapNames = new Set([...list1Names].filter(name => list2Names.has(name)));
    const overlapSpecies = (list1Species || []).filter(s => 
      overlapNames.has(s.scientific_name.toLowerCase())
    );

    return {
      list1Only: list1Names.size - overlapNames.size,
      list2Only: list2Names.size - overlapNames.size,
      overlap: overlapNames.size,
      overlapSpecies
    };
  }
}