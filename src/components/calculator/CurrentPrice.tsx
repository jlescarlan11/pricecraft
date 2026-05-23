import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { Input, Button, Card } from '../shared';

interface CurrentPriceProps {
  value?: number;
  onChange: (value?: number) => void;
  error?: string;
  embedded?: boolean;
}

export const CurrentPrice: React.FC<CurrentPriceProps> = ({
  value,
  onChange,
  error,
  embedded = false,
}) => {
  const [isVisible, setIsVisible] = useState(value !== undefined && value > 0);

  const toggleVisibility = () => {
    if (isVisible) {
      // Clear value when hiding to avoid accidental price comparison
      onChange(undefined);
    }
    setIsVisible(!isVisible);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange(isNaN(val) ? undefined : val);
  };

  if (embedded) {
    return (
      <div className="space-y-2" data-testid="current-price-section">
        <div className="flex items-center justify-between">
          <h4 className="label-caps">Current price</h4>
          <Button variant="ghost" size="sm" onClick={toggleVisibility}>
            {isVisible ? 'Hide' : 'Compare'}
            {isVisible ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </Button>
        </div>
        {isVisible && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <Input
              label="Current selling price"
              hideLabel
              type="number"
              value={value ?? ''}
              onChange={handleInputChange}
              currency
              placeholder="0.00"
              error={error}
              min={0}
              step="0.01"
              autoFocus
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-clay shrink-0" />
            <h3 className="text-sm font-semibold text-ink-900">Current price</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleVisibility}>
            <span>{isVisible ? 'Hide' : 'Compare'}</span>
            {isVisible ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {isVisible && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <Input
              label="Current selling price"
              type="number"
              value={value ?? ''}
              onChange={handleInputChange}
              currency
              placeholder="0.00"
              error={error}
              helperText="See how your current price compares."
              min={0}
              step="0.01"
            />
          </div>
        )}
      </div>
    </Card>
  );
};
