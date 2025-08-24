# New Species Dataset Import Plan

## Overview

This document outlines the specific plan for importing the new 133 extinct species CSV file with its enhanced data structure into the Entity v1.0 system.

## New CSV Structure Analysis

The new CSV file (`133 extinct species.csv`) contains **133 species** with the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `common_name` | Common name of species | "Great Auk" |
| `scientific_name` | Scientific/Latin name | "Alca impennis" |
| `extinction_date` | Year of extinction | "1844" |
| `type` | Type of organism | "Animal" or "Plant" |
| `region` | Geographic region | "North Atlantic" |
| `habitat` | Natural habitat | "Marine/Rocky coasts" |
| `extinction_cause` | Primary cause of extinction | "Hunting, egg collection" |
| `last_seen` | Location and date last observed | "Eldey Island, 1844" |
| `description` | Detailed description | "Last breeding pair killed for specimens" |
| `sources` | Reference sources | "IUCN, BirdLife" |

## Key Differences from Original Dataset

### Original CSV (238 species):
- `Scientific Name`, `Common Name`, `Year Extinct`, `Last Location`, `Extinction Cause`

### New CSV (133 species):
- **More detailed data**: 10 columns vs 5 columns
- **Better organization**: Separate `extinction_date`, `region`, `habitat`
- **Enhanced information**: `type`, `last_seen`, `description`, `sources`
- **Fewer species**: 133 vs 238 (more curated, higher quality dataset)

## Database Schema Updates Required

### Enhanced Species Table
```sql
-- Update species table to accommodate new CSV structure
ALTER TABLE species ADD COLUMN IF NOT EXISTS extinction_date TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS habitat TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS last_seen TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE species ADD COLUMN IF NOT EXISTS sources TEXT;

-- Add indexes for new searchable columns
CREATE INDEX IF NOT EXISTS idx_species_type ON species(type);
CREATE INDEX IF NOT EXISTS idx_species_region ON species(region);
CREATE INDEX IF NOT EXISTS idx_species_extinction_date ON species(extinction_date);

-- Update existing year_extinct to match extinction_date for consistency
-- Note: Keep both columns for backward compatibility
```

## Enhanced TypeScript Interfaces

```typescript
interface NewSpeciesCSVRow {
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

interface EnhancedSpecies extends Species {
  // New fields from CSV
  extinction_date: string;
  type: string; // "Animal" or "Plant"
  region: string;
  habitat: string;
  last_seen: string;
  description: string;
  sources: string;
  
  // Existing fields (mapped for compatibility)
  year_extinct: string; // Maps to extinction_date
  last_location: string; // Maps to last_seen
  extinction_cause: string; // Same field name
  common_name: string; // Same field name
  scientific_name: string; // Same field name
}
```

## Import Service Implementation

