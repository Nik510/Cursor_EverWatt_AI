/**
 * Energy Efficiency Measures Training Data
 * Structured content for LLM context and AI insights generation
 * Based on ASHRAE standards, utility programs, and industry best practices
 */

export interface EEMeasure {
  id: string;
  category: 'battery' | 'hvac' | 'lighting' | 'motors' | 'envelope' | 'controls' | 'process';
  name: string;
  description: string;
  technicalDetails: string[];
  salesHooks: string[];
  engineeringFocus: string[];
  typicalSavings: {
    percentRange: [number, number];
    paybackYearsRange: [number, number];
  };
  ashraeReferences?: string[];
  keyMetrics: string[];
  redFlags: string[];
  bestPractices: string[];
}

export interface AnalysisSectionContext {
  sectionId: string;
  sectionName: string;
  whatToLookFor: string[];
  engineeringInsights: string[];
  salesTalkingPoints: string[];
  commonIssues: string[];
  benchmarks: Record<string, string>;
}

/**
 * Battery/Storage specific EE measures
 */
export const batteryMeasures: EEMeasure[] = [
  {
    id: 'peak-shaving',
    category: 'battery',
    name: 'Peak Demand Shaving',
    description: 'Battery storage system that discharges during peak demand periods to reduce maximum kW draw from the grid, directly reducing demand charges.',
    technicalDetails: [
      'Optimal sizing typically targets 20-40% peak reduction',
      'Battery should be sized to cover full peak event duration (typically 2-4 hours)',
      'Round-trip efficiency of 85-95% for lithium-ion systems',
      'C-rate of 0.5-1.0 typical for peak shaving applications',
      'State of Charge management between 10-90% extends battery life',
      'Peak detection algorithms use 15-minute averaging to match utility billing',
    ],
    salesHooks: [
      'Demand charges often represent 30-50% of commercial electric bills',
      'Shaving 100 kW at $20/kW saves $24,000/year with no operational changes',
      'Battery provides backup power capability as bonus',
      'Qualifies for SGIP incentives reducing upfront cost by 25-35%',
      'Locks in savings regardless of future rate increases',
    ],
    engineeringFocus: [
      'Analyze 15-minute interval data to identify peak patterns',
      'Calculate load factor to determine peak shaving potential',
      'Size battery power (kW) to target threshold, capacity (kWh) for duration',
      'Consider degradation in long-term financial modeling (2-3%/year)',
      'Evaluate electrical infrastructure for battery interconnection',
    ],
    typicalSavings: {
      percentRange: [15, 40],
      paybackYearsRange: [4, 8],
    },
    ashraeReferences: ['ASHRAE 90.1 Appendix G', 'ASHRAE Guideline 14'],
    keyMetrics: [
      'Peak demand reduction (kW)',
      'Load factor improvement',
      'Demand charge savings ($/month)',
      'Cycles per year',
      'Round-trip efficiency',
    ],
    redFlags: [
      'Load factor already above 60% - limited peak shaving benefit',
      'Peak events shorter than 15 minutes - may not affect billing',
      'Multiple peaks per day - may exceed battery capacity',
      'Demand charges below $10/kW - weak economics',
    ],
    bestPractices: [
      'Always analyze full year of interval data before sizing',
      'Include demand charge escalation in financial projections',
      'Consider time-of-use rate optimization alongside peak shaving',
      'Plan for battery degradation over project lifetime',
    ],
  },
  {
    id: 'energy-arbitrage',
    category: 'battery',
    name: 'Energy Arbitrage',
    description: 'Charge battery during low-cost off-peak periods and discharge during high-cost on-peak periods to capture rate differential.',
    technicalDetails: [
      'Requires significant on-peak/off-peak rate differential (>$0.10/kWh)',
      'Daily cycling increases battery degradation',
      'Net savings = (on-peak rate - off-peak rate) × kWh discharged × efficiency - degradation cost',
      'Best combined with peak shaving for stacked value',
    ],
    salesHooks: [
      'Make money from your battery every day, not just during peaks',
      'TOU rate differentials are increasing as utilities push demand response',
      'Automated systems optimize charge/discharge without operator intervention',
    ],
    engineeringFocus: [
      'Model TOU rate structure with battery dispatch optimization',
      'Account for round-trip efficiency losses (5-15%)',
      'Balance arbitrage cycling with peak shaving reserves',
      'Consider battery warranty cycle limitations',
    ],
    typicalSavings: {
      percentRange: [5, 15],
      paybackYearsRange: [6, 12],
    },
    keyMetrics: [
      'Rate differential ($/kWh)',
      'Daily discharge capacity (kWh)',
      'Efficiency losses',
      'Incremental cycles per year',
    ],
    redFlags: [
      'Rate differential less than $0.08/kWh - inefficiency losses eat savings',
      'High cycling may void battery warranty',
      'Complex TOU schedules may reduce optimization potential',
    ],
    bestPractices: [
      'Always prioritize peak shaving value over arbitrage',
      'Use predictive algorithms to optimize daily strategy',
      'Monitor battery health metrics to detect accelerated degradation',
    ],
  },
];

