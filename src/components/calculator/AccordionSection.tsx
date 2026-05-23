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
  return (
    <div
      className={`border rounded-lg transition-colors duration-150 overflow-hidden bg-bg-elevated ${
        isOpen
          ? 'border-clay-200 shadow-level-1'
          : 'border-border-subtle hover:border-border-base'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Step Indicator */}
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-150 shrink-0
              ${
                isComplete && !isOpen
                  ? 'bg-moss-50 text-moss-700 border border-moss-100'
                  : isOpen
                    ? 'bg-clay text-white'
                    : 'bg-surface text-ink-500 border border-border-base group-hover:border-border-strong'
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
              className={`text-sm font-semibold transition-colors duration-150 ${
                isOpen ? 'text-ink-900' : 'text-ink-700 group-hover:text-ink-900'
              }`}
            >
              {title}
            </span>
            {!isOpen && summary && (
              <span className="text-xs text-ink-500 mt-0.5 truncate">
                {summary}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-ink-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-clay' : 'group-hover:text-ink-700'
          }`}
        />
      </button>

      {/* Content */}
      <div
        className={`grid transition-all duration-200 ease-out ${
          isOpen
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden min-w-0">
          <div className="border-t border-border-subtle px-4 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
