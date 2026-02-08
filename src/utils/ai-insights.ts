/**
 * AI Insights Generation
 * Analyzes energy data and generates actionable insights and recommendations
 */

import type { RegressionAnalysisResult, AggregatedDataPoint } from './regression-analysis';

export interface AIInsight {
  id: string;
  category: 'pattern' | 'anomaly' | 'opportunity' | 'risk' | 'recommendation';
  severity: 'info' | 'warning' | 'success' | 'critical';
  title: string;
  description: string;
  impact?: string;
  action?: string;
  data?: Record<string, any>;
}

export interface TechnologyRecommendation {
  id: string;
  technology: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSavings: { min: number; max: number };
  paybackYears: { min: number; max: number };
  description: string;
  reasons: string[];
  nextSteps: string[];
}

export interface UsageMetrics {
  avgDailyUsage: number;
  avgMonthlyUsage: number;
  peakDemand: number;
  avgDemand: number;
  loadFactor: number;
  peakToAverageRatio: number;
  seasonalVariation: number;
  baseload: number;
  coolingLoad: number;
  heatingLoad: number;
  weatherSensitivity: number;
}

/**
 * Calculate comprehensive usage metrics
 */
export function calculateUsageMetrics(
  aggregatedData: AggregatedDataPoint[],
  regressionResult: RegressionAnalysisResult
): UsageMetrics {
  const usages = aggregatedData.map(d => d.totalUsage);
  const demands = aggregatedData.map(d => d.maxDemand);
  const avgDemands = aggregatedData.map(d => d.avgDemand);
  
  const totalUsage = usages.reduce((a, b) => a + b, 0);
  const avgMonthlyUsage = totalUsage / Math.max(1, aggregatedData.length);
  const avgDailyUsage = avgMonthlyUsage / 30; // Approximate
  
  const peakDemand = Math.max(...demands);
  const avgDemand = avgDemands.reduce((a, b) => a + b, 0) / avgDemands.length;
  
  // Load factor = average demand / peak demand (higher is better, means more consistent usage)
  const loadFactor = peakDemand > 0 ? avgDemand / peakDemand : 0;
  
  // Peak to average ratio (lower is better)
  const peakToAverageRatio = avgDemand > 0 ? peakDemand / avgDemand : 0;
  
  // Seasonal variation (std dev / mean)
  const meanUsage = usages.reduce((a, b) => a + b, 0) / usages.length;
  const variance = usages.reduce((sum, u) => sum + (u - meanUsage) ** 2, 0) / usages.length;
  const stdDev = Math.sqrt(variance);
  const seasonalVariation = meanUsage > 0 ? stdDev / meanUsage : 0;
  
  // Extract from regression
  const baseload = regressionResult.baseload;
  const coolingLoad = regressionResult.coolingSlope > 0 ? 
    regressionResult.coolingSlope * aggregatedData.reduce((sum, d) => sum + d.coolingDegreeDays, 0) : 0;
  const heatingLoad = regressionResult.heatingSlope > 0 ?
    regressionResult.heatingSlope * aggregatedData.reduce((sum, d) => sum + d.heatingDegreeDays, 0) : 0;
  
  // Weather sensitivity (R² of temperature regression)
  const weatherSensitivity = regressionResult.temperatureRegression.rSquared;
  
  return {
    avgDailyUsage,
    avgMonthlyUsage,
    peakDemand,
    avgDemand,
    loadFactor,
    peakToAverageRatio,
    seasonalVariation,
    baseload,
    coolingLoad,
    heatingLoad,
    weatherSensitivity,
  };
}

/**
 * Generate AI-powered insights from analysis data
 */
