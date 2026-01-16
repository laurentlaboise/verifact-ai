import React from 'react';

interface CreditBadgeProps {
  credits: number;
  onClick: () => void;
}

export const CreditBadge: React.FC<CreditBadgeProps> = ({ credits, onClick }) => {
  const isLow = credits < 10;
  const isCritical = credits === 0;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${
        isCritical
          ? 'bg-red-600 text-white animate-pulse'
          : isLow
          ? 'bg-amber-500 text-white'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
      title="Click to buy more credits"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="text-sm">
        {credits} {credits === 1 ? 'credit' : 'credits'}
      </span>
      {isCritical && (
        <span className="text-xs bg-white text-red-600 px-2 py-0.5 rounded-full font-bold">
          OUT
        </span>
      )}
      {isLow && !isCritical && (
        <span className="text-xs bg-white text-amber-600 px-2 py-0.5 rounded-full font-bold">
          LOW
        </span>
      )}
    </button>
  );
};
