import React from 'react';
import { X, ShieldCheck, Shuffle, Users, Check, Sparkles, Building, Accessibility } from 'lucide-react';
import { AllocationRules } from '../types';

interface RulesConfigProps {
  isOpen: boolean;
  onClose: () => void;
  rules: AllocationRules;
  onSaveRules: (newRules: AllocationRules) => void;
}

export const RulesConfig: React.FC<RulesConfigProps> = ({
  isOpen,
  onClose,
  rules,
  onSaveRules,
}) => {
  const [current, setCurrent] = React.useState<AllocationRules>({ ...rules });

  if (!isOpen) return null;

  const applyPreset = (preset: 'strict' | 'dense' | 'spaced') => {
    if (preset === 'strict') {
      setCurrent({
        antiCheatStrictness: 'adjacent_all',
        branchAlternation: true,
        densityPattern: 'full',
        rollOrder: 'sequential_snake',
        roomStrategy: 'balance_evenly',
        prioritizeSpecialNeedsFrontRow: true,
      });
    } else if (preset === 'dense') {
      setCurrent({
        antiCheatStrictness: 'adjacent_horizontal',
        branchAlternation: true,
        densityPattern: 'full',
        rollOrder: 'sequential_col',
        roomStrategy: 'fill_largest_first',
        prioritizeSpecialNeedsFrontRow: true,
      });
    } else if (preset === 'spaced') {
      setCurrent({
        antiCheatStrictness: 'adjacent_all',
        branchAlternation: true,
        densityPattern: 'checkerboard',
        rollOrder: 'sequential_snake',
        roomStrategy: 'balance_evenly',
        prioritizeSpecialNeedsFrontRow: true,
      });
    }
  };

  const handleSave = () => {
    onSaveRules(current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Configurable Allocation Rules</h2>
              <p className="text-xs text-slate-400">Control anti-cheating separation, density, and seat sequences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Quick Policy Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => applyPreset('strict')}
                className="p-3 text-left rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-brand-500/50 transition group"
              >
                <div className="flex items-center space-x-2 text-brand-400 font-medium text-sm mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Strict Anti-Cheat</span>
                </div>
                <p className="text-xs text-slate-400">8-way separation & snake branch interleaving</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('dense')}
                className="p-3 text-left rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 transition group"
              >
                <div className="flex items-center space-x-2 text-indigo-400 font-medium text-sm mb-1">
                  <Users className="w-4 h-4" />
                  <span>Max Capacity</span>
                </div>
                <p className="text-xs text-slate-400">100% density with horizontal separation</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('spaced')}
                className="p-3 text-left rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 transition group"
              >
                <div className="flex items-center space-x-2 text-emerald-400 font-medium text-sm mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Checkerboard</span>
                </div>
                <p className="text-xs text-slate-400">50% capacity, guaranteed empty desk gaps</p>
              </button>
            </div>
          </div>

          {/* Rule 1: Anti-Cheat Strictness */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold text-white">Same-Subject Separation Radius</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Prohibits students sitting for the exact same examination from being adjacent to one another.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'adjacent_all', label: 'Strict 8-Way (Recommended)', desc: 'Left, right, front, back & diagonals' },
                { id: 'adjacent_horizontal', label: 'Horizontal Only', desc: 'Left, right & bench partners' },
                { id: 'none', label: 'No Restriction', desc: 'May place same exams adjacent' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCurrent({ ...current, antiCheatStrictness: opt.id as any })}
                  className={`p-3 rounded-lg border text-left transition ${
                    current.antiCheatStrictness === opt.id
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium text-xs mb-1">
                    <span>{opt.label}</span>
                    {current.antiCheatStrictness === opt.id && <Check className="w-3.5 h-3.5 text-brand-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Rule 2: Branch Alternation */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-1 pr-4">
              <div className="flex items-center space-x-2">
                <Shuffle className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Branch / Department Interleaving</span>
              </div>
              <p className="text-xs text-slate-400">
                Force students from different departments (e.g., Computer Science, Electrical, Mechanical) to alternate across adjacent desks.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={current.branchAlternation}
                onChange={(e) => setCurrent({ ...current, branchAlternation: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {/* Rule 3: Seating Density Pattern */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Room Seating Density Pattern</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Define whether to pack all physical desks or maintain empty gaps between students.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'full', label: '100% Packed Density', desc: 'Utilizes all operational desks' },
                { id: 'checkerboard', label: 'Checkerboard (50%)', desc: 'Alternates empty desks in grid' },
                { id: 'staggered', label: 'Staggered Rows', desc: 'Offsets seats every alternate row' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCurrent({ ...current, densityPattern: opt.id as any })}
                  className={`p-3 rounded-lg border text-left transition ${
                    current.densityPattern === opt.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium text-xs mb-1">
                    <span>{opt.label}</span>
                    {current.densityPattern === opt.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Rule 4: Roll Number Sequence */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Roll Number Traversal Pattern</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Determines how sequential roll numbers flow through the examination hall columns.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'sequential_snake', label: 'Snake Pattern (Recommended)', desc: 'Down Col 1, Up Col 2, etc.' },
                { id: 'sequential_col', label: 'Column Standard', desc: 'Down Col 1, Down Col 2' },
                { id: 'randomized', label: 'Randomized Cohort', desc: 'Breaks predictable seat positions' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCurrent({ ...current, rollOrder: opt.id as any })}
                  className={`p-3 rounded-lg border text-left transition ${
                    current.rollOrder === opt.id
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium text-xs mb-1">
                    <span>{opt.label}</span>
                    {current.rollOrder === opt.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Rule 5: Special Needs Accommodation */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-1 pr-4">
              <div className="flex items-center space-x-2">
                <Accessibility className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white">Special Needs & Accessibility Priority</span>
              </div>
              <p className="text-xs text-slate-400">
                Automatically allocate students with mobility or medical accommodations to Row 1 of Ground Floor halls.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={current.prioritizeSpecialNeedsFrontRow}
                onChange={(e) => setCurrent({ ...current, prioritizeSpecialNeedsFrontRow: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {/* Rule 6: Hall Balancing Strategy */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-1 pr-4">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Room Filling Strategy</span>
              </div>
              <p className="text-xs text-slate-400">
                Balance student count across all halls evenly, or pack the largest halls first to minimize proctoring staff.
              </p>
            </div>
            <select
              value={current.roomStrategy}
              onChange={(e) => setCurrent({ ...current, roomStrategy: e.target.value as any })}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="balance_evenly">Balance Evenly Across Halls</option>
              <option value="fill_largest_first">Fill Largest Halls First</option>
            </select>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end space-x-3 bg-slate-900 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg shadow-lg shadow-brand-600/30 transition"
          >
            Apply Rules
          </button>
        </div>
      </div>
    </div>
  );
};
