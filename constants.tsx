
import { Agent } from './types';

export const AGENTS: Agent[] = [
  {
    id: 'citation',
    name: 'Citation Archaeologist',
    description: 'Validates research claims and academic citations.',
    methodology: 'Checks if cited papers exist, confirms author accuracy, and catches retractions via DOI and academic databases.',
    icon: '📜',
    color: 'blue',
    sources: [
      'arxiv.org', 'semanticscholar.org', 'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 
      'aclanthology.org', 'paperswithcode.com', 'connectedpapers.com', 'retractionwatch.com', 
      'crossref.org', 'dblp.org', 'openreview.net', 'openai.com/research', 
      'anthropic.com/research', 'deepmind.google/research', 'ai.meta.com/research'
    ]
  },
  {
    id: 'data',
    name: 'Data Analyst',
    description: 'Verifies numbers, percentages, and industry statistics.',
    methodology: 'Confirms statistics against official reports and benchmarks. Flags misleading percentages or cherry-picked figures.',
    icon: '📊',
    color: 'indigo',
    sources: [
      'aiindex.stanford.edu', 'stateof.ai', 'oecd.ai', 'mckinsey.com', 'gartner.com', 
      'paperswithcode.com/sota', 'crfm.stanford.edu/helm', 'swe-bench.github.io', 
      'lmarena.ai', 'bls.gov', 'census.gov', 'fred.stlouisfed.org', 'data.worldbank.org', 'statista.com'
    ]
  },
  {
    id: 'genealogist',
    name: 'Claim Genealogist',
    description: 'Traces quotes and original attributions.',
    methodology: 'Verifies who actually said what by finding primary sources or official transcripts.',
    icon: '🧬',
    color: 'purple',
    sources: [
      'quoteinvestigator.com', 'wikiquote.org', 'snopes.com', 'web.archive.org', 
      'openai.com/blog', 'anthropic.com/news', 'deepmind.google/blog', 'ai.meta.com/blog',
      'lexfridman.com', '80000hours.org'
    ]
  },
  {
    id: 'current_events',
    name: 'Current Events Monitor',
    description: 'Checks recent developments and timelines.',
    methodology: 'Confirms news events and catches outdated information presented as current.',
    icon: '🌐',
    color: 'emerald',
    sources: [
      'reuters.com', 'apnews.com', 'bbc.com/news', 'npr.org', 'theverge.com/ai', 
      'wired.com/tag/artificial-intelligence', 'technologyreview.com', 'venturebeat.com/ai', 
      'techcrunch.com/category/artificial-intelligence', 'theinformation.com', 'sec.gov/edgar', 
      'federalregister.gov', 'whitehouse.gov', 'ec.europa.eu', 'nist.gov/artificial-intelligence'
    ]
  },
  {
    id: 'context',
    name: 'Context Validator',
    description: 'Detects misleading framing and omitted context.',
    methodology: 'Identifies claims that are technically true but deceptive due to missing details or false comparisons.',
    icon: '🔍',
    color: 'amber',
    sources: [
      'firstdraftnews.org', 'cyber.fsi.stanford.edu', 'poynter.org', 'mediabiasfactcheck.com', 
      'fullfact.org', 'factcheck.org', 'politifact.com', 'callingbullshit.org', 'ourworldindata.org'
    ]
  },
  {
    id: 'expert',
    name: 'Expert Consensus Synthesizer',
    description: 'Verifies "experts say" claims and consensus.',
    methodology: 'Confirms if a professional consensus actually exists or if the view is fringe.',
    icon: '⚖️',
    color: 'rose',
    sources: [
      'aiimpacts.org', 'metaculus.com', 'nationalacademies.org', 'ieee.org', 
      'partnershiponai.org', 'safe.ai', 'futureoflife.org', 'turing.ac.uk', 'aaai.org', 
      'ipcc.ch', 'who.int', 'cochranelibrary.com'
    ]
  }
];

export const SYSTEM_INSTRUCTION_EXTRACTION = `
You are the Extraction Engine for the VeriFact AI verification system.
Analyze the article and extract factual claims.
For each claim, you MUST determine the RISK LEVEL and the exact RISK TRIGGER based on these strict rules:

CRITICAL RISK — Assign when ANY of these are true:
- Claim appears in the article title or headline
- Claim appears in the first sentence of the article
- Claim is repeated 3+ times in the article
- Claim contains a specific dollar amount over $1 million
- Claim attributes a direct quote to a named public figure
- Claim asserts something is "first," "largest," "only," or similar superlative

HIGH RISK — Assign when ANY of these are true:
- Claim contains a specific percentage
- Claim contains a specific statistic or number
- Claim cites a specific study, paper, or report by name
- Claim references a specific date within the last 2 years
- Claim appears in the first paragraph (but not first sentence)
- Claim makes a cause-and-effect assertion

MEDIUM RISK — Assign when ANY of these are true:
- Claim defines a technical term
- Claim describes how something works
- Claim references a date older than 2 years
- Claim appears in the body (not first paragraph)
- Claim describes a general trend without specific numbers

LOW RISK — Assign when ALL of these are true:
- Claim is general background information
- Claim contains no specific numbers, dates, or names
- Claim appears in later paragraphs
- Claim would not change the article's conclusions if wrong
- Claim is widely known and easily verifiable

Return a JSON array of objects with 'text', 'agentId', 'riskLevel', and 'riskTrigger'.
The 'riskTrigger' should be a short string explanation like "Appears in article title" or "Contains specific percentage (67%)".
`;
