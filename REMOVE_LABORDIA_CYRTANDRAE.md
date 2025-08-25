# Remove Labordia cyrtandrae

## Species to Remove
- **Common Name**: Labordia cyrtandrae
- **Scientific Name**: Labordia cyrtandrae
- **Location**: Line 40 in CSV - "Maui, Hawaii", Wet shrubland, Invasive species, "West Maui, 1997", Kamakahala

## SQL Commands

### Step 1: Find Species ID
```sql
-- Find Labordia cyrtandrae species ID
SELECT id, common_name, scientific_name 
FROM species 
WHERE common_name = 'Labordia cyrtandrae' 
AND scientific_name = 'Labordia cyrtandrae';
```

### Step 2: Delete Species (replace YOUR_SPECIES_ID with actual ID)
```sql
DELETE FROM species 
WHERE id = 'YOUR_SPECIES_ID';
```

### Step 3: Verification Query
```sql
-- Verify Labordia cyrtandrae has been removed
SELECT id, common_name, scientific_name 
FROM species 
WHERE scientific_name = 'Labordia cyrtandrae';
```

Should return no results after deletion.

## Steps to Execute
1. Run the SELECT query to find the species ID
2. Copy the ID and replace YOUR_SPECIES_ID in the DELETE command
3. Run the DELETE command
4. Run the verification query to confirm removal
5. Species will no longer appear in gallery or exhibit interfaces

## What This Does
- Removes Labordia cyrtandrae from the species database
- Cleans up the species list for exhibition
- Any associated media will also be removed via CASCADE constraints