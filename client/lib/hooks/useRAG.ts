/**
 * useRAG Hook
 * Provides RAG (Retrieval Augmented Generation) operations for health guidelines
 * - Search clinical guidelines
 * - Fetch guideline details
 * - Get related conditions
 */

import { useState, useCallback } from 'react';

export interface Guideline {
  id: string;
  condition: string;
  category: string;
  severity: 'mild' | 'moderate' | 'severe' | 'emergency';
  symptoms: string[];
  causes: string[];
  prevention: string[];
  homeRemedies: string[];
  whenToSeekHelp: string[];
  regionalInfo?: {
    prevalence: string;
    seasonality?: string;
    riskAreas?: string[];
  };
  sources?: string[];
  lastUpdated?: string;
}

export interface SearchResult {
  guideline: Guideline;
  similarity: number;
  snippet?: string;
}

interface UseRAGReturn {
  // State
  loading: boolean;
  error: string | null;
  guidelines: Guideline[];
  searchResults: SearchResult[];

  // Operations
  fetchAllGuidelines: () => Promise<Guideline[]>;
  searchGuidelines: (query: string, options?: {
    topK?: number;
    minSimilarity?: number;
    category?: string;
  }) => Promise<SearchResult[]>;
  getGuideline: (id: string) => Promise<Guideline | null>;
  getRelatedGuidelines: (condition: string, limit?: number) => Promise<SearchResult[]>;

  clearError: () => void;
  clearResults: () => void;
}

export function useRAG(): UseRAGReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const clearError = useCallback(() => setError(null), []);
  const clearResults = useCallback(() => setSearchResults([]), []);

  // Fetch all guidelines
  const fetchAllGuidelines = useCallback(async (): Promise<Guideline[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/guidelines');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch guidelines');
      }

      const fetchedGuidelines = data.success && data.data?.guidelines ? data.data.guidelines : [];
      setGuidelines(fetchedGuidelines);
      return fetchedGuidelines;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch guidelines';
      setError(message);
      console.error('[useRAG] Fetch guidelines error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Search guidelines using semantic search
  const searchGuidelines = useCallback(async (
    query: string,
    options?: {
      topK?: number;
      minSimilarity?: number;
      category?: string;
    }
  ): Promise<SearchResult[]> => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          topK: options?.topK || 5,
          minSimilarity: options?.minSimilarity || 0.3,
          category: options?.category,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Search failed');
      }

      const results = data.success && data.data?.results ? data.data.results : [];
      setSearchResults(results);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      console.error('[useRAG] Search error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a specific guideline by ID
  const getGuideline = useCallback(async (id: string): Promise<Guideline | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rag/guidelines/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch guideline');
      }

      return data.success && data.data?.guideline ? data.data.guideline : null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch guideline';
      setError(message);
      console.error('[useRAG] Get guideline error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get related guidelines based on a condition
  const getRelatedGuidelines = useCallback(async (
    condition: string,
    limit: number = 3
  ): Promise<SearchResult[]> => {
    return searchGuidelines(condition, { topK: limit, minSimilarity: 0.4 });
  }, [searchGuidelines]);

  return {
    loading,
    error,
    guidelines,
    searchResults,
    fetchAllGuidelines,
    searchGuidelines,
    getGuideline,
    getRelatedGuidelines,
    clearError,
    clearResults,
  };
}
