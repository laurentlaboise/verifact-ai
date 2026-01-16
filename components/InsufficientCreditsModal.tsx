import React from 'react';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  creditsNeeded: number;
  onBuyCredits: () => void;
}

export const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
  isOpen,
  onClose,
  currentCredits,
  creditsNeeded,
  onBuyCredits
}) => {
  if (!isOpen) return null;

  const shortfall = creditsNeeded - currentCredits;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Insufficient Credits
          </h2>
          <p className="text-gray-600">
            You don't have enough credits to complete this verification.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Current balance:</span>
            <span className="font-semibold text-gray-900">{currentCredits} credits</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Credits needed:</span>
            <span className="font-semibold text-gray-900">{creditsNeeded} credits</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Shortfall:</span>
              <span className="font-bold text-red-600">{shortfall} credits</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              onClose();
              onBuyCredits();
            }}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Buy Credits Now
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            💡 Tip: Subscribe to a plan for better value and never run out of credits!
          </p>
        </div>
      </div>
    </div>
  );
};
