# How to Test Semantic Job Matching

## 🚀 Quick Start Testing Guide

### Step 1: Start the Server

```bash
# Make sure you're in the project root
cd /Users/msannan/Desktop/kraftify

# Start both frontend and backend
npm run dev
```

**Watch for this in console:**
```
🔄 Loading semantic matching model...
✅ Semantic matching model loaded
```
*(This happens the first time a job is posted)*

---

### Step 2: Create Test Tradespeople Accounts

You need at least 2-3 tradespeople with different specializations:

#### **Tradesperson 1: Mechanic**
1. Sign up as a tradesperson
2. Go to Profile page
3. Fill in:
   - **Business Name:** "Mike's Auto Repair"
   - **Bio/About Me:** 
     ```
     Experienced auto mechanic with 10+ years specializing in engine repairs, 
     diagnostics, and car maintenance. Expert in fixing starter motors, batteries, 
     and engine issues. Quick diagnosis and efficient repairs.
     ```
   - **Skills:** Add these skills:
     - "Engine Repair"
     - "Car Diagnostics" 
     - "Auto Maintenance"
     - "Battery Replacement"
   - **Portfolio:** Add a project:
     - **Title:** "Engine Diagnostic and Repair"
     - **Description:** 
       ```
       Fixed 50+ engine issues including starter motor problems, battery replacements, 
       and engine diagnostics. Specialized in quick diagnosis and efficient repairs.
       ```

#### **Tradesperson 2: Electrician**
1. Sign up as another tradesperson
2. Go to Profile page
3. Fill in:
   - **Business Name:** "Sparky Electric"
   - **Bio/About Me:**
     ```
     Licensed electrician specializing in home wiring, circuit installation, 
     and electrical repairs. Expert in residential and commercial electrical work.
     ```
   - **Skills:** Add:
     - "Electrical Wiring"
     - "Circuit Installation"
     - "Home Electrical"
   - **Portfolio:** Add:
     - **Title:** "Home Rewiring Project"
     - **Description:**
       ```
       Installed complete home electrical systems, fixed circuit breakers, 
       and rewired old houses. Expert in electrical safety and code compliance.
       ```

#### **Tradesperson 3: Plumber** (Optional)
- Similar setup but for plumbing services

---

### Step 3: Create a Customer Account

1. Sign up as a customer
2. Complete your profile

---

### Step 4: Post a Test Job (The Real Test!)

#### **Test Case 1: Car Problem with WRONG Category**

1. Login as customer
2. Go to "Post a Job" page
3. Fill in:
   - **Title:** "Car engine won't start"
   - **Description:** 
     ```
     My car won't start in the morning. Need someone to check the engine, 
     maybe it's the battery or starter motor. Please help diagnose and fix the issue.
     ```
   - **Category:** Select **"Electrical"** (WRONG category on purpose!)
   - **Location:** Any location
   - **Budget:** Any amount
   - **Required Skills:** (Optional) Add "Engine Repair"

4. **Submit the job**

5. **Watch the server console** - You should see:
   ```
   🔍 Starting semantic matching for job X: "Car engine won't start"
   🔄 Loading semantic matching model...
   ✅ Semantic matching model loaded
     📊 User 2: similarity = 0.852
     📊 User 3: similarity = 0.156
     📊 User 4: similarity = 0.089
   ✅ Created notifications for 1 matching tradespeople for job X
   🏆 Top matches: User 2: 85.2%
   ```

