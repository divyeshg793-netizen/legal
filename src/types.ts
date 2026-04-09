export type RiskLevel = "Low" | "Medium" | "High";

export interface RiskClause {
  clause: string;
  level: RiskLevel;
  description: string;
}

export interface AnalysisResult {
  docTitle?: string;
  compareDocTitle?: string;
  summary: string;
  risks: RiskClause[];
  riskLevel: RiskLevel;
  trustScore: number;
  decision: "Safe to Accept" | "Review Carefully" | "High Risk – Avoid";
  translation?: string | null;
  compareResult?: {
    summary: string;
    risks: RiskClause[];
    riskLevel: RiskLevel;
    trustScore: number;
    decision: string;
    diffSummary: string;
  };
}

export interface TeamMember {
  name: string;
  role: string;
  image?: string;
}
