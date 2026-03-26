/**
 * Clinical Guidelines RAG Store
 * Stores and retrieves Indian clinical guidelines using embeddings
 */

import { getFirestore } from './firestore';
import { generateEmbedding, generateQueryEmbedding, cosineSimilarity } from './embeddings';
import { getEnv } from '../env';

// Collection name for guidelines
const GUIDELINES_COLLECTION = 'clinical_guidelines';

/**
 * Clinical guideline document structure
 */
export interface ClinicalGuideline {
  id: string;
  condition: string;
  category: 'infectious' | 'chronic' | 'emergency' | 'maternal' | 'pediatric' | 'general';
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
  region?: string;
  lastUpdated: Date;
  embedding?: number[];
  keywords: string[];
  severity?: 'low' | 'moderate' | 'high' | 'critical';
}

/**
 * Search result with similarity score
 */
export interface GuidelineSearchResult {
  guideline: Omit<ClinicalGuideline, 'embedding'>;
  similarity: number;
}

/**
 * Add or update a clinical guideline with embedding
 */
export async function upsertGuideline(
  guideline: Omit<ClinicalGuideline, 'id' | 'embedding' | 'lastUpdated'>
): Promise<string> {
  const db = getFirestore();
  const collection = db.collection(GUIDELINES_COLLECTION);

  // Generate embedding for the content
  const textForEmbedding = `${guideline.title}. ${guideline.content}. Keywords: ${guideline.keywords.join(', ')}`;
  const embedding = await generateEmbedding(textForEmbedding);

  // Check if guideline already exists by condition and title
  const existing = await collection
    .where('condition', '==', guideline.condition)
    .where('title', '==', guideline.title)
    .limit(1)
    .get();

  const docData: ClinicalGuideline = {
    ...guideline,
    id: existing.empty ? collection.doc().id : existing.docs[0].id,
    embedding,
    lastUpdated: new Date(),
  };

  if (existing.empty) {
    const docRef = collection.doc(docData.id);
    await docRef.set(docData);
  } else {
    await existing.docs[0].ref.update({
      ...docData,
      lastUpdated: new Date(),
    });
  }

  return docData.id;
}

/**
 * Batch upsert multiple guidelines
 */
export async function batchUpsertGuidelines(
  guidelines: Array<Omit<ClinicalGuideline, 'id' | 'embedding' | 'lastUpdated'>>
): Promise<string[]> {
  const ids: string[] = [];

  // Process in batches to avoid rate limits
  const batchSize = getEnv().RAG_BATCH_SIZE;

  for (let i = 0; i < guidelines.length; i += batchSize) {
    const batch = guidelines.slice(i, i + batchSize);
    const batchIds = await Promise.all(batch.map((g) => upsertGuideline(g)));
    ids.push(...batchIds);
  }

  return ids;
}

/**
 * Search guidelines using semantic similarity
 */
export async function searchGuidelines(
  query: string,
  options: {
    topK?: number;
    minSimilarity?: number;
    category?: ClinicalGuideline['category'];
    condition?: string;
  } = {}
): Promise<GuidelineSearchResult[]> {
  const env = getEnv();
  const {
    topK = env.RAG_TOP_K,
    minSimilarity = env.RAG_MIN_SIMILARITY,
    category,
    condition,
  } = options;

  const db = getFirestore();
  let queryRef: FirebaseFirestore.Query = db.collection(GUIDELINES_COLLECTION);

  // Apply filters if provided
  if (category) {
    queryRef = queryRef.where('category', '==', category);
  }
  if (condition) {
    queryRef = queryRef.where('condition', '==', condition);
  }

  const snapshot = await queryRef.get();

  if (snapshot.empty) {
    return [];
  }

  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(query);

  // Calculate similarities
  const results: GuidelineSearchResult[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as ClinicalGuideline;

    if (!data.embedding) {
      continue;
    }

    const similarity = cosineSimilarity(queryEmbedding, data.embedding);

    if (similarity >= minSimilarity) {
      // Remove embedding from result to reduce payload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { embedding: _embedding, ...guidelineWithoutEmbedding } = data;
      results.push({
        guideline: guidelineWithoutEmbedding,
        similarity,
      });
    }
  }

  // Sort by similarity and return top K
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Get guideline by ID
 */
export async function getGuideline(id: string): Promise<ClinicalGuideline | null> {
  const db = getFirestore();
  const doc = await db.collection(GUIDELINES_COLLECTION).doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as ClinicalGuideline;
}

/**
 * List all guidelines with optional filtering
 */
export async function listGuidelines(options: {
  category?: ClinicalGuideline['category'];
  condition?: string;
  limit?: number;
} = {}): Promise<Array<Omit<ClinicalGuideline, 'embedding'>>> {
  const { category, condition, limit = 100 } = options;

  const db = getFirestore();
  let queryRef: FirebaseFirestore.Query = db.collection(GUIDELINES_COLLECTION);

  if (category) {
    queryRef = queryRef.where('category', '==', category);
  }
  if (condition) {
    queryRef = queryRef.where('condition', '==', condition);
  }

  queryRef = queryRef.limit(limit);

  const snapshot = await queryRef.get();

  return snapshot.docs.map((doc) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding: _embedding, ...rest } = doc.data() as ClinicalGuideline;
    return rest;
  });
}

/**
 * Delete a guideline by ID
 */
export async function deleteGuideline(id: string): Promise<void> {
  const db = getFirestore();
  await db.collection(GUIDELINES_COLLECTION).doc(id).delete();
}

/**
 * Get statistics about the guidelines store
 */
export async function getGuidelinesStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byCondition: Record<string, number>;
}> {
  const db = getFirestore();
  const snapshot = await db.collection(GUIDELINES_COLLECTION).get();

  const stats = {
    total: snapshot.size,
    byCategory: {} as Record<string, number>,
    byCondition: {} as Record<string, number>,
  };

  for (const doc of snapshot.docs) {
    const data = doc.data() as ClinicalGuideline;

    stats.byCategory[data.category] = (stats.byCategory[data.category] || 0) + 1;
    stats.byCondition[data.condition] = (stats.byCondition[data.condition] || 0) + 1;
  }

  return stats;
}

// Export collection name for external use
export { GUIDELINES_COLLECTION };
