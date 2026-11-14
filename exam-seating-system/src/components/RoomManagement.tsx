import React, { useState } from 'react';
import { Room } from '../types';
import {
  Building2,
  Plus,
  Trash2,
  X,
  Layers,
  Accessibility,
} from 'lucide-react';

interface RoomManagementProps {
  rooms: Room[];
  onAddRoom: (room: Room) => void;
  onDeleteRoom: (id: string) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
  rooms,
  onAddRoom,
  onDeleteRoom,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [block, setBlock] = useState('Block A');
  const [floor, setFloor] = useState(0);
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(5);
  const [deskType, setDeskType] = useState<'single' | 'double'>('single');
  const [isGround, setIsGround] = useState(true);

  // Aggregated Stats
  const totalPhysicalCapacity = rooms.reduce((acc, r) => {
    const slots = r.deskType === 'double' ? 2 : 1;
    return acc + r.rows * r.cols * slots;
  }, 0);

  const totalBrokenSeats = rooms.reduce((acc, r) => acc + r.blockedSeats.length, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name,
      block,
      floor,
      rows: Number(rows),
      cols: Number(cols),
      deskType,
      isGroundFloor: isGround || floor === 0,
      blockedSeats: [],
    };

    onAddRoom(newRoom);
    setName('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block">Active Examination Halls</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-white">{rooms.length}</span>
            <span className="text-xs text-slate-500">halls registered</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block">Total Examination Capacity</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-brand-400">{totalPhysicalCapacity}</span>
            <span className="text-xs text-slate-500">candidate seats</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block">Operational Availability</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-emerald-400">
              {totalPhysicalCapacity - totalBrokenSeats}
            </span>
            <span className="text-xs text-slate-500">functional ({totalBrokenSeats} broken)</span>
          </div>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Examination Halls & Layout Configurations</h2>
          <p className="text-xs text-slate-400">Configure room dimensions, multi-occupancy benches, and accessibility</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exam Hall</span>
        </button>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => {
          const slots = room.deskType === 'double' ? 2 : 1;
          const grossCap = room.rows * room.cols * slots;
          const netCap = grossCap - room.blockedSeats.length;

          return (
            <div
              key={room.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/25">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{room.name}</h3>
                    <p className="text-xs text-slate-400">
                      {room.block} • Floor {room.floor}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteRoom(room.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                  title="Delete Hall"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Specs & Layout Badges */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <div>
                  <span className="text-[11px] text-slate-500 block">Matrix</span>
                  <span className="font-semibold text-white">
                    {room.rows}R × {room.cols}C
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Desk Type</span>
                  <span className="font-semibold text-brand-300">
                    {room.deskType === 'double' ? 'Double Bench' : 'Single Desk'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Capacity</span>
                  <span className="font-bold text-emerald-400">
                    {netCap} <span className="text-[10px] text-slate-400 font-normal">({grossCap})</span>
                  </span>
                </div>
              </div>

              {/* Accessibility & Features */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {room.isGroundFloor && (
                  <span className="inline-flex items-center space-x-1 text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-full text-xs border border-blue-500/20 font-medium">
                    <Accessibility className="w-3.5 h-3.5" />
                    <span>Ground Floor Accessible</span>
                  </span>
                )}
                {room.blockedSeats.length > 0 && (
                  <span className="text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full text-xs border border-rose-500/20 font-medium">
                    {room.blockedSeats.length} Damaged Desks
                  </span>
                )}
                <span className="text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full text-xs font-medium">
                  {room.rows * room.cols} Physical Desks
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Room Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Configure New Examination Hall</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Hall / Room Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Hall 301 - Galileo Complex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Building Block</label>
                <input
                  type="text"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Floor Number</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={floor}
                  onChange={(e) => {
                    const fl = parseInt(e.target.value);
                    setFloor(fl);
                    if (fl === 0) setIsGround(true);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Rows (Depth)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Columns (Width)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Bench Desk Type</label>
              <select
                value={deskType}
                onChange={(e) => setDeskType(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="single">Single Seater (1 student per desk)</option>
                <option value="double">Double Bench (2 students per bench: Left & Right)</option>
              </select>
            </div>

            <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-200 font-medium block">Ground Floor / Wheelchair Access</span>
                <span className="text-slate-400 text-[11px]">Eligible for special accommodations</span>
              </div>
              <input
                type="checkbox"
                checked={isGround}
                onChange={(e) => setIsGround(e.target.checked)}
                className="rounded bg-slate-700 text-brand-600 w-4 h-4"
              />
            </div>

            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">
              Estimated Total Capacity:{' '}
              <span className="font-bold">{rows * cols * (deskType === 'double' ? 2 : 1)} seats</span>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-600/25"
              >
                Create Room
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
