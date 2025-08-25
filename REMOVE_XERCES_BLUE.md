# Remove Xerces Blue (Keep Xerces Blue Butterfly)

## Problem
There are two entries for the same species:
- "Xerces Blue" (line 33 in CSV) - TO BE REMOVED
- "Xerces Blue Butterfly" (line 121 in CSV) - TO BE KEPT

## SQL Command to Remove "Xerces Blue"

```sql
-- First, find the species ID for "Xerces Blue" (not the butterfly)
SELECT id, common_name, scientific_name 
FROM species 
WHERE common_name = 'Xerces Blue' 
AND scientific_name = 'Glaucopsyche xerces';

-- Then delete it (replace YOUR_SPECIES_ID with the actual ID from above)
DELETE FROM species 
WHERE common_name = 'Xerces Blue' 
AND scientific_name = 'Glaucopsyche xerces'
AND id = 'YOUR_SPECIES_ID';
```

## Verification Query

```sql
-- Verify only "Xerces Blue Butterfly" remains
SELECT id, common_name, scientific_name 
FROM species 
WHERE scientific_name = 'Glaucopsyche xerces';
```

Should return only one result: "Xerces Blue Butterfly"

## Steps
1. Run the SELECT query to find the ID of "Xerces Blue"
2. Copy the ID and replace YOUR_SPECIES_ID in the DELETE command
3. Run the DELETE command
4. Run the verification query to confirm only the butterfly entry remains