# Data Access Guide

## Overview

The EverWatt Engine now has a **unified data access system** that makes all training data, measures, and content easily accessible, searchable, and usable throughout the application.

## What's Available

### ✅ Fully Integrated Data

1. **Training Content** (22 documents, 625 sections)
   - Battery training manuals
   - HVAC training content
   - EV charging guides
   - Lighting compendiums
   - Demand response materials
   - All extracted from PDFs and DOCX files

2. **Energy Efficiency Measures** (279 measures)
   - Categorized by technology type
   - Linked to training content
   - Searchable and filterable

3. **Cross-References** (271 links)
   - Measures ↔ Training content connections
   - Relevance scoring
   - Bidirectional relationships

4. **Test Data**
   - `INTERVAL.csv` - 15-minute interval data
   - `USAGE.csv` - Monthly billing data
   - `battery-catalog.csv` - Battery specifications

## How to Access Data

### 1. Using React Hooks (Recommended)

The easiest way to access data in React components:

```tsx
import { useSearch, useTrainingContent, useMeasure } from '../hooks/useDataService';

function MyComponent() {
  // Search across all data
  const { results, loading, error } = useSearch('battery peak shaving');
  
  // Get specific training content
  const { content, loading } = useTrainingContent('battery-modeling-manual');
  
  // Get specific measure
  const { measure, loading } = useMeasure('led-fixture-replacement');
  
  return (
    <div>
      {results.map(result => (
        <div key={result.id}>{result.title}</div>
      ))}
    </div>
  );
}
```

### 2. Using the Data Service Directly

For non-React code or server-side:

```typescript
import * as dataService from '../services/data-service';

// Search
const results = await dataService.searchData('VFD optimization', {
  categories: ['hvac'],
  types: ['training', 'measure'],
  limit: 20
});

// Get training content
const content = await dataService.getTrainingContent('training-id');

// Get measures
const measures = await dataService.getMeasuresByCategory('lighting');

// Get related content
const training = await dataService.getTrainingForMeasure('measure-id');
const measures = await dataService.getMeasuresForTraining('training-id');
```

### 3. Using the Search Component

Pre-built React component for search UI:

```tsx
import { DataSearch } from '../components/DataSearch';

function SearchPage() {
  return (
    <DataSearch
      onSelect={(result) => {
        console.log('Selected:', result);
        // Navigate to detail page, etc.
      }}
      placeholder="Search training content and measures..."
    />
  );
}
```

### 4. Using API Endpoints

REST API for external access or server-side:

```bash
# Search
GET /api/data/search?q=battery&categories=hvac&types=training,measure&limit=20

# Get training content
GET /api/data/training/:id

# Get training by category
GET /api/data/training/category/:category

# Get all categories
GET /api/data/categories

# Get measure
GET /api/data/measure/:id

# Get measures by category
GET /api/data/measures/category/:category

# Get training for measure
GET /api/data/measure/:id/training

# Get measures for training
GET /api/data/training/:id/measures

# Get all measures
GET /api/data/measures

# Get all training content
GET /api/data/training
```

## Available Hooks

### `useSearch(query, options?)`
Search across all training content and measures.

```tsx
const { results, loading, error } = useSearch('battery storage', {
  categories: ['battery'],
  types: ['training'],
  limit: 10
});
```

### `useTrainingContent(id)`
Get specific training content by ID.

```tsx
const { content, loading, error } = useTrainingContent('training-id');
```

### `useTrainingContentByCategory(category)`
Get all training content in a category.

```tsx
const { content, loading, error } = useTrainingContentByCategory('battery');
```

### `useCategories()`
Get all available categories.

```tsx
const { categories, loading, error } = useCategories();
```

### `useMeasure(id)`
Get specific measure by ID.

```tsx
const { measure, loading, error } = useMeasure('measure-id');
```

### `useMeasuresByCategory(category)`
Get all measures in a category.

```tsx
const { measures, loading, error } = useMeasuresByCategory('lighting');
```

### `useTrainingForMeasure(measureId)`
Get training content related to a measure.

```tsx
const { content, loading, error } = useTrainingForMeasure('measure-id');
```

### `useMeasuresForTraining(trainingId)`
Get measures related to training content.

```tsx
const { measures, loading, error } = useMeasuresForTraining('training-id');
```

### `useAllMeasures()`
Get all measures.

```tsx
const { measures, loading, error } = useAllMeasures();
```

### `useAllTrainingContent()`
Get all training content.

```tsx
const { content, loading, error } = useAllTrainingContent();
```

## Data Structure

### TrainingContent
```typescript
{
  id: string;
  title: string;
  category: string;
  source: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
}
```

### Measure
```typescript
{
  id: string;
  name: string;
  category?: string;
  description?: string;
  tags?: string[];
}
```

### SearchResult
```typescript
{
  type: 'training' | 'measure';
  id: string;
  title: string;
  category?: string;
  relevance: number;
  snippet: string;
}
```

## Search Features

- **Full-text search** across all content
- **Category filtering** (battery, hvac, lighting, etc.)
- **Type filtering** (training, measure, or both)
- **Relevance scoring** - Results sorted by relevance
- **Keyword extraction** - Automatic keyword indexing
- **Fuzzy matching** - Finds related content

## Performance

- **Lazy loading** - Data loaded only when needed
- **Caching** - Results cached for fast subsequent access
- **Indexed search** - Pre-built search index for fast queries
- **Efficient filtering** - Server-side filtering reduces data transfer

## Examples

### Example 1: Search Page

```tsx
import { useState } from 'react';
import { useSearch } from '../hooks/useDataService';

function SearchPage() {
  const [query, setQuery] = useState('');
  const { results, loading } = useSearch(query);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {loading && <div>Loading...</div>}
      {results.map(result => (
        <div key={result.id}>
          <h3>{result.title}</h3>
          <p>{result.snippet}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Measure Detail Page

```tsx
import { useMeasure, useTrainingForMeasure } from '../hooks/useDataService';

function MeasureDetailPage({ measureId }: { measureId: string }) {
  const { measure } = useMeasure(measureId);
  const { content } = useTrainingForMeasure(measureId);

  return (
    <div>
      <h1>{measure?.name}</h1>
      <p>{measure?.description}</p>
      
      <h2>Related Training</h2>
      {content.map(doc => (
        <div key={doc.id}>
          <h3>{doc.title}</h3>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Category Browser

```tsx
import { useCategories, useTrainingContentByCategory } from '../hooks/useDataService';

function CategoryBrowser() {
  const { categories } = useCategories();
  const [selected, setSelected] = useState<string | null>(null);
  const { content } = useTrainingContentByCategory(selected);

  return (
    <div>
      <div>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelected(cat)}>
            {cat}
          </button>
        ))}
      </div>
      
      {selected && (
        <div>
          {content.map(doc => (
            <div key={doc.id}>{doc.title}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## File Locations

- **Service Layer**: `src/services/data-service.ts`
- **React Hooks**: `src/hooks/useDataService.ts`
- **Types**: `src/types/data-service.ts`
- **API Endpoints**: `src/api/data-api.ts`
- **Search Component**: `src/components/DataSearch.tsx`
- **Data Files**: `public/data/*.json`

## Next Steps

1. **Use the hooks** in your components for easy data access
2. **Use the search component** for search UI
3. **Explore the API** for server-side access
4. **Check the examples** above for common patterns

All data is now **organized, findable, and accessible** throughout your application! 🎉
