# Smart Job Matching System

## Overview

The Smart Job Matching system uses **semantic similarity** (not just keywords) to match customer job postings with the right tradespeople. This ensures that even if a customer selects the wrong category, the system can still identify the right tradesperson based on the actual job description and tradesperson profile.

## How It Works

### 1. **Semantic Embeddings**
- Uses a lightweight AI model (`Xenova/all-MiniLM-L6-v2`) that runs locally on your server
- Converts text into numerical vectors (embeddings) that capture meaning, not just keywords
- No external API calls needed - everything runs on your server

### 2. **What Gets Matched**

**Job Posting:**
- Job title
- Job description  
- Required skills (if any)

**Tradesperson Profile:**
- Bio/About Me
- Business name
- Skills list
- Portfolio project descriptions (all projects)

### 3. **Similarity Calculation**

1. **Generate Embeddings:**
   - Job text → embedding vector
   - Tradesperson text → embedding vector

2. **Calculate Cosine Similarity:**
   - Measures how similar the two vectors are
   - Returns a score between 0 and 1
   - 0 = completely different
   - 1 = very similar

3. **Threshold Filtering:**
   - Only tradespeople with similarity ≥ 0.4 (40% match) get notified
   - This prevents irrelevant notifications

### 4. **Example Scenario**

**Customer posts:**
- Title: "Car engine won't start"
- Description: "My car won't start, need someone to check the engine and fix it"
- Category: (accidentally selects "Electrician" instead of "Mechanic")

**System matches against:**

**Mechanic Profile:**
- Bio: "Experienced auto mechanic specializing in engine repairs..."
- Skills: ["Engine Repair", "Diagnostics", "Auto Maintenance"]
- Portfolio: "Fixed 50+ engine issues, replaced timing belts..."

**Result:** 
- Semantic similarity: **0.85** (85% match) ✅
- **Mechanic gets notified** (even though category was wrong!)

**Electrician Profile:**
- Bio: "Licensed electrician for home wiring..."
- Skills: ["Electrical Wiring", "Circuit Installation"]
- Portfolio: "Installed home electrical systems..."

**Result:**
- Semantic similarity: **0.15** (15% match) ❌
- **Electrician does NOT get notified** (correctly filtered out)

## Benefits

✅ **Category-Independent:** Works even if customer selects wrong category  
✅ **Semantic Understanding:** Understands meaning, not just keywords  
✅ **Portfolio Integration:** Uses portfolio descriptions for better matching  
✅ **Local Processing:** No external API costs or dependencies  
✅ **Accurate Matching:** Only relevant tradespeople get notified

## Technical Details

- **Model:** `Xenova/all-MiniLM-L6-v2` (quantized, ~23MB)
- **Similarity Metric:** Cosine similarity
- **Threshold:** 0.4 (40% match required)
- **Performance:** First load takes ~2-3 seconds, then cached for fast matching

## Files

- `server/utils/semanticMatching.js` - Core matching logic
- `server/routes/jobs.js` - Job posting endpoint (calls matching on job creation)

