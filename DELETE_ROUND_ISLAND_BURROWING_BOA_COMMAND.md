# Delete Round Island Burrowing Boa Command

## Ready-to-Run SQL Command

```sql
DELETE FROM species 
WHERE id = 'bf982ed9-4f6c-41d4-bbd3-a28f9da7d2a1';
```

## Verification Query (run after deletion)

```sql
-- Verify only "Round Island Boa" remains
SELECT id, common_name, scientific_name 
FROM species 
WHERE common_name LIKE '%Round Island%Boa%'
ORDER BY common_name;
```

Should return only one result: "Round Island Boa" (Casarea dussumieri)

## What This Does
- Removes the "Round Island Burrowing Boa" entry (ID: bf982ed9-4f6c-41d4-bbd3-a28f9da7d2a1)
- Keeps the "Round Island Boa" entry
- Cleans up the duplicate species for your exhibition