/**
 * EE Training Backend Types
 * Schema for modular, extensible training content
 * All content is backend-driven - no hard-coded data in frontend
 */

/**
 * Content Block Types - Building blocks for training content
 */
export type ContentBlockType = 
  | 'text'           // Plain text content
  | 'markdown'       // Markdown formatted content
  | 'image'          // Image with caption
  | 'video'          // Video embed
  | 'interactive'    // Interactive component (schematic, calculator, etc.)
  | 'calculator'     // Interactive calculator widget
  | 'list'           // Bulleted or numbered list
  | 'table'          // Data table
  | 'code'           // Code example
  | 'formula'        // Mathematical formula
  | 'quote'          // Quote or callout
  | 'accordion'      // Collapsible content
  | 'tabs'           // Tabbed content
  | 'cards'          // Card grid layout
  | 'comparison'     // Before/after comparison
  | 'timeline'       // Timeline visualization
  // New widget-based content blocks
  | 'stats-grid'     // Grid of stat cards with KPIs
  | 'kpi-dashboard'  // KPI rings with metrics
  | 'measure-cards'  // Filterable measure card grid
  | 'quiz'           // Interactive quiz block
  | 'process-flow'   // Animated process diagram
  | 'decision-matrix'// Heat map decision helper
  | 'obf-eligibility'// OBF eligibility checker
  | 'skill-meter'    // Skill proficiency indicators
  | 'savings-counter'// Animated savings display
  | 'equipment-grid';// Equipment cards grid

/**
 * Base Content Block
 */
export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  order: number; // Display order within section
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    [key: string]: unknown; // Extensible metadata
  };
}

/**
 * Text Content Block
 */
export interface TextBlock extends ContentBlock {
  type: 'text' | 'markdown';
  content: string;
}

/**
 * Image Content Block
 */
export interface ImageBlock extends ContentBlock {
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

/**
 * Video Content Block
 */
export interface VideoBlock extends ContentBlock {
  type: 'video';
  src: string;
  provider?: 'youtube' | 'vimeo' | 'direct';
  thumbnail?: string;
  caption?: string;
}

/**
 * Interactive Content Block
 */
export interface InteractiveBlock extends ContentBlock {
  type: 'interactive';
  component: string; // Component identifier (e.g., 'chiller-schematic', 'calculator')
  config: Record<string, unknown>; // Component-specific configuration
}

/**
 * Calculator Content Block
 * Renders a calculator widget with a typed configuration.
 */
export interface CalculatorBlock extends ContentBlock {
  type: 'calculator';
  calculatorType:
    | 'energy-savings'
    | 'roi'
    | 'compressed-air'
    | 'lighting-retrofit'
    | 'hvac-optimization';
  title?: string;
  subtitle?: string;
  config?: Record<string, unknown>;
}

/**
 * List Content Block
 */
export interface ListBlock extends ContentBlock {
  type: 'list';
  items: string[];
  ordered?: boolean; // true for numbered, false for bulleted
}

/**
 * Table Content Block
 */
export interface TableBlock extends ContentBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
  caption?: string;
}

/**
 * Formula Content Block
 */
export interface FormulaBlock extends ContentBlock {
  type: 'formula';
  formula: string; // LaTeX or plain text
  explanation?: string;
  variables?: { name: string; description: string }[];
}

/**
 * Quote Content Block
 */
export interface QuoteBlock extends ContentBlock {
  type: 'quote';
  quote: string;
  author?: string;
  role?: string;
  citation?: string;
}

/**
 * Accordion Content Block
 */
export interface AccordionBlock extends ContentBlock {
  type: 'accordion';
  items: {
    title: string;
    content: ContentBlock[]; // Nested content blocks
  }[];
}

/**
 * Tabs Content Block
 */
export interface TabsBlock extends ContentBlock {
  type: 'tabs';
  tabs: {
    label: string;
    content: ContentBlock[]; // Nested content blocks
  }[];
}

/**
 * Cards Content Block
 */
export interface CardsBlock extends ContentBlock {
  type: 'cards';
  cards: {
    title: string;
    description?: string;
    image?: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }[];
  columns?: number; // Grid columns (1-4)
}

/**
 * Comparison Content Block
 */
export interface ComparisonBlock extends ContentBlock {
  type: 'comparison';
  title?: string;
  before: {
    label: string;
    content: ContentBlock[];
  };
  after: {
    label: string;
    content: ContentBlock[];
  };
}

/**
 * Stats Grid Content Block
 * Grid of stat cards with KPIs
 */
export interface StatsGridBlock extends ContentBlock {
  type: 'stats-grid';
  stats: {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: { direction: 'up' | 'down' | 'neutral'; value: string };
    color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'pink';
    sparkline?: number[];
  }[];
  columns?: number;
}

/**
 * KPI Dashboard Content Block
 * KPI rings with metrics
 */
