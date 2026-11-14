import React from 'react';
import {
  Accessibility,
  BarChart3,
  BookOpen,
  Globe2,
  Home,
  Sliders,
} from 'lucide-react';
import { WorkspaceId } from '../../types/earthsound';
import { useAccessibility } from '../../context/AccessibilityContext';

interface SidebarProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (workspace: WorkspaceId) => void;
}

const NAV_ITEMS: Array<{
  id: WorkspaceId;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: WorkspaceId.HOME, label: 'Home', shortcut: 'H', icon: Home },
  { id: WorkspaceId.EXPLORE, label: 'Explore Map', shortcut: '1', icon: Globe2 },
  { id: WorkspaceId.STUDIO, label: 'Audio Studio', shortcut: '2', icon: Sliders },
  { id: WorkspaceId.ANALYSIS, label: 'Data Analysis', shortcut: '3', icon: BarChart3 },
  { id: WorkspaceId.LEARN, label: 'Learn', shortcut: '4', icon: BookOpen },
  {
    id: WorkspaceId.ACCESSIBILITY,
    label: 'Accessibility & Settings',
    shortcut: '5',
    icon: Accessibility,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeWorkspace,
  onSelectWorkspace,
}) => {
  const { playUiCue } = useAccessibility();

  return (
    <aside
      aria-label="Primary Workspace Navigation"
      className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-sky-500/20 bg-[#0B1120] p-3 lg:p-4"
    >
      <nav aria-label="EarthSound workspaces" className="flex lg:flex-col gap-1.5 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeWorkspace === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                onSelectWorkspace(item.id);
                playUiCue();
              }}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-400/50'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-sky-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </span>
              <span className="hidden lg:inline font-mono text-xs text-slate-500">
                {item.shortcut}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
