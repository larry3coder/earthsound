import React, { useEffect } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { WorkspaceId } from '../../types/earthsound';

interface KeyboardNavigationProps {
  onNavigate: (workspace: WorkspaceId) => void;
  onTogglePlay: () => void;
  onTriggerUpload: () => void;
  onRepeatNarration: () => void;
  onOpenAccessibilityModal: () => void;
  onToggleVoiceNav: () => void;
}

const MODE_KEYS: Record<string, WorkspaceId> = {
  '1': WorkspaceId.EXPLORE,
  '2': WorkspaceId.STUDIO,
  '3': WorkspaceId.ANALYSIS,
  '4': WorkspaceId.LEARN,
  '5': WorkspaceId.ACCESSIBILITY,
};

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  onNavigate,
  onTogglePlay,
  onTriggerUpload,
  onRepeatNarration,
  onOpenAccessibilityModal,
  onToggleVoiceNav,
}) => {
  const { stopSpeech, speak } = useAccessibility();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        stopSpeech();
      } else if (key === 'v') {
        e.preventDefault();
        onToggleVoiceNav();
      } else if (key === 'h') {
        e.preventDefault();
        onNavigate(WorkspaceId.HOME);
        speak('Returned to Home workspace.', true);
      } else if (key === 'c') {
        e.preventDefault();
        onTriggerUpload();
      } else if (key === 'r') {
        e.preventDefault();
        onRepeatNarration();
      } else if (key === 'q') {
        e.preventDefault();
        onOpenAccessibilityModal();
      } else if (MODE_KEYS[key]) {
        e.preventDefault();
        onNavigate(MODE_KEYS[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onNavigate,
    onTogglePlay,
    onTriggerUpload,
    onRepeatNarration,
    onOpenAccessibilityModal,
    onToggleVoiceNav,
    stopSpeech,
    speak,
  ]);

  return null;
};