export interface KPIDashboardBlock extends ContentBlock {
  type: 'kpi-dashboard';
  metrics: {
    value: number;
    maxValue?: number;
    label: string;
    sublabel?: string;
    unit?: string;
    color?: 'auto' | 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'pink';
    thresholds?: { good: number; warning: number };
  }[];
}

/**
 * Measure Cards Content Block
 * Filterable grid of measure cards
 */
export interface MeasureCardsBlock extends ContentBlock {
  type: 'measure-cards';
  measures: {
    id: string;
    name: string;
    category: string;
    description?: string;
    savingsRange?: { min: number; max: number; unit: string };
    paybackRange?: { min: number; max: number; unit: string };
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
    obfEligible?: boolean;
    tags?: string[];
    featured?: boolean;
  }[];
  showFilters?: boolean;
  columns?: number;
}

/**
 * Quiz Content Block
 * Interactive quiz with immediate feedback
 */
export interface QuizBlock extends ContentBlock {
  type: 'quiz';
  questions: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
    hint?: string;
    points?: number;
  }[];
  title?: string;
  subtitle?: string;
  showHints?: boolean;
  allowRetry?: boolean;
  passingScore?: number;
}

/**
 * Process Flow Content Block
 * Animated step-by-step process visualization
 */
export interface ProcessFlowBlock extends ContentBlock {
  type: 'process-flow';
  steps: {
    id: string;
    title: string;
    description?: string;
    details?: string[];
    duration?: string;
  }[];
  title?: string;
  subtitle?: string;
  direction?: 'horizontal' | 'vertical';
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'teal';
}

/**
 * Decision Matrix Content Block
 * Heat map decision helper
 */
export interface DecisionMatrixBlock extends ContentBlock {
  type: 'decision-matrix';
  rows: { key: string; label: string }[];
  cols: { key: string; label: string }[];
  data: {
    row: string;
    col: string;
    value: number;
    label?: string;
    tooltip?: string;
  }[];
  title?: string;
  subtitle?: string;
  colorScale?: 'green-red' | 'blue-red' | 'cool-warm' | 'single';
}

/**
 * OBF Eligibility Content Block
 * OBF eligibility checker and display
 */
export interface OBFEligibilityBlock extends ContentBlock {
  type: 'obf-eligibility';
  measureId: string;
  showDetails?: boolean;
  showUtilityBreakdown?: boolean;
}

/**
 * Skill Meter Content Block
 * Skill proficiency indicators
 */
export interface SkillMeterBlock extends ContentBlock {
  type: 'skill-meter';
  skills: {
    id: string;
    name: string;
    level: number;
    icon?: 'engineering' | 'sales' | 'field' | 'technical' | 'business';
    color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal';
  }[];
  title?: string;
  subtitle?: string;
  layout?: 'horizontal' | 'vertical' | 'grid';
}

/**
 * Savings Counter Content Block
 * Animated savings display
 */
export interface SavingsCounterBlock extends ContentBlock {
  type: 'savings-counter';
  value: number;
  valueType?: 'currency' | 'energy' | 'water' | 'carbon' | 'custom';
  label?: string;
  sublabel?: string;
  prefix?: string;
  suffix?: string;
  color?: 'green' | 'blue' | 'orange' | 'purple' | 'teal';
}

/**
 * Equipment Grid Content Block
 * Grid of equipment cards
 */
export interface EquipmentGridBlock extends ContentBlock {
  type: 'equipment-grid';
  equipment: {
    id: string;
    name: string;
    type: string;
    description?: string;
    imageUrl?: string;
    specs?: { label: string; value: string; icon?: string }[];
    efficiency?: { label: string; value: number; unit: string; benchmark?: number };
    tags?: string[];
    featured?: boolean;
  }[];
  columns?: number;
}

/**
 * Union type for all content blocks
 */
export type AnyContentBlock = 
  | TextBlock
  | ImageBlock
  | VideoBlock
  | InteractiveBlock
  | CalculatorBlock
  | ListBlock
  | TableBlock
  | FormulaBlock
  | QuoteBlock
  | AccordionBlock
  | TabsBlock
  | CardsBlock
  | ComparisonBlock
  | StatsGridBlock
  | KPIDashboardBlock
  | MeasureCardsBlock
  | QuizBlock
  | ProcessFlowBlock
  | DecisionMatrixBlock
  | OBFEligibilityBlock
  | SkillMeterBlock
  | SavingsCounterBlock
  | EquipmentGridBlock;

/**
 * Training Section
 * A section within a module (e.g., "Introduction", "How It Works", "Best Practices")
 */
export interface TrainingSection {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string; // Emoji or icon identifier
  order: number;
  status?: VisibilityStatus; // Optional: section-level visibility
  content: AnyContentBlock[]; // Array of content blocks
  metadata?: {
    estimatedTime?: number; // Minutes to complete
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    prerequisites?: string[]; // Section IDs that should be completed first
    tags?: string[];
    publishedAt?: string;
    publishedBy?: string;
    [key: string]: unknown;
  };
}

