# Testing Semantic Job Matching

## Quick Test Steps

### 1. Start the Server
```bash
npm run dev
```

### 2. Create Test Tradespeople Profiles

You'll need at least 2-3 tradespeople with different specializations:

**Mechanic:**
- Bio: "Experienced auto mechanic with 10+ years specializing in engine repairs, diagnostics, and car maintenance"
- Skills: "Engine Repair", "Car Diagnostics", "Auto Maintenance"
- Portfolio: "Fixed 50+ engine issues, replaced timing belts, diagnosed electrical problems in vehicles"

**Electrician:**
- Bio: "Licensed electrician specializing in home wiring, circuit installation, and electrical repairs"
- Skills: "Electrical Wiring", "Circuit Installation", "Home Electrical"
- Portfolio: "Installed home electrical systems, fixed circuit breakers, rewired old houses"

**Plumber:**
- Bio: "Professional plumber with expertise in pipe repairs, drain cleaning, and fixture installation"
- Skills: "Pipe Repair", "Drain Cleaning", "Fixture Installation"
- Portfolio: "Fixed 100+ plumbing issues, installed new fixtures, cleared blocked drains"

### 3. Post a Test Job

**Scenario 1: Correct Category**
- Title: "Car engine won't start"
- Description: "My car won't start in the morning. Need someone to check the engine, maybe it's the battery or starter motor. Please help diagnose and fix."
- Category: Select "Automotive" (correct)
- **Expected:** Only Mechanic should get notified (high similarity)

**Scenario 2: Wrong Category (The Real Test!)**
- Title: "Car engine won't start"
- Description: "My car won't start in the morning. Need someone to check the engine, maybe it's the battery or starter motor. Please help diagnose and fix."
- Category: Select "Electrical" (WRONG - but system should still match correctly!)
- **Expected:** Only Mechanic should get notified (high similarity), Electrician should NOT (low similarity)

**Scenario 3: Ambiguous Job**
- Title: "Need help with wiring"
- Description: "My house has some wiring issues, need someone to check and fix"
- Category: Select "Automotive" (wrong)
- **Expected:** Electrician should get notified (high similarity), Mechanic should NOT

### 4. Check Console Logs

When you post a job, watch the server console. You should see:

```
🔍 Starting semantic matching for job 1: "Car engine won't start"
🔄 Loading semantic matching model...
✅ Semantic matching model loaded
  📊 User 2: similarity = 0.852
  📊 User 3: similarity = 0.156
  📊 User 4: similarity = 0.089
✅ Created notifications for 1 matching tradespeople for job 1
🏆 Top matches: User 2: 85.2%
```

### 5. Verify Notifications

- Login as each tradesperson
- Check if they received a notification about the new job
- Only tradespeople with similarity ≥ 0.4 should have notifications

## Testing Checklist

- [ ] Server starts without errors
- [ ] Model loads successfully (check console for "✅ Semantic matching model loaded")
- [ ] Job posting creates notifications
- [ ] Only relevant tradespeople get notified
- [ ] Wrong category selection doesn't break matching
- [ ] Console shows similarity scores for each tradesperson
- [ ] Notifications appear in tradesperson dashboard

## Troubleshooting

**Model not loading?**
- Check internet connection (first time download)
- Check console for errors
- Model downloads automatically on first use (~23MB)

**No notifications created?**
- Check similarity scores in console
- Lower threshold temporarily to 0.3 for testing
- Verify tradespeople have profiles with bio/portfolio

**Wrong tradespeople getting notified?**
- Check similarity scores in console
- Verify tradesperson profiles have relevant content
- Adjust threshold in `server/routes/jobs.js` (line 535)

