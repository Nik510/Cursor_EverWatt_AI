export type ClaimsPolicyStatusV1 = 'ALLOW' | 'LIMITED' | 'BLOCK';

export type ClaimsPolicyAllowedClaimsV1 = {
  canClaimAnnualUsdSavings: boolean;
  canClaimDemandSavings: boolean;
  canRecommendTariffSwitch: boolean;
  canRecommendBatterySizing: boolean;
  canClaimEmissionsAvoided: boolean;
};

export type ClaimsPolicyRequiredNextDataItemV1 = { code: string; label: string };

export type ClaimsPolicyV1 = {
  status: ClaimsPolicyStatusV1;
  /** Deterministically sorted. Bounded. */
  blockedReasons: string[];
  /** Fixed key set, always present. */
  allowedClaims: ClaimsPolicyAllowedClaimsV1;
  /** Deterministically sorted/bounded. */
  requiredNextData: ClaimsPolicyRequiredNextDataItemV1[];
};

