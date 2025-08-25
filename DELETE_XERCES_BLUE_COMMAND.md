# Delete Xerces Blue Command

## Ready-to-Run SQL Command

```sql
DELETE FROM species 
WHERE id = '0fa20cf7-2ac2-4847-81e7-1cb01d2fcbeb';
```

## Verification Query (run after deletion)

```sql
-- Verify only "Xerces Blue Butterfly" remains
SELECT id, common_name, scientific_name 
FROM species 
WHERE scientific_name = 'Glaucopsyche xerces';
```

Should return only one result: "Xerces Blue Butterfly"

## What This Does
- Removes the "Xerces Blue" entry (ID: 0fa20cf7-2ac2-4847-81e7-1cb01d2fcbeb)
- Keeps the "Xerces Blue Butterfly" entry
- Cleans up the duplicate species for your exhibition