import React from 'react';

export const SkeletonTable = ({ rows = 10, cols = 6 }) => {
  return (
    <div className="w-full overflow-hidden bg-white rounded-2xl animate-fade-in">
      <div className="space-y-4 p-6">
        {/* Header Skeleton */}
        <div className="flex gap-4 border-b border-slate-100 pb-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-slate-100 rounded-md flex-1" />
          ))}
        </div>
        
        {/* Rows Skeleton */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2 border-b border-slate-50 last:border-0 items-center">
            {Array.from({ length: cols }).map((_, j) => (
              <div 
                key={j} 
                className="h-8 bg-slate-50 rounded-lg flex-1 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
};

export default SkeletonTable;
