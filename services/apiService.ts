const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Auth token management
let authToken: string | null = localStorage.getItem('verifact_auth_token');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('verifact_auth_token', token);
  } else {
    localStorage.removeItem('verifact_auth_token');
  }
};

export const getAuthToken = () => authToken;

// Generic API request wrapper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Request failed',
      message: response.statusText
    }));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// Auth API
export const authAPI = {
  signup: async (email: string, password: string, name: string) => {
    const response = await apiRequest<{
      user: any;
      token: string;
      message: string;
    }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setAuthToken(response.token);
    return response;
  },

  login: async (email: string, password: string) => {
    const response = await apiRequest<{
      user: any;
      token: string;
      message: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(response.token);
    return response;
  },

  logout: async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  getProfile: async () => {
    return apiRequest<{ user: any }>('/api/auth/me');
  },

  updateProfile: async (name: string) => {
    return apiRequest<{ user: any; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },
};

// Credits API
export const creditsAPI = {
  getBalance: async () => {
    return apiRequest<{
      credits: number;
      subscription: any;
      verificationsCount: number;
      claimsVerifiedCount: number;
    }>('/api/credits/balance');
  },

  checkCredits: async (creditsRequired: number) => {
    return apiRequest<{
      hasEnoughCredits: boolean;
      currentBalance: number;
      creditsRequired: number;
      shortfall: number;
    }>('/api/credits/check', {
      method: 'POST',
      body: JSON.stringify({ creditsRequired }),
    });
  },

  deductCredits: async (
    credits: number,
    verificationId: string,
    claimsVerified: number,
    articleName: string
  ) => {
    return apiRequest<{
      message: string;
      creditsDeducted: number;
      newBalance: number;
      claimsVerified: number;
      totalClaimsVerified: number;
    }>('/api/credits/deduct', {
      method: 'POST',
      body: JSON.stringify({
        credits,
        verificationId,
        claimsVerified,
        articleName,
      }),
    });
  },

  getTransactions: async (page = 1, limit = 20, type?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type }),
    });
    return apiRequest<{
      transactions: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/api/credits/transactions?${params}`);
  },

  getStats: async () => {
    return apiRequest<{
      currentBalance: number;
      subscription: any;
      verificationsCount: number;
      claimsVerifiedCount: number;
      totalCreditsPurchased: number;
      totalMoneySpent: number;
      totalCreditsSpent: number;
      averageCreditsPerVerification: number;
    }>('/api/credits/stats');
  },
};

// Verification API
export const verificationAPI = {
  start: async (articleName: string, articleText: string, estimatedClaims: number) => {
    return apiRequest<{
      message: string;
      verificationId: string;
      status: string;
    }>('/api/verification/start', {
      method: 'POST',
      body: JSON.stringify({ articleName, articleText, estimatedClaims }),
    });
  },

  update: async (
    id: string,
    data: {
      claims?: any[];
      status?: string;
      overallConfidence?: number;
      recommendation?: string;
      processingTime?: number;
    }
  ) => {
    return apiRequest<{
      message: string;
      verification: any;
    }>(`/api/verification/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  get: async (id: string) => {
    return apiRequest<{ verification: any }>(`/api/verification/${id}`);
  },

  getAll: async (page = 1, limit = 10, status?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    return apiRequest<{
      verifications: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/api/verification?${params}`);
  },

  delete: async (id: string) => {
    return apiRequest<{ message: string }>(`/api/verification/${id}`, {
      method: 'DELETE',
    });
  },
};

// Stripe API
export const stripeAPI = {
  getPricing: async () => {
    return apiRequest<{
      subscriptions: any;
      creditPacks: any;
    }>('/api/stripe/pricing');
  },

  createCheckoutSession: async (
    plan: string,
    billing: 'monthly' | 'annual',
    type: 'subscription' | 'payment' = 'subscription'
  ) => {
    return apiRequest<{
      sessionId: string;
      url: string;
    }>('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ plan, billing, type }),
    });
  },

  cancelSubscription: async () => {
    return apiRequest<{
      message: string;
      subscription: any;
    }>('/api/stripe/cancel-subscription', {
      method: 'POST',
    });
  },
};
