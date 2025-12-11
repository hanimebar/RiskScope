import type { RiskLevel } from "@/lib/riskScore";

interface RiskBadgeProps {
  score: number;
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
}

const levelColors: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-800 border-green-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

const sizeClasses = {
  sm: "text-sm px-2 py-1",
  md: "text-base px-3 py-1.5",
  lg: "text-2xl px-6 py-3",
};

export default function RiskBadge({ score, level, size = "md" }: RiskBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border font-semibold ${levelColors[level]} ${sizeClasses[size]}`}
    >
      <span className="font-bold">{score}</span>
      <span className="capitalize">{level}</span>
    </div>
  );
}

