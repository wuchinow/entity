# Disable Auto-Recovery Feature Plan

## Problem
The auto-recovery feature is running every minute and showing console errors:
```
Auto-recovery failed: "Comprehensive recovery: 0 fixed, 0 retried"
```

Since all media has been added and the system is stable for exhibition, this feature is no longer needed and should be disabled.

## Files to Modify

### 1. entity/src/app/exhibit/page.tsx
**Current code (lines 20-24):**
```typescript
// Auto error recovery for exhibit
useAutoErrorRecovery({
  enabled: true,
  interval: 60000, // Check every minute for exhibit
});
```

**Change to:**
```typescript
// Auto error recovery disabled - no longer needed for exhibition
// useAutoErrorRecovery({
//   enabled: false,
//   interval: 60000, // Check every minute for exhibit
// });
```

### 2. entity/src/app/gallery/page.tsx
**Find and disable the useAutoErrorRecovery hook (around line 71):**
```typescript
// Auto error recovery hook
const { stats: recoveryStats, manualRecovery } = useAutoErrorRecovery({
  enabled: true,
  interval: 120000, // Check every 2 minutes
});
```

**Change to:**
```typescript
// Auto error recovery disabled - no longer needed
// const { stats: recoveryStats, manualRecovery } = useAutoErrorRecovery({
//   enabled: false,
//   interval: 120000, // Check every 2 minutes
// });
```

### 3. Remove import statements
Also remove or comment out the import statements in both files:
```typescript
import { useAutoErrorRecovery } from '@/hooks/useAutoErrorRecovery';
```

## Expected Result
- Console errors about auto-recovery will stop
- System will be cleaner for exhibition use
- No background processes trying to fix non-existent errors
- Better performance during exhibition

## Implementation Steps
1. Switch to Code mode
2. Modify exhibit/page.tsx to disable auto-recovery
3. Modify gallery/page.tsx to disable auto-recovery
4. Test that console errors are gone
5. Verify exhibition still works properly