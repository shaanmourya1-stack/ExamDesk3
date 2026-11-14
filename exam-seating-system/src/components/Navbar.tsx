import React from 'react';
import {
  LayoutGrid,
  Users,
  Building2,
  Printer,
  Search,
  BarChart3,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';
import { SeatingPlan } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  plan: SeatingPlan;
  onOpenRules: () => void;
  onRunAllocation: () => void;
  onResetData: () => void;
  isAllocating: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  plan,
  onOpenRules,
  onRunAllocation,
  onResetData,
  isAllocating,
}) => {
  const tabs = [
    { id: 'matrix', label: 'Seating Matrix', icon: LayoutGrid },
    { id: 'data', label: 'Students & Exams', icon: Users },
    { id: 'rooms', label: 'Halls & Capacity', icon: Building2 },
    { id: 'search', label: 'Student Lookup', icon: Search },
    { id: 'print', label: 'Printable Plans', icon: Printer },
    { id: 'reports', label: 'Audit & Reports', icon: BarChart3 },
  ];

  const totalAssigned = Object.keys(plan.assignments).length;

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold text-xl tracking-wider">
              ES
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-lg tracking-tight">ExamDesk</span>
                <span className="bg-brand-500/20 text-brand-400 text-xs px-2 py-0.5 rounded-full font-medium border border-brand-500/30">
                  Allocation Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Automated Seating & Conflict Prevention Suite</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onOpenRules}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition shadow-sm"
              title="Configure Seating Rules & Constraints"
            >
              <Sliders className="w-4 h-4 text-brand-400" />
              <span className="hidden md:inline">Rules & Policies</span>
            </button>

            <button
              onClick={onResetData}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-sm border border-slate-700 transition"
              title="Reset to Initial Demonstration Dataset"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden lg:inline text-xs">Reset Demo</span>
            </button>

            <button
              onClick={onRunAllocation}
              disabled={isAllocating}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white shadow-lg transition duration-200 ${
                isAllocating
                  ? 'bg-brand-700 opacity-75 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-brand-500/25 active:scale-95'
              }`}
            >
              <Play className={`w-4 h-4 fill-white ${isAllocating ? 'animate-spin' : ''}`} />
              <span>{isAllocating ? 'Generating...' : totalAssigned > 0 ? 'Re-allocate Seats' : 'Generate Seating'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/60 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.id === 'reports' && plan.stats?.violations && plan.stats.violations.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
