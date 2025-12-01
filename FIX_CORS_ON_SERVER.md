# Fix CORS Issue on AWS Server - Step by Step

## Step 1: Update Backend Environment Variables

```bash
cd ~/kraftify

# Edit the .env file
nano .env
```

Add or update these lines:
```env
FRONTEND_URL=http://35.89.52.162
SERVER_IP=35.89.52.162
PORT=5001
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 2: Set Frontend Environment Variable and Rebuild

```bash
# Navigate to client directory
cd ~/kraftify/client

# Set the API URL environment variable
export NEXT_PUBLIC_API_URL=http://35.89.52.162:5001/api

# Rebuild the frontend (this will bake the API URL into the build)
npm run build
```

**Important:** The `NEXT_PUBLIC_API_URL` must be set **before** running `npm run build` because Next.js bakes environment variables into the build at build time.

## Step 3: Restart PM2 Processes

```bash
# Go back to project root
cd ~/kraftify

# Restart backend
pm2 restart kraftify-backend

# If you're running frontend with PM2, restart it too
pm2 restart kraftify-frontend  # if applicable

# Save PM2 configuration
pm2 save

# Check status
pm2 status
```

## Step 4: Verify Firewall Rules

Make sure port 5001 is open:

```bash
# Check if port 5001 is open
sudo ufw status

# If not open, allow it
sudo ufw allow 5001/tcp

# Also allow port 3000 if running frontend separately
sudo ufw allow 3000/tcp

# Reload firewall
sudo ufw reload
```

## Step 5: Test the Fix

### Test Backend API:
```bash
# From your server
curl http://localhost:5001/api/health

# Should return: {"status":"OK","message":"Kraftify API is running"}
```

### Test from Browser:
1. Open `http://35.89.52.162:3000` (or your frontend URL)
2. Open browser DevTools (F12) → Console tab
3. Try to register/login
4. Check Network tab - requests should go to `http://35.89.52.162:5001/api/...`
5. No CORS errors should appear

## Step 6: Check Logs

```bash
# Check backend logs for any errors
pm2 logs kraftify-backend --lines 50

# Look for CORS warnings or errors
```

## Alternative: Create .env.local File (Permanent Solution)

Instead of using `export`, create a permanent `.env.local` file:

```bash
cd ~/kraftify/client

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://35.89.52.162:5001/api
EOF

# Rebuild
npm run build
```

This way, the API URL will be set every time you rebuild without needing to export the variable.

## Quick One-Liner Fix

Run this complete fix script:

```bash
cd ~/kraftify && \
export NEXT_PUBLIC_API_URL=http://35.89.52.162:5001/api && \
cd client && \
npm run build && \
cd .. && \
pm2 restart kraftify-backend && \
pm2 save && \
echo "✅ CORS fix applied! Check: pm2 logs kraftify-backend"
```

## Troubleshooting

### Still getting CORS errors?

1. **Check backend .env file:**
   ```bash
   cat ~/kraftify/.env | grep FRONTEND_URL
   ```

2. **Check if frontend was rebuilt:**
   ```bash
   # Check build timestamp
   ls -la ~/kraftify/client/.next
   ```

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   - Or clear browser cache completely

4. **Check PM2 logs:**
   ```bash
   pm2 logs kraftify-backend --err --lines 50
   ```

5. **Verify API URL in browser:**
   - Open DevTools → Network tab
   - Try an action (register/login)
   - Check the request URL - should be `http://35.89.52.162:5001/api/...`

### Frontend still using localhost?

If the frontend is still trying to use localhost, the build didn't pick up the environment variable. Make sure:

1. You set `NEXT_PUBLIC_API_URL` **before** running `npm run build`
2. The variable name starts with `NEXT_PUBLIC_` (required for Next.js)
3. You cleared the `.next` cache: `rm -rf ~/kraftify/client/.next && npm run build`

## For Production with Domain Name

If you have a domain name (e.g., `kraftify.com`):

```bash
# In client/.env.local
NEXT_PUBLIC_API_URL=https://api.kraftify.com/api
# Or if same domain:
NEXT_PUBLIC_API_URL=https://kraftify.com/api
```

Then update backend `.env`:
```env
FRONTEND_URL=https://kraftify.com
```

