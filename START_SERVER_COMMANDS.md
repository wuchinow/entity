# Start Local Server Commands

## Kill Any Existing Servers
```bash
cd entity
pkill -f "next"
sleep 3
```

## Start Development Server
```bash
npm run dev
```

## Expected Output
You should see something like:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

## Test URLs After Server Starts
- **Gallery**: http://localhost:3000/gallery
- **Admin**: http://localhost:3000/admin
- **Exhibit**: http://localhost:3000/exhibit

## Next Steps After Server is Running
1. Go to http://localhost:3000/gallery
2. Click on Acacia acanthoclada (first species)
3. See what media currently displays
4. Then we'll add your uploaded image to the database
5. Refresh and see if it appears

Let me know when the server is running and what you see in the gallery for Acacia acanthoclada!