import React, { useState, useId, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

interface Coords {
  top: number;
  left: number;
  position: 'top' | 'right' | 'bottom' | 'left';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position: preferredPosition = 'top',
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const calculatePosition = useCallback((pos: 'top' | 'right' | 'bottom' | 'left'): Coords => {
    if (!triggerRef.current) return { top: 0, left: 0, position: pos };

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // We need to know the tooltip dimensions to adjust positioning
    // Since it might not be rendered yet, we use a placeholder or wait for render
    // For now, we'll calculate based on trigger and use CSS for centering

    let top = 0;
    let left = 0;

    switch (pos) {
      case 'top':
        top = triggerRect.top + scrollY;
        left = triggerRect.left + scrollX + triggerRect.width / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY;
        left = triggerRect.left + scrollX + triggerRect.width / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + triggerRect.height / 2;
        left = triggerRect.left + scrollX;
        break;
      case 'right':
        top = triggerRect.top + scrollY + triggerRect.height / 2;
        left = triggerRect.right + scrollX;
        break;
    }

    return { top, left, position: pos };
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !isVisible) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalPos = preferredPosition;

    // Basic boundary detection and flipping
    if (preferredPosition === 'top' && triggerRect.top < 100) {
      finalPos = 'bottom';
    } else if (preferredPosition === 'bottom' && viewportHeight - triggerRect.bottom < 100) {
      finalPos = 'top';
    } else if (preferredPosition === 'left' && triggerRect.left < 150) {
      finalPos = 'right';
    } else if (preferredPosition === 'right' && viewportWidth - triggerRect.right < 150) {
      finalPos = 'left';
    }

    setCoords(calculatePosition(finalPos));
  }, [calculatePosition, isVisible, preferredPosition]);

  const showTooltip = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);

      // Force position update immediately
      if (triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let finalPos = preferredPosition;

        // Basic boundary detection and flipping
        if (preferredPosition === 'top' && triggerRect.top < 100) {
          finalPos = 'bottom';
        } else if (preferredPosition === 'bottom' && viewportHeight - triggerRect.bottom < 100) {
          finalPos = 'top';
        } else if (preferredPosition === 'left' && triggerRect.left < 150) {
          finalPos = 'right';
        } else if (preferredPosition === 'right' && viewportWidth - triggerRect.right < 150) {
          finalPos = 'left';
        }

        setCoords(calculatePosition(finalPos));
      }
    }, delay);
  };

  const hideTooltip = () => {
    clearTimeout(timeoutRef.current);
    setIsAnimating(false);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setCoords(null);
    }, 150); // Match fade-out duration
  };

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        hideTooltip();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible]);

  const handleTriggerClick = () => {
    if (isVisible) {
      hideTooltip();
    } else {
      showTooltip();
    }
  };

  const getTooltipStyles = () => {
    if (!coords) return { opacity: 0 };

    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      top: `${coords.top}px`,
      left: `${coords.left}px`,
      transform: '',
      transition: isAnimating
        ? 'opacity 200ms ease-in-out, transform 200ms ease-in-out'
        : 'opacity 150ms ease-in-out, transform 150ms ease-in-out',
      opacity: isAnimating ? 1 : 0,
    };

    switch (coords.position) {
      case 'top':
        baseStyles.transform = `translate(-50%, calc(-100% - 10px)) ${isAnimating ? 'scale(1)' : 'scale(0.95)'}`;
        break;
      case 'bottom':
        baseStyles.transform = `translate(-50%, 10px) ${isAnimating ? 'scale(1)' : 'scale(0.95)'}`;
        break;
      case 'left':
        baseStyles.transform = `translate(calc(-100% - 10px), -50%) ${isAnimating ? 'scale(1)' : 'scale(0.95)'}`;
        break;
      case 'right':
        baseStyles.transform = `translate(10px, -50%) ${isAnimating ? 'scale(1)' : 'scale(0.95)'}`;
        break;
    }

    return baseStyles;
  };

  const getArrowStyles = () => {
    if (!coords) return {};

    const arrowSize = 6;
    const styles: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    const arrowColor = '#1a1815'; // matches --color-ink-900
    switch (coords.position) {
      case 'top':
        styles.bottom = `-${arrowSize}px`;
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        styles.borderWidth = `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`;
        styles.borderColor = `${arrowColor} transparent transparent transparent`;
        break;
      case 'bottom':
        styles.top = `-${arrowSize}px`;
        styles.left = '50%';
        styles.transform = 'translateX(-50%)';
        styles.borderWidth = `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`;
        styles.borderColor = `transparent transparent ${arrowColor} transparent`;
        break;
      case 'left':
        styles.right = `-${arrowSize}px`;
        styles.top = '50%';
        styles.transform = 'translateY(-50%)';
        styles.borderWidth = `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`;
        styles.borderColor = `transparent transparent transparent ${arrowColor}`;
        break;
      case 'right':
        styles.left = `-${arrowSize}px`;
        styles.top = '50%';
        styles.transform = 'translateY(-50%)';
        styles.borderWidth = `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`;
        styles.borderColor = `transparent ${arrowColor} transparent transparent`;
        break;
    }

    return styles;
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={handleTriggerClick}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {React.cloneElement(
          children as React.ReactElement,
          {
            'aria-describedby': isVisible ? tooltipId : undefined,
          } as Record<string, unknown>
        )}
      </div>

      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none z-[9999] w-max max-w-[240px] whitespace-normal break-words rounded-md bg-ink-900 px-2.5 py-1.5 text-xs font-sans leading-snug text-bg-elevated shadow-level-3"
            style={getTooltipStyles()}
          >
            {content}
            <div style={getArrowStyles()} aria-hidden="true" />
          </div>,
          document.body
        )}
    </>
  );
};
