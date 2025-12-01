# Debug Registration Server Error

## Check Server Logs

On your AWS server, check the detailed error:

```bash
pm2 logs kraftify-backend --err --lines 50
```

Look for:
- Database connection errors
- Table doesn't exist errors
- JWT_SECRET missing
- Permission errors

## Common Issues and Fixes

### Issue 1: JWT_SECRET Not Set

**Error:** `JWT_SECRET is not defined`

**Fix:**
```bash
cd ~/kraftify
nano .env
```

Add:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

Then:
```bash
pm2 restart kraftify-backend
```

### Issue 2: Database Tables Don't Exist

**Error:** `relation "users" does not exist`

**Fix:**
```bash
cd ~/kraftify
node -e "require('./server/config/database').createTables().then(() => process.exit())"
```

Or manually:
```bash
psql -h localhost -U msannan -d kraftify -f create_tables.sql
```

### Issue 3: Database Connection Failed

**Error:** `Connection refused` or `password authentication failed`

**Fix:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U msannan -d kraftify -c "SELECT 1;"

# If fails, check .env file
cat ~/kraftify/.env | grep DB_
```

### Issue 4: Missing Database Permissions

**Error:** `permission denied` or `aclcheck_error`

**Fix:**
```bash
sudo -u postgres psql
```

```sql
GRANT ALL PRIVILEGES ON DATABASE kraftify TO msannan;
\c kraftify
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO msannan;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO msannan;
\q
```

### Issue 5: Validation Error

**Error:** `Validation errors` in response

**Check:**
- Email format is valid
- Password is at least 6 characters
- Role is either 'tradesperson' or 'customer'
- firstName and lastName are provided

## Quick Diagnostic

Run this on your server:

```bash
#!/bin/bash
echo "🔍 Registration Diagnostic"
echo ""

echo "1. PM2 Status:"
pm2 status kraftify-backend
echo ""

echo "2. Recent Errors:"
pm2 logs kraftify-backend --err --lines 20 --nostream
echo ""

echo "3. Database Connection:"
psql -h localhost -U msannan -d kraftify -c "SELECT 1;" 2>&1
echo ""

echo "4. JWT_SECRET:"
grep JWT_SECRET ~/kraftify/.env || echo "❌ JWT_SECRET not found in .env"
echo ""

echo "5. Tables Exist:"
psql -h localhost -U msannan -d kraftify -c "\dt" 2>&1 | head -10
echo ""

echo "6. Test Registration Endpoint:"
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "role": "customer",
    "firstName": "Test",
    "lastName": "User"
  }' 2>&1
echo ""
```

## Test Registration Manually

```bash
curl -X POST http://35.89.52.162:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "role": "customer",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Check the response for specific error details.