/**
 * Visibility Status
 */
export type VisibilityStatus = 'published' | 'draft' | 'archived' | 'hidden';

/**
 * Training Module
 * Top-level container (e.g., "Cooling Systems", "Lighting", "HVAC Controls")
 */
export interface TrainingModule {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  category: string; // e.g., "cooling", "lighting", "hvac"
  order: number;
  status: VisibilityStatus; // Updated to support 'hidden'
  sections: TrainingSection[];
  metadata?: {
    author?: string;
    lastUpdated?: string;
    version?: string;
    tags?: string[];
    estimatedTime?: number; // Total minutes
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    publishedAt?: string;
    publishedBy?: string;
    lastEditedAt?: string;
    lastEditedBy?: string;
    [key: string]: unknown;
  };
}

/**
 * Module Category
 * Groups related modules (e.g., "Cooling Systems", "Heating Systems")
 */
export interface ModuleCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  modules: string[]; // Module IDs in this category
}

/**
 * Training Library Structure
 * Root structure for all training content
 */
export interface TrainingLibrary {
  version: string;
  lastUpdated: string;
  categories: ModuleCategory[];
  modules: TrainingModule[];
}

/**
 * API Response Types
 */
export interface GetModulesResponse {
  modules: TrainingModule[];
  categories: ModuleCategory[];
}

export interface GetModuleResponse {
  module: TrainingModule;
}

export interface GetSectionResponse {
  section: TrainingSection;
  module: TrainingModule; // Include module context
}

/**
 * Certification Types
 * Industry-specific certification tests and certificates
 */

/**
 * Certification Test Question
 * More rigorous than quiz questions - no hints, timed, scenario-based
 */
export interface CertificationQuestion {
  id: string;
  question: string;
  questionType: 'multiple-choice' | 'scenario' | 'calculation' | 'application';
  options: {
    id: string;
    text: string;
  }[];
  correctAnswer: string;
  explanation?: string;
  points: number;
  category: string; // e.g., 'hvac', 'lighting', 'compressed-air'
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number; // seconds
  scenario?: string; // For scenario-based questions
}

/**
 * Certification Test
 * Industry-specific certification exam
 */
export interface CertificationTest {
  id: string;
  industry: string; // e.g., 'healthcare', 'manufacturing', 'k12-public'
  title: string; // e.g., "EverWatt Energy Efficiency Certification - For Healthcare Engineers"
  subtitle?: string;
  description: string;
  icon?: string;
  passingScore: number; // Percentage (e.g., 80)
  timeLimit?: number; // Minutes (optional)
  questions: CertificationQuestion[];
  prerequisites?: string[]; // Module IDs that should be completed first
  metadata?: {
    estimatedTime?: number; // Total minutes
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    version?: string;
    lastUpdated?: string;
    [key: string]: unknown;
  };
}

/**
 * Certification Attempt
 * Tracks a user's attempt at a certification test
 */
export interface CertificationAttempt {
  id: string;
  testId: string;
  userId?: string; // Optional user tracking
  startedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  answers: Record<string, string>; // questionId -> answerId
  score: number;
  percentage: number;
  passed: boolean;
  timeSpent?: number; // seconds
}

/**
 * Practice Attempt
 * Tracks a user's practice run (separate from certification attempts).
 */
export interface PracticeAttempt {
  id: string;
  testId: string;
  startedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  answers: Record<string, string>; // questionId -> answerId
  score: number;
  percentage: number;
  timeSpent?: number; // seconds
}

/**
 * Certification Certificate
 * Generated certificate after passing
 */
export interface CertificationCertificate {
  id: string;
  testId: string;
  industry: string;
  title: string;
  recipientName?: string;
  issuedAt: string; // ISO timestamp
  expiresAt?: string; // Optional expiration
  attemptId: string;
  certificateNumber: string; // Unique identifier
  verificationUrl?: string; // URL to verify certificate
}

/**
 * Training Progress Types
 * Local progress tracking for modules/sections and learning path recommendations
 */

export interface SectionProgress {
  sectionId: string;
  completed: boolean;
  completedAt?: string; // ISO
  firstViewedAt?: string; // ISO
  lastViewedAt?: string; // ISO
  timeSpentSec: number;
}

export interface ModuleProgress {
  moduleId: string;
  startedAt?: string; // ISO
  lastViewedAt?: string; // ISO
  lastSectionId?: string;
  sections: Record<string, SectionProgress>;
}

export interface UserProgress {
  version: number;
  updatedAt: string; // ISO
  modules: Record<string, ModuleProgress>;
  preferences?: {
    role?: 'sales' | 'engineer' | 'field';
    industryFocus?: string; // e.g. 'healthcare'
  };
}

export interface LearningPathStep {
  moduleId: string;
  title: string;
  reason: string;
  recommendedMode?: 'sales' | 'deep';
}

export interface LearningPath {
  id: string;
  name: string;
  description?: string;
  steps: LearningPathStep[];
}