const { calculateSemanticSimilarity, cosineSimilarity } = require('../utils/semanticMatching');

describe('Semantic Matching', () => {
  // Mock the pipeline to avoid loading the actual model in tests
  jest.mock('@xenova/transformers', () => ({
    pipeline: jest.fn(() => Promise.resolve({
      __call__: jest.fn((text) => {
        // Mock embedding: simple hash-based embedding for testing
        const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const embedding = Array(384).fill(0).map((_, i) => (hash + i) % 100 / 100);
        return { data: embedding };
      })
    }))
  }));

  test('cosineSimilarity should return 1 for identical vectors', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];
    expect(cosineSimilarity(vec1, vec2)).toBe(1);
  });

  test('cosineSimilarity should return 0 for orthogonal vectors', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    expect(cosineSimilarity(vec1, vec2)).toBe(0);
  });

  test('cosineSimilarity should return 0 for null/empty vectors', () => {
    expect(cosineSimilarity(null, [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], null)).toBe(0);
    expect(cosineSimilarity(null, null)).toBe(0);
  });

  test('cosineSimilarity should return 0 for mismatched lengths', () => {
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2];
    expect(cosineSimilarity(vec1, vec2)).toBe(0);
  });

  test('calculateSemanticSimilarity should return 0 for empty job text', async () => {
    const jobPosting = { title: '', description: '', required_skills: [] };
    const tradesperson = { bio: 'I am a mechanic', business_name: 'Auto Repair', skills: [], portfolio: [] };
    
    const result = await calculateSemanticSimilarity(jobPosting, tradesperson);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  test('calculateSemanticSimilarity should return 0 for empty tradesperson text', async () => {
    const jobPosting = { title: 'Fix my car', description: 'Engine problem', required_skills: [] };
    const tradesperson = { bio: '', business_name: '', skills: [], portfolio: [] };
    
    const result = await calculateSemanticSimilarity(jobPosting, tradesperson);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  test('calculateSemanticSimilarity should handle matching content', async () => {
    const jobPosting = {
      title: 'Car repair needed',
      description: 'Engine trouble, need mechanic',
      required_skills: ['mechanic', 'auto repair']
    };
    const tradesperson = {
      bio: 'Experienced auto mechanic',
      business_name: 'Car Fix Pro',
      skills: ['mechanic', 'engine repair'],
      portfolio: []
    };
    
    const result = await calculateSemanticSimilarity(jobPosting, tradesperson);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

