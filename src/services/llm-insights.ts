/**
 * LLM Insights Service
 * Generates contextual AI insights using OpenAI API for analysis report sections
 */

import OpenAI from 'openai';
import { aiConfig, aiSystemPrompts, insightPromptTemplates } from '../config/ai-config';
import { getSectionContext, getAllTrainingContent } from '../data/training';

/**
 * Section insight response structure
 */
export interface SectionInsight {
  sectionId: string;
  title: string;
  whatWeAreLookingAt: string;
  whyItMatters: string;
  engineeringFocus: string[];
  salesTalkingPoints: string[];
  recommendations?: string[];
  isGenerated: boolean;
  generatedAt?: Date;
  error?: string;
}

/**
 * Weather correlation insight response
 */
export interface WeatherInsight {
  summary: string;
  technicalFindings: string[];
  efficiencyOpportunities: string[];
  impactOnBattery: string;
}

/**
 * Cache for generated insights to avoid redundant API calls
 */
const insightCache = new Map<string, { insight: SectionInsight; timestamp: number }>();

/**
 * OpenAI client instance (lazy initialized)
 */
let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(): OpenAI | null {
  if (!aiConfig.isEnabled) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: aiConfig.openaiApiKey,
      dangerouslyAllowBrowser: true, // Allow client-side usage
    });
  }

  return openaiClient;
}

/**
 * Generate insight for a specific analysis section
 */
