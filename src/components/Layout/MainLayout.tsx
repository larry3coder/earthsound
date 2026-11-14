import React from 'react';
import { WorkspaceId } from '../../types/earthsound';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (workspace: WorkspaceId) => void;
  onOpenAccessibility: () => void;
  onOpenTutorial: () => void;
  activeTrackTitle: string;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  onOpenAccessibility,
  onOpenTutorial,
  activeTrackTitle,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      <a href="#main-workspace" className="skip-link">
        Skip to main workspace
      </a>

      <Header
        onOpenAccessibility={onOpenAccessibility}
        onOpenTutorial={onOpenTutorial}
        activeTrackTitle={activeTrackTitle}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        <Sidebar
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={onSelectWorkspace}
        />

        <main
          id="main-workspace"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden"
        >
          {children}
        </main>
      </div>

      <footer className="border-t border-sky-500/15 bg-[#060913] px-6 py-4 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p>
          EarthSound is an independent participant project utilizing open NASA Earth Observation and SVS data.
        </p>
        <p className="font-mono text-slate-500">
          WCAG AAA Accessible · Caldwell 73 Sonification Engine
        </p>
      </footer>
    </div>
  );
};
