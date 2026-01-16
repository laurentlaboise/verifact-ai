import React, { useState } from 'react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: string, billing: 'monthly' | 'annual') => void;
  currentCredits: number;
}

const PRICING_TIERS = {
  standard: {
    name: 'Standard Plan',
    credits: 100,
    monthlyPrice: 5,
    annualPrice: 51,
    description: 'Best Value',
    features: [
      '100 verification credits/month',
      'Access to all 5 verification agents',
      'Export reports',
      'Email support'
    ]
  },
  pro: {
    name: 'Pro Plan',
    credits: 750,
    monthlyPrice: 185,
    annualPrice: 1887,
    description: 'For Heavy Users',
    features: [
      '750 verification credits/month',
      'Priority processing',
      'Advanced analytics',
      'API access',
      'Priority support'
    ]
  },
  team: {
    name: 'Team Plan',
    credits: 1250,
    monthlyPrice: 285,
    annualPrice: 2907,
    description: 'For Organizations',
    features: [
      '1250 verification credits/month',
      'Team collaboration',
      'Custom workflows',
      'Dedicated account manager',
      'SLA guarantee'
    ]
  }
};

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  currentCredits
}) => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountCode, setDiscountCode] = useState('');

  if (!isOpen) return null;

  const handleSelectPlan = (plan: string) => {
    onSelectPlan(plan, billing);
  };

  const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
    const monthlyCost = monthlyPrice * 12;
    const savings = monthlyCost - annualPrice;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return { savings, percentage };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
            <p className="text-gray-600 mt-1">
              You currently have <span className="font-semibold text-blue-600">{currentCredits} credits</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Billing Toggle */}
        <div className="px-8 py-6 bg-gray-50">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                billing === 'monthly'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                billing === 'annual'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Annually
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PRICING_TIERS).map(([key, tier]) => {
            const price = billing === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
            const savings = billing === 'annual' ? calculateSavings(tier.monthlyPrice, tier.annualPrice) : null;
            const isRecommended = key === 'standard';

            return (
              <div
                key={key}
                className={`relative bg-white border-2 rounded-xl p-6 flex flex-col ${
                  isRecommended
                    ? 'border-blue-500 shadow-xl scale-105'
                    : 'border-gray-200 hover:border-blue-300'
                } transition-all`}
              >
                {isRecommended && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      BEST VALUE
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">${price}</span>
                    <span className="text-gray-500 ml-2">
                      /{billing === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {billing === 'annual' && savings && (
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      Save ${savings.savings}/year ({savings.percentage}% off)
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <p className="text-center text-2xl font-bold text-blue-600 mb-4">
                    {tier.credits} credits/month
                  </p>
                </div>

                <ul className="space-y-3 mb-6 flex-grow">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(key)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isRecommended
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  Upgrade to {tier.name}
                </button>
              </div>
            );
          })}
        </div>

        {/* Discount Code Section */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
          {!showDiscountInput ? (
            <button
              onClick={() => setShowDiscountInput(true)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm mx-auto block"
            >
              🎉 Get Discount Code (75% off promotion for Google AI Futures Fund)
            </button>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="Enter discount code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    // Handle discount code application
                    alert('Discount code functionality coming soon!');
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Apply
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Special promotion for Google AI Futures Fund participants
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-white border-t border-gray-200 text-center text-sm text-gray-500">
          All plans include access to VeriFact AI's fact verification technology
        </div>
      </div>
    </div>
  );
};
