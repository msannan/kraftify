#!/bin/bash

# Kraftify PM2 Diagnostic Script
# Run this on your AWS server to diagnose PM2 errors

echo "🔍 Kraftify Backend Diagnostic"
echo "================================"
echo ""

# Check PM2 status
echo "1️⃣  PM2 Status:"
pm2 status kraftify-backend
echo ""

# Check error logs
echo "2️⃣  Recent Error Logs (last 30 lines):"
pm2 logs kraftify-backend --err --lines 30 --nostream
echo ""

# Check if PostgreSQL is running
echo "3️⃣  PostgreSQL Status:"
sudo systemctl status postgresql --no-pager | head -5
echo ""

# Check database connection
echo "4️⃣  Testing Database Connection:"
if psql -h localhost -U msannan -d kraftify -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "   Try: sudo systemctl start postgresql"
fi
echo ""

# Check .env file
echo "5️⃣  Environment Variables Check:"
if [ -f .env ]; then
    echo "✅ .env file exists"
    echo "   Required variables:"
    grep -E "^(DB_|JWT_SECRET|PORT|NODE_ENV)" .env | sed 's/=.*/=***/' || echo "   ⚠️  Some variables may be missing"
else
    echo "❌ .env file not found!"
fi
echo ""

# Check port availability
echo "6️⃣  Port 5001 Check:"
if sudo lsof -i:5001 > /dev/null 2>&1; then
    echo "⚠️  Port 5001 is in use:"
    sudo lsof -i:5001
else
    echo "✅ Port 5001 is available"
fi
echo ""

# Check Node.js version
echo "7️⃣  Node.js Version:"
node --version
echo ""

# Check if upload directories exist
echo "8️⃣  Required Directories:"
for dir in uploads/profiles uploads/jobs uploads/customers uploads/messages logs; do
    if [ -d "$dir" ]; then
        echo "✅ $dir exists"
    else
        echo "❌ $dir missing - creating..."
        mkdir -p "$dir"
    fi
done
echo ""

# Check dependencies
echo "9️⃣  Node Modules:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
else
    echo "❌ node_modules missing - run: npm install"
fi
echo ""

echo "================================"
echo "📋 Summary:"
echo "  - Check the error logs above for specific issues"
echo "  - Most common fixes:"
echo "    1. Start PostgreSQL: sudo systemctl start postgresql"
echo "    2. Fix .env file: nano .env"
echo "    3. Reinstall deps: npm install"
echo "    4. Restart: pm2 delete kraftify-backend && pm2 start ecosystem.config.js"
echo ""

