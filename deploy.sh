#!/bin/bash

# Kraftify Deployment Script for AWS Linux Server
# Run this script on your server after initial setup

set -e

echo "🚀 Starting Kraftify deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Navigate to application directory
APP_DIR="/var/www/kraftify"
cd $APP_DIR || { echo -e "${RED}Application directory not found. Please create it first.${NC}"; exit 1; }

echo -e "${GREEN}📦 Installing dependencies...${NC}"
npm install

echo -e "${GREEN}🏗️  Building frontend...${NC}"
cd client
npm install
npm run build
cd ..

echo -e "${GREEN}📁 Creating upload directories...${NC}"
mkdir -p uploads/profiles
mkdir -p uploads/jobs
mkdir -p uploads/customers
mkdir -p uploads/messages
mkdir -p logs

echo -e "${GREEN}🔄 Restarting application...${NC}"
pm2 restart kraftify-backend || pm2 start ecosystem.config.js
pm2 save

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}Check status with: pm2 status${NC}"
echo -e "${YELLOW}View logs with: pm2 logs kraftify-backend${NC}"

