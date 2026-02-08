# Utility Library Location & Access Guide

## 📍 Location

The utility library is located at:
```
src/utils/
```

### Directory Structure

```
src/utils/
├── index.ts                    # Main entry point (exports everything)
├── format.ts                   # Formatting utilities (currency, dates, numbers)
├── math.ts                     # Math utilities (rounding, statistics, etc.)
├── date.ts                     # Date/time utilities
├── string.ts                   # String manipulation utilities
├── energy.ts                   # Energy-specific utilities (unit conversions)
├── array.ts                    # Array utilities
├── object.ts                   # Object utilities
├── type-guards.ts              # Type checking utilities
├── rates/                      # Utility rate management system
│   ├── index.ts
│   ├── types.ts                # Rate type definitions
│   ├── storage.ts              # Rate storage & management
│   ├── calculations.ts         # Rate calculation functions
│   ├── helpers.ts              # Rate helper functions
│   ├── rate-data.ts            # Pre-populated rate data
│   └── README.md               # Rate system documentation
├── validation.ts               # Form validation utilities
├── types.ts                    # Utility types
└── ... (other existing utilities)
```

## 🔌 How to Access

### Option 1: Direct Import (Recommended)

```typescript
// Import from main utils index
import { 
  formatCurrency, 
  formatDate, 
  round, 
  clamp,
  getRateById,
  calculateMonthlyCost 
} from '../utils';

// Or use path alias (if configured)
import { formatCurrency, getRateById } from '@utils';
```

### Option 2: Import from Specific Modules

```typescript
// Import from specific utility modules
import { formatCurrency } from '../utils/format';
import { round, mean } from '../utils/math';
import { getRateById } from '../utils/rates';
```

### Option 3: Import Rate System Separately

```typescript
// Import just the rate system
import { 
  getRateById, 
  calculateMonthlyCost,
  findBestRate 
} from '../utils/rates';
```

## 📦 Available Utilities

### Formatting (`format.ts`)
```typescript
import { 
  formatCurrency,      // Format as currency
  formatNumber,        // Format numbers
  formatPercent,       // Format as percentage
  formatDate,          // Format dates
  formatDateTime,      // Format date + time
  formatEnergy,        // Format energy values (kW, kWh, etc.)
  formatDuration,      // Format time duration
  formatFileSize,      // Format file sizes
} from '../utils';
```

### Math (`math.ts`)
```typescript
import {
  round,              // Round numbers
  clamp,              // Clamp values
  mean,               // Calculate mean
  median,             // Calculate median
  standardDeviation,  // Calculate std dev
  percentile,         // Calculate percentile
  statistics,          // Get full statistics
} from '../utils';
```

### Date/Time (`date.ts`)
```typescript
import {
  startOfDay,         // Get start of day
  endOfDay,           // Get end of day
  addDays,            // Add days to date
  diffInDays,         // Calculate day difference
  isToday,            // Check if date is today
  formatRelativeTime, // "2 hours ago" format
} from '../utils';
```

### String (`string.ts`)
```typescript
import {
  capitalize,         // Capitalize string
  toCamelCase,       // Convert to camelCase
  toKebabCase,       // Convert to kebab-case
  truncate,          // Truncate string
  slugify,           // Create URL slug
} from '../utils';
```

### Energy (`energy.ts`)
```typescript
import {
  kWToMW,            // Convert kW to MW
  kWhToMWh,          // Convert kWh to MWh
  calculatePeakDemand, // Calculate peak demand
  calculateLoadFactor, // Calculate load factor
} from '../utils';
```

### Array (`array.ts`)
```typescript
import {
  unique,            // Remove duplicates
  groupBy,           // Group by key
  chunk,             // Split into chunks
  sortBy,            // Sort by key
} from '../utils';
```

### Object (`object.ts`)
```typescript
import {
  get,              // Get nested property
  set,              // Set nested property
  omit,             // Omit properties
  pick,             // Pick properties
  deepClone,        // Deep clone object
} from '../utils';
```

### Type Guards (`type-guards.ts`)
```typescript
import {
  isNumber,         // Check if number
  isString,         // Check if string
  isArray,          // Check if array
  isDefined,        // Check if defined
} from '../utils';
```

### Rate Management (`rates/`)
```typescript
import {
  getRateById,                    // Get rate by ID
  searchRates,                     // Search rates
  calculateMonthlyCost,            // Calculate monthly cost
  calculateAnnualCost,            // Calculate annual cost
  calculatePeakShavingSavings,    // Calculate savings
  findBestRate,                    // Find best rate for customer
  getEffectiveDemandRate,         // Get demand rate
} from '../utils/rates';
```

## 🎯 Quick Examples

### Example 1: Formatting in Components
```typescript
import { formatCurrency, formatPercent } from '../utils';

function MyComponent() {
  const price = 12500.50;
  const savings = 0.15;
  
  return (
    <div>
      <p>Price: {formatCurrency(price)}</p>
      <p>Savings: {formatPercent(savings)}</p>
    </div>
  );
}
```

### Example 2: Rate Calculations
```typescript
import { getRateById, calculateMonthlyCost } from '../utils/rates';

const rate = getRateById('pge-b-19');
const monthlyCost = calculateMonthlyCost(rate, intervalData, 6, 2024);
console.log(`Monthly cost: $${monthlyCost.totalCost}`);
```

### Example 3: Math Operations
```typescript
import { round, mean, clamp } from '../utils';

const values = [10, 20, 30, 40, 50];
const avg = mean(values);
const rounded = round(avg, 2);
const clamped = clamp(rounded, 0, 100);
```

## 🔍 Finding Utilities in Your IDE

### VS Code / Cursor

1. **File Explorer**: Navigate to `src/utils/` folder
2. **Quick Open** (Ctrl+P / Cmd+P): Type `utils/` to see all utility files
3. **Go to Symbol** (Ctrl+Shift+O / Cmd+Shift+O): Search for function names
4. **Find References** (Shift+F12): Find where utilities are used

### Search Tips

- Search for `from '../utils'` to find all imports
- Search for `from '@utils'` to find alias imports
- Search for specific function names like `formatCurrency`

## 📝 Path Aliases

Your project has path aliases configured:

```typescript
// In tsconfig.json and vite.config.ts
"@utils/*": ["src/utils/*"]
```

You can use:
```typescript
import { formatCurrency } from '@utils';
```

However, the main index exports everything, so you can also use:
```typescript
import { formatCurrency } from '@utils/index';
// or just
import { formatCurrency } from '../utils';
```

## 🚀 Current Usage Examples

The utility library is already being used in:

- `src/components/BatteryRecommendationCard.tsx` - Uses `formatCurrency`, `formatPercent`
- `src/components/ProjectCard.tsx` - Uses `formatCurrency`

You can see these as examples of how to import and use the utilities!

## 📚 Documentation

- **Rate System**: See `src/utils/rates/README.md` for detailed rate system documentation
- **Individual Files**: Each utility file has JSDoc comments explaining each function

## 💡 Tips

1. **Import from main index**: Use `import { ... } from '../utils'` to get everything from one place
2. **Tree-shaking**: Vite will automatically tree-shake unused imports
3. **Type safety**: All utilities are fully typed with TypeScript
4. **Auto-complete**: Your IDE should provide full autocomplete for all utilities
