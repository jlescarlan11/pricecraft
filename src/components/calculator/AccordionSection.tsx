import React from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  stepNumber: number;
  isOpen: boolean;
  isComplete: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  summary?: string;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  stepNumber,
  isOpen,
  isComplete,
  onToggle,
  children,
  summary,
}) => {
  const contentId = React.useId();

  return (
    <div
      className={`border-x-0 border-t-0 border-b rounded-none transition-colors duration-150 overflow-hidden bg-bg-elevated ${
        isOpen
          ? 'border-ink-900 shadow-none'
          : 'border-border-subtle hover:border-border-base'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-0 py-4 text-left focus:outline-none group"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Step Indicator */}
          <div
            className={`w-8 h-8 rounded-none flex items-center justify-center font-mono text-[10px] font-medium transition-colors duration-150 shrink-0 border
              ${
                isComplete && !isOpen
                  ? 'bg-surface text-ink-900 border-border-base'
                  : isOpen
                    ? 'bg-ink-900 text-signal border-ink-900'
                    : 'bg-transparent text-ink-500 border-border-base group-hover:border-ink-900'
              }
            `}
          >
            {isComplete && !isOpen ? (
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            ) : (
              stepNumber
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span
              className={`text-sm font-medium transition-colors duration-150 ${
                isOpen ? 'text-ink-900' : 'text-ink-700 group-hover:text-ink-900'
              }`}
            >
              {title}
            </span>
            {!isOpen && summary && (
              <span className="font-mono text-[10px] text-ink-500 mt-0.5 truncate">
                {summary}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-ink-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-ink-900' : 'group-hover:text-ink-700'
          }`}
        />
      </button>

      {/* Content */}
      <div
        id={contentId}
        role="region"
        aria-label={`${title} section`}
        hidden={!isOpen}
        className={isOpen ? 'animate-in fade-in duration-150' : undefined}
      >
        <div className="border-t border-border-subtle px-0 py-5">
          {children}
        </div>
      </div>
    </div>
  );
};
