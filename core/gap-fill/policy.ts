export interface GapFillPolicyConfig {
  maxOperationsForAutoApply: number;
  maxReplacementLinesForAutoApply: number;
}

export const DEFAULT_GAP_FILL_POLICY: GapFillPolicyConfig = {
  maxOperationsForAutoApply: 3,
  maxReplacementLinesForAutoApply: 12,
};
