# Fix CORS and API URL Configuration

## Problem
The frontend is trying to connect to `http://localhost:5001` from `http://35.89.52.162`, which causes:
- CORS errors
- Network errors (localhost is not accessible from remote server)

## Solution

### Step 1: Update Backend CORS (Already Done)
The backend now accepts requests from any origin. Make sure your `.env` file on the server has:

```env
FRONTEND_URL=http://35.89.52.162
# Or if using a domain:
# FRONTEND_URL=http://yourdomain.com
```

### Step 2: Set Environment Variable on Server

**On your AWS server**, set the API URL environment variable before building:

```bash
cd ~/kraftify/client

# Set environment variable for Next.js build
export NEXT_PUBLIC_API_URL=http://35.89.52.162:5001/api

# Rebuild the frontend
npm run build

# Restart PM2
cd ..
pm2 restart kraftify-backend
```

### Step 3: Alternative - Use .env.local File

Create a `.env.local` file in the `client` directory:

```bash
cd ~/kraftify/client
nano .env.local
```

Add:
```env
NEXT_PUBLIC_API_URL=http://35.89.52.162:5001/api
```

Then rebuild:
```bash
npm run build
```

### Step 4: Update PM2 Ecosystem Config

Update `ecosystem.config.js` to include environment variables:

```javascript
module.exports = {
  apps: [{
    name: 'kraftify-backend',
    script: './server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5001,
      FRONTEND_URL: 'http://35.89.52.162', // Add this
      SERVER_IP: '35.89.52.162' // Add this
    },
    // ... rest of config
  }]
};
```

Then restart:
```bash
pm2 delete kraftify-backend
pm2 start ecosystem.config.js
pm2 save
```

## Quick Fix Script

Run this on your server:

```bash
#!/bin/bash
cd ~/kraftify

# Set environment variable
export NEXT_PUBLIC_API_URL=http://35.89.52.162:5001/api

# Rebuild frontend
cd client
npm run build

# Restart backend
cd ..
pm2 restart kraftify-backend

echo "✅ CORS and API URL configured!"
```

## Verify It Works

1. **Check backend CORS logs:**
   ```bash
   pm2 logs kraftify-backend | grep CORS
   ```

2. **Test API from browser console:**
   ```javascript
   fetch('http://35.89.52.162:5001/api/health')
     .then(r => r.json())
     .then(console.log)
   ```

3. **Check frontend is using correct URL:**
   - Open browser DevTools → Network tab
   - Try to register/login
   - Check the request URL - it should be `http://35.89.52.162:5001/api/...`

## For Production with Domain

If you have a domain name:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
# Or if same domain:
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

## Troubleshooting

### Still getting CORS errors?
1. Check backend logs: `pm2 logs kraftify-backend`
2. Verify FRONTEND_URL in backend `.env`
3. Make sure port 5001 is open in firewall:
   ```bash
   sudo ufw allow 5001/tcp
   ```

### Frontend still using localhost?
1. Clear Next.js cache: `rm -rf client/.next`
2. Rebuild: `cd client && npm run build`
3. Restart frontend if running separately

### Socket.io connection failing?
The socket URL is now automatically detected from the API URL. Make sure `NEXT_PUBLIC_API_URL` is set correctly.

