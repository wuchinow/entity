# Delete Labordia cyrtandrae - Final Command

## Ready-to-Run SQL Command

```sql
DELETE FROM species 
WHERE id = 'fd578420-81c2-4242-b430-468309f7738c';
```

## Verification Query (run after deletion)

```sql
-- Verify Labordia cyrtandrae has been removed
SELECT id, common_name, scientific_name 
FROM species 
WHERE scientific_name = 'Labordia cyrtandrae';
```

Should return no results after deletion.

## What This Does
- Removes Labordia cyrtandrae from the species database
- Species ID: fd578420-81c2-4242-b430-468309f7738c
- Cleans up the species list for exhibition
- Any associated media will also be removed via CASCADE constraints
- Species will no longer appear in gallery or exhibit interfaces

## Species Details Being Removed
- **Common Name**: Labordia cyrtandrae
- **Scientific Name**: Labordia cyrtandrae
- **Location**: Maui, Hawaii
- **Habitat**: Wet shrubland
- **Extinction Cause**: Invasive species
- **Last Seen**: West Maui, 1997
- **Local Name**: Kamakahala