```typescript
class NewSpeciesImportService {
  static async importNewSpeciesDataset(
    file: File,
    options: {
      replaceExisting?: boolean;
      createNewList?: boolean;
      listName?: string;
      onProgress?: (progress: number, message: string) => void;
    } = {}
  ): Promise<ImportResult> {
    
    const {
      replaceExisting = false,
      createNewList = true,
      listName = "133 Extinct Species Dataset",
      onProgress = () => {}
    } = options;

    try {
      onProgress(10, "Reading CSV file...");
      
      // Parse CSV
      const csvText = await file.text();
      const rows = this.parseCSV(csvText);
      
      onProgress(20, "Validating data structure...");
      
      // Validate CSV structure
      const validationResult = this.validateNewCSVStructure(rows);
      if (!validationResult.isValid) {
        throw new Error(`CSV validation failed: ${validationResult.errors.join(', ')}`);
      }

      onProgress(30, "Creating species list...");
      
      // Create new species list
      let speciesListId: string;
      if (createNewList) {
        const { data: newList, error: listError } = await supabase
          .from('species_lists')
          .insert({
            name: listName,
            description: `Imported from ${file.name} - ${rows.length} species`,
            csv_filename: file.name,
            total_species: rows.length,
            import_status: 'importing',
            import_started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (listError) throw listError;
        speciesListId = newList.id;
      }

      onProgress(40, "Processing species data...");
      
      // Convert CSV rows to species objects
      const speciesData = rows.map((row, index) => ({
        // Map new CSV structure to database fields
        common_name: row.common_name,
        scientific_name: row.scientific_name,
        extinction_date: row.extinction_date,
        year_extinct: row.extinction_date, // Backward compatibility
        type: row.type,
        region: row.region,
        habitat: row.habitat,
        extinction_cause: row.extinction_cause,
        last_seen: row.last_seen,
        last_location: row.last_seen, // Backward compatibility
        description: row.description,
        sources: row.sources,
        species_list_id: speciesListId,
        display_order: index + 1,
        generation_status: 'pending' as const,
        total_image_versions: 0,
        total_video_versions: 0,
        current_displayed_image_version: 1,
        current_displayed_video_version: 1
      }));

      onProgress(60, "Inserting species into database...");
      
      // Batch insert species
      const batchSize = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < speciesData.length; i += batchSize) {
        const batch = speciesData.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('species')
          .insert(batch);
          
        if (insertError) {
          console.error('Batch insert error:', insertError);
          throw new Error(`Failed to insert batch starting at index ${i}: ${insertError.message}`);
        }
        
        insertedCount += batch.length;
        const progress = 60 + (insertedCount / speciesData.length) * 30;
        onProgress(progress, `Inserted ${insertedCount}/${speciesData.length} species...`);
      }

      onProgress(90, "Finalizing import...");
      
      // Update species list status
      if (createNewList) {
        await supabase
          .from('species_lists')
          .update({
            import_status: 'completed',
            imported_species: insertedCount,
            import_completed_at: new Date().toISOString()
          })
          .eq('id', speciesListId);
      }

      onProgress(100, "Import completed successfully!");
      
      return {
        success: true,
        imported: insertedCount,
        errors: [],
        speciesListId: speciesListId,
        message: `Successfully imported ${insertedCount} species from ${listName}`
      };

    } catch (error) {
      console.error('Import error:', error);
      
      // Update species list status to error if it was created
      if (createNewList && speciesListId) {
        await supabase
          .from('species_lists')
          .update({
            import_status: 'error',
            import_error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', speciesListId);
      }
      
      return {
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        message: 'Import failed'
      };
    }
  }

  private static validateNewCSVStructure(rows: any[]): ValidationResult {
    const requiredColumns = [
      'common_name', 'scientific_name', 'extinction_date', 'type', 
      'region', 'habitat', 'extinction_cause', 'last_seen', 
      'description', 'sources'
    ];
    
    const errors: string[] = [];
    
    if (rows.length === 0) {
      errors.push('CSV file is empty');
      return { isValid: false, errors };
    }
    
    // Check if all required columns exist
    const firstRow = rows[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Validate data types and content
    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2 because index is 0-based and we skip header
      
      if (!row.common_name?.trim()) {
        errors.push(`Row ${rowNum}: Missing common name`);
      }
      
      if (!row.scientific_name?.trim()) {
        errors.push(`Row ${rowNum}: Missing scientific name`);
      }
      
      if (!row.extinction_date?.trim()) {
        errors.push(`Row ${rowNum}: Missing extinction date`);
      }
      
      if (!['Animal', 'Plant'].includes(row.type)) {
        errors.push(`Row ${rowNum}: Type must be 'Animal' or 'Plant', got '${row.type}'`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static parseCSV(csvText: string): NewSpeciesCSVRow[] {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      
      return row as NewSpeciesCSVRow;
    });
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  speciesListId?: string;
  message: string;
}
```

## Enhanced Admin Dashboard Integration

