import React from 'react';
import {
  FileCode,
  FolderTree,
  Bug,
  Zap,
  Terminal,
  Bot,
} from 'lucide-react';
import { MobileTab } from '../types/roblox';

interface Props {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  issueCount: number;
}

export const MobileBottomNav: React.FC<Props> = ({ activeTab, onSelectTab, issueCount }) => {
  const items: Array<{
    id: MobileTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'editor', label: 'Editor', icon: FileCode },
    { id: 'explorer', label: 'Files', icon: FolderTree },
    { id: 'debugger', label: 'Bugs', icon: Bug, badge: issueCount },
    { id: 'optimizer', label: 'Optimize', icon: Zap },
    { id: 'console', label: 'Output', icon: Terminal },
    { id: 'copilot', label: 'AI Chat', icon: Bot },
  ];

  return (
    <nav className="md:hidden flex items-center justify-around bg-[#0a0c12] border-t border-[#1e2336] py-1 px-1 shrink-0 z-30 select-none">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors flex-1 ${
              isActive ? 'text-red-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
