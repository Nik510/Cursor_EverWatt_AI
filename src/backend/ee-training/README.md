# EE Training Backend

## Overview

The EE Training system is a **modular, backend-driven** training content system. All training content is stored in the backend (file-based JSON for now, can be migrated to database), and the frontend dynamically loads and renders it.

## Architecture

```
src/
├── backend/
│   └── ee-training/
│       ├── types.ts              # TypeScript types/schema
│       ├── index.ts              # Backend API (loads modules)
│       ├── modules/              # Module JSON files
│       │   ├── cooling-systems.json
│       │   ├── lighting.json     # Add more modules here
│       │   └── ...
│       └── README.md
├── api/
│   └── ee-training/
│       └── index.ts              # Frontend API layer
└── components/
    └── ee-training/
        ├── ContentBlockRenderer.tsx  # Renders content blocks
        ├── ModuleList.tsx            # Module browser
        └── ModuleViewer.tsx          # Module viewer
```

## Adding a New Module

To add a new training module, simply create a JSON file in `src/backend/ee-training/modules/`:

1. **Create the JSON file** (e.g., `lighting.json`)
2. **Follow the schema** defined in `types.ts`
3. **The module will automatically appear** in the training library

Example structure:
```json
{
  "id": "lighting",
  "title": "LED Lighting & Controls",
  "subtitle": "Complete Guide to LED Retrofits",
  "category": "lighting",
  "order": 2,
  "status": "published",
  "sections": [
    {
      "id": "introduction",
      "title": "Introduction",
      "order": 1,
      "content": [
        {
          "id": "intro-text",
          "type": "markdown",
          "order": 1,
          "content": "Your content here..."
        }
      ]
    }
  ]
}
```

## Content Block Types

The system supports multiple content block types (building blocks):

- `text` / `markdown` - Text content
- `image` - Images with captions
- `video` - Video embeds
- `list` - Bulleted/numbered lists
- `table` - Data tables
- `formula` - Mathematical formulas
- `quote` - Quotes/callouts
- `accordion` - Collapsible content
- `tabs` - Tabbed content
- `cards` - Card grids
- `comparison` - Before/after comparisons
- `interactive` - Interactive components (schematics, calculators)

## Benefits

1. **No Hard-Coded Data** - Everything comes from backend
2. **Modular** - Add modules by creating JSON files
3. **Extensible** - Add new content block types easily
4. **Clean Separation** - Backend and frontend are separate
5. **Database-Ready** - Can migrate from files to database without frontend changes

## Migration to Database

When ready to migrate to a database:

1. Keep the same schema/types
2. Replace `loadAllModules()` in `backend/ee-training/index.ts` with database queries
3. Frontend code remains unchanged (API layer abstracts the backend)

## Future Enhancements

- [ ] Markdown parser for markdown blocks
- [ ] Video embed support (YouTube, Vimeo)
- [ ] Interactive component registry
- [ ] Content versioning
- [ ] User progress tracking
- [ ] Search indexing
- [ ] Content caching
