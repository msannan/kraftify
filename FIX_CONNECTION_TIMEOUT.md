# Fix Connection Timeout Error

## Problem
Getting `ERR_CONNECTION_TIMED_OUT` when trying to access the API. This means the backend server is not accessible from the browser.

## Common Causes

1. **Backend not running**
2. **Backend listening on localhost only** (not accessible from outside)
3. **Firewall blocking port 5001**
4. **Wrong API URL in frontend**

## Step-by-Step Fix

### Step 1: Check if Backend is Running

```bash
# On your AWS server
pm2 status

# Should show kraftify-backend as "online"
# If it shows "errored" or "stopped", check logs:
pm2 logs kraftify-backend --lines 50
```

### Step 2: Verify Backend is Listening on All Interfaces

The server must listen on `0.0.0.0` (all interfaces), not just `localhost`.

**Check server/index.js:**
```bash
cd ~/kraftify
grep -n "server.listen" server/index.js
```

It should be:
```javascript
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

**If it's listening on localhost only, fix it:**
```bash
nano server/index.js
```

Find the line with `server.listen(PORT, ...)` and change it to:
```javascript
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

Then restart:
```bash
pm2 restart kraftify-backend
```

### Step 3: Check Firewall Rules

```bash
# Check current firewall status
sudo ufw status

# Allow port 5001
sudo ufw allow 5001/tcp

# If using AWS Security Groups, make sure port 5001 is open:
# - Go to AWS Console → EC2 → Security Groups
# - Add inbound rule: Port 5001, Source: 0.0.0.0/0 (or your IP)
```

### Step 4: Test Backend from Server

```bash
# Test from the server itself
curl http://localhost:5001/api/health

# Should return: {"status":"OK","message":"Kraftify API is running"}

# Test from server's public IP
curl http://35.89.52.162:5001/api/health
```

### Step 5: Test from Your Local Machine

```bash
# From your local machine (not the server)
curl http://35.89.52.162:5001/api/health
```

If this works, the backend is accessible. If not, check:
- AWS Security Groups
- Firewall rules
- Backend is listening on 0.0.0.0

### Step 6: Verify Frontend API URL

Check what URL the frontend is using:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to register
4. Check the failed request URL

It should be: `http://35.89.52.162:5001/api/auth/register`

If it's still `localhost:5001`, the frontend wasn't rebuilt correctly.

### Step 7: Rebuild Frontend (if needed)

```bash
cd ~/kraftify/client

# Make sure API URL is set
export NEXT_PUBLIC_API_URL=http://35.89.52.162:5001/api

# Clear cache and rebuild
rm -rf .next
npm run build

# Restart if using PM2 for frontend
pm2 restart kraftify-frontend
```

## Quick Diagnostic Script

Run this on your server:

```bash
#!/bin/bash
echo "🔍 Diagnosing connection timeout issue..."
echo ""

echo "1. PM2 Status:"
pm2 status kraftify-backend
echo ""

echo "2. Backend listening on:"
sudo netstat -tlnp | grep 5001 || ss -tlnp | grep 5001
echo ""

echo "3. Testing localhost:"
curl -s http://localhost:5001/api/health || echo "❌ Backend not responding on localhost"
echo ""

echo "4. Testing public IP:"
curl -s http://35.89.52.162:5001/api/health || echo "❌ Backend not accessible from public IP"
echo ""

echo "5. Firewall status:"
sudo ufw status | grep 5001 || echo "⚠️  Port 5001 not in firewall rules"
echo ""

echo "6. Server listen configuration:"
grep "server.listen" ~/kraftify/server/index.js
echo ""
```

## AWS Security Group Configuration

If you're using AWS EC2, you MUST configure Security Groups:

1. Go to AWS Console → EC2 → Instances
2. Select your instance
3. Click "Security" tab → Security groups
4. Click on the security group
5. Click "Edit inbound rules"
6. Add rule:
   - Type: Custom TCP
   - Port: 5001
   - Source: 0.0.0.0/0 (or specific IP for security)
   - Description: Kraftify API
7. Save rules

## Most Common Fix

The most common issue is the server listening on `localhost` only. Fix it:

```bash
cd ~/kraftify
nano server/index.js
```

Find:
```javascript
server.listen(PORT, () => {
```

Change to:
```javascript
server.listen(PORT, '0.0.0.0', () => {
```

Then:
```bash
pm2 restart kraftify-backend
pm2 logs kraftify-backend
```

## Verify Fix

1. **From server:**
   ```bash
   curl http://localhost:5001/api/health
   ```

2. **From your browser:**
   - Open: `http://35.89.52.162:5001/api/health`
   - Should see: `{"status":"OK","message":"Kraftify API is running"}`

3. **From frontend:**
   - Try to register/login
   - Check Network tab - should connect successfully