```typescript
// Updated AdminPanel component with new species import
const NewSpeciesImportSection: React.FC = () => {
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewSpeciesImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportMessage('');

    try {
      const result = await NewSpeciesImportService.importNewSpeciesDataset(file, {
        createNewList: true,
        listName: "133 Extinct Species Dataset",
        onProgress: (progress, message) => {
          setImportProgress(progress);
          setImportMessage(message);
        }
      });

      if (result.success) {
        setImportMessage(`✅ ${result.message}`);
        // Refresh admin data
        await loadAdminData();
      } else {
        setImportMessage(`❌ Import failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      setImportMessage(`❌ Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded mb-6">
      <h3 className="text-lg font-semibold mb-4">Import New Species Dataset</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Select 133 Extinct Species CSV File
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleNewSpeciesImport}
          disabled={isImporting}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 disabled:opacity-50"
        />
        <p className="text-xs text-gray-400 mt-1">
          Expected format: common_name, scientific_name, extinction_date, type, region, habitat, extinction_cause, last_seen, description, sources
        </p>
      </div>

      {isImporting && (
        <div className="mb-4">
          <div className="bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <div className="text-sm text-gray-400">{importMessage}</div>
        </div>
      )}

      {importMessage && !isImporting && (
        <div className={`text-sm mb-2 ${importMessage.startsWith('❌') ? 'text-red-400' : 'text-green-400'}`}>
          {importMessage}
        </div>
      )}
    </div>
  );
};
```

## Species List Toggle Implementation

```typescript
const SpeciesListToggle: React.FC = () => {
  const [availableLists, setAvailableLists] = useState<SpeciesList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    loadAvailableLists();
  }, []);

  const loadAvailableLists = async () => {
    try {
      const { data: lists, error } = await supabase
        .from('species_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAvailableLists(lists || []);
      
      // Find active list
      const activeList = lists?.find(list => list.is_active);
      setActiveListId(activeList?.id || null);
    } catch (error) {
      console.error('Error loading species lists:', error);
    }
  };

  const handleListSwitch = async (listId: string) => {
    if (listId === activeListId) return;

    setSwitching(true);
    try {
      const response = await fetch('/api/admin/switch-species-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId })
      });

      if (!response.ok) {
        throw new Error('Failed to switch species list');
      }

      setActiveListId(listId);
      
      // Refresh admin data to show new species
      await loadAdminData();
      
      setImportMessage(`✅ Switched to ${availableLists.find(l => l.id === listId)?.name}`);
    } catch (error) {
      console.error('Error switching species list:', error);
      setImportMessage(`❌ Failed to switch species list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded mb-6">
      <h3 className="text-lg font-semibold mb-4">Species Dataset</h3>
      
      <div className="space-y-3">
        {availableLists.map(list => (
          <div
            key={list.id}
            className={`p-3 rounded border cursor-pointer transition-all ${
              list.id === activeListId
                ? 'border-green-500 bg-green-900/20'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => handleListSwitch(list.id)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">
                  {list.name}
                  {list.id === activeListId && (
                    <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded">ACTIVE</span>
                  )}
                </h4>
                <p className="text-sm text-gray-400 mt-1">{list.description}</p>
                <div className="text-xs text-gray-500 mt-2">
                  {list.imported_species} species • Imported {new Date(list.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-xs px-2 py-1 rounded ${
                  list.import_status === 'completed' ? 'bg-green-600' :
                  list.import_status === 'error' ? 'bg-red-600' :
                  'bg-yellow-600'
                }`}>
                  {list.import_status}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {switching && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Switching species dataset...
          </div>
        </div>
      )}
    </div>
  );
};
```

## API Route for Species List Switching

```typescript
// /api/admin/switch-species-list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { listId } = await request.json();

    if (!listId) {
      return NextResponse.json({ error: 'Species list ID is required' }, { status: 400 });
    }

    // Verify the list exists
    const { data: targetList, error: listError } = await supabase
      .from('species_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError || !targetList) {
      return NextResponse.json({ error: 'Species list not found' }, { status: 404 });
    }

    // Deactivate all lists
    await supabase
      .from('species_lists')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    // Activate the target list
    const { error: activateError } = await supabase
      .from('species_lists')
      .update({ is_active: true })
      .eq('id', listId);

    if (activateError) {
      throw activateError;
    }

    return NextResponse.json({
      success: true,
      message: `Switched to species list: ${targetList.name}`,
      activeList: targetList
    });

  } catch (error) {
    console.error('Error switching species list:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to switch species list' },
      { status: 500 }
    );
  }
}
```

## Migration Strategy

### Phase 1: Database Schema Update
1. Run migration to add new columns to species table
2. Create species_lists table
3. Add indexes for performance

### Phase 2: Import New Dataset
1. Create new species list entry for "133 Extinct Species Dataset"
2. Import all 133 species with enhanced data
3. Set as active species list

### Phase 3: Preserve Original Data
1. Create species list entry for "Original Species Dataset" 
2. Associate existing 238 species with original list
3. Maintain both datasets in parallel

### Phase 4: Admin Interface Update
1. Add species list toggle to admin dashboard
2. Implement new CSV import functionality
3. Update species display to show enhanced data

## Benefits of New Dataset

### Enhanced Information Quality
- **Detailed descriptions**: Rich context for each species
- **Better categorization**: Animal vs Plant classification
- **Geographic precision**: Specific regions and habitats
- **Source attribution**: Credible references for each entry
- **Timeline accuracy**: Specific extinction dates vs general years

### Improved User Experience
- **More engaging content**: Detailed descriptions for exhibit visitors
- **Better search/filtering**: Type, region, habitat categories
- **Educational value**: Sources for further research
- **Visual variety**: Mix of animals and plants for diverse content

### Technical Advantages
- **Structured data**: Consistent format across all entries
- **Validation ready**: Clear data types and constraints
- **API friendly**: Well-organized for programmatic access
- **Future-proof**: Extensible structure for additional fields

This import plan ensures a smooth transition to the new, higher-quality species dataset while preserving all existing work and maintaining backward compatibility.