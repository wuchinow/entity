# Browser Troubleshooting Guide - 0 Species Issue

## Current Status
- ✅ **API Endpoints Working**: `/api/species` returns 238 species correctly
- ✅ **Database Connection**: `/api/test-connection` confirms connectivity  
- ✅ **Server Logs**: Show successful data fetching
- ❌ **Browser Display**: User seeing 0 species in gallery

## Immediate Troubleshooting Steps

### 1. Hard Refresh Browser Cache
```bash
# In your browser:
- Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Or open Developer Tools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"
```

### 2. Check Browser Console
```bash
# Open Developer Tools (F12) and check Console tab for errors
# Look for any JavaScript errors or failed network requests
```

### 3. Verify API Endpoints Manually
```bash
# Test these URLs directly in your browser:
http://localhost:3000/api/test-connection
http://localhost:3000/api/species
```

### 4. Clear Browser Data
```bash
# In browser settings:
- Clear browsing data for localhost
- Clear cookies and site data
- Clear cached images and files
```

### 5. Try Different Browser
```bash
# Test in a different browser or incognito/private mode
# This will rule out browser-specific caching issues
```

### 6. Check Network Tab
```bash
# In Developer Tools → Network tab:
# Refresh the page and check if /api/species request is made
# Verify the response contains the species data
```

## Diagnostic Commands

### Test API Directly
```bash
# Run these in terminal to verify API responses:
curl http://localhost:3000/api/test-connection
curl http://localhost:3000/api/species | head -100
```

### Check Server Logs
```bash
# Watch the terminal running npm run dev
# Look for any error messages when you refresh the gallery page
```

## Potential Causes

1. **Browser Cache**: Old cached version of the page
2. **JavaScript Errors**: Client-side errors preventing data loading
3. **Network Issues**: Failed API requests
4. **React Hydration**: Client-server mismatch
5. **Environment Variables**: Browser not picking up updated env vars

## Next Steps

If the above steps don't resolve the issue, please:

1. **Share Browser Console Logs**: Any errors or warnings
2. **Share Network Tab**: Show the API requests and responses
3. **Try Incognito Mode**: Test if it works in a fresh browser session
4. **Restart Development Server**: Stop and restart `npm run dev`

## Emergency Reset

If nothing else works:
```bash
# Stop the development server
# Clear all browser data for localhost
# Restart the development server
cd entity
npm run dev
```

Then visit `http://localhost:3000/gallery` in a fresh incognito window.