/**
 * HVAC-related EE measures
 */
export const hvacMeasures: EEMeasure[] = [
  {
    id: 'chiller-optimization',
    category: 'hvac',
    name: 'Chiller Plant Optimization',
    description: 'Optimize chiller staging, sequencing, and setpoints to reduce cooling energy while maintaining comfort.',
    technicalDetails: [
      'Chillers operate most efficiently at 60-80% load',
      'Chilled water reset can save 2-4% per degree of setpoint increase',
      'Condenser water temperature optimization tied to wet bulb conditions',
      'VFD on chilled water pumps enables significant pump energy savings',
      'Proper chiller staging avoids low-load inefficiency',
    ],
    salesHooks: [
      'Chillers are often the single largest electric load in commercial buildings',
      'Optimization typically yields 10-20% cooling energy savings with minimal capital',
      'Improved efficiency reduces demand charges during hot afternoons',
      'Modern controls can be installed without replacing equipment',
    ],
    engineeringFocus: [
      'Calculate current kW/ton and compare to design efficiency',
      'Review staging sequence for optimal loading',
      'Analyze condenser approach temperatures for fouling indicators',
      'Evaluate reset strategies based on actual load profiles',
    ],
    typicalSavings: {
      percentRange: [10, 25],
      paybackYearsRange: [1, 4],
    },
    ashraeReferences: ['ASHRAE 90.1', 'ASHRAE Guideline 14'],
    keyMetrics: [
      'kW/ton at various loads',
      'Part-load efficiency curves',
      'Condenser approach temperature',
      'Chilled water differential',
    ],
    redFlags: [
      'kW/ton above 1.0 indicates significant inefficiency',
      'Constant speed pumps waste energy at part load',
      'Fixed setpoints miss reset opportunities',
    ],
    bestPractices: [
      'Trend chiller performance data continuously',
      'Implement demand-based reset strategies',
      'Coordinate chiller, tower, and pump operation',
    ],
  },
  {
    id: 'vfd-retrofit',
    category: 'hvac',
    name: 'Variable Frequency Drive Retrofit',
    description: 'Install VFDs on fans and pumps to enable variable speed operation matching actual load requirements.',
    technicalDetails: [
      'Affinity laws: power varies with cube of speed (50% speed = 12.5% power)',
      'Typical HVAC systems operate at 50-70% load on average',
      'VFD efficiency typically 95-97% at full speed',
      'Harmonics mitigation may be required for sensitive equipment',
      'Minimum speed limits prevent motor overheating',
    ],
    salesHooks: [
      'VFDs often provide 30-50% energy savings on fans and pumps',
      'Payback typically under 2 years with utility incentives',
      'Soft start extends motor and belt life',
      'Reduced noise from slower operation improves occupant comfort',
    ],
    engineeringFocus: [
      'Survey existing motor inventory for VFD candidates',
      'Prioritize constant-volume systems with variable load',
      'Verify motor compatibility with VFD operation',
      'Size VFD for full load amps with service factor',
    ],
    typicalSavings: {
      percentRange: [25, 50],
      paybackYearsRange: [1, 3],
    },
    keyMetrics: [
      'Operating hours at each speed',
      'Power draw at part load vs full load',
      'Motor efficiency at reduced speed',
    ],
    redFlags: [
      'Motors already at end of life - consider premium efficiency replacement',
      'Very short operating hours limit savings potential',
      'Process requiring constant flow reduces VFD benefit',
    ],
    bestPractices: [
      'Install VFDs in conjunction with demand-based controls',
      'Ensure proper motor cable length and shielding',
      'Commission with trending to verify savings',
    ],
  },
];

