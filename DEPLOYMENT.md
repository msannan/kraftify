# AWS Linux Server Deployment Guide

This guide will help you deploy the Kraftify application to an AWS Linux server (Amazon Linux 2 or Ubuntu).

## Prerequisites

- AWS EC2 instance running (Amazon Linux 2 or Ubuntu)
- SSH access to the server
- Domain name (optional, for production)

## Step 1: Connect to Your Server

```bash
ssh -i your-key.pem ec2-user@your-server-ip
# Or for Ubuntu:
ssh -i your-key.pem ubuntu@your-server-ip
```

## Step 2: Update System Packages

### For Amazon Linux 2:
```bash
sudo yum update -y
```

### For Ubuntu:
```bash
sudo apt update && sudo apt upgrade -y
```

## Step 3: Install Node.js

### Using NodeSource (Recommended for both):
```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Or for Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 4: Install PostgreSQL

### For Amazon Linux 2:
```bash
sudo amazon-linux-extras enable postgresql14
sudo yum install -y postgresql-server postgresql
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### For Ubuntu:
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Configure PostgreSQL:
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE kraftify;
CREATE USER kraftify_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kraftify TO kraftify_user;
\q
```

## Step 5: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

## Step 6: Install Nginx (Optional, for reverse proxy)

### For Amazon Linux 2:
```bash
sudo amazon-linux-extras enable nginx1
sudo yum install -y nginx
```

### For Ubuntu:
```bash
sudo apt install -y nginx
```

## Step 7: Clone Your Repository

```bash
# Create application directory
sudo mkdir -p /var/www/kraftify
sudo chown $USER:$USER /var/www/kraftify

# Clone repository (or upload files)
cd /var/www/kraftify
git clone https://github.com/your-username/kraftify.git .

# Or if you need to upload files manually:
# Use scp or sftp to upload your project files
```

## Step 8: Install Application Dependencies

```bash
cd /var/www/kraftify

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
npm run build
cd ..
```

## Step 9: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following content:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kraftify
DB_USER=kraftify_user
DB_PASSWORD=your_secure_password

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=5001
NODE_ENV=production

# Frontend URL (update with your domain)
FRONTEND_URL=http://your-domain.com
# Or if using IP:
# FRONTEND_URL=http://your-server-ip:3000
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 10: Create Upload Directories

```bash
mkdir -p uploads/profiles
mkdir -p uploads/jobs
mkdir -p uploads/customers
mkdir -p uploads/messages
```

## Step 11: Initialize Database Tables

The database tables will be created automatically when the server starts, but you can verify:

```bash
# Test database connection
psql -h localhost -U kraftify_user -d kraftify -c "SELECT 1;"
```

## Step 12: Configure PM2

Create a PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

Add:

```javascript
module.exports = {
  apps: [{
    name: 'kraftify-backend',
    script: './server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

## Step 13: Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions it provides
```

## Step 14: Configure Nginx (Reverse Proxy)

```bash
sudo nano /etc/nginx/conf.d/kraftify.conf
```

Add:

```nginx
# Backend API
upstream kraftify_backend {
    server localhost:5001;
}

server {
    listen 80;
    server_name your-domain.com;  # Or your server IP

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://kraftify_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads (static files)
    location /uploads {
        alias /var/www/kraftify/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Increase body size for file uploads
    client_max_body_size 10M;
}
```

Test and restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 15: Configure Firewall

### For Amazon Linux 2 (using firewalld):
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### For Ubuntu (using ufw):
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Step 16: Run Frontend (Next.js)

For production, you have two options:

### Option A: Run Next.js with PM2

```bash
cd /var/www/kraftify/client
pm2 start npm --name "kraftify-frontend" -- start
pm2 save
```

### Option B: Build and serve static files (if using static export)

Update `next.config.js` for static export if needed.

## Step 17: Verify Everything is Running

```bash
# Check PM2 processes
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check PostgreSQL
sudo systemctl status postgresql

# Check application logs
pm2 logs kraftify-backend
```

## Step 18: Access Your Application

- Frontend: `http://your-server-ip` or `http://your-domain.com`
- Backend API: `http://your-server-ip/api` or `http://your-domain.com/api`

## Useful Commands

### PM2 Commands:
```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart all         # Restart all apps
pm2 stop all            # Stop all apps
pm2 delete all          # Delete all apps
pm2 monit               # Monitor resources
```

### Application Updates:
```bash
cd /var/www/kraftify
git pull                # Pull latest changes
npm install             # Update dependencies
cd client && npm install && npm run build
pm2 restart kraftify-backend
pm2 restart kraftify-frontend
```

### Database Backup:
```bash
# Backup
pg_dump -h localhost -U kraftify_user kraftify > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U kraftify_user kraftify < backup_20241201.sql
```

## Troubleshooting

### Check application logs:
```bash
pm2 logs kraftify-backend --lines 100
```

### Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Check PostgreSQL logs:
```bash
sudo tail -f /var/lib/pgsql/data/pg_log/postgresql-*.log
# Or for Ubuntu:
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Restart services:
```bash
sudo systemctl restart postgresql
sudo systemctl restart nginx
pm2 restart all
```

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Use strong JWT_SECRET
- [ ] Configure firewall (only allow necessary ports)
- [ ] Set up SSL/HTTPS (Let's Encrypt)
- [ ] Regular database backups
- [ ] Keep system packages updated
- [ ] Use environment variables (never commit .env)
- [ ] Set proper file permissions

## SSL/HTTPS Setup (Optional but Recommended)

Install Certbot for Let's Encrypt:

```bash
# Amazon Linux 2
sudo yum install -y certbot python3-certbot-nginx

# Ubuntu
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Next Steps

1. Set up domain DNS to point to your server IP
2. Configure SSL certificate
3. Set up automated backups
4. Configure monitoring (optional)
5. Set up CI/CD to auto-deploy (optional)

