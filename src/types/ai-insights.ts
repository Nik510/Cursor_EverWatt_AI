export type SectionInsight = {
  sectionId: string;
  title: string;
  whatWeAreLookingAt: string;
  whyItMatters: string;
  engineeringFocus: string[];
  salesTalkingPoints: string[];
  recommendations?: string[];
  isGenerated: boolean;
  /**
   * ISO timestamp (string) for safe JSON transport.
   */
  generatedAt?: string;
  error?: string;
};

export type WeatherInsight = {
  summary: string;
  technicalFindings: string[];
  efficiencyOpportunities: string[];
  impactOnBattery: string;
};