/**
 * Analysis section contexts for AI insight generation
 */
export const analysisSectionContexts: AnalysisSectionContext[] = [
  {
    sectionId: 'site-overview',
    sectionName: 'Site Overview',
    whatToLookFor: [
      'Customer name and site address establish the project scope',
      'Rate code determines applicable demand charges and TOU periods',
      'Service provider indicates available incentive programs',
      'Date range shows seasonality coverage in the data',
    ],
    engineeringInsights: [
      'Verify rate code matches actual tariff for accurate savings calculations',
      'Check for any pending rate changes that could affect project economics',
      'Confirm service address matches meter location for solar/storage siting',
    ],
    salesTalkingPoints: [
      'Reference specific site details to demonstrate thorough analysis',
      'Mention any rate optimization opportunities beyond battery storage',
      'Highlight how long the data covers to validate seasonal patterns',
    ],
    commonIssues: [
      'Rate code mismatch between bill and meter data',
      'Incomplete data periods missing summer or winter peaks',
      'Multiple meters requiring aggregated analysis',
    ],
    benchmarks: {
      'dataQuality': '95%+ data completeness is ideal',
      'dataCoverage': '12 months minimum for valid seasonal analysis',
    },
  },
  {
    sectionId: 'interval-data-summary',
    sectionName: 'Interval Data Summary',
    whatToLookFor: [
      'Total data points indicates measurement granularity',
      'Days covered shows temporal scope of analysis',
      'Interval resolution affects peak detection accuracy',
      'Missing data percentage impacts analysis reliability',
    ],
    engineeringInsights: [
      '15-minute data aligns with utility demand measurement intervals',
      'Missing data above 5% may skew peak analysis',
      'Hourly data may miss short-duration peaks',
      'Check for meter resets or zero readings indicating issues',
    ],
    salesTalkingPoints: [
      'Emphasize comprehensive data analysis backing recommendations',
      'Highlight data quality to build confidence in projections',
      'Note if data covers peak demand seasons (summer typically)',
    ],
    commonIssues: [
      'Gaps in data during peak periods',
      'Inconsistent interval lengths',
      'Zero readings requiring investigation',
    ],
    benchmarks: {
      'missingData': 'Under 2% is excellent, 2-5% acceptable, over 5% requires attention',
      'resolution': '15-minute intervals match utility billing',
    },
  },
  {
    sectionId: 'demand-statistics',
    sectionName: 'Demand Statistics',
    whatToLookFor: [
      'Peak demand drives demand charges - primary target for reduction',
      'Average demand indicates typical operating level',
      'Load factor shows demand volatility and peak shaving potential',
      'Minimum demand suggests baseload that battery cannot reduce',
    ],
    engineeringInsights: [
      'Load factor below 40% indicates excellent peak shaving opportunity',
      'Peak-to-average ratio above 2.0 suggests significant demand spikes',
      'High baseload may indicate opportunities for efficiency measures',
      'Compare peak to connected load for demand diversity insights',
    ],
    salesTalkingPoints: [
      'Low load factor means customer is paying for capacity they rarely use',
      'Each kW of peak reduction saves $X per month at their rate',
      'Battery can flatten the peaks to reduce demand charges significantly',
    ],
    commonIssues: [
      'Single extreme peak skewing annual analysis',
      'Peaks driven by equipment startup rather than normal operations',
      'Load factor already high limiting peak shaving benefit',
    ],
    benchmarks: {
      'loadFactor': 'Below 40% = excellent opportunity, 40-60% = good, above 60% = limited',
      'peakToAverage': 'Above 2.5x indicates significant peak spikes',
    },
  },
  {
    sectionId: 'demand-profile',
    sectionName: 'Demand Profile Chart',
    whatToLookFor: [
      'Annual demand pattern shows seasonal variations',
      'Peak events above threshold are battery discharge opportunities',
      'Clustering of peaks indicates predictable patterns',
      'Baseline trend shows typical operating demand',
    ],
    engineeringInsights: [
      'Identify if peaks are seasonal (summer AC) or consistent year-round',
      'Count peak events to estimate battery cycling requirements',
      'Look for correlating factors (temperature, production schedule)',
      'Note duration of peak events for battery sizing',
    ],
    salesTalkingPoints: [
      'Visual clearly shows when demand spikes occur',
      'Battery would "shave" everything above the threshold line',
      'Predictable patterns mean reliable, consistent savings',
    ],
    commonIssues: [
      'Unpredictable peaks are harder to capture with battery',
      'Very frequent peaks may exceed battery capacity',
      'Long-duration peaks require larger battery capacity',
    ],
    benchmarks: {
      'peakEvents': '10-50 events/year is ideal for battery sizing',
      'peakDuration': '1-4 hours is optimal for cost-effective battery sizing',
    },
  },
  {
    sectionId: 'peak-event-analysis',
    sectionName: 'Peak Event Analysis',
    whatToLookFor: [
      'Number of events determines annual battery cycling',
      'Longest duration sizes minimum battery capacity needed',
      'Peak event energy shows total kWh battery must supply',
      'Hourly distribution reveals when peaks typically occur',
    ],
    engineeringInsights: [
      'Size battery capacity for 95th percentile event, not maximum',
      'Check if peaks cluster at certain hours (2-6 PM typical)',
      'Correlate with TOU periods for combined value analysis',
      'Account for battery recharge time between events',
    ],
    salesTalkingPoints: [
      'X events per year means the battery works this many times to save money',
      'Most peaks occur during afternoon TOU on-peak periods',
      'Battery can handle the typical peaks with capacity to spare',
    ],
    commonIssues: [
      'Back-to-back peaks may not allow full recharge',
      'Morning peaks may occur before solar charging',
      'Very long peaks require expensive oversizing',
    ],
    benchmarks: {
      'cyclesPerYear': '100-300 cycles typical for peak shaving',
      'peakClusterHours': 'Peaks during 2-6 PM align with TOU on-peak',
    },
  },
  {
    sectionId: 'tou-distribution',
    sectionName: 'Time-of-Use Distribution',
    whatToLookFor: [
      'On-peak vs off-peak kWh distribution affects energy charges',
      'Monthly demand pattern shows seasonal variation',
      'Weekday vs weekend comparison indicates operational patterns',
    ],
    engineeringInsights: [
      'High on-peak consumption increases arbitrage value',
      'Shifting load to off-peak hours can complement battery storage',
      'Weekend patterns may indicate baseload vs operational load',
    ],
    salesTalkingPoints: [
      'Customer uses X% of energy during expensive on-peak hours',
      'Battery can shift high-cost on-peak consumption to off-peak',
      'Combined demand and energy savings maximize ROI',
    ],
    commonIssues: [
      'Already low on-peak usage limits arbitrage benefit',
      'Process loads cannot be shifted to off-peak',
    ],
    benchmarks: {
      'onPeakPercent': 'Above 30% on-peak indicates arbitrage opportunity',
      'rateSpread': 'On-peak/off-peak differential above $0.10/kWh needed for arbitrage',
    },
  },
  {
    sectionId: 'battery-recommendations',
    sectionName: 'Battery Recommendations',
    whatToLookFor: [
      'Top recommended batteries ranked by composite score',
      'Power rating (kW) sized to target threshold',
      'Capacity (kWh) sized for peak event duration',
      'Payback period indicates project attractiveness',
    ],
    engineeringInsights: [
      'Verify recommended power matches peak reduction target',
      'Check capacity provides adequate duration for typical peaks',
      'Compare across manufacturers for technology diversity',
      'Review warranty terms relative to projected cycling',
    ],
    salesTalkingPoints: [
      'These specific batteries were selected for this site\'s load profile',
      'Payback of X years means positive cash flow from year Y forward',
      'Annual savings of $X continue for 10+ years after payback',
    ],
    commonIssues: [
      'Undersized battery limits achievable savings',
      'Oversized battery has poor economics',
      'Short warranty relative to payback period',
    ],
    benchmarks: {
      'paybackYears': 'Under 6 years is good, under 4 years is excellent',
      'warrantyVsPayback': 'Warranty should exceed payback by 2+ years',
    },
  },
  {
    sectionId: 'weather-correlation',
    sectionName: 'Weather Correlation Analysis',
    whatToLookFor: [
      'R-squared indicates how much usage is explained by temperature',
      'Cooling slope shows kWh per cooling degree day',
      'Heating slope shows kWh per heating degree day',
      'Baseload is temperature-independent consumption',
    ],
    engineeringInsights: [
      'High R-squared (>0.7) indicates weather-driven load - good for prediction',
      'Steep cooling slope suggests HVAC optimization opportunities',
      'High baseload may indicate process or 24/7 equipment',
      'Use regression for M&V baseline development per ASHRAE 14',
    ],
    salesTalkingPoints: [
      'X% of energy use is driven by weather - predictable and manageable',
      'HVAC optimization could reduce weather-sensitive load by Y%',
      'Stable baseload provides consistent savings potential',
    ],
    commonIssues: [
      'Low R-squared means factors beyond weather drive consumption',
      'Missing weather data reduces model accuracy',
      'Change points not captured in linear model',
    ],
    benchmarks: {
      'rSquared': 'Above 0.7 is good for weather-normalized baseline',
      'cvRmse': 'Below 25% meets ASHRAE 14 requirements',
      'nmbe': 'Within ±10% meets ASHRAE 14 requirements',
    },
  },
];