export function generateInsights(
  metrics: UsageMetrics,
  regressionResult: RegressionAnalysisResult,
  aggregatedData: AggregatedDataPoint[]
): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // Load Factor Analysis
  if (metrics.loadFactor < 0.3) {
    insights.push({
      id: 'low-load-factor',
      category: 'opportunity',
      severity: 'warning',
      title: 'Low Load Factor Detected',
      description: `Your load factor is ${(metrics.loadFactor * 100).toFixed(1)}%, indicating significant demand spikes relative to average usage. This creates high demand charges.`,
      impact: 'You may be paying 30-50% more in demand charges than necessary.',
      action: 'Consider battery storage for peak shaving or load shifting strategies.',
      data: { loadFactor: metrics.loadFactor },
    });
  } else if (metrics.loadFactor > 0.6) {
    insights.push({
      id: 'good-load-factor',
      category: 'pattern',
      severity: 'success',
      title: 'Excellent Load Factor',
      description: `Your load factor of ${(metrics.loadFactor * 100).toFixed(1)}% indicates consistent, efficient energy usage patterns.`,
      impact: 'Your demand charges are well-optimized relative to your usage.',
      data: { loadFactor: metrics.loadFactor },
    });
  }
  
  // Peak Demand Analysis
  if (metrics.peakToAverageRatio > 2.5) {
    insights.push({
      id: 'high-peak-ratio',
      category: 'risk',
      severity: 'critical',
      title: 'High Peak Demand Spikes',
      description: `Peak demand is ${metrics.peakToAverageRatio.toFixed(1)}x your average demand. These spikes significantly increase your utility costs.`,
      impact: `Estimated excess demand charges: $${((metrics.peakDemand - metrics.avgDemand * 1.5) * 20 * 12).toLocaleString()}/year`,
      action: 'Battery storage or demand response can reduce peak by 20-40%.',
      data: { peakToAverageRatio: metrics.peakToAverageRatio, peakDemand: metrics.peakDemand },
    });
  }
  
  // Weather Sensitivity Analysis
  if (metrics.weatherSensitivity > 0.7) {
    insights.push({
      id: 'high-weather-sensitivity',
      category: 'pattern',
      severity: 'info',
      title: 'Strong Weather Correlation',
      description: `${(metrics.weatherSensitivity * 100).toFixed(0)}% of your energy usage is explained by temperature, indicating significant HVAC load.`,
      impact: 'Weather-driven usage creates predictable but variable costs.',
      action: 'HVAC optimization, building envelope improvements, or thermal storage could reduce weather-sensitive load.',
      data: { weatherSensitivity: metrics.weatherSensitivity },
    });
  } else if (metrics.weatherSensitivity < 0.3) {
    insights.push({
      id: 'low-weather-sensitivity',
      category: 'pattern',
      severity: 'info',
      title: 'Process-Dominated Load Profile',
      description: `Only ${(metrics.weatherSensitivity * 100).toFixed(0)}% of usage correlates with temperature. Your facility has significant process or baseload consumption.`,
      impact: 'Consistent baseload offers good opportunities for rate optimization.',
      action: 'Consider time-of-use rate optimization or on-site generation.',
      data: { weatherSensitivity: metrics.weatherSensitivity },
    });
  }
  
  // Baseload Analysis
  if (metrics.baseload > 0) {
    const baseloadPercent = (metrics.baseload / metrics.avgMonthlyUsage) * 100;
    if (baseloadPercent > 60) {
      insights.push({
        id: 'high-baseload',
        category: 'opportunity',
        severity: 'info',
        title: 'Significant Baseload Consumption',
        description: `Approximately ${baseloadPercent.toFixed(0)}% of your energy is weather-independent baseload (${metrics.baseload.toLocaleString()} kWh).`,
        impact: 'High baseload suggests 24/7 equipment or significant standby consumption.',
        action: 'Audit for phantom loads, inefficient equipment, or unnecessary always-on systems.',
        data: { baseload: metrics.baseload, baseloadPercent },
      });
    }
  }
  
  // Seasonal Variation
  if (metrics.seasonalVariation > 0.4) {
    insights.push({
      id: 'high-seasonal-variation',
      category: 'pattern',
      severity: 'warning',
      title: 'High Seasonal Variation',
      description: `Your energy usage varies significantly by season (${(metrics.seasonalVariation * 100).toFixed(0)}% coefficient of variation).`,
      impact: 'Peak summer/winter months may have bills 50%+ higher than shoulder months.',
      action: 'Consider seasonal rate plans or demand response programs.',
      data: { seasonalVariation: metrics.seasonalVariation },
    });
  }
  
  // Model Quality Insight
  const { cvrmse, nmbe } = regressionResult.statistics;
  if (cvrmse < 15 && Math.abs(nmbe) < 5) {
    insights.push({
      id: 'excellent-model-fit',
      category: 'pattern',
      severity: 'success',
      title: 'Highly Predictable Energy Pattern',
      description: `Your energy model has excellent accuracy (CV-RMSE: ${cvrmse.toFixed(1)}%, NMBE: ${nmbe.toFixed(1)}%).`,
      impact: 'Predictable patterns enable accurate savings projections for efficiency projects.',
      data: { cvrmse, nmbe },
    });
  } else if (cvrmse > 25) {
    insights.push({
      id: 'variable-usage',
      category: 'anomaly',
      severity: 'warning',
      title: 'Variable Usage Patterns',
      description: `Your energy usage shows high variability (CV-RMSE: ${cvrmse.toFixed(1)}%), suggesting irregular operations or unmeasured variables.`,
      impact: 'Savings projections may have wider uncertainty ranges.',
      action: 'Consider sub-metering to identify variable loads.',
      data: { cvrmse, nmbe },
    });
  }
  
  // Trend Analysis
  if (aggregatedData.length >= 6) {
    const firstHalf = aggregatedData.slice(0, Math.floor(aggregatedData.length / 2));
    const secondHalf = aggregatedData.slice(Math.floor(aggregatedData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.totalUsage, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.totalUsage, 0) / secondHalf.length;
    
    const trendPercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (trendPercent > 10) {
      insights.push({
        id: 'increasing-trend',
        category: 'risk',
        severity: 'warning',
        title: 'Increasing Energy Trend',
        description: `Energy usage has increased ${trendPercent.toFixed(0)}% over the analysis period.`,
        impact: `If trend continues, expect ${(trendPercent / 2).toFixed(0)}% higher annual costs.`,
        action: 'Investigate causes: expansion, equipment degradation, or operational changes.',
        data: { trendPercent },
      });
    } else if (trendPercent < -10) {
      insights.push({
        id: 'decreasing-trend',
        category: 'pattern',
        severity: 'success',
        title: 'Decreasing Energy Trend',
        description: `Energy usage has decreased ${Math.abs(trendPercent).toFixed(0)}% over the analysis period.`,
        impact: 'Positive trend suggests successful efficiency measures or reduced operations.',
        data: { trendPercent },
      });
    }
  }
  
  return insights;
}

