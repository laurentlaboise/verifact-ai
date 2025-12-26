import React, { useState, useEffect, useRef } from 'react';
import { AGENTS } from './constants';
import { Claim, VerificationStatus, AgentType, AirtableExportPayload, ExecutiveSummary, VerificationMetadata } from './types';
import { extractClaimsFromArticle, verifyClaim } from './services/geminiService';
import { AgentIcon } from './components/AgentIcon';
import { VerificationBadge } from './components/VerificationBadge';

declare const pdfjsLib: any;
declare const mammoth: any;

const App: React.FC = () => {
  const [article, setArticle] = useState('');
  const [fileName, setFileName] = useState('');
  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'extracting' | 'verifying' | 'report'>('input');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activeTab, setActiveTab] = useState<AgentType | 'all'>('all');
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('verifact_webhook') || '');
  const [startTime, setStartTime] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('verifact_webhook', webhookUrl);
  }, [webhookUrl]);

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    const extension = file.name.split('.').pop()?.toLowerCase();
    try {
      if (extension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        setArticle(text);
      } else if (extension === 'docx' || extension === 'doc') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setArticle(result.value);
      } else {
        const text = await file.text();
        setArticle(text);
      }
    } catch (err) {
      console.error("Error reading file", err);
      alert("Could not extract text from file.");
    }
  };

  const startVerification = async () => {
    if (!article.trim()) return;
    setIsProcessing(true);
    setStep('extracting');
    setStartTime(Date.now());
    try {
      const extractedClaims = await extractClaimsFromArticle(article);
      setClaims(extractedClaims);
      setStep('verifying');
      const verificationPromises = extractedClaims.map(async (claim) => {
        setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: 'Verifying' } : c));
        const result = await verifyClaim(claim);
        setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, ...result } : c));
        return { ...claim, ...result };
      });
      await Promise.all(verificationPromises);
      setStep('report');
    } catch (error) {
      console.error(error);
      alert("An error occurred during verification.");
      setStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateOverallConfidence = () => {
    if (claims.length === 0) return 0;
    const total = claims.reduce((acc, c) => acc + c.confidence, 0);
    return total / claims.length;
  };

  const getRecommendation = (avgConf: number) => {
    const criticalClaims = claims.filter(c => c.riskLevel === 'Critical');
    const allCritConfirmed = criticalClaims.every(c => c.status === 'Confirmed');

    if (avgConf >= 0.85 && allCritConfirmed) return "READY TO PUBLISH";
    if (avgConf >= 0.70 && !allCritConfirmed) return "HOLD — Critical claims need attention";
    if (avgConf >= 0.50) return "REVISION RECOMMENDED — Multiple claims need verification";
    return "DO NOT PUBLISH — Significant accuracy concerns";
  };

  const getReadinessColor = (label: string) => {
    if (label === "READY TO PUBLISH") return "bg-green-600";
    if (label.startsWith("HOLD")) return "bg-red-600";
    if (label.startsWith("REVISION")) return "bg-amber-600";
    return "bg-slate-900";
  };

  const formatPayload = (): AirtableExportPayload => {
    const avgConf = calculateOverallConfidence();
    const recommendation = getRecommendation(avgConf);
    const criticalClaims = claims.filter(c => c.riskLevel === 'Critical');
    const highConfCount = claims.filter(c => c.confidence >= 0.85).length;
    const revisionCount = claims.filter(c => c.status !== 'Confirmed').length;

    const summary: ExecutiveSummary = {
      verdict: recommendation,
      critical_issues: criticalClaims.filter(c => c.status !== 'Confirmed').length,
      high_confidence_claims: highConfCount,
      claims_needing_revision: revisionCount,
      key_concerns: claims
        .filter(c => c.riskLevel === 'Critical' && c.status !== 'Confirmed')
        .map(c => `${c.text.substring(0, 50)}... flagged as ${c.status}`)
        .slice(0, 3)
    };

    const metadata: VerificationMetadata = {
      agents_used: Array.from(new Set(claims.map(c => c.agentId))),
      total_sources_consulted: claims.reduce((acc, c) => acc + (c.sources?.length || 0), 0),
      average_sources_per_claim: claims.length > 0 ? claims.reduce((acc, c) => acc + (c.sources?.length || 0), 0) / claims.length : 0,
      verification_duration_seconds: Math.floor((Date.now() - startTime) / 1000),
      knowledge_cutoff_warning: claims.some(c => c.recency_flag)
    };

    const mappedClaims = claims.map(c => ({
      claim_text: c.text,
      risk_level: c.riskLevel,
      risk_trigger: c.riskTrigger,
      confidence_score: Number(c.confidence.toFixed(2)),
      confidence_breakdown: c.confidenceBreakdown || { source_score: 0, clarity_score: 0, agent_certainty_score: 0, contradiction_penalty: 0 },
      status: c.status,
      human_review_required: !!c.humanReviewRequired,
      human_review_trigger: c.humanReviewTrigger || null,
      evidence: c.evidence || '',
      sources: c.sources || "No authoritative sources located",
      correction_needed: c.status === 'Partially Accurate' || c.status === 'Disputed' ? 'Yes' : 'No',
      recency_flag: !!c.recency_flag
    }));

    return {
      article_title: fileName || "Pasted Text",
      submission_date: new Date().toISOString(),
      total_claims: claims.length,
      claims_confirmed: claims.filter(c => c.status === 'Confirmed').length,
      claims_disputed: claims.filter(c => c.status === 'Disputed').length,
      overall_confidence: avgConf.toFixed(2),
      recommendation,
      executive_summary: summary,
      claims_by_risk: {
        critical: mappedClaims.filter(c => c.risk_level === 'Critical'),
        high: mappedClaims.filter(c => c.risk_level === 'High'),
        medium: mappedClaims.filter(c => c.risk_level === 'Medium'),
        low: mappedClaims.filter(c => c.risk_level === 'Low'),
      },
      verification_metadata: metadata,
      claims: mappedClaims
    };
  };

  const exportToJson = () => {
    const payload = formatPayload();
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    alert("JSON payload copied to clipboard.");
  };

  const sendToWebhook = async () => {
    if (!webhookUrl) {
      alert("Please set a Webhook URL in the input section first.");
      return;
    }
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatPayload())
      });
      if (response.ok) alert("Exported successfully!");
      else alert("Export failed.");
    } catch (err) {
      alert("Error sending to webhook.");
    }
  };

  const getConfidenceBar = (conf: number) => {
    const filled = Math.round(conf * 10);
    return "█".repeat(filled) + "░".repeat(10 - filled);
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep('input')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">VeriFact <span className="text-blue-600">AI</span></h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {step === 'input' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-slate-900">High-Precision Content Verification</h2>
              <p className="text-lg text-slate-600">Route claims through specialized libraries to ensure authoritative accuracy.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex border-b bg-slate-50">
                <button onClick={() => setInputTab('upload')} className={`flex-1 py-4 font-bold text-sm ${inputTab === 'upload' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Upload File</button>
                <button onClick={() => setInputTab('paste')} className={`flex-1 py-4 font-bold text-sm ${inputTab === 'paste' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Paste Text</button>
              </div>
              <div className="p-8">
                {inputTab === 'upload' ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                    {fileName ? (
                      <div>
                        <p className="text-lg font-bold">{fileName}</p>
                        <button onClick={() => {setFileName(''); setArticle('');}} className="text-red-500 text-sm font-bold">Change File</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-slate-400 text-sm">PDF, DOCX, TXT, MD</p>
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                        >
                          Choose File
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".pdf,.docx,.doc,.txt,.md"
                          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} 
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea value={article} onChange={(e) => setArticle(e.target.value)} placeholder="Paste article here..." className="w-full min-h-[300px] text-lg focus:outline-none resize-none" />
                )}
              </div>
              <div className="px-8 pb-8 pt-0 space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Configuration: Webhook URL</label>
                  <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="https://hook.make.com/..." />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{article.length} characters</span>
                  <button onClick={startVerification} disabled={!article.trim() || isProcessing} className="bg-blue-600 text-white px-10 py-4 rounded-xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">START VERIFICATION</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(step === 'extracting' || step === 'verifying') && (
          <div className="space-y-12 py-20 text-center animate-in zoom-in">
            <div className="w-24 h-24 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{step === 'extracting' ? 'EXTRACTING CLAIMS...' : 'DEEP VERIFICATION ACTIVE...'}</h2>
              <div className="max-w-md mx-auto space-y-3">
                {claims.slice(-3).map(c => (
                  <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-left shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <span className="text-sm font-medium truncate pr-4">{c.text}</span>
                    <VerificationBadge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'report' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-8">
            <div className={`rounded-[2.5rem] p-10 text-white shadow-2xl flex flex-col items-center justify-center text-center gap-6 ${getReadinessColor(getRecommendation(calculateOverallConfidence()))}`}>
              <div className="text-xs font-black opacity-90 uppercase tracking-[0.2em]">Publish Readiness Status</div>
              <h2 className="text-4xl font-black tracking-tighter">{getRecommendation(calculateOverallConfidence())}</h2>
              <div className="text-sm font-bold opacity-80 uppercase tracking-widest">Score: {(calculateOverallConfidence() * 100).toFixed(0)}%</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-200">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-8">Article Risk Profile</h3>
                <div className="space-y-6">
                  {/* Fix: Added explicit typing for the risk profile counts to prevent 'unknown' inference during mapping */}
                  {Object.entries(claims.reduce((acc, c) => ({ ...acc, [c.riskLevel]: (acc[c.riskLevel] || 0) + 1 }), {} as Record<string, number>)).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${level === 'Critical' ? 'bg-red-600' : 'bg-orange-500'}`}></div>
                        <span className="text-sm font-bold text-slate-600">{level} Claims</span>
                      </div>
                      <span className="text-lg font-black text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-200">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-8">Executive Summary</h3>
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-600">Verification took {Math.floor((Date.now() - startTime) / 1000)}s</p>
                  <p className="text-xs font-bold text-slate-600">{claims.filter(c => c.confidence >= 0.85).length} High Confidence Claims</p>
                  <p className="text-xs font-bold text-slate-600">{claims.filter(c => c.status !== 'Confirmed').length} Claims Needing Attention</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-10 bg-slate-50 border-b flex gap-8 overflow-x-auto scrollbar-hide">
                <button onClick={() => setActiveTab('all')} className={`py-5 text-sm font-black uppercase tracking-widest border-b-4 transition-all ${activeTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>All Findings</button>
                {AGENTS.map(agent => (
                  <button key={agent.id} onClick={() => setActiveTab(agent.id)} className={`py-5 text-sm font-black border-b-4 transition-all ${activeTab === agent.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{agent.icon}</button>
                ))}
              </div>
              <div className="divide-y divide-slate-100">
                {claims.filter(c => activeTab === 'all' || c.agentId === activeTab).map((claim) => (
                  <div key={claim.id} className="p-10 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-8">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex items-start gap-5">
                          <AgentIcon type={claim.agentId} size="sm" />
                          <h4 className="text-2xl font-bold text-slate-900 leading-snug tracking-tight">"{claim.text}"</h4>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <VerificationBadge status={claim.status} />
                           {claim.recency_flag && <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Live Event Flag</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Risk: {claim.riskLevel}</span>
                          </div>
                          <div className="p-4 bg-slate-100 rounded-2xl text-[13px] font-bold text-slate-700 border border-slate-200/50">
                            {claim.riskTrigger}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Confidence Breakdown</span>
                            <span className={`text-xs font-black ${claim.confidence >= 0.85 ? 'text-green-600' : 'text-blue-600'}`}>{claim.confidence.toFixed(2)}</span>
                          </div>
                          <div className="font-mono text-xs text-blue-600 tracking-[0.25em] bg-blue-50/50 p-2 rounded-lg border border-blue-100 text-center">
                            {getConfidenceBar(claim.confidence)}
                          </div>
                          {claim.confidenceBreakdown && (
                            <div className="grid grid-cols-4 gap-2 text-[8px] font-black text-slate-400 uppercase tracking-tighter text-center">
                              <div className="bg-slate-50 p-1.5 rounded-md">Src: +{claim.confidenceBreakdown.source_score.toFixed(2)}</div>
                              <div className="bg-slate-50 p-1.5 rounded-md">Clr: +{claim.confidenceBreakdown.clarity_score.toFixed(2)}</div>
                              <div className="bg-slate-50 p-1.5 rounded-md">Agt: +{claim.confidenceBreakdown.agent_certainty_score.toFixed(2)}</div>
                              <div className="bg-red-50 text-red-500 p-1.5 rounded-md">Pen: {claim.confidenceBreakdown.contradiction_penalty.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                        <div className="space-y-2">
                          <p className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-wrap">{claim.evidence}</p>
                        </div>
                        
                        {claim.humanReviewRequired && (
                          <div className="p-5 bg-red-50 border border-red-100 rounded-[1.5rem] flex items-start gap-4">
                            <span className="text-2xl mt-1">⚠️</span>
                            <div>
                              <p className="text-red-700 text-xs font-black uppercase tracking-[0.1em] mb-1">Human Review Triggered</p>
                              <p className="text-red-600 text-[13px] font-medium leading-snug">{claim.humanReviewTrigger}</p>
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                          {claim.sources?.map((s, i) => (
                            <a key={i} href={s.uri} target="_blank" className="bg-slate-50 text-slate-500 px-4 py-2 rounded-xl text-[11px] font-bold border border-slate-200 uppercase hover:text-blue-600 transition-all flex items-center gap-2">
                              {s.title.substring(0, 30)}... ({s.authority})
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => { setStep('input'); setClaims([]); }} className="font-black text-slate-400 hover:text-slate-900 uppercase text-xs tracking-[0.2em] transition-colors">← NEW ARTICLE</button>
              <div className="flex gap-4">
                <button onClick={exportToJson} className="bg-white border-2 border-slate-200 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-colors">Copy JSON Report</button>
                <button onClick={sendToWebhook} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95">EXPORT REPORT</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;