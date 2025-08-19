import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { CSVSpeciesRow, Species } from '@/types';
import { SupabaseService } from './supabase';

export class CSVImportService {
  static async parseCSVFile(file: File): Promise<CSVSpeciesRow[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
            return;
          }
          
          const data = results.data as CSVSpeciesRow[];
          
          // Validate required columns
          const requiredColumns = ['Scientific Name', 'Common Name', 'Year Extinct', 'Last Location', 'Extinction Cause'];
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

  static convertCSVToSpecies(csvData: CSVSpeciesRow[]): Omit<Species, 'id' | 'created_at'>[] {
    return csvData.map((row, index) => ({
      scientific_name: row['Scientific Name']?.trim() || '',
      common_name: row['Common Name']?.trim() || '',
      year_extinct: row['Year Extinct']?.trim() || '',
      last_location: row['Last Location']?.trim() || '',
      extinction_cause: row['Extinction Cause']?.trim() || '',
      image_url: undefined,
      video_url: undefined,
      image_generated_at: undefined,
      video_generated_at: undefined,
      generation_status: 'pending' as const,
      display_order: index + 1,
    }));
  }

  static validateSpeciesData(species: Omit<Species, 'id' | 'created_at'>[]): string[] {
    const errors: string[] = [];
    
    species.forEach((spec, index) => {
      const rowNum = index + 1;
      
      if (!spec.scientific_name) {
        errors.push(`Row ${rowNum}: Missing scientific name`);
      }
      
      if (!spec.common_name) {
        errors.push(`Row ${rowNum}: Missing common name`);
      }
      
      if (!spec.year_extinct) {
        errors.push(`Row ${rowNum}: Missing extinction year`);
      }
      
      if (!spec.last_location) {
        errors.push(`Row ${rowNum}: Missing last location`);
      }
      
      if (!spec.extinction_cause) {
        errors.push(`Row ${rowNum}: Missing extinction cause`);
      }
      
      // Validate year format (basic check)
      if (spec.year_extinct && !spec.year_extinct.match(/^\d{4}s?$|^\d{4}$/)) {
        // Allow formats like "1662", "1500s", etc.
        const yearPattern = /\d{4}/;
        if (!yearPattern.test(spec.year_extinct)) {
          errors.push(`Row ${rowNum}: Invalid year format "${spec.year_extinct}"`);
        }
      }
    });
    
    return errors;
  }

  static async importSpeciesToDatabase(
    csvData: CSVSpeciesRow[],
    options: {
      replaceExisting?: boolean;
      onProgress?: (progress: number, message: string) => void;
    } = {}
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const { replaceExisting = false, onProgress } = options;
    
    try {
      onProgress?.(0, 'Parsing CSV data...');
      
      // Convert CSV to species format
      const speciesData = this.convertCSVToSpecies(csvData);
      
      onProgress?.(20, 'Validating species data...');
      
      // Validate data
      const validationErrors = this.validateSpeciesData(speciesData);
      if (validationErrors.length > 0) {
        return {
          success: false,
          imported: 0,
          errors: validationErrors
        };
      }
      
      onProgress?.(40, 'Preparing database...');
      
      // Clear existing data if requested
      if (replaceExisting) {
        await SupabaseService.deleteAllSpecies();
        onProgress?.(60, 'Cleared existing species data...');
      }
      
      onProgress?.(70, 'Importing species to database...');
      
      // Insert species data
      const insertedSpecies = await SupabaseService.insertSpecies(speciesData);
      
      onProgress?.(90, 'Updating system state...');
      
      // Update system state
      await SupabaseService.updateSystemState({
        total_species: insertedSpecies.length,
        completed_species: 0,
        is_cycling: false,
      });
      
      onProgress?.(100, 'Import completed successfully!');
      
      return {
        success: true,
        imported: insertedSpecies.length,
        errors: []
      };
      
    } catch (error) {
      console.error('Import error:', error);
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown import error']
      };
    }
  }

  static async importFromFile(
    file: File,
    options: {
      replaceExisting?: boolean;
      onProgress?: (progress: number, message: string) => void;
    } = {}
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    try {
      options.onProgress?.(0, 'Reading CSV file...');
      
      const csvData = await this.parseCSVFile(file);
      
      options.onProgress?.(10, `Found ${csvData.length} species records...`);
      
      return await this.importSpeciesToDatabase(csvData, options);
      
    } catch (error) {
      console.error('File import error:', error);
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Failed to read CSV file']
      };
    }
  }

  // Utility to export current database to CSV (for backup)
  static async exportToCSV(): Promise<string> {
    try {
      const species = await SupabaseService.getAllSpecies();
      
      const csvData = species.map(spec => ({
        'Scientific Name': spec.scientific_name,
        'Common Name': spec.common_name,
        'Year Extinct': spec.year_extinct,
        'Last Location': spec.last_location,
        'Extinction Cause': spec.extinction_cause,
        'Image URL': spec.image_url || '',
        'Video URL': spec.video_url || '',
        'Generation Status': spec.generation_status,
        'Display Order': spec.display_order,
      }));
      
      return Papa.unparse(csvData);
      
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }
}