/**
 * Generate technology recommendations based on analysis
 */
export function generateRecommendations(
  metrics: UsageMetrics,
  regressionResult: RegressionAnalysisResult,
  insights: AIInsight[]
): TechnologyRecommendation[] {
  const recommendations: TechnologyRecommendation[] = [];
  
  // Battery Storage Recommendation
  if (metrics.peakToAverageRatio > 1.8 || metrics.loadFactor < 0.5) {
    const peakReductionPotential = metrics.peakDemand * 0.25; // 25% reduction potential
    const annualSavingsMin = peakReductionPotential * 15 * 12; // $15/kW demand rate
    const annualSavingsMax = peakReductionPotential * 25 * 12; // $25/kW demand rate
    
    recommendations.push({
      id: 'battery-storage',
      technology: 'Battery Energy Storage',
      icon: '🔋',
      priority: metrics.peakToAverageRatio > 2.5 ? 'high' : 'medium',
      estimatedSavings: { min: annualSavingsMin, max: annualSavingsMax },
      paybackYears: { min: 4, max: 8 },
      description: 'Commercial battery storage for peak demand reduction and demand charge management.',
      reasons: [
        `Peak demand of ${metrics.peakDemand.toFixed(0)} kW is ${metrics.peakToAverageRatio.toFixed(1)}x your average demand`,
        `Estimated ${(peakReductionPotential).toFixed(0)} kW peak reduction potential`,
        'Qualifies for SGIP incentives and potential S-Rate benefits',
      ],
      nextSteps: [
        'Run Battery Calculator for detailed sizing',
        'Request battery vendor quotes',
        'Evaluate S-Rate qualification',
      ],
    });
  }
  
  // HVAC Optimization
  if (metrics.weatherSensitivity > 0.5 && (metrics.coolingLoad > 0 || metrics.heatingLoad > 0)) {
    const hvacSavingsPotential = (metrics.coolingLoad + metrics.heatingLoad) * 0.20; // 20% savings potential
    const annualSavingsMin = hvacSavingsPotential * 0.15; // $0.15/kWh
    const annualSavingsMax = hvacSavingsPotential * 0.25;
    
    recommendations.push({
      id: 'hvac-optimization',
      technology: 'HVAC Optimization',
      icon: '❄️',
      priority: metrics.weatherSensitivity > 0.7 ? 'high' : 'medium',
      estimatedSavings: { min: annualSavingsMin, max: annualSavingsMax },
      paybackYears: { min: 2, max: 5 },
      description: 'Optimize HVAC systems through upgrades, controls, and operational improvements.',
      reasons: [
        `${(metrics.weatherSensitivity * 100).toFixed(0)}% of usage is weather-correlated`,
        'High potential for VFD, chiller, or controls upgrades',
        'Building automation improvements can reduce 15-30% of HVAC energy',
      ],
      nextSteps: [
        'Conduct HVAC audit',
        'Evaluate chiller/boiler efficiency',
        'Consider demand-controlled ventilation',
      ],
    });
  }
  
  // Lighting Retrofit
  if (metrics.baseload > metrics.avgMonthlyUsage * 0.3) {
    const lightingSavingsEstimate = metrics.baseload * 0.15; // 15% of baseload from lighting
    const annualSavingsMin = lightingSavingsEstimate * 0.15 * 12;
    const annualSavingsMax = lightingSavingsEstimate * 0.20 * 12;
    
    recommendations.push({
      id: 'lighting-retrofit',
      technology: 'LED Lighting Retrofit',
      icon: '💡',
      priority: 'medium',
      estimatedSavings: { min: annualSavingsMin, max: annualSavingsMax },
      paybackYears: { min: 1, max: 3 },
      description: 'Upgrade to LED lighting with smart controls for significant energy and maintenance savings.',
      reasons: [
        'LED retrofits typically reduce lighting energy 40-70%',
        'Reduced maintenance costs from longer lamp life',
        'Improved light quality and occupant comfort',
      ],
      nextSteps: [
        'Conduct lighting audit',
        'Evaluate occupancy sensors and daylight harvesting',
        'Check utility rebate availability',
      ],
    });
  }
  
  // Demand Response
  if (metrics.peakDemand > 100) {
    recommendations.push({
      id: 'demand-response',
      technology: 'Demand Response Program',
      icon: '⚡',
      priority: metrics.peakDemand > 200 ? 'high' : 'low',
      estimatedSavings: { min: metrics.peakDemand * 50, max: metrics.peakDemand * 100 },
      paybackYears: { min: 0, max: 1 },
      description: 'Participate in utility demand response programs for direct payments during grid events.',
      reasons: [
        `${metrics.peakDemand.toFixed(0)} kW peak qualifies for DR programs`,
        'No capital investment required',
        'Typical payments of $50-100/kW/year',
      ],
      nextSteps: [
        'Evaluate load flexibility',
        'Contact utility about DR programs',
        'Consider Auto-DR capable controls',
      ],
    });
  }
  
  // Solar PV
  if (metrics.avgDailyUsage > 100) {
    const solarCapacity = Math.min(metrics.peakDemand * 0.8, metrics.avgDailyUsage / 4);
    const annualProduction = solarCapacity * 1600; // 1600 kWh/kW in CA
    const annualSavingsMin = annualProduction * 0.12;
    const annualSavingsMax = annualProduction * 0.18;
    
    recommendations.push({
      id: 'solar-pv',
      technology: 'Solar PV System',
      icon: '☀️',
      priority: 'medium',
      estimatedSavings: { min: annualSavingsMin, max: annualSavingsMax },
      paybackYears: { min: 5, max: 10 },
      description: 'On-site solar generation to reduce grid purchases and lock in energy costs.',
      reasons: [
        `Estimated ${solarCapacity.toFixed(0)} kW system capacity potential`,
        'Federal ITC and state incentives available',
        'Hedge against rising utility rates',
      ],
      nextSteps: [
        'Assess roof/ground space availability',
        'Get solar feasibility study',
        'Evaluate PPA vs purchase options',
      ],
    });
  }
  
  // Rate Optimization
  recommendations.push({
    id: 'rate-optimization',
    technology: 'Rate Schedule Optimization',
    icon: '📊',
    priority: 'medium',
    estimatedSavings: { min: metrics.avgMonthlyUsage * 0.01 * 12, max: metrics.avgMonthlyUsage * 0.05 * 12 },
    paybackYears: { min: 0, max: 0 },
    description: 'Analyze current rate schedule and evaluate alternatives for potential savings.',
    reasons: [
      'Many customers are on suboptimal rate schedules',
      'TOU rate optimization can yield 5-15% savings',
      'No cost to switch rate schedules',
    ],
    nextSteps: [
      'Compare current vs alternative rates',
      'Evaluate B-19/B-20 options',
      'Consider S-Rate if adding battery',
    ],
  });
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return recommendations;
}

