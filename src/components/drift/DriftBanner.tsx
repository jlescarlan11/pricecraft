import React from 'react';
import { TrendingUp, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DriftBannerProps {
  affectedCount: number;
  onDismiss: () => void;
}

export const DriftBanner: React.FC<DriftBannerProps> = ({
  affectedCount,
  onDismiss,
}) => {
  const navigate = useNavigate();
  if (affectedCount === 0) return null;
  return (
    <div className="flex items-center justify-between bg-clay/5 border border-clay/20 rounded-xl p-md">
      <div className="flex items-center gap-md">
        <TrendingUp className="w-5 h-5 text-clay" aria-hidden="true" />
        <p className="text-sm text-ink-900">
          {affectedCount} recipe{affectedCount === 1 ? '' : 's'} affected by recent
          price changes.
        </p>
      </div>
      <div className="flex items-center gap-sm">
        <button
          type="button"
          onClick={() => navigate('/drift')}
          className="text-sm font-medium text-clay hover:underline inline-flex items-center"
        >
          Review
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-ink-400 hover:text-ink-900"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
