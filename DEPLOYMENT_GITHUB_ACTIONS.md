# GitHub Actions Deployment Setup

## Overview
This workflow automatically deploys your application to EC2 when you push to the main/master branch.

## Setup Instructions

### Step 1: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

1. **EC2_SSH_KEY**
   - Your EC2 private key (the .pem file content)
   - Copy the entire content of your `.pem` file
   - Example: `-----BEGIN RSA PRIVATE KEY-----...-----END RSA PRIVATE KEY-----`

2. **EC2_HOST**
   - Your EC2 server IP or domain
   - Example: `35.89.52.162` or `yourdomain.com`

3. **EC2_USER**
   - Your EC2 username
   - Usually `ubuntu` for Ubuntu or `ec2-user` for Amazon Linux
   - Example: `ubuntu`

4. **NEXT_PUBLIC_API_URL**
   - Your API URL for the frontend build
   - Example: `http://35.89.52.162:5001/api`
   - Or if using domain: `https://api.yourdomain.com/api`

### Step 2: Configure Git on EC2 Server

On your EC2 server, make sure git is configured:

```bash
cd ~/kraftify

# If not already a git repo, initialize it
git init

# Add your GitHub repository as remote
git remote add origin https://github.com/your-username/kraftify.git

# Or if using SSH:
git remote add origin git@github.com:your-username/kraftify.git

# Pull the code
git pull origin main
```

### Step 3: Set Up SSH Key Authentication (Optional but Recommended)

For better security, set up SSH key authentication:

```bash
# On your local machine, generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -C "github-actions"

# Copy public key to EC2
ssh-copy-id -i ~/.ssh/id_rsa.pub ubuntu@35.89.52.162

# Or manually add to EC2:
cat ~/.ssh/id_rsa.pub | ssh ubuntu@35.89.52.162 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Step 4: Test the Workflow

1. Make a small change to your code
2. Commit and push to main branch:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. Go to GitHub → Actions tab
4. Watch the deployment workflow run

## Workflow Details

The deployment workflow:
1. ✅ Checks out code
2. ✅ Runs tests
3. ✅ Builds frontend
4. ✅ SSH into EC2 server
5. ✅ Pulls latest code
6. ✅ Installs dependencies
7. ✅ Rebuilds frontend with production API URL
8. ✅ Restarts PM2 processes
9. ✅ Verifies deployment

## Troubleshooting

### SSH Connection Failed
- Check EC2 security group allows SSH (port 22) from GitHub Actions IPs
- Verify SSH key is correct in GitHub Secrets
- Check EC2_USER is correct (ubuntu vs ec2-user)

### Deployment Fails
- Check PM2 is installed: `pm2 --version`
- Verify ecosystem.config.js exists
- Check .env file exists on server
- View logs: `pm2 logs kraftify-backend`

### Frontend Build Fails
- Verify NEXT_PUBLIC_API_URL secret is set correctly
- Check client/package.json exists
- Ensure Node.js version matches (18.x)

### Git Pull Fails
- Make sure git remote is configured on server
- Check branch name (main vs master)
- Verify you have push access to the repository

## Manual Deployment

If you need to deploy manually:

```bash
# On your EC2 server
cd ~/kraftify
git pull origin main
npm ci
cd client
export NEXT_PUBLIC_API_URL=http://35.89.52.162:5001/api
npm ci
npm run build
cd ..
pm2 restart kraftify-backend
```

## Security Best Practices

1. **Never commit secrets** - Always use GitHub Secrets
2. **Use SSH keys** - Don't use passwords
3. **Restrict SSH access** - Only allow from specific IPs if possible
4. **Rotate keys regularly** - Update SSH keys periodically
5. **Use environment-specific secrets** - Different values for dev/prod

## Advanced: Multiple Environments

To deploy to different environments (staging/production):

1. Create separate workflow files:
   - `.github/workflows/deploy-staging.yml`
   - `.github/workflows/deploy-production.yml`

2. Use different secrets:
   - `EC2_HOST_STAGING` / `EC2_HOST_PRODUCTION`
   - `EC2_USER_STAGING` / `EC2_USER_PRODUCTION`
   - etc.

3. Trigger on different branches:
   - Staging: `develop` branch
   - Production: `main` branch

