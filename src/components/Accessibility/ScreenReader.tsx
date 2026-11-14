import React from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';

/**
 * Provides NVDA / VoiceOver compatible ARIA live regions and visual-free
 * announcements synchronized with the Web Speech API.
 */
export const ScreenReader: React.FC = () => {
  const { lastAnnouncement } = useAccessibility();

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="aria-live-region">
      {lastAnnouncement}
    </div>
  );
};
