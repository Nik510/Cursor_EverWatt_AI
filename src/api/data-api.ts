/**
 * API endpoints for data access
 * Can be used with Express or other server frameworks
 */

import type { Request, Response } from 'express';
import * as dataService from '../services/data-service';
import type { SearchOptions } from '../types/data-service';

/**
 * Search endpoint
 * GET /api/data/search?q=query&categories=battery,hvac&types=training,measure&limit=50
 */
export async function searchEndpoint(req: Request, res: Response) {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const options: SearchOptions = {
      categories: req.query.categories 
        ? (req.query.categories as string).split(',')
        : undefined,
      types: req.query.types
        ? (req.query.types as string).split(',') as Array<'training' | 'measure'>
        : undefined,
      limit: req.query.limit 
        ? parseInt(req.query.limit as string, 10)
        : 50,
    };

    const results = await dataService.searchData(query, options);
    res.json({ results, count: results.length });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get training content by ID
 * GET /api/data/training/:id
 */
export async function getTrainingContentEndpoint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const content = await dataService.getTrainingContent(id);
    
    if (!content) {
      return res.status(404).json({ error: 'Training content not found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Get training content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get training content by category
 * GET /api/data/training/category/:category
 */
export async function getTrainingByCategoryEndpoint(req: Request, res: Response) {
  try {
    const { category } = req.params;
    const content = await dataService.getTrainingContentByCategory(category);
    res.json({ content, count: content.length });
  } catch (error) {
    console.error('Get training by category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all categories
 * GET /api/data/categories
 */
export async function getCategoriesEndpoint(req: Request, res: Response) {
  try {
    const categories = await dataService.getCategories();
    res.json({ categories, count: categories.length });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get measure by ID
 * GET /api/data/measure/:id
 */
export async function getMeasureEndpoint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const measure = await dataService.getMeasure(id);
    
    if (!measure) {
      return res.status(404).json({ error: 'Measure not found' });
    }
    
    res.json(measure);
  } catch (error) {
    console.error('Get measure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get measures by category
 * GET /api/data/measures/category/:category
 */
export async function getMeasuresByCategoryEndpoint(req: Request, res: Response) {
  try {
    const { category } = req.params;
    const measures = await dataService.getMeasuresByCategory(category);
    res.json({ measures, count: measures.length });
  } catch (error) {
    console.error('Get measures by category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get training content for a measure
 * GET /api/data/measure/:id/training
 */
export async function getTrainingForMeasureEndpoint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const content = await dataService.getTrainingForMeasure(id);
    res.json({ content, count: content.length });
  } catch (error) {
    console.error('Get training for measure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get measures for training content
 * GET /api/data/training/:id/measures
 */
export async function getMeasuresForTrainingEndpoint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const measures = await dataService.getMeasuresForTraining(id);
    res.json({ measures, count: measures.length });
  } catch (error) {
    console.error('Get measures for training error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all measures
 * GET /api/data/measures
 */
export async function getAllMeasuresEndpoint(req: Request, res: Response) {
  try {
    const measures = await dataService.getAllMeasures();
    res.json({ measures, count: measures.length });
  } catch (error) {
    console.error('Get all measures error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all training content
 * GET /api/data/training
 */
export async function getAllTrainingEndpoint(req: Request, res: Response) {
  try {
    const content = await dataService.getAllTrainingContent();
    res.json({ content, count: content.length });
  } catch (error) {
    console.error('Get all training error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
