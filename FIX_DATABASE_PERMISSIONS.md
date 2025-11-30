# Fix PostgreSQL Permission Error (aclcheck_error)

## Problem
The error `aclcheck_error` from `aclchk.c` indicates that the database user `msannan` doesn't have sufficient permissions to access the database or perform operations.

## Solution: Grant Proper Permissions

### Step 1: Connect to PostgreSQL as Superuser

```bash
sudo -u postgres psql
```

### Step 2: Grant Database Permissions

In the PostgreSQL prompt, run:

```sql
-- Grant database access
GRANT ALL PRIVILEGES ON DATABASE kraftify TO msannan;

-- Connect to the kraftify database
\c kraftify

-- Grant permissions on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO msannan;

-- Grant permissions on all sequences (for auto-increment IDs)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO msannan;

-- Grant permissions on all functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO msannan;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO msannan;

-- Set default permissions for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO msannan;

-- Set default permissions for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO msannan;

-- Verify permissions
\dp

-- Exit
\q
```

### Step 3: Verify Database Connection

Test the connection with your application user:

```bash
psql -h localhost -U msannan -d kraftify -c "SELECT 1;"
```

If this works, you should see:
```
 ?column? 
----------
        1
(1 row)
```

### Step 4: Restart the Application

```bash
cd ~/kraftify
pm2 restart kraftify-backend
pm2 logs kraftify-backend --lines 20
```

## Alternative: Recreate User with Proper Permissions

If granting permissions doesn't work, you can recreate the user:

```bash
sudo -u postgres psql
```

```sql
-- Drop existing user (if needed)
DROP USER IF EXISTS msannan;

-- Create user with password
CREATE USER msannan WITH PASSWORD 'postgres';

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE kraftify TO msannan;

-- Connect to database
\c kraftify

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO msannan;

-- Make user owner of schema (optional, gives full control)
ALTER SCHEMA public OWNER TO msannan;

-- Exit
\q
```

## Verify Everything Works

```bash
# Test connection
psql -h localhost -U msannan -d kraftify -c "SELECT NOW();"

# Check if tables exist
psql -h localhost -U msannan -d kraftify -c "\dt"

# Check PM2 status
pm2 status

# Check logs
pm2 logs kraftify-backend --lines 30
```

## Common Issues

### Issue: "password authentication failed"
**Fix:** Check your `.env` file has the correct password:
```bash
cat .env | grep DB_PASSWORD
```

### Issue: "database does not exist"
**Fix:** Create the database:
```bash
sudo -u postgres psql -c "CREATE DATABASE kraftify;"
```

### Issue: "relation does not exist"
**Fix:** Tables might not be created. The application should create them automatically on first run, but you can check:
```bash
psql -h localhost -U msannan -d kraftify -c "\dt"
```

If no tables exist, make sure the application has run at least once to create them.

## Full Permission Script

Here's a complete script you can run:

```bash
#!/bin/bash
sudo -u postgres psql << EOF
GRANT ALL PRIVILEGES ON DATABASE kraftify TO msannan;
\c kraftify
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO msannan;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO msannan;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO msannan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO msannan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO msannan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO msannan;
\q
EOF
```

Save this as `fix-permissions.sh`, make it executable (`chmod +x fix-permissions.sh`), and run it.

