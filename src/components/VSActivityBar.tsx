import React from 'react';
import {
  FolderTree,
  Search,
  Bug,
  FolderKanban,
  Settings,
  Plus,
  Terminal,
} from 'lucide-react';
import { SidebarTab } from '../types/roblox';

interface Props {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  issueCount: number;
  isOpen: boolean;
  onToggleSidebar: () => void;
}

export const VSActivityBar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  issueCount,
  isOpen,
  onToggleSidebar,
}) => {
  const items: Array<{
    id: SidebarTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    color?: string;
  }> = [
    { id: 'explorer', label: 'Explorer (Files & Rojo Folders)', icon: FolderTree },
    { id: 'projects', label: 'Projects & Templates', icon: FolderKanban },
    { id: 'debugger', label: 'Roblox Luau Debugger & Bugs', icon: Bug, badge: issueCount },
  ];

  return (
    <aside className="w-12 bg-[#090b10] border-r border-[#1a1f2e] flex flex-col items-center py-2 justify-between shrink-0 select-none z-20">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isOpen && activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (isOpen && activeTab === item.id) {
                  onToggleSidebar();
                } else {
                  onSelectTab(item.id);
                  if (!isOpen) onToggleSidebar();
                }
              }}
              title={item.label}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-[#1e2436] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#141824]'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-red-500 rounded-r" />
              )}
              <Icon className={`w-4 h-4 ${item.color || ''}`} />

              {/* Badge for issues or notifications */}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#090b10]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <button
          onClick={() => {
            onSelectTab('settings');
            if (!isOpen) onToggleSidebar();
          }}
          title="Project & Luau Settings"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            isOpen && activeTab === 'settings'
              ? 'bg-[#1e2436] text-white'
              : 'text-gray-500 hover:text-gray-300 hover:bg-[#141824]'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
