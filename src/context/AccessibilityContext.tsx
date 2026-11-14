import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AccessibilityMode } from '../types/earthsound';
import { toneEngine } from '../utils/toneEngine';

export interface AccessibilityState {
  mode: AccessibilityMode;
  highContrast: boolean;
  textSize: number; // default 18px
  autoReadResults: boolean;
  reducedMotion: boolean;
  simplifiedUi: boolean;
  soundEffects: boolean;
  isSpeaking: boolean;
  lastAnnouncement: string;
}

interface AccessibilityContextValue extends AccessibilityState {
  setMode: (mode: AccessibilityMode) => void;
  setHighContrast: (enabled: boolean) => void;
  setTextSize: (px: number) => void;
  setAutoReadResults: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setSimplifiedUi: (enabled: boolean) => void;
  setSoundEffects: (enabled: boolean) => void;
  speak: (text: string, interrupt?: boolean) => void;
  stopSpeech: () => void;
  announce: (text: string, speakIfAuto?: boolean) => void;
  playUiCue: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AccessibilityMode>(AccessibilityMode.STANDARD);
  const [highContrast, setHighContrastState] = useState<boolean>(false);
  const [textSize, setTextSizeState] = useState<number>(18);
  const [autoReadResults, setAutoReadResults] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [simplifiedUi, setSimplifiedUi] = useState<boolean>(false);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [lastAnnouncement, setLastAnnouncement] = useState<string>(
    'EarthSound initialized. Standard mode active.'
  );

  // Respect system prefers-reduced-motion on first load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true);
    }
  }, []);

  // Apply CSS root classes & font-size variable cleanly
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--es-font-size', `${textSize}px`);

    if (highContrast || mode === AccessibilityMode.HIGH_CONTRAST) {
      root.classList.add('es-high-contrast');
    } else {
      root.classList.remove('es-high-contrast');
    }

    if (mode === AccessibilityMode.LOW_VISION) {
      root.classList.add('es-low-vision');
    } else {
      root.classList.remove('es-low-vision');
    }

    if (reducedMotion) {
      root.classList.add('es-reduced-motion');
    } else {
      root.classList.remove('es-reduced-motion');
    }
  }, [mode, highContrast, textSize, reducedMotion]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, interrupt: boolean = true) => {
      setLastAnnouncement(text);
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        if (interrupt) {
          window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    []
  );

  const announce = useCallback(
    (text: string, speakIfAuto: boolean = true) => {
      setLastAnnouncement(text);
      if (speakIfAuto && (autoReadResults || mode === AccessibilityMode.AUDIO_NAV)) {
        speak(text, true);
      }
    },
    [autoReadResults, mode, speak]
  );

  const playUiCue = useCallback(() => {
    if (soundEffects) {
      void toneEngine.playUiConfirmChime();
    }
  }, [soundEffects]);

  const setMode = useCallback(
    (nextMode: AccessibilityMode) => {
      setModeState(nextMode);
      if (nextMode === AccessibilityMode.STANDARD) {
        setHighContrastState(false);
        setTextSizeState(18);
        setSimplifiedUi(false);
        setAutoReadResults(false);
      } else if (nextMode === AccessibilityMode.HIGH_CONTRAST) {
        setHighContrastState(true);
      } else if (nextMode === AccessibilityMode.LOW_VISION) {
        setTextSizeState(22);
        setSimplifiedUi(true);
      } else if (nextMode === AccessibilityMode.AUDIO_NAV) {
        setAutoReadResults(true);
        setSoundEffects(true);
        speak(
          'Audio Navigation Mode active. Use Space to play or pause sonification, S to stop speech, and keys 1 through 5 to switch workspaces.',
          true
        );
      }
      setLastAnnouncement(`Interface mode switched to ${nextMode.replace('_', ' ')}.`);
    },
    [speak]
  );

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    if (enabled) {
      setModeState(AccessibilityMode.HIGH_CONTRAST);
    } else if (mode === AccessibilityMode.HIGH_CONTRAST) {
      setModeState(AccessibilityMode.STANDARD);
    }
  }, [mode]);

  const setTextSize = useCallback((px: number) => {
    setTextSizeState(Math.max(14, Math.min(26, px)));
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        mode,
        highContrast,
        textSize,
        autoReadResults,
        reducedMotion,
        simplifiedUi,
        soundEffects,
        isSpeaking,
        lastAnnouncement,
        setMode,
        setHighContrast,
        setTextSize,
        setAutoReadResults,
        setReducedMotion,
        setSimplifiedUi,
        setSoundEffects,
        speak,
        stopSpeech,
        announce,
        playUiCue,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return ctx;
}
