# Remove Round Island Burrowing Boa (Keep Round Island Boa)

## Problem
There are two similar entries:
- "Round Island Boa" (Casarea dussumieri) - TO BE KEPT
- "Round Island Burrowing Boa" (Bolyeria multocarinata) - TO BE REMOVED

## SQL Command to Find "Round Island Burrowing Boa"

```sql
-- First, find the species ID for "Round Island Burrowing Boa"
SELECT id, common_name, scientific_name 
FROM species 
WHERE common_name = 'Round Island Burrowing Boa' 
AND scientific_name = 'Bolyeria multocarinata';
```

## Delete Command (replace YOUR_SPECIES_ID with the actual ID from above)

```sql
DELETE FROM species 
WHERE id = 'YOUR_SPECIES_ID';
```

## Verification Query

```sql
-- Verify only "Round Island Boa" remains
SELECT id, common_name, scientific_name 
FROM species 
WHERE common_name LIKE '%Round Island%Boa%'
ORDER BY common_name;
```

Should return only one result: "Round Island Boa" (Casarea dussumieri)

## Steps
1. Run the SELECT query to find the ID of "Round Island Burrowing Boa"
2. Copy the ID and replace YOUR_SPECIES_ID in the DELETE command
3. Run the DELETE command
4. Run the verification query to confirm only the "Round Island Boa" entry remains