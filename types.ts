
export type AgentType = 
  | 'citation' 
  | 'data' 
  | 'genealogist' 
  | 'current_events' 
  | 'context' 
  | 'expert';

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  methodology: string;
  icon: string;
  color: string;
  sources: string[];
}

export type VerificationStatus = 
  | 'Pending' 
  | 'Verifying' 
  | 'Confirmed' 
  | 'Disputed' 
  | 'Partially Accurate'
  | 'Unverifiable'
  | 'Outdated'
  | 'Needs Human Review'
  | 'Error';

export interface GroundingSource {
  uri: string;
  title: string;
  accessed?: string;
  authority?: 'primary' | 'secondary' | 'unknown';
}

export interface ConfidenceBreakdown {
  source_score: number;
  clarity_score: number;
  agent_certainty_score: number;
  contradiction_penalty: number;
}

export interface Claim {
  id: string;
  text: string;
  agentId: AgentType;
  status: VerificationStatus;
  confidence: number; // 0.00 to 1.00
  confidenceBreakdown?: ConfidenceBreakdown;
  riskLevel: RiskLevel;
  riskTrigger: string;
  evidence?: string;
  sources?: GroundingSource[];
  reasoning?: string;
  humanReviewRequired?: boolean;
  humanReviewTrigger?: string;
  recency_flag?: boolean;
}

export interface AirtableExportClaim {
  claim_text: string;
  risk_level: string;
  risk_trigger: string;
  confidence_score: number;
  confidence_breakdown: ConfidenceBreakdown;
  status: string;
  human_review_required: boolean;
  human_review_trigger: string | null;
  evidence: string;
  sources: GroundingSource[] | string;
  correction_needed: string;
  recency_flag: boolean;
}

export interface ExecutiveSummary {
  verdict: string;
  critical_issues: number;
  high_confidence_claims: number;
  claims_needing_revision: number;
  key_concerns: string[];
}

export interface VerificationMetadata {
  agents_used: string[];
  total_sources_consulted: number;
  average_sources_per_claim: number;
  verification_duration_seconds: number;
  knowledge_cutoff_warning: boolean;
}

export interface AirtableExportPayload {
  article_title: string;
  submission_date: string;
  total_claims: number;
  claims_confirmed: number;
  claims_disputed: number;
  overall_confidence: string;
  recommendation: string;
  executive_summary: ExecutiveSummary;
  claims_by_risk: {
    critical: AirtableExportClaim[];
    high: AirtableExportClaim[];
    medium: AirtableExportClaim[];
    low: AirtableExportClaim[];
  };
  verification_metadata: VerificationMetadata;
  claims: AirtableExportClaim[]; // Flattened for compatibility
}
