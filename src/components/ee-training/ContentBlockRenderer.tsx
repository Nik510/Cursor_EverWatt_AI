/**
 * Content Block Renderer
 * Dynamically renders content blocks based on type
 * This is the building block system - add new block types here
 */

import React, { Suspense, lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AnyContentBlock } from '../../backend/ee-training/types';

// Lazy load interactive components for better performance
// Cooling Systems
const AnimatedSchematic = lazy(() => import('./AnimatedSchematic'));
const InteractiveChillerDiagram = lazy(() => import('./InteractiveChillerDiagram'));
const RefrigerationCycleAnimation = lazy(() => import('./RefrigerationCycleAnimation'));
const CoolingTowerAnimation = lazy(() => import('./CoolingTowerAnimation'));
// Heating Systems
const BoilerDiagram = lazy(() => import('./interactive/BoilerDiagram'));
const HeatPumpCycle = lazy(() => import('./interactive/HeatPumpCycle'));
const SteamTrapTester = lazy(() => import('./interactive/SteamTrapTester'));
// New diagnostic diagrams (all modules)
const CompressedAirSystemMap = lazy(() => import('./interactive/CompressedAirSystemMap'));
const LightingControlsStackDiagram = lazy(() => import('./interactive/LightingControlsStackDiagram'));
const FixtureIDAuditGuide = lazy(() => import('./interactive/FixtureIDAuditGuide'));
const VFDFitCheckerDiagram = lazy(() => import('./interactive/VFDFitCheckerDiagram'));
const MotorNameplateExplainer = lazy(() => import('./interactive/MotorNameplateExplainer'));
const RefrigerationControlsDiagram = lazy(() => import('./interactive/RefrigerationControlsDiagram'));
const AirsideSystemMap = lazy(() => import('./interactive/AirsideSystemMap'));
const HVACControlLoopsExplainer = lazy(() => import('./interactive/HVACControlLoopsExplainer'));
const DataCenterAirflowContainment = lazy(() => import('./interactive/DataCenterAirflowContainment'));
const HeatLossPathsDiagram = lazy(() => import('./interactive/HeatLossPathsDiagram'));
// Widgets (for quiz)
const QuizWidget = lazy(() => import('./widgets/QuizWidget'));
// Widgets (for calculators)
const CalculatorWidget = lazy(() => import('./widgets/CalculatorWidget'));

// Loading fallback for interactive components
const InteractiveLoading: React.FC = () => (
  <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
    <p className="text-sm text-gray-600">Loading interactive component...</p>
  </div>
);

interface ContentBlockRendererProps {
  block: AnyContentBlock;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ block }) => {
  switch (block.type) {
    case 'text':
    case 'markdown':
      return <TextBlock block={block} />;
    
    case 'image':
      return <ImageBlock block={block} />;
    
    case 'video':
      return <VideoBlock block={block} />;
    
    case 'interactive':
      return <InteractiveBlock block={block} />;

    case 'calculator':
      return (
        <Suspense fallback={<InteractiveLoading />}>
          <CalculatorWidget
            calculatorType={block.calculatorType}
            title={block.title ?? block.metadata?.title}
            subtitle={block.subtitle ?? (block.metadata?.description as string | undefined)}
            config={block.config}
          />
        </Suspense>
      );
    
    case 'list':
      return <ListBlock block={block} />;
    
    case 'table':
      return <TableBlock block={block} />;
    
    case 'formula':
      return <FormulaBlock block={block} />;
    
    case 'quote':
      return <QuoteBlock block={block} />;
    
    case 'accordion':
      return <AccordionBlock block={block} />;
    
    case 'tabs':
      return <TabsBlock block={block} />;
    
    case 'cards':
      return <CardsBlock block={block} />;
    
    case 'comparison':
      return <ComparisonBlock block={block} />;
    
    default:
      console.warn(`Unknown content block type: ${(block as any).type}`);
      return null;
  }
};