/**
 * Get all EE measures for a category
 */
export function getMeasuresByCategory(category: EEMeasure['category']): EEMeasure[] {
  return [...batteryMeasures, ...hvacMeasures].filter(m => m.category === category);
}

/**
 * Get context for a specific analysis section
 */
export function getSectionContext(sectionId: string): AnalysisSectionContext | undefined {
  return analysisSectionContexts.find(s => s.sectionId === sectionId);
}

/**
 * Get all training content for LLM context
 */
export function getAllTrainingContent(): string {
  const measures = [...batteryMeasures, ...hvacMeasures];
  
  let content = '# Energy Efficiency Measures Reference\n\n';
  
  for (const measure of measures) {
    content += `## ${measure.name}\n`;
    content += `${measure.description}\n\n`;
    content += `### Technical Details\n`;
    measure.technicalDetails.forEach(d => content += `- ${d}\n`);
    content += `\n### Sales Hooks\n`;
    measure.salesHooks.forEach(h => content += `- ${h}\n`);
    content += `\n### Engineering Focus\n`;
    measure.engineeringFocus.forEach(e => content += `- ${e}\n`);
    content += `\n### Key Metrics\n`;
    measure.keyMetrics.forEach(m => content += `- ${m}\n`);
    content += `\n### Red Flags\n`;
    measure.redFlags.forEach(r => content += `- ${r}\n`);
    content += `\n### Best Practices\n`;
    measure.bestPractices.forEach(b => content += `- ${b}\n`);
    content += '\n---\n\n';
  }
  
  content += '\n# Analysis Section Guidance\n\n';
  
  for (const section of analysisSectionContexts) {
    content += `## ${section.sectionName}\n\n`;
    content += `### What to Look For\n`;
    section.whatToLookFor.forEach(w => content += `- ${w}\n`);
    content += `\n### Engineering Insights\n`;
    section.engineeringInsights.forEach(e => content += `- ${e}\n`);
    content += `\n### Sales Talking Points\n`;
    section.salesTalkingPoints.forEach(s => content += `- ${s}\n`);
    content += `\n### Benchmarks\n`;
    Object.entries(section.benchmarks).forEach(([k, v]) => content += `- ${k}: ${v}\n`);
    content += '\n---\n\n';
  }
  
  return content;
}


