import { GoogleGenAI, Type } from "@google/genai";
import { Claim, AgentType, GroundingSource, VerificationStatus, RiskLevel, ConfidenceBreakdown } from "../types";
import { SYSTEM_INSTRUCTION_EXTRACTION, AGENTS } from "../constants";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractClaimsFromArticle(articleText: string): Promise<Claim[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract claims from the following article:\n\n${articleText}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_EXTRACTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            agentId: { type: Type.STRING, enum: ['citation', 'data', 'genealogist', 'current_events', 'context', 'expert'] },
            riskLevel: { type: Type.STRING, enum: ['Critical', 'High', 'Medium', 'Low'] },
            riskTrigger: { type: Type.STRING }
          },
          required: ["text", "agentId", "riskLevel", "riskTrigger"]
        }
      }
    }
  });

  const rawClaims = JSON.parse(response.text || "[]");
  return rawClaims.map((c: any, index: number) => ({
    id: `claim-${index}`,
    text: c.text,
    agentId: c.agentId as AgentType,
    riskLevel: c.riskLevel as RiskLevel,
    riskTrigger: c.riskTrigger,
    status: 'Pending',
    confidence: 0
  }));
}

export async function verifyClaim(claim: Claim): Promise<Partial<Claim>> {
  const ai = getAI();
  const agent = AGENTS.find(a => a.id === claim.agentId);

  const prompt = `
    Verification Request for ${agent?.name}:
    Claim: "${claim.text}"
    Risk Level: ${claim.riskLevel}
    Methodology: ${agent?.methodology}
    
    INSTRUCTIONS:
    - Perform deep verification using Google Search grounding.
    - If the claim involves events in the last 6 months, search for the most recent updates.
    - Calculate confidence scores strictly using normalized values (0.00 to 1.00).

    SCORING RULES:
    1. source_score (max 0.50):
       - 0 sources: 0.00 | 1 source: 0.25 | 2 sources: 0.40 | 3+ sources: 0.50
       - Subtract 0.10 if sources are secondary/unofficial.
    2. clarity_score (max 0.30):
       - Specific/verifiable: 0.15 | Direct wording match: 0.10 | Context match: 0.05
    3. agent_certainty_score (max 0.20):
       - Methodology fully applied: 0.10 | Expected source type found: 0.05 | Complete info: 0.05
    4. contradiction_penalty (subtract):
       - 1 source contradicts: -0.20 | 2 sources: -0.35 | 3+ sources: -0.45
       - Official source contradicts: additional -0.10 (use negative numbers)

    Return JSON:
    {
      "status": "Confirmed" | "Disputed" | "Partially Accurate" | "Unverifiable" | "Outdated" | "Needs Human Review",
      "evidence": "Detailed 2-paragraph summary",
      "reasoning": "Breakdown of the decision",
      "recency_flag": boolean,
      "breakdown": {
        "source_score": number,
        "clarity_score": number,
        "agent_certainty_score": number,
        "contradiction_penalty": number
      },
      "humanReviewRequired": boolean,
      "humanReviewTrigger": string | null
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            evidence: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            recency_flag: { type: Type.BOOLEAN },
            breakdown: {
              type: Type.OBJECT,
              properties: {
                source_score: { type: Type.NUMBER },
                clarity_score: { type: Type.NUMBER },
                agent_certainty_score: { type: Type.NUMBER },
                contradiction_penalty: { type: Type.NUMBER }
              },
              required: ["source_score", "clarity_score", "agent_certainty_score", "contradiction_penalty"]
            },
            humanReviewRequired: { type: Type.BOOLEAN },
            humanReviewTrigger: { type: Type.STRING, nullable: true }
          },
          required: ["status", "evidence", "reasoning", "breakdown", "humanReviewRequired"]
        }
      },
    });

    // Fix: Correctly extract website URLs from groundingChunks as required by the SDK guidelines
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingSources: GroundingSource[] = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        uri: chunk.web.uri,
        title: chunk.web.title,
        authority: 'primary',
        accessed: new Date().toISOString().split('T')[0]
      }));

    const result = JSON.parse(response.text || "{}");
    const breakdown = result.breakdown as ConfidenceBreakdown;
    
    // Fix: Use safe access and defaults for breakdown scores
    const confidence = Math.max(0, Math.min(1, 
      (breakdown?.source_score || 0) + 
      (breakdown?.clarity_score || 0) + 
      (breakdown?.agent_certainty_score || 0) + 
      (breakdown?.contradiction_penalty || 0)
    ));
    
    return {
      status: (result.status || 'Unverifiable') as VerificationStatus,
      confidence,
      confidenceBreakdown: breakdown,
      evidence: result.evidence || "No evidence provided by verification engine.",
      reasoning: result.reasoning || "Decision reasoning missing.",
      recency_flag: !!result.recency_flag,
      humanReviewRequired: !!result.humanReviewRequired,
      humanReviewTrigger: result.humanReviewTrigger || null,
      sources: groundingSources
    };
  } catch (error) {
    console.error("Verification failed", error);
    return {
      status: 'Error',
      evidence: "Technical error during verification.",
      confidence: 0,
      sources: []
    };
  }
}