6. **Expected Result:**
   - ✅ **Mechanic (Mike's Auto Repair)** should get a notification (high similarity ~85%)
   - ❌ **Electrician (Sparky Electric)** should NOT get a notification (low similarity ~15%)
   - ❌ **Plumber** should NOT get a notification (low similarity)

---

### Step 5: Verify Notifications

**Option A: Check Server Console (Easiest)**
- Look at the console output when you post the job
- You'll see similarity scores for each tradesperson
- Only tradespeople with similarity ≥ 0.4 get notifications created

**Option B: Check Database**
```sql
-- Connect to your PostgreSQL database
SELECT 
  jn.*,
  jp.title as job_title,
  u.first_name || ' ' || u.last_name as tradesperson_name
FROM job_notifications jn
JOIN job_postings jp ON jn.job_id = jp.id
JOIN users u ON jn.tradesperson_id = u.id
WHERE jp.id = <YOUR_JOB_ID>
ORDER BY jn.created_at DESC;
```

**Option C: Check via API (if you have API testing tool)**
```bash
# Login as tradesperson first, then:
GET /api/notifications
```

**Expected Results:**
- ✅ **Mechanic** should have a notification in `job_notifications` table
- ❌ **Electrician** should NOT have a notification
- ❌ **Plumber** should NOT have a notification

**Note:** Currently, job notifications are created in the database. The UI to display these notifications can be added later. For now, you can verify matching works by checking:
1. Server console logs (similarity scores)
2. Database `job_notifications` table
3. Jobs appearing in "Browse Jobs" page (filtered by `/jobs/for-me` endpoint)

---

### Step 6: Test More Scenarios

#### **Test Case 2: Electrical Job with Wrong Category**

1. Post a job:
   - **Title:** "Need help with house wiring"
   - **Description:** "My house has some wiring issues, need someone to check and fix the electrical system"
   - **Category:** Select **"Automotive"** (wrong again!)

2. **Expected:**
   - ✅ Electrician gets notified
   - ❌ Mechanic does NOT get notified

#### **Test Case 3: Ambiguous Job**

1. Post a job:
   - **Title:** "Need help with installation"
   - **Description:** "Need someone to install new fixtures in my bathroom"
   - **Category:** Any

2. **Expected:**
   - Plumber might get notified (if they have fixture installation in portfolio)
   - Others might not (depending on their profiles)

---

## 🔍 What to Look For

### ✅ Success Indicators:

1. **Server Console Shows:**
   - Model loads successfully
   - Similarity scores for each tradesperson
   - Only relevant tradespeople get notifications

2. **Correct Matching:**
   - Even with wrong category, right tradespeople get notified
   - Low similarity scores for irrelevant tradespeople
   - High similarity scores (≥0.4) for relevant ones

3. **Notifications:**
   - Only matching tradespeople see the job in their dashboard
   - Notification count is accurate

### ❌ Problems to Watch For:

1. **Model not loading:**
   - Check internet connection (first download)
   - Check console for errors

2. **No notifications created:**
   - Check similarity scores in console
   - Scores might be too low (below 0.4 threshold)
   - Verify tradespeople have complete profiles

3. **Wrong tradespeople getting notified:**
   - Check similarity scores
   - Adjust threshold if needed (in `server/routes/jobs.js` line 535)

---

## 🛠️ Advanced Testing

### Run the Test Script

```bash
node test-semantic-matching.js
```

This will test the matching logic directly without needing the full UI.

### Adjust Similarity Threshold

If you want to be more/less strict:

1. Open `server/routes/jobs.js`
2. Find line 535: `if (similarityScore >= 0.4)`
3. Change to:
   - `0.3` = More tradespeople notified (less strict)
   - `0.5` = Fewer tradespeople notified (more strict)

---

## 📊 Understanding Similarity Scores

- **0.0 - 0.3:** Very different, won't notify
- **0.3 - 0.5:** Somewhat related, might notify (if threshold is low)
- **0.5 - 0.7:** Good match, should notify
- **0.7 - 1.0:** Excellent match, definitely notify

---

## 🎯 Expected Test Results Summary

| Job Type | Wrong Category | Mechanic | Electrician | Plumber |
|----------|---------------|----------|-------------|---------|
| Car engine issue | Electrical | ✅ Notified | ❌ Not notified | ❌ Not notified |
| House wiring | Automotive | ❌ Not notified | ✅ Notified | ❌ Not notified |
| Drain cleaning | Electrical | ❌ Not notified | ❌ Not notified | ✅ Notified |

---

## 💡 Tips

1. **First time:** Model download takes 2-3 minutes, be patient
2. **Console logs:** Always check server console for similarity scores
3. **Profile quality:** More detailed profiles = better matching
4. **Portfolio matters:** Portfolio descriptions help matching significantly

---

## 🐛 Troubleshooting

**"Model not loading"**
- First download requires internet
- Check console for specific errors
- Model file: `~/.cache/huggingface/transformers/`

**"No notifications created"**
- Check if tradespeople have `availability_status = 'available'`
- Verify profiles have bio/portfolio content
- Check similarity scores in console

**"Wrong matches"**
- Review similarity scores
- Adjust threshold if needed
- Improve tradesperson profile descriptions

---

That's it! The system should now intelligently match jobs to tradespeople based on semantic similarity, not just category selection. 🎉

