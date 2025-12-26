
import React from 'react';
import { AgentType } from '../types';
import { AGENTS } from '../constants';

export const AgentIcon: React.FC<{ type: AgentType, size?: 'sm' | 'md' | 'lg' }> = ({ type, size = 'md' }) => {
  const agent = AGENTS.find(a => a.id === type);
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-3xl'
  };

  const bgColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold ${bgColors[agent?.color || 'blue']} border-2 border-white shadow-sm`}>
      {agent?.icon || '🤖'}
    </div>
  );
};
