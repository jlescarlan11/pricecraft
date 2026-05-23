import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Single shimmering rectangle. Width/height controlled via className. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`rounded bg-surface-strong animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
};

interface SkeletonRowProps {
  cols?: number;
  className?: string;
}

/** A row of skeleton cells for table loading states. */
export const SkeletonRow: React.FC<SkeletonRowProps> = ({
  cols = 4,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={
            i === 0 ? 'h-4 w-1/3' : i === cols - 1 ? 'h-4 w-16 ml-auto' : 'h-4 w-20'
          }
        />
      ))}
    </div>
  );
};

/** Skeleton placeholder for a list of cards or list items. */
export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="card p-4 flex items-center gap-3"
        >
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
};
