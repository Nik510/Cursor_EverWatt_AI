/**
 * React hooks for data service access
 */

import { useState, useEffect, useCallback } from 'react';
import * as dataService from '../services/data-service';
import type { 
  TrainingContent, 
  Measure, 
  SearchResult,
  SearchOptions 
} from '../types/data-service';

/**
 * Hook to search data
 */
export function useSearch(query: string, options?: SearchOptions) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    dataService.searchData(query, options)
      .then(setResults)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [query, JSON.stringify(options)]);

  return { results, loading, error };
}

/**
 * Hook to get training content by ID
 */
export function useTrainingContent(id: string | null) {
  const [content, setContent] = useState<TrainingContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setContent(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    dataService.getTrainingContent(id)
      .then(setContent)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { content, loading, error };
}

/**
 * Hook to get training content by category
 */
export function useTrainingContentByCategory(category: string | null) {
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!category) {
      setContent([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    dataService.getTrainingContentByCategory(category)
      .then(setContent)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [category]);

  return { content, loading, error };
}

/**
 * Hook to get all categories
 */
export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    dataService.getCategories()
      .then(setCategories)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading, error };
}

/**
 * Hook to get measure by ID
 */
export function useMeasure(id: string | null) {
  const [measure, setMeasure] = useState<Measure | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setMeasure(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    dataService.getMeasure(id)
      .then(setMeasure)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { measure, loading, error };
}

/**
 * Hook to get measures by category
 */
export function useMeasuresByCategory(category: string | null) {
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!category) {
      setMeasures([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    dataService.getMeasuresByCategory(category)
      .then(setMeasures)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [category]);

  return { measures, loading, error };
}

/**
 * Hook to get training content for a measure
 */
export function useTrainingForMeasure(measureId: string | null) {
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!measureId) {
      setContent([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    dataService.getTrainingForMeasure(measureId)
      .then(setContent)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [measureId]);

  return { content, loading, error };
}

/**
 * Hook to get measures for training content
 */
export function useMeasuresForTraining(trainingId: string | null) {
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!trainingId) {
      setMeasures([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    dataService.getMeasuresForTraining(trainingId)
      .then(setMeasures)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [trainingId]);

  return { measures, loading, error };
}

/**
 * Hook to get all measures
 */
export function useAllMeasures() {
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    dataService.getAllMeasures()
      .then(setMeasures)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { measures, loading, error };
}

/**
 * Hook to get all training content
 */
export function useAllTrainingContent() {
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    dataService.getAllTrainingContent()
      .then(setContent)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { content, loading, error };
}
