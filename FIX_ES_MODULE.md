# Fix for ERR_REQUIRE_ESM Error

## Problem
The `@xenova/transformers` package is an ES module and cannot be used with `require()` in CommonJS files.

## Solution
The file `server/utils/semanticMatching.js` has been updated to use dynamic `import()` instead of `require()`.

## How to Apply the Fix on Your AWS Server

### Option 1: Upload the Fixed File (Recommended)

1. **On your local machine**, the file is already fixed at:
   ```
   server/utils/semanticMatching.js
   ```

2. **Upload to your server:**
   ```bash
   # From your local machine
   scp -i your-key.pem server/utils/semanticMatching.js ubuntu@your-server-ip:/home/ubuntu/kraftify/server/utils/
   ```

3. **Restart PM2:**
   ```bash
   # SSH into your server
   ssh -i your-key.pem ubuntu@your-server-ip
   
   # Navigate to project
   cd ~/kraftify
   
   # Restart the backend
   pm2 restart kraftify-backend
   
   # Check if it's running
   pm2 status
   
   # View logs
   pm2 logs kraftify-backend --lines 20
   ```

### Option 2: Edit Directly on Server

1. **SSH into your server:**
   ```bash
   ssh -i your-key.pem ubuntu@your-server-ip
   cd ~/kraftify
   ```

2. **Edit the file:**
   ```bash
   nano server/utils/semanticMatching.js
   ```

3. **Find this line (around line 1):**
   ```javascript
   const { pipeline } = require('@xenova/transformers');
   ```

4. **Remove it** and make sure the `initializeModel()` function looks like this:
   ```javascript
   async function initializeModel() {
     if (modelCache && tokenizerCache) {
       return { model: modelCache, tokenizer: tokenizerCache };
     }

     try {
       console.log('🔄 Loading semantic matching model...');
       // Use dynamic import() for ES module compatibility
       const { pipeline } = await import('@xenova/transformers');
       
       const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
         quantized: true,
       });
       
       modelCache = pipe;
       tokenizerCache = pipe;
       console.log('✅ Semantic matching model loaded');
       
       return { model: pipe, tokenizer: pipe };
     } catch (error) {
       console.error('❌ Error loading semantic model:', error);
       throw error;
     }
   }
   ```

5. **Save and exit** (Ctrl+X, then Y, then Enter)

6. **Restart PM2:**
   ```bash
   pm2 restart kraftify-backend
   pm2 logs kraftify-backend
   ```

## Verify the Fix

After restarting, check the logs:

```bash
pm2 logs kraftify-backend --lines 30
```

You should see:
- ✅ No more `ERR_REQUIRE_ESM` errors
- ✅ "🔄 Loading semantic matching model..." message
- ✅ "✅ Semantic matching model loaded" message
- ✅ Process status should be "online" instead of "errored"

## What Changed

**Before (causing error):**
```javascript
const { pipeline } = require('@xenova/transformers'); // ❌ ES modules can't use require()
```

**After (fixed):**
```javascript
// Import moved inside async function
const { pipeline } = await import('@xenova/transformers'); // ✅ Dynamic import works with ES modules
```

The dynamic `import()` is only called when the model is actually needed (lazy loading), which is more efficient anyway.

