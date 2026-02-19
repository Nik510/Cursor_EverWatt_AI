/**
 * AI Configuration
 * Settings for OpenAI integration and LLM-powered insights
 *
 * To use AI insights, set the environment variable:
 * OPENAI_API_KEY=your-api-key-here
 */

function isBrowserRuntime(): boolean {
  // window is defined in browsers and some test environments; treat any window presence as "browser mode".
  // This file must never expose secrets to browser bundles.
  return typeof window !== 'undefined';
}

/**
 * Get OpenAI API key from environment
 */
export function getOpenAIKey(): string | undefined {
  if (isBrowserRuntime()) return undefined;
  return process.env.OPENAI_API_KEY;
}

/**
 * AI Configuration object
 */
export const aiConfig = {
  /**
   * OpenAI API key - loaded from environment variable
   */
  get openaiApiKey(): string | undefined {
    return getOpenAIKey();
  },

  /**
   * Default model to use for generating insights
   * gpt-4o-mini is fast and cost-effective for structured output
   */
  defaultModel: 'gpt-4o-mini' as const,

  /**
   * Model for complex analysis requiring higher reasoning
   */
  advancedModel: 'gpt-4o' as const,

  /**
   * Maximum tokens for insight generation
   */
  maxTokens: 1024,

  /**
   * Temperature for generation (lower = more deterministic)
   */
  temperature: 0.3,

  /**
   * Whether AI features are enabled (requires API key)
   */
  get isEnabled(): boolean {
    const key = this.openaiApiKey;
    return Boolean(key && key.length > 10);
  },

  /**
   * Timeout for API calls in milliseconds
   */
  timeout: 30000,

  /**
   * Number of retries for failed API calls
   */
  retries: 2,

  /**
   * Cache duration for insights in milliseconds (5 minutes)
   */
  cacheDuration: 5 * 60 * 1000,
};

/**
 * System prompt for the AI insight generator
 */
export const aiSystemPrompts = {
  /**
   * Base system prompt for energy analysis insights
   */
  analysisInsight: `You are an expert energy analyst at EverWatt, a commercial energy consulting firm.
Your role is to provide insights on energy consumption data and battery storage recommendations.

Guidelines:
- Be specific and actionable in your recommendations
- Reference actual data values when discussing findings
- Provide both engineering technical details and sales-oriented customer benefits
- Focus on ROI, payback periods, and tangible cost savings
- Use industry standard terminology (ASHRAE, demand charges, load factor, etc.)
- Keep explanations clear for both technical and non-technical audiences
- Highlight red flags and opportunities in the data
- Be concise but thorough - aim for 2-3 sentences per point`,

  /**
   * System prompt for battery recommendation insights
   */
  batteryRecommendation: `You are an expert in commercial battery energy storage systems (BESS).
Analyze battery recommendations for peak shaving applications and provide insights.

Focus on:
- Why specific battery sizing makes sense for this load profile
- Trade-offs between different battery options
- Expected performance and cycling patterns
- Warranty and lifecycle considerations
- Integration with utility rate structures
- SGIP and other incentive opportunities`,

  /**
   * System prompt for weather correlation insights
   */
  weatherCorrelation: `You are an expert in building energy analysis following ASHRAE Guideline 14.
Analyze weather-energy correlation data and provide insights.

Focus on:
- What the R-squared and regression coefficients indicate
- Whether the building is heating-dominated, cooling-dominated, or balanced
- Implications for energy efficiency measures
- How weather sensitivity affects battery sizing and operation
- Opportunities for HVAC optimization based on weather correlation`,
};

/**
 * Prompt templates for different insight types
 */
export const insightPromptTemplates = {
  /**
   * Generate insight for a specific report section
   */
  sectionInsight: (sectionId: string, sectionData: Record<string, unknown>) => `
Analyze the following ${sectionId} data and provide insights:

${JSON.stringify(sectionData, null, 2)}

Provide your response in the following JSON format:
{
  "whatWeAreLookingAt": "Brief explanation of what this section shows",
  "whyItMatters": "Why this is important for the customer",
  "engineeringFocus": ["Technical point 1", "Technical point 2", "Technical point 3"],
  "salesTalkingPoints": ["Customer-facing point 1", "Customer-facing point 2", "Customer-facing point 3"],
  "recommendations": ["Action item 1", "Action item 2"]
}`,

  /**
   * Generate executive summary
   */
  executiveSummary: (analysisData: Record<string, unknown>) => `
Generate an executive summary for this battery storage analysis:

${JSON.stringify(analysisData, null, 2)}

Provide a 3-4 paragraph summary covering:
1. Current situation and key findings
2. Recommended solution and expected benefits
3. Financial summary and next steps`,

  /**
   * Generate weather correlation insight
   */
  weatherInsight: (correlationData: Record<string, unknown>) => `
Analyze this weather-energy correlation data:

${JSON.stringify(correlationData, null, 2)}

Provide insights in JSON format:
{
  "summary": "One sentence summary of weather sensitivity",
  "technicalFindings": ["Finding 1", "Finding 2"],
  "efficiencyOpportunities": ["Opportunity 1", "Opportunity 2"],
  "impactOnBattery": "How weather affects battery operation strategy"
}`,
};

export default aiConfig;