export async function generateSectionInsight(
  sectionId: string,
  sectionData: Record<string, unknown>,
  sectionTitle?: string
): Promise<SectionInsight> {
  // Check cache first
  const cacheKey = `${sectionId}-${JSON.stringify(sectionData).substring(0, 100)}`;
  const cached = insightCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < aiConfig.cacheDuration) {
    return cached.insight;
  }

  // Get section context from training data
  const sectionContext = getSectionContext(sectionId);
  const title = sectionTitle || sectionContext?.sectionName || sectionId;

  // If AI is not enabled, return fallback insights from training data
  if (!aiConfig.isEnabled) {
    return generateFallbackInsight(sectionId, sectionData, title);
  }

  const client = getOpenAIClient();
  if (!client) {
    return generateFallbackInsight(sectionId, sectionData, title);
  }

  try {
    // Build prompt with training context
    const trainingContext = sectionContext ? `
Context for this section:
- What to look for: ${sectionContext.whatToLookFor.join('; ')}
- Engineering insights: ${sectionContext.engineeringInsights.join('; ')}
- Sales points: ${sectionContext.salesTalkingPoints.join('; ')}
- Benchmarks: ${JSON.stringify(sectionContext.benchmarks)}
` : '';

    const userPrompt = `${trainingContext}

${insightPromptTemplates.sectionInsight(sectionId, sectionData)}`;

    const response = await client.chat.completions.create({
      model: aiConfig.defaultModel,
      messages: [
        { role: 'system', content: aiSystemPrompts.analysisInsight },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);

    const insight: SectionInsight = {
      sectionId,
      title,
      whatWeAreLookingAt: parsed.whatWeAreLookingAt || 'Analysis in progress...',
      whyItMatters: parsed.whyItMatters || 'Understanding this data helps optimize your energy strategy.',
      engineeringFocus: parsed.engineeringFocus || [],
      salesTalkingPoints: parsed.salesTalkingPoints || [],
      recommendations: parsed.recommendations,
      isGenerated: true,
      generatedAt: new Date(),
    };

    // Cache the result
    insightCache.set(cacheKey, { insight, timestamp: Date.now() });

    return insight;
  } catch (error) {
    console.error('Failed to generate AI insight:', error);
    return {
      ...generateFallbackInsight(sectionId, sectionData, title),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate fallback insight using training data when AI is not available
 */
function generateFallbackInsight(
  sectionId: string,
  sectionData: Record<string, unknown>,
  title: string
): SectionInsight {
  const sectionContext = getSectionContext(sectionId);

  if (sectionContext) {
    return {
      sectionId,
      title,
      whatWeAreLookingAt: sectionContext.whatToLookFor[0] || 'Analyzing energy consumption patterns.',
      whyItMatters: sectionContext.salesTalkingPoints[0] || 'Understanding this data drives better energy decisions.',
      engineeringFocus: sectionContext.engineeringInsights.slice(0, 3),
      salesTalkingPoints: sectionContext.salesTalkingPoints.slice(0, 3),
      recommendations: sectionContext.commonIssues.slice(0, 2).map(issue => `Review: ${issue}`),
      isGenerated: false,
    };
  }

  // Generic fallback
  return {
    sectionId,
    title,
    whatWeAreLookingAt: 'This section displays key metrics from your energy analysis.',
    whyItMatters: 'These insights help identify opportunities for cost savings and efficiency improvements.',
    engineeringFocus: [
      'Review data quality and completeness',
      'Compare against industry benchmarks',
      'Identify anomalies or patterns',
    ],
    salesTalkingPoints: [
      'Highlight key findings that impact costs',
      'Connect data to potential savings',
      'Focus on actionable recommendations',
    ],
    isGenerated: false,
  };
}

/**
 * Generate battery recommendation insight
 */
export async function generateBatteryInsight(
  batteries: Array<{
    modelName: string;
    manufacturer: string;
    capacityKwh: number;
    maxPowerKw: number;
    peakReductionKw: number;
    annualSavings: number;
    paybackYears: number;
  }>,
  peakProfile: {
    peakKw: number;
    avgKw: number;
    loadFactor: number;
    peakEvents: number;
  }
): Promise<SectionInsight> {
  const sectionData = { batteries, peakProfile };
  
  if (!aiConfig.isEnabled) {
    return generateFallbackInsight('battery-recommendations', sectionData, 'Battery Recommendations');
  }

  const client = getOpenAIClient();
  if (!client) {
    return generateFallbackInsight('battery-recommendations', sectionData, 'Battery Recommendations');
  }

  try {
    const prompt = `Analyze these battery recommendations for a site with:
- Peak demand: ${peakProfile.peakKw} kW
- Average demand: ${peakProfile.avgKw} kW
- Load factor: ${(peakProfile.loadFactor * 100).toFixed(1)}%
- Peak events per year: ${peakProfile.peakEvents}

Top battery recommendations:
${batteries.slice(0, 3).map((b, i) => `
${i + 1}. ${b.manufacturer} ${b.modelName}
   - Capacity: ${b.capacityKwh} kWh, Power: ${b.maxPowerKw} kW
   - Peak reduction: ${b.peakReductionKw} kW
   - Annual savings: $${b.annualSavings.toLocaleString()}
   - Payback: ${b.paybackYears.toFixed(1)} years
`).join('')}

Provide your response in JSON format:
{
  "whatWeAreLookingAt": "Brief explanation",
  "whyItMatters": "Business impact",
  "engineeringFocus": ["Point 1", "Point 2", "Point 3"],
  "salesTalkingPoints": ["Point 1", "Point 2", "Point 3"],
  "recommendations": ["Action 1", "Action 2"]
}`;

    const response = await client.chat.completions.create({
      model: aiConfig.defaultModel,
      messages: [
        { role: 'system', content: aiSystemPrompts.batteryRecommendation },
        { role: 'user', content: prompt },
      ],
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);

    return {
      sectionId: 'battery-recommendations',
      title: 'Battery Recommendations',
      whatWeAreLookingAt: parsed.whatWeAreLookingAt,
      whyItMatters: parsed.whyItMatters,
      engineeringFocus: parsed.engineeringFocus || [],
      salesTalkingPoints: parsed.salesTalkingPoints || [],
      recommendations: parsed.recommendations,
      isGenerated: true,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to generate battery insight:', error);
    return {
      ...generateFallbackInsight('battery-recommendations', sectionData, 'Battery Recommendations'),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate weather correlation insight
 */
export async function generateWeatherInsight(
  correlationData: {
    rSquared: number;
    slope: number;
    baseload: number;
    coolingSlope: number;
    heatingSlope: number;
    weatherSensitivity: string;
  }
): Promise<WeatherInsight> {
  const fallback: WeatherInsight = {
    summary: `Energy consumption shows ${correlationData.weatherSensitivity} correlation with temperature (R² = ${(correlationData.rSquared * 100).toFixed(1)}%).`,
    technicalFindings: [
      `${(correlationData.rSquared * 100).toFixed(1)}% of usage variance explained by temperature`,
      correlationData.coolingSlope > correlationData.heatingSlope 
        ? 'Building is cooling-dominated' 
        : 'Building is heating-dominated',
      `Estimated baseload: ${correlationData.baseload.toFixed(0)} kW`,
    ],
    efficiencyOpportunities: [
      correlationData.coolingSlope > 0 ? 'HVAC optimization could reduce cooling load' : '',
      correlationData.heatingSlope > 0 ? 'Building envelope improvements may reduce heating' : '',
      'Consider demand-controlled ventilation',
    ].filter(Boolean),
    impactOnBattery: correlationData.weatherSensitivity === 'high' 
      ? 'Weather-driven peaks are predictable, improving battery dispatch accuracy'
      : 'Process-driven peaks require more sophisticated battery controls',
  };

  if (!aiConfig.isEnabled) {
    return fallback;
  }

  const client = getOpenAIClient();
  if (!client) {
    return fallback;
  }

  try {
    const prompt = insightPromptTemplates.weatherInsight(correlationData);

    const response = await client.chat.completions.create({
      model: aiConfig.defaultModel,
      messages: [
        { role: 'system', content: aiSystemPrompts.weatherCorrelation },
        { role: 'user', content: prompt },
      ],
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return JSON.parse(content) as WeatherInsight;
  } catch (error) {
    console.error('Failed to generate weather insight:', error);
    return fallback;
  }
}

/**
 * Generate executive narrative summary
 */
export async function generateExecutiveNarrative(
  analysisData: {
    customerName: string;
    siteAddress: string;
    peakDemand: number;
    avgDemand: number;
    loadFactor: number;
    recommendedBattery: string;
    annualSavings: number;
    paybackYears: number;
    peakReduction: number;
  }
): Promise<string> {
  const fallbackNarrative = `
## Executive Summary

**${analysisData.customerName}** at ${analysisData.siteAddress} has a peak demand of ${analysisData.peakDemand.toFixed(0)} kW with a load factor of ${(analysisData.loadFactor * 100).toFixed(1)}%. 

Our analysis recommends the **${analysisData.recommendedBattery}** battery system, which can reduce peak demand by ${analysisData.peakReduction.toFixed(0)} kW.

**Financial Impact:**
- Annual savings: $${analysisData.annualSavings.toLocaleString()}
- Simple payback: ${analysisData.paybackYears.toFixed(1)} years
- 10-year savings potential: $${(analysisData.annualSavings * 10).toLocaleString()}

Contact us to discuss next steps and financing options.
`.trim();

  if (!aiConfig.isEnabled) {
    return fallbackNarrative;
  }

  const client = getOpenAIClient();
  if (!client) {
    return fallbackNarrative;
  }

  try {
    const prompt = insightPromptTemplates.executiveSummary(analysisData);

    const response = await client.chat.completions.create({
      model: aiConfig.advancedModel, // Use advanced model for executive summary
      messages: [
        { role: 'system', content: aiSystemPrompts.analysisInsight },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.4,
    });

    return response.choices[0]?.message?.content || fallbackNarrative;
  } catch (error) {
    console.error('Failed to generate executive narrative:', error);
    return fallbackNarrative;
  }
}

/**
 * Clear insight cache
 */
export function clearInsightCache(): void {
  insightCache.clear();
}

/**
 * Check if AI insights are available
 */
export function isAIEnabled(): boolean {
  return aiConfig.isEnabled;
}