/**
 * Generate executive summary
 */
export function generateExecutiveSummary(
  metrics: UsageMetrics,
  regressionResult: RegressionAnalysisResult,
  insights: AIInsight[],
  recommendations: TechnologyRecommendation[]
): string {
  const criticalInsights = insights.filter(i => i.severity === 'critical' || i.severity === 'warning');
  const opportunities = insights.filter(i => i.category === 'opportunity');
  const topRecommendations = recommendations.filter(r => r.priority === 'high');
  
  const totalSavingsPotentialMin = recommendations.reduce((sum, r) => sum + r.estimatedSavings.min, 0);
  const totalSavingsPotentialMax = recommendations.reduce((sum, r) => sum + r.estimatedSavings.max, 0);
  
  let summary = `## Executive Summary\n\n`;
  
  summary += `### Energy Profile Overview\n`;
  summary += `- **Average Monthly Usage:** ${metrics.avgMonthlyUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh\n`;
  summary += `- **Peak Demand:** ${metrics.peakDemand.toFixed(0)} kW\n`;
  summary += `- **Load Factor:** ${(metrics.loadFactor * 100).toFixed(1)}%\n`;
  summary += `- **Weather Sensitivity:** ${(metrics.weatherSensitivity * 100).toFixed(0)}%\n\n`;
  
  summary += `### Model Quality\n`;
  summary += `- **R²:** ${(regressionResult.temperatureRegression.rSquared * 100).toFixed(1)}%\n`;
  summary += `- **CV(RMSE):** ${regressionResult.statistics.cvrmse.toFixed(1)}% ${regressionResult.statistics.cvrmse < 25 ? '✓' : '✗'}\n`;
  summary += `- **NMBE:** ${regressionResult.statistics.nmbe.toFixed(1)}% ${Math.abs(regressionResult.statistics.nmbe) < 10 ? '✓' : '✗'}\n\n`;
  
  if (criticalInsights.length > 0) {
    summary += `### Key Findings\n`;
    criticalInsights.forEach(i => {
      summary += `- **${i.title}:** ${i.description}\n`;
    });
    summary += `\n`;
  }
  
  if (topRecommendations.length > 0) {
    summary += `### Priority Recommendations\n`;
    topRecommendations.forEach(r => {
      summary += `- **${r.technology}:** $${r.estimatedSavings.min.toLocaleString()}-${r.estimatedSavings.max.toLocaleString()}/year potential\n`;
    });
    summary += `\n`;
  }
  
  summary += `### Total Savings Opportunity\n`;
  summary += `**$${totalSavingsPotentialMin.toLocaleString()} - $${totalSavingsPotentialMax.toLocaleString()} per year**\n\n`;
  
  return summary;
}
