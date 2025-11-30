// Cache the model to avoid reloading
let modelCache = null;
let tokenizerCache = null;

/**
 * Initialize the sentence transformer model
 * Uses a lightweight model that runs locally
 * Uses dynamic import() for ES module compatibility
 */
async function initializeModel() {
  if (modelCache && tokenizerCache) {
    return { model: modelCache, tokenizer: tokenizerCache };
  }

  try {
    console.log('🔄 Loading semantic matching model...');
    // Use dynamic import() for ES module compatibility
    const { pipeline } = await import('@xenova/transformers');
    
    const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Use quantized model for faster loading
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

/**
 * Generate embedding for a text using the sentence transformer
 */
async function generateEmbedding(text) {
  try {
    const { model } = await initializeModel();
    
    // Clean and prepare text
    const cleanText = (text || '').trim();
    if (!cleanText) {
      return null;
    }

    // Generate embedding
    const output = await model(cleanText, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to array if needed
    return Array.from(output.data || output);
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Calculate semantic similarity between job posting and tradesperson profile
 * @param {Object} jobPosting - Job posting with title, description, required_skills
 * @param {Object} tradesperson - Tradesperson with bio, business_name, skills, portfolio
 * @returns {Promise<number>} Similarity score between 0 and 1
 */
async function calculateSemanticSimilarity(jobPosting, tradesperson) {
  try {
    // Build job text: title + description + required skills
    const jobText = [
      jobPosting.title || '',
      jobPosting.description || '',
      ...(jobPosting.required_skills || []).map(skill => skill || ''),
    ]
      .filter(text => text.trim())
      .join(' ')
      .trim();

    // Build tradesperson text: bio + business name + skills + portfolio descriptions
    const portfolioDescriptions = (tradesperson.portfolio || [])
      .map(project => `${project.project_title || ''} ${project.project_description || ''}`)
      .filter(text => text.trim())
      .join(' ');

    const tradespersonText = [
      tradesperson.bio || '',
      tradesperson.business_name || '',
      ...(tradesperson.skills || []).map(skill => skill || ''),
      portfolioDescriptions,
    ]
      .filter(text => text.trim())
      .join(' ')
      .trim();

    // Debug logging (only log first time to avoid spam)
    if (process.env.DEBUG_SEMANTIC === 'true') {
      console.log('🔍 Semantic Matching Debug:');
      console.log('  Job text:', jobText.substring(0, 100) + '...');
      console.log('  Tradesperson text:', tradespersonText.substring(0, 100) + '...');
    }

    if (!jobText || !tradespersonText) {
      console.warn('⚠️ Empty text for matching:', { hasJobText: !!jobText, hasTradespersonText: !!tradespersonText });
      return 0;
    }

    // Generate embeddings
    const jobEmbedding = await generateEmbedding(jobText);
    const tradespersonEmbedding = await generateEmbedding(tradespersonText);

    if (!jobEmbedding || !tradespersonEmbedding) {
      return 0;
    }

    // Calculate cosine similarity
    const similarity = cosineSimilarity(jobEmbedding, tradespersonEmbedding);

    // Normalize to 0-1 range (cosine similarity is already -1 to 1, but we'll clamp to 0-1)
    return Math.max(0, similarity);
  } catch (error) {
    console.error('Error calculating semantic similarity:', error);
    // Fallback to 0 if there's an error
    return 0;
  }
}

module.exports = {
  calculateSemanticSimilarity,
  generateEmbedding,
  cosineSimilarity,
};

