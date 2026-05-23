import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

const ANIMATION_DURATION = 400;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-[500px]',
  className = '',
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync shouldRender with isOpen immediately when opening
  if (isOpen && !shouldRender) {
    setShouldRender(true);
  }

  // Handle unmounting with delay for animation
  useEffect(() => {
    if (!isOpen && shouldRender) {
      const timeoutId = setTimeout(() => setShouldRender(false), ANIMATION_DURATION);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, shouldRender]);

  // Lock body scroll
  useEffect(() => {
    if (shouldRender) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [shouldRender]);

  // Focus trap
  useEffect(() => {
    if (!shouldRender) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (!modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        handleTabKey(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Initial focus
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    } else {
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldRender, onClose]);

  if (!shouldRender) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 max-[480px]:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-ink-900/50 backdrop-blur-[2px] transition-opacity duration-200 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`
          relative z-10 flex flex-col bg-bg-elevated shadow-level-4 rounded-xl
          border border-border-subtle
          transition-[opacity,transform] duration-200 ease-out
          w-full shrink-0 max-h-[90vh]
          max-[480px]:h-full max-[480px]:max-h-none max-[480px]:rounded-none max-[480px]:border-0
          ${maxWidth} ${className}
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
          focus:outline-none
        `}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border-subtle">
          <h2
            id="modal-title"
            className="text-base font-semibold text-ink-900 leading-tight"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 p-1.5 rounded-md text-ink-400 hover:bg-surface hover:text-ink-900 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border-subtle bg-surface/30">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
