import type { RiskSignal } from "@/types";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export function calculateRiskScore(signals: RiskSignal[]): {
  score: number;
  level: RiskLevel;
} {
  // sum severity, cap at 100
  const raw = signals.reduce((sum, s) => sum + (s.severity ?? 0), 0);
  const score = Math.max(0, Math.min(100, raw));

  let level: RiskLevel = "low";
  if (score > 70) level = "critical";
  else if (score > 40) level = "high";
  else if (score > 20) level = "medium";
  return { score, level };
}