// Individual block components
const TextBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'text' | 'markdown' }> }> = ({ block }) => {
  if (block.type === 'markdown') {
    return (
      <div className="mb-6 text-slate-800">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mt-2 mb-3">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl md:text-[1.35rem] font-bold tracking-tight text-slate-900 mt-6 mb-2 pb-2 border-b border-slate-200/70">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg md:text-xl font-semibold tracking-tight text-slate-900 mt-5 mb-2">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base md:text-[1.05rem] font-semibold text-slate-900 mt-4 mb-2">
                {children}
              </h4>
            ),
            p: ({ children }) => <p className="text-[15px] leading-7 text-slate-700 mb-3">{children}</p>,
            ul: ({ children }) => (
              <ul className="list-disc pl-6 mb-4 space-y-1.5 text-[15px] leading-7 text-slate-700 marker:text-slate-400">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-[15px] leading-7 text-slate-700 marker:text-slate-400">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="leading-7">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="my-5 border-l-4 border-indigo-300 bg-gradient-to-r from-indigo-50 to-white px-4 py-3 rounded-r-xl shadow-sm">
                <div className="text-[15px] leading-7 text-slate-700">{children}</div>
              </blockquote>
            ),
            hr: () => <hr className="my-6 border-slate-200" />,
            a: ({ children, href }) => (
              <a className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2" href={href}>
                {children}
              </a>
            ),
            code: ({ children, className, ...props }) => {
              // react-markdown uses `inline` prop at runtime; keep typing loose
              const inline = (props as any).inline as boolean | undefined;
              if (inline) {
                return (
                  <code className="px-1 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[0.9em] font-mono">
                    {children}
                  </code>
                );
              }

              return (
                <code className={className ? String(className) : undefined}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="my-5 overflow-x-auto rounded-xl bg-slate-950 text-slate-50 p-4 text-sm shadow-sm ring-1 ring-slate-900/10">
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <div className="my-5 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
            th: ({ children }) => (
              <th className="px-4 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-slate-700 border-b border-slate-100 align-top">{children}</td>
            ),
          }}
        >
          {block.content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{block.content}</p>
    </div>
  );
};

const ImageBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'image' }> }> = ({ block }) => {
  return (
    <figure className="mb-6">
      <img
        src={block.src}
        alt={block.alt}
        className="rounded-lg shadow-md w-full"
        style={{
          maxWidth: block.width ? `${block.width}px` : undefined,
          maxHeight: block.height ? `${block.height}px` : undefined,
        }}
      />
      {block.caption && (
        <figcaption className="text-sm text-gray-500 mt-2 text-center">{block.caption}</figcaption>
      )}
    </figure>
  );
};

const VideoBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'video' }> }> = ({ block }) => {
  // Placeholder for video embedding
  return (
    <div className="mb-6">
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600">Video: {block.src}</p>
        {block.caption && <p className="text-sm text-gray-500 mt-2">{block.caption}</p>}
      </div>
    </div>
  );
};

const InteractiveBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'interactive' }> }> = ({ block }) => {
  // Render the appropriate interactive component based on the component identifier
  const renderComponent = () => {
    switch (block.component) {
      case 'animated-schematic':
        return (
          <AnimatedSchematic
            title={block.config?.title}
            subtitle={block.config?.subtitle}
            flowPaths={block.config?.flowPaths}
            components={block.config?.components}
            hotspots={block.config?.hotspots}
            showLabels={block.config?.showLabels}
            animationSpeed={block.config?.animationSpeed}
            width={block.config?.width}
            height={block.config?.height}
          />
        );
      
      case 'interactive-chiller':
      case 'chiller-diagram':
        return (
          <InteractiveChillerDiagram
            title={block.config?.title}
            chillerType={block.config?.chillerType}
            showWaterLoops={block.config?.showWaterLoops}
          />
        );
      
      case 'refrigeration-cycle':
        return (
          <RefrigerationCycleAnimation
            title={block.config?.title}
            refrigerant={block.config?.refrigerant}
            autoPlay={block.config?.autoPlay}
            showPHDiagram={block.config?.showPHDiagram}
          />
        );
      
      case 'cooling-tower':
      case 'tower-animation':
        return (
          <CoolingTowerAnimation
            title={block.config?.title}
            towerType={block.config?.towerType}
            showCalculator={block.config?.showCalculator}
            interactive={block.config?.interactive}
          />
        );
      
      // Heating Systems Components
      case 'boiler-diagram':
      case 'boiler':
        return (
          <BoilerDiagram
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );
      
      case 'heat-pump-cycle':
      case 'heat-pump':
        return (
          <HeatPumpCycle
            title={block.config?.title}
            outdoorTemp={block.config?.outdoorTemp}
            mode={block.config?.mode}
          />
        );
      
      case 'steam-trap-tester':
      case 'steam-trap':
        return (
          <SteamTrapTester
            title={block.config?.title}
            subtitle={block.config?.subtitle}
            steamPressure={block.config?.steamPressure}
          />
        );
      
      // Quiz Widget
      case 'quiz-widget':
      case 'quiz':
        // Transform quiz questions from JSON format to component format
        const transformedQuestions = ((block.config?.questions || []) as any[]).map((q: any) => {
          // Handle both formats: array of strings or array of objects
          let options: Array<{ id: string; text: string }>;
          let correctAnswer: string;

          if (Array.isArray(q.options) && q.options.length > 0) {
            // If options is an array of strings, convert to objects
            if (typeof q.options[0] === 'string') {
              options = q.options.map((opt: string, idx: number) => ({
                id: `${q.id}-opt-${idx}`,
                text: opt,
              }));
              // correctAnswer is an index (number), convert to option id
              const correctIndex = typeof q.correctAnswer === 'number' 
                ? q.correctAnswer 
                : parseInt(String(q.correctAnswer), 10);
              correctAnswer = (options[correctIndex]?.id) || options[0]?.id || '';
            } else {
              // Already in object format {id, text}
              options = q.options;
              correctAnswer = String(q.correctAnswer || '');
            }
          } else {
            options = [];
            correctAnswer = '';
          }

          return {
            id: q.id || `question-${Math.random()}`,
            question: q.question || '',
            options,
            correctAnswer,
            explanation: q.explanation,
            hint: q.hint,
            points: q.points || 10,
          };
        });

        return (
          <QuizWidget
            title={block.config?.title}
            subtitle={block.config?.subtitle}
            questions={transformedQuestions}
            showHints={block.config?.showHints}
            allowRetry={block.config?.allowRetry}
            color={block.config?.color}
          />
        );

      // Compressed Air
      case 'compressed-air-system-map':
        return (
          <CompressedAirSystemMap
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );

      // Lighting
      case 'lighting-controls-stack':
        return (
          <LightingControlsStackDiagram
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );
      case 'fixture-id-audit':
        return (
          <FixtureIDAuditGuide
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );

      // Motors / Electrical
      case 'vfd-fit-checker':
        return (
          <VFDFitCheckerDiagram
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );
      case 'motor-nameplate-explainer':
        return (
          <MotorNameplateExplainer
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );

      // Refrigeration
      case 'refrigeration-controls':
        return (
          <RefrigerationControlsDiagram
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );

      // Air distribution
      case 'airside-system-map':
        return (
          <AirsideSystemMap
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );

      // HVAC controls
      case 'hvac-control-loops':
        return (
          <HVACControlLoopsExplainer
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );

      // Data center
      case 'data-center-airflow':
        return (
          <DataCenterAirflowContainment
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );

      // Envelope
      case 'heat-loss-paths':
        return (
          <HeatLossPathsDiagram
            title={block.config?.title}
            subtitle={block.config?.subtitle}
          />
        );
      
      default:
        // Fallback for unknown interactive components
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Interactive Component:</strong> {block.component}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Component not found. Available: animated-schematic, interactive-chiller, refrigeration-cycle, cooling-tower, boiler-diagram, heat-pump-cycle, steam-trap-tester, quiz-widget
            </p>
          </div>
        );
    }
  };
  
  return (
    <div className="mb-6">
      <Suspense fallback={<InteractiveLoading />}>
        {renderComponent()}
      </Suspense>
    </div>
  );
};

const ListBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'list' }> }> = ({ block }) => {
  const ListTag = block.ordered ? 'ol' : 'ul';
  const listClassName = block.ordered
    ? 'list-decimal pl-6 mb-4 space-y-1.5 text-[15px] leading-7 text-slate-700 marker:text-slate-400'
    : 'list-disc pl-6 mb-4 space-y-1.5 text-[15px] leading-7 text-slate-700 marker:text-slate-400';
  
  return (
    <ListTag className={listClassName}>
      {block.items.map((item, idx) => (
        <li key={idx} className="leading-7">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Keep list items compact: avoid block-level <p> spacing inside <li>
              p: ({ children }) => <span className="text-slate-700">{children}</span>,
              a: ({ children, href }) => (
                <a className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2" href={href}>
                  {children}
                </a>
              ),
              code: ({ children, ...props }) => {
                const inline = (props as any).inline as boolean | undefined;
                if (inline) {
                  return (
                    <code className="px-1 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[0.9em] font-mono">
                      {children}
                    </code>
                  );
                }
                return <code>{children}</code>;
              },
            }}
          >
            {item}
          </ReactMarkdown>
        </li>
      ))}
    </ListTag>
  );
};

const TableBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'table' }> }> = ({ block }) => {
  return (
    <div className="mb-6 overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            {block.headers.map((header, idx) => (
              <th key={idx} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-3 text-sm text-gray-700 border-b">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {block.caption && (
        <p className="text-sm text-gray-500 mt-2 text-center">{block.caption}</p>
      )}
    </div>
  );
};

const FormulaBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'formula' }> }> = ({ block }) => {
  return (
    <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="font-mono text-lg mb-2">{block.formula}</div>
      {block.explanation && (
        <p className="text-sm text-gray-600 mb-2">{block.explanation}</p>
      )}
      {block.variables && block.variables.length > 0 && (
        <div className="mt-3 space-y-1">
          {block.variables.map((variable, idx) => (
            <div key={idx} className="text-sm">
              <span className="font-semibold">{variable.name}:</span>{' '}
              <span className="text-gray-600">{variable.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const QuoteBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'quote' }> }> = ({ block }) => {
  return (
    <blockquote className="mb-6 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
      <p className="text-gray-700 italic mb-2">"{block.quote}"</p>
      {block.author && (
        <footer className="text-sm text-gray-600">
          {block.author}
          {block.role && <span className="text-gray-500">, {block.role}</span>}
        </footer>
      )}
    </blockquote>
  );
};

const AccordionBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'accordion' }> }> = ({ block }) => {
  const [openItems, setOpenItems] = React.useState<Set<number>>(new Set());
  
  const toggleItem = (index: number) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenItems(newOpen);
  };
  
  return (
    <div className="mb-6 space-y-2">
      {block.items.map((item, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleItem(idx)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
          >
            <span className="font-semibold text-gray-900">{item.title}</span>
            <span className="text-gray-500">
              {openItems.has(idx) ? '−' : '+'}
            </span>
          </button>
          {openItems.has(idx) && (
            <div className="px-4 py-3 bg-white">
              {item.content.map((contentBlock, blockIdx) => (
                <ContentBlockRenderer key={blockIdx} block={contentBlock} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const TabsBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'tabs' }> }> = ({ block }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  
  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <div className="flex space-x-1">
          {block.tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === idx
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {block.tabs[activeTab]?.content.map((contentBlock, blockIdx) => (
          <ContentBlockRenderer key={blockIdx} block={contentBlock} />
        ))}
      </div>
    </div>
  );
};

const CardsBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'cards' }> }> = ({ block }) => {
  const columns = block.columns || 3;
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'grid-cols-1 md:grid-cols-3';
  
  return (
    <div className={`mb-6 grid ${gridCols} gap-4`}>
      {block.cards.map((card, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          {card.image && (
            <img src={card.image} alt={card.title} className="w-full h-32 object-cover rounded mb-3" />
          )}
          <h4 className="font-semibold text-gray-900 mb-2">{card.title}</h4>
          {card.description && (
            <p className="text-sm text-gray-600 mb-3">{card.description}</p>
          )}
          {card.link && (
            <a href={card.link} className="text-blue-600 text-sm hover:underline">
              Learn more →
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

const ComparisonBlock: React.FC<{ block: Extract<AnyContentBlock, { type: 'comparison' }> }> = ({ block }) => {
  return (
    <div className="mb-6">
      {block.title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{block.title}</h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-4 bg-red-50">
          <h4 className="font-semibold text-gray-900 mb-3">{block.before.label}</h4>
          {block.before.content.map((contentBlock, idx) => (
            <ContentBlockRenderer key={idx} block={contentBlock} />
          ))}
        </div>
        <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
          <h4 className="font-semibold text-gray-900 mb-3">{block.after.label}</h4>
          {block.after.content.map((contentBlock, idx) => (
            <ContentBlockRenderer key={idx} block={contentBlock} />
          ))}
        </div>
      </div>
    </div>
  );
};
