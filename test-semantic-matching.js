/**
 * Quick Test Script for Semantic Job Matching
 * 
 * This script helps you test the semantic matching by:
 * 1. Creating test tradespeople profiles
 * 2. Posting a test job
 * 3. Showing which tradespeople should get notified
 * 
 * Usage: node test-semantic-matching.js
 */

const pool = require('./server/config/database');
const { calculateSemanticSimilarity } = require('./server/utils/semanticMatching');

async function testSemanticMatching() {
  console.log('🧪 Testing Semantic Job Matching\n');

  try {
    // Test job posting
    const testJob = {
      title: 'Car engine won\'t start',
      description: 'My car won\'t start in the morning. Need someone to check the engine, maybe it\'s the battery or starter motor. Please help diagnose and fix the issue.',
      required_skills: ['Engine Repair', 'Car Diagnostics']
    };

    // Test tradespeople profiles
    const testTradespeople = [
      {
        user_id: 1,
        bio: 'Experienced auto mechanic with 10+ years specializing in engine repairs, diagnostics, and car maintenance. Expert in fixing starter motors, batteries, and engine issues.',
        business_name: 'Mike\'s Auto Repair',
        skills: ['Engine Repair', 'Car Diagnostics', 'Auto Maintenance', 'Battery Replacement'],
        portfolio: [
          {
            project_title: 'Engine Diagnostic and Repair',
            project_description: 'Fixed 50+ engine issues including starter motor problems, battery replacements, and engine diagnostics. Specialized in quick diagnosis and efficient repairs.'
          }
        ]
      },
      {
        user_id: 2,
        bio: 'Licensed electrician specializing in home wiring, circuit installation, and electrical repairs. Expert in residential and commercial electrical work.',
        business_name: 'Sparky Electric',
        skills: ['Electrical Wiring', 'Circuit Installation', 'Home Electrical'],
        portfolio: [
          {
            project_title: 'Home Rewiring Project',
            project_description: 'Installed complete home electrical systems, fixed circuit breakers, and rewired old houses. Expert in electrical safety and code compliance.'
          }
        ]
      },
      {
        user_id: 3,
        bio: 'Professional plumber with expertise in pipe repairs, drain cleaning, and fixture installation. Available for emergency plumbing services.',
        business_name: 'Quick Fix Plumbing',
        skills: ['Pipe Repair', 'Drain Cleaning', 'Fixture Installation'],
        portfolio: [
          {
            project_title: 'Emergency Drain Cleaning',
            project_description: 'Fixed 100+ plumbing issues including blocked drains, leaky pipes, and fixture installations. Fast response time for emergencies.'
          }
        ]
      }
    ];

    console.log('📋 Test Job:');
    console.log(`   Title: ${testJob.title}`);
    console.log(`   Description: ${testJob.description}\n`);

    console.log('🔍 Calculating semantic similarity...\n');

    const results = [];

    for (const tradesperson of testTradespeople) {
      const similarity = await calculateSemanticSimilarity(testJob, tradesperson);
      results.push({ ...tradesperson, similarity });
      
      console.log(`   ${tradesperson.business_name}:`);
      console.log(`      Similarity: ${(similarity * 100).toFixed(1)}%`);
      console.log(`      Bio: ${tradesperson.bio.substring(0, 60)}...`);
      console.log(`      Match: ${similarity >= 0.4 ? '✅ WILL GET NOTIFIED' : '❌ Will NOT get notified'}\n`);
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    console.log('📊 Results Summary:');
    console.log('   Tradespeople who will be notified (similarity ≥ 0.4):');
    results
      .filter(r => r.similarity >= 0.4)
      .forEach(r => {
        console.log(`      ✅ ${r.business_name}: ${(r.similarity * 100).toFixed(1)}% match`);
      });

    const notNotified = results.filter(r => r.similarity < 0.4);
    if (notNotified.length > 0) {
      console.log('\n   Tradespeople who will NOT be notified:');
      notNotified.forEach(r => {
        console.log(`      ❌ ${r.business_name}: ${(r.similarity * 100).toFixed(1)}% match (below threshold)`);
      });
    }

    console.log('\n✅ Test completed!');
    console.log('\n💡 Expected Result:');
    console.log('   Only "Mike\'s Auto Repair" (mechanic) should get notified');
    console.log('   Electrician and Plumber should NOT get notified\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testSemanticMatching();

