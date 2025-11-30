# Troubleshooting PM2 Errors

## Backend Process in "errored" State

If your `kraftify-backend` shows as "errored" in PM2, follow these steps:

### Step 1: Check PM2 Logs

```bash
# View recent error logs
pm2 logs kraftify-backend --lines 50

# Or view only errors
pm2 logs kraftify-backend --err --lines 50

# View all logs
pm2 logs kraftify-backend
```

### Step 2: Common Issues and Fixes

#### Issue 1: Database Connection Error
**Error:** `ECONNREFUSED` or `password authentication failed`

**Fix:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if stopped
sudo systemctl start postgresql

# Verify database credentials in .env
cat .env | grep DB_

# Test database connection
psql -h localhost -U kraftify_user -d kraftify -c "SELECT 1;"
```

#### Issue 2: Missing Environment Variables
**Error:** `JWT_SECRET is not defined` or similar

**Fix:**
```bash
# Check .env file exists and has all required variables
cat .env

# Required variables:
# - DB_HOST
# - DB_PORT
# - DB_NAME
# - DB_USER
# - DB_PASSWORD
# - JWT_SECRET
# - PORT
# - NODE_ENV
```

#### Issue 3: Port Already in Use
**Error:** `EADDRINUSE: address already in use :::5001`

**Fix:**
```bash
# Find process using port 5001
sudo lsof -i:5001

# Kill the process
sudo kill -9 <PID>

# Or change port in .env
nano .env
# Change PORT=5001 to PORT=5002
```

#### Issue 4: Missing Dependencies
**Error:** `Cannot find module` or `MODULE_NOT_FOUND`

**Fix:**
```bash
# Reinstall dependencies
cd /var/www/kraftify
npm install

# If that doesn't work, delete node_modules and reinstall
rm -rf node_modules
npm install
```

#### Issue 5: Missing Upload Directories
**Error:** `ENOENT: no such file or directory` (uploads folder)

**Fix:**
```bash
# Create required directories
mkdir -p uploads/profiles
mkdir -p uploads/jobs
mkdir -p uploads/customers
mkdir -p uploads/messages
mkdir -p logs

# Set proper permissions
chmod -R 755 uploads
```

#### Issue 6: Permission Denied
**Error:** `EACCES: permission denied`

**Fix:**
```bash
# Check file permissions
ls -la server/index.js

# Fix ownership
sudo chown -R $USER:$USER /var/www/kraftify

# Fix permissions
chmod +x server/index.js
```

### Step 3: Restart the Application

After fixing the issue:

```bash
# Delete the errored process
pm2 delete kraftify-backend

# Start fresh
pm2 start ecosystem.config.js

# Or if using npm start
pm2 start npm --name "kraftify-backend" -- start

# Save PM2 configuration
pm2 save
```

### Step 4: Monitor the Application

```bash
# Watch logs in real-time
pm2 logs kraftify-backend --lines 0

# Check status
pm2 status

# Monitor resources
pm2 monit
```

### Step 5: Verify Application is Running

```bash
# Test backend health endpoint
curl http://localhost:5001/api/health

# Should return: {"status":"OK","message":"Kraftify API is running"}
```

## Quick Diagnostic Commands

```bash
# 1. Check PM2 status
pm2 status

# 2. Check recent logs
pm2 logs kraftify-backend --lines 20

# 3. Check if port is listening
sudo netstat -tlnp | grep 5001

# 4. Check PostgreSQL
sudo systemctl status postgresql
psql -h localhost -U kraftify_user -d kraftify -c "SELECT 1;"

# 5. Check environment variables
cd /var/www/kraftify
cat .env

# 6. Check Node.js version
node --version

# 7. Test database connection manually
node -e "require('dotenv').config(); const {Pool} = require('pg'); const pool = new Pool({user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT}); pool.query('SELECT NOW()', (err, res) => { if(err) console.error(err); else console.log('DB OK:', res.rows[0]); process.exit(); });"
```

## Getting Help

If the issue persists, collect this information:

```bash
# System info
uname -a
node --version
npm --version
pm2 --version

# Application info
cd /var/www/kraftify
cat package.json | grep version
cat .env | grep -v PASSWORD

# Error logs
pm2 logs kraftify-backend --err --lines 100 > error.log

# PM2 info
pm2 info kraftify-backend > pm2-info.txt
```

