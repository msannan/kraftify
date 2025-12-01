# Quick Fix for Connection Timeout

## The Problem
The server is listening on `localhost` only, so it's not accessible from outside the server.

## Quick Fix (Run on AWS Server)

### Step 1: Update server/index.js

```bash
cd ~/kraftify
nano server/index.js
```

Find line 127:
```javascript
server.listen(PORT, () => {
```

Change to:
```javascript
server.listen(PORT, '0.0.0.0', () => {
```

Save (Ctrl+X, Y, Enter)

### Step 2: Restart Backend

```bash
pm2 restart kraftify-backend
pm2 logs kraftify-backend
```

You should see: `Server running on port 5001 (accessible from all interfaces)`

### Step 3: Check Firewall

```bash
# Allow port 5001
sudo ufw allow 5001/tcp

# Check status
sudo ufw status
```

### Step 4: Check AWS Security Group

**IMPORTANT:** In AWS Console:
1. Go to EC2 → Instances → Select your instance
2. Click "Security" tab
3. Click on Security Group name
4. Click "Edit inbound rules"
5. Add rule:
   - Type: Custom TCP
   - Port: 5001
   - Source: 0.0.0.0/0
   - Description: Kraftify API
6. Save rules

### Step 5: Test

```bash
# From server
curl http://localhost:5001/api/health

# From your browser, open:
http://35.89.52.162:5001/api/health
```

Both should work!

