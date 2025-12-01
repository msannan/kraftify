# Fix "relation users does not exist" Error

## Problem
The error `relation "users" does not exist` means the database tables haven't been created yet.

## Quick Fix

Run this on your AWS server:

```bash
cd ~/kraftify

# Option 1: Use the initialization script
node init-database.js

# Option 2: Run directly
node -e "require('./server/config/database').createTables().then(() => { console.log('✅ Tables created!'); process.exit(); })"
```

After running, you should see:
```
🔄 Initializing database...
Database tables created successfully
✅ Database tables created successfully!
```

## Verify Tables Were Created

```bash
psql -h localhost -U msannan -d kraftify -c "\dt"
```

You should see a list of tables including:
- users
- tradesperson_profiles
- customer_profiles
- job_postings
- job_bids
- messages
- etc.

## Restart Backend

```bash
pm2 restart kraftify-backend
pm2 logs kraftify-backend
```

## If You Get Permission Errors

If you see permission errors when creating tables:

```bash
sudo -u postgres psql
```

```sql
GRANT ALL PRIVILEGES ON DATABASE kraftify TO msannan;
\c kraftify
GRANT ALL PRIVILEGES ON SCHEMA public TO msannan;
ALTER SCHEMA public OWNER TO msannan;
\q
```

Then try creating tables again.

## Test Registration

After tables are created and backend is restarted, try registering again. It should work!

