#!/bin/bash

# Quick CORS Fix Script for AWS Server
# Run this on your AWS server: ./fix-cors-server.sh

set -e

echo "🔧 Fixing CORS issue on AWS server..."
echo ""

# Get server IP (you can also set this manually)
SERVER_IP=${1:-$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "35.89.52.162")}

echo "📍 Using server IP: $SERVER_IP"
echo ""

# Step 1: Update backend .env
echo "1️⃣  Updating backend .env file..."
cd ~/kraftify

if [ -f .env ]; then
    # Update or add FRONTEND_URL
    if grep -q "FRONTEND_URL" .env; then
        sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=http://$SERVER_IP|" .env
    else
        echo "FRONTEND_URL=http://$SERVER_IP" >> .env
    fi
    
    # Update or add SERVER_IP
    if grep -q "SERVER_IP" .env; then
        sed -i "s|SERVER_IP=.*|SERVER_IP=$SERVER_IP|" .env
    else
        echo "SERVER_IP=$SERVER_IP" >> .env
    fi
    
    echo "✅ Backend .env updated"
else
    echo "⚠️  .env file not found, creating one..."
    cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kraftify
DB_USER=msannan
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-change-this
PORT=5001
NODE_ENV=production
FRONTEND_URL=http://$SERVER_IP
SERVER_IP=$SERVER_IP
EOF
    echo "✅ Created .env file"
fi

# Step 2: Set frontend environment variable and rebuild
echo ""
echo "2️⃣  Rebuilding frontend with correct API URL..."
cd ~/kraftify/client

# Remove old build
rm -rf .next

# Set environment variable and build
export NEXT_PUBLIC_API_URL=http://$SERVER_IP:5001/api
npm run build

echo "✅ Frontend rebuilt"

# Step 3: Restart PM2
echo ""
echo "3️⃣  Restarting PM2 processes..."
cd ~/kraftify

pm2 restart kraftify-backend
pm2 save

echo "✅ PM2 restarted"

# Step 4: Check firewall
echo ""
echo "4️⃣  Checking firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 5001/tcp 2>/dev/null || true
    sudo ufw allow 3000/tcp 2>/dev/null || true
    echo "✅ Firewall rules checked"
fi

# Step 5: Test
echo ""
echo "5️⃣  Testing backend..."
sleep 2
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend is responding"
else
    echo "⚠️  Backend might not be running, check: pm2 logs kraftify-backend"
fi

echo ""
echo "================================"
echo "✅ CORS fix complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Check PM2 status: pm2 status"
echo "  2. View logs: pm2 logs kraftify-backend"
echo "  3. Test in browser: http://$SERVER_IP:3000"
echo ""
echo "🔍 If you still see CORS errors:"
echo "  - Clear browser cache (Ctrl+Shift+R)"
echo "  - Check: pm2 logs kraftify-backend"
echo "  - Verify API URL in browser DevTools → Network tab"
echo ""

