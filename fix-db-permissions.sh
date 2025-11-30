#!/bin/bash

# Fix PostgreSQL Permissions for Kraftify
# Run this script on your AWS server

echo "🔧 Fixing PostgreSQL permissions for user 'msannan'..."
echo ""

# Connect to PostgreSQL and grant permissions
sudo -u postgres psql << 'EOF'
-- Grant database access
GRANT ALL PRIVILEGES ON DATABASE kraftify TO msannan;

-- Connect to the kraftify database
\c kraftify

-- Grant permissions on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO msannan;

-- Grant permissions on all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO msannan;

-- Grant permissions on all functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO msannan;

-- Set default permissions for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO msannan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO msannan;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO msannan;

-- Verify by listing tables
\dt

\q
EOF

echo ""
echo "✅ Permissions granted!"
echo ""
echo "🧪 Testing database connection..."
if psql -h localhost -U msannan -d kraftify -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed. Check your .env file."
fi

echo ""
echo "🔄 Restarting PM2..."
pm2 restart kraftify-backend

echo ""
echo "📋 Check status:"
pm2 status kraftify-backend

echo ""
echo "📝 View logs:"
echo "   pm2 logs kraftify-backend --lines 20"

