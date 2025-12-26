

import React from 'react';
import { VerificationStatus } from '../types';

export const VerificationBadge: React.FC<{ status: VerificationStatus }> = ({ status }) => {
  /* Updated mapping to strictly follow VerificationStatus union and added missing statuses */
  const variants: Record<VerificationStatus, string> = {
    'Pending': 'bg-slate-100 text-slate-500 border-slate-200',
    'Verifying': 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse',
    'Confirmed': 'bg-green-100 text-green-700 border-green-200',
    'Disputed': 'bg-red-100 text-red-700 border-red-200',
    'Partially Accurate': 'bg-amber-100 text-amber-700 border-amber-200',
    'Unverifiable': 'bg-slate-200 text-slate-500 border-slate-300',
    'Outdated': 'bg-orange-100 text-orange-700 border-orange-200',
    'Needs Human Review': 'bg-purple-100 text-purple-700 border-purple-200',
    'Error': 'bg-gray-200 text-gray-800 border-gray-300'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-widest ${variants[status]}`}>
      {status}
    </span>
  );
};