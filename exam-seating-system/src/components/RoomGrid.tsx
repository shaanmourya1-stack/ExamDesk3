import React, { useState } from 'react';
import {
  Room,
  Student,
  Exam,
  SeatingPlan,
  SeatAssignment,
  RuleViolation,
} from '../types';
import { generateRoomSeats, RoomGridSeat } from '../services/allocationEngine';
import {
  Lock,
  Unlock,
  AlertTriangle,
  ArrowLeftRight,
  UserX,
  Accessibility,
  Eye,
  CheckCircle,
  HelpCircle,
  Wrench,
} from 'lucide-react';

interface RoomGridProps {
  rooms: Room[];
  students: Student[];
  exams: Exam[];
  plan: SeatingPlan;
  onUpdateAssignment: (seatKey: string, assignment: SeatAssignment | null) => void;
  onSwapAssignments: (seatKey1: string, seatKey2: string) => void;
  onToggleSeatBlocked: (roomId: string, seatKey: string) => void;
  highlightedSeatKey?: string | null;
}

// Subject color generator for distinct badges
const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'CS-301': { bg: 'bg-indigo-950/40', text: 'text-indigo-200', border: 'border-indigo-500/40', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  'EE-202': { bg: 'bg-amber-950/40', text: 'text-amber-200', border: 'border-amber-500/40', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  'ME-104': { bg: 'bg-emerald-950/40', text: 'text-emerald-200', border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  'BT-201': { bg: 'bg-rose-950/40', text: 'text-rose-200', border: 'border-rose-500/40', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  'CS-302': { bg: 'bg-cyan-950/40', text: 'text-cyan-200', border: 'border-cyan-500/40', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  'EE-203': { bg: 'bg-violet-950/40', text: 'text-violet-200', border: 'border-violet-500/40', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
};

function getSubjectStyle(code: string) {
  return SUBJECT_COLORS[code] || {
    bg: 'bg-slate-800',
    text: 'text-slate-200',
    border: 'border-slate-700',
    badge: 'bg-slate-700 text-slate-300 border-slate-600',
  };
}

export const RoomGrid: React.FC<RoomGridProps> = ({
  rooms,
  students,
  exams,
  plan,
  onUpdateAssignment,
  onSwapAssignments,
  onToggleSeatBlocked,
  highlightedSeatKey,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);
  const [activeModalSeat, setActiveModalSeat] = useState<RoomGridSeat | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'warn'; msg: string } | null>(null);

  const studentsMap = new Map(students.map((s) => [s.id, s]));
  const examsMap = new Map(exams.map((e) => [e.id, e]));

  const currentRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];
  if (!currentRoom) {
    return <div className="p-8 text-center text-slate-400">No rooms configured.</div>;
  }

  // Generate grid seats for current room
  const seats = generateRoomSeats(currentRoom, plan.rules.densityPattern);
  const totalPhysicalSeats = currentRoom.rows * currentRoom.cols * (currentRoom.deskType === 'double' ? 2 : 1);
  const blockedSeatsCount = currentRoom.blockedSeats.length;

  let allocatedInRoom = 0;
  seats.forEach((s) => {
    if (plan.assignments[s.seatKey]?.studentId) {
      allocatedInRoom++;
    }
  });

  // Collect violations in this room
  const roomViolations = (plan.stats?.violations || []).filter((v) => v.roomId === currentRoom.id);
  const violationSeatKeys = new Set<string>();
  roomViolations.forEach((v) => {
    violationSeatKeys.add(v.seatKey1);
    if (v.seatKey2) violationSeatKeys.add(v.seatKey2);
  });

  const showNotification = (type: 'success' | 'warn', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  // Seat click handler for Swap / Move
  const handleSeatClick = (seat: RoomGridSeat) => {
    // If in maintenance mode, toggle broken state
    if (isMaintenanceMode) {
      onToggleSeatBlocked(currentRoom.id, seat.seatKey);
      showNotification('success', `Toggled operational status for seat ${seat.label}`);
      return;
    }

    if (seat.isBlocked) {
      showNotification('warn', `Seat ${seat.label} is marked as broken/out-of-order.`);
      return;
    }

    if (!selectedSeatKey) {
      // Step 1: Select first seat
      const assign = plan.assignments[seat.seatKey];
      if (!assign || !assign.studentId) {
        showNotification('warn', `Seat ${seat.label} is currently empty. Click an occupied seat to select a candidate.`);
        return;
      }
      setSelectedSeatKey(seat.seatKey);
      const student = studentsMap.get(assign.studentId);
      showNotification('success', `Selected ${student?.name || 'Student'} (${seat.label}). Click another desk to swap or move.`);
    } else {
      // Step 2: Destination seat clicked
      if (selectedSeatKey === seat.seatKey) {
        // Deselect
        setSelectedSeatKey(null);
        showNotification('warn', 'Selection cancelled.');
        return;
      }

      const sourceAssign = plan.assignments[selectedSeatKey];
      const targetAssign = plan.assignments[seat.seatKey];

      if (sourceAssign?.isLocked || targetAssign?.isLocked) {
        showNotification('warn', 'Cannot swap/move an Admin-Locked seat. Please unlock first.');
        return;
      }

      onSwapAssignments(selectedSeatKey, seat.seatKey);
      setSelectedSeatKey(null);
      showNotification('success', `Relocated candidates between desks successfully.`);
    }
  };

  // Lock toggle
  const handleToggleLock = (seatKey: string) => {
    const current = plan.assignments[seatKey];
    if (!current || !current.studentId) return;
    onUpdateAssignment(seatKey, {
      ...current,
      isLocked: !current.isLocked,
    });
    showNotification('success', current.isLocked ? 'Seat unlocked' : 'Seat locked to prevent auto-reallocation');
  };

  // Unassign student
  const handleUnassign = (seatKey: string) => {
    onUpdateAssignment(seatKey, null);
    if (selectedSeatKey === seatKey) setSelectedSeatKey(null);
    if (activeModalSeat?.seatKey === seatKey) setActiveModalSeat(null);
    showNotification('warn', 'Student unassigned from seat.');
  };

  return (
    <div className="space-y-6">
      {/* Room Tabs & Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Room Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {rooms.map((room) => {
              const isSelected = room.id === selectedRoomId;
              let inRoom = 0;
              const rSeats = generateRoomSeats(room, plan.rules.densityPattern);
              rSeats.forEach((s) => {
                if (plan.assignments[s.seatKey]?.studentId) inRoom++;
              });
              const cap = rSeats.filter((s) => s.isUsable).length;

              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setSelectedSeatKey(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center space-x-2.5 ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 ring-2 ring-brand-400/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{room.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-brand-700 text-white font-semibold' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {inRoom}/{cap}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2.5 w-full lg:w-auto justify-end">
            <button
              onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border ${
                isMaintenanceMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{isMaintenanceMode ? 'Exit Desk Editor' : 'Toggle Broken Desks'}</span>
            </button>
          </div>
        </div>

        {/* Selected Room Metadata Banner */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-200">{currentRoom.name}</span>
            <span>•</span>
            <span>{currentRoom.block} (Floor {currentRoom.floor})</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              {currentRoom.deskType === 'double' ? 'Double Benches (2 seats/bench)' : 'Single Desks (1 seat/desk)'}
            </span>
            {currentRoom.isGroundFloor && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                Ground Floor Accessible
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div>
              Capacity: <span className="text-white font-semibold">{totalPhysicalSeats}</span>
            </div>
            <div>
              Allocated: <span className="text-brand-400 font-semibold">{allocatedInRoom}</span>
            </div>
            <div>
              Damaged: <span className="text-rose-400 font-semibold">{blockedSeatsCount}</span>
            </div>
          </div>
        </div>

        {/* Subject Color Legend */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Exam Legend:</span>
          {exams.map((ex) => {
            const style = getSubjectStyle(ex.code);
            return (
              <div key={ex.id} className="flex items-center space-x-1.5">
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${style.badge}`}>
                  {ex.code}
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">{ex.name.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Action Notification */}
      {notification && (
        <div
          className={`px-4 py-2.5 rounded-xl border flex items-center justify-between text-sm transition animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{notification.msg}</span>
          </div>
          {selectedSeatKey && (
            <button
              onClick={() => setSelectedSeatKey(null)}
              className="text-xs underline hover:text-white ml-3"
            >
              Cancel Selection
            </button>
          )}
        </div>
      )}

      {/* Selected Seat Move Indicator */}
      {selectedSeatKey && (
        <div className="bg-brand-950/40 border border-brand-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-brand-300 animate-pulse">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-4 h-4 text-brand-400" />
            <span>
              <strong>Relocation Mode:</strong> Click any other desk in the grid to swap candidates, or click an empty desk to move.
            </span>
          </div>
          <button
            onClick={() => setSelectedSeatKey(null)}
            className="px-2.5 py-1 rounded bg-brand-800 hover:bg-brand-700 text-white font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Maintenance Mode Warning */}
      {isMaintenanceMode && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex items-center space-x-2 text-xs text-amber-300">
          <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Desk Maintenance Mode Active:</strong> Click any desk in the grid below to mark it as broken/out-of-order or restore it.
          </span>
        </div>
      )}

      {/* Interactive 2D Visual Examination Hall */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        {/* Stage / Invigilator Podium */}
        <div className="max-w-md mx-auto mb-8">
          <div className="h-10 rounded-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-600/50 flex items-center justify-center text-xs font-bold text-slate-300 tracking-wider shadow-inner uppercase">
            [ FRONT — INSTRUCTOR PODIUM & BLACKBOARD ]
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 px-2 mt-1">
            <span>Entry Door (West)</span>
            <span>Aisle</span>
            <span>Emergency Exit (East)</span>
          </div>
        </div>

        {/* The Seating Grid */}
        <div className="inline-block min-w-full">
          <div className="space-y-4">
            {Array.from({ length: currentRoom.rows }).map((_, rIdx) => (
              <div key={`row-${rIdx}`} className="flex items-center space-x-3">
                {/* Row Label */}
                <div className="w-8 text-center text-xs font-bold text-slate-500 flex-shrink-0">
                  R{rIdx + 1}
                </div>

                {/* Columns */}
                <div className="flex items-center space-x-3 flex-grow justify-center">
                  {Array.from({ length: currentRoom.cols }).map((_, cIdx) => {
                    const isDouble = currentRoom.deskType === 'double';

                    if (isDouble) {
                      // Double Bench Container
                      const seatKeyL = `${currentRoom.id}_r${rIdx}_c${cIdx}_s0`;
                      const seatKeyR = `${currentRoom.id}_r${rIdx}_c${cIdx}_s1`;
                      const seatL = seats.find((s) => s.seatKey === seatKeyL);
                      const seatR = seats.find((s) => s.seatKey === seatKeyR);

                      return (
                        <div
                          key={`desk-${rIdx}-${cIdx}`}
                          className="bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80 flex space-x-1.5 shadow-sm"
                        >
                          {seatL && renderSeatButton(seatL)}
                          <div className="w-[1px] bg-slate-800 my-1" />
                          {seatR && renderSeatButton(seatR)}
                        </div>
                      );
                    } else {
                      // Single Desk
                      const seatKey = `${currentRoom.id}_r${rIdx}_c${cIdx}_s0`;
                      const seat = seats.find((s) => s.seatKey === seatKey);
                      return seat ? (
                        <div key={`desk-${rIdx}-${cIdx}`}>
                          {renderSeatButton(seat)}
                        </div>
                      ) : null;
                    }
                  })}
                </div>

                {/* Right Row Label */}
                <div className="w-8 text-center text-xs font-bold text-slate-500 flex-shrink-0">
                  R{rIdx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seat Inspector Modal */}
      {activeModalSeat && renderSeatInspectorModal(activeModalSeat)}
    </div>
  );

  // Helper to render an individual desk slot
  function renderSeatButton(seat: RoomGridSeat) {
    const assign = plan.assignments[seat.seatKey];
    const student = assign?.studentId ? studentsMap.get(assign.studentId) : undefined;
    const exam = assign?.examId ? examsMap.get(assign.examId) : undefined;
    const isSelected = selectedSeatKey === seat.seatKey;
    const isHighlighted = highlightedSeatKey === seat.seatKey;
    const hasViolation = violationSeatKeys.has(seat.seatKey);
    const style = exam ? getSubjectStyle(exam.code) : null;

    let baseClass = 'w-28 sm:w-32 h-20 sm:h-24 p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between select-none cursor-pointer ';

    if (seat.isBlocked) {
      baseClass += 'bg-rose-950/20 border-rose-900/40 text-rose-400 opacity-60 ';
    } else if (!seat.isUsable) {
      // Checkerboard or staggered inactive desk
      baseClass += 'bg-slate-950/30 border-slate-800/40 text-slate-600 border-dashed ';
    } else if (assign && student) {
      // Occupied
      baseClass += `${style?.bg || 'bg-slate-800'} ${style?.border || 'border-slate-700'} hover:scale-[1.02] `;
    } else {
      // Usable & Empty
      baseClass += 'bg-slate-900/70 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/50 border-dashed ';
    }

    if (isSelected) {
      baseClass += 'ring-2 ring-amber-400 border-amber-400 shadow-lg shadow-amber-500/20 scale-105 z-20 ';
    } else if (isHighlighted) {
      baseClass += 'ring-4 ring-brand-400 border-brand-400 shadow-xl shadow-brand-500/50 scale-110 z-30 animate-bounce ';
    } else if (hasViolation) {
      baseClass += 'ring-2 ring-rose-500 border-rose-500 animate-pulse ';
    }

    return (
      <div
        className={baseClass}
        onClick={() => handleSeatClick(seat)}
        title={`${seat.label}: ${student ? student.name : 'Empty'}`}
      >
        {/* Top line: Seat Label & Status Badges */}
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider">
            {seat.label}
          </span>
          <div className="flex items-center space-x-1">
            {hasViolation && (
              <span title="Anti-cheating / Adjacency conflict detected!" className="text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500" />
              </span>
            )}
            {assign?.isLocked && (
              <span title="Admin Locked">
                <Lock className="w-3 h-3 text-amber-400" />
              </span>
            )}
            {student?.specialNeeds && (
              <span title="Special Accommodation Seat">
                <Accessibility className="w-3 h-3 text-blue-400" />
              </span>
            )}
            {assign && student && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModalSeat(seat);
                }}
                className="opacity-60 hover:opacity-100 text-slate-400 hover:text-white p-0.5 rounded"
                title="View Student Card"
              >
                <Eye className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Center / Body: Student or Empty State */}
        {seat.isBlocked ? (
          <div className="text-center my-auto">
            <span className="text-[10px] font-medium text-rose-400 block">Out of Order</span>
            <span className="text-[9px] text-rose-500/80">Damaged Desk</span>
          </div>
        ) : !seat.isUsable ? (
          <div className="text-center my-auto">
            <span className="text-[9px] text-slate-600 block">Empty Gap</span>
            <span className="text-[8px] text-slate-700">Checkerboard</span>
          </div>
        ) : assign && student ? (
          <div className="overflow-hidden my-auto">
            <div className="flex items-center space-x-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${style?.badge}`}>
                {exam?.code || 'EXAM'}
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate mt-0.5" title={student.name}>
              {student.name}
            </p>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight truncate">
              {student.rollNo}
            </p>
          </div>
        ) : (
          <div className="text-center my-auto">
            <span className="text-[10px] text-slate-500 font-medium">Available</span>
          </div>
        )}

        {/* Bottom indicator */}
        {student && (
          <div className="text-[9px] text-slate-400 truncate flex items-center justify-between">
            <span>{student.department.split(' ')[0]}</span>
          </div>
        )}
      </div>
    );
  }

  // Seat Inspector Drawer / Modal
  function renderSeatInspectorModal(seat: RoomGridSeat) {
    const assign = plan.assignments[seat.seatKey];
    const student = assign?.studentId ? studentsMap.get(assign.studentId) : undefined;
    const exam = assign?.examId ? examsMap.get(assign.examId) : undefined;
    if (!assign || !student) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
                  Desk {seat.label}
                </span>
                <span className="text-xs text-slate-400">{currentRoom.name}</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">{student.name}</h3>
              <p className="text-xs font-mono text-slate-400">{student.rollNo}</p>
            </div>
            <button
              onClick={() => setActiveModalSeat(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>

          <div className="bg-slate-800/50 p-3.5 rounded-xl space-y-2 text-xs border border-slate-700/60">
            <div className="flex justify-between">
              <span className="text-slate-400">Department:</span>
              <span className="text-slate-200 font-medium">{student.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Semester:</span>
              <span className="text-slate-200 font-medium">Semester {student.semester}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Scheduled Exam:</span>
              <span className="text-brand-300 font-semibold">{exam?.code} — {exam?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Exam Time:</span>
              <span className="text-slate-200">{exam?.startTime} - {exam?.endTime}</span>
            </div>
            {student.specialNeeds && (
              <div className="flex items-center space-x-1.5 text-blue-400 mt-1 pt-1 border-t border-slate-700">
                <Accessibility className="w-3.5 h-3.5" />
                <span>Special needs accommodation active</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                handleToggleLock(seat.seatKey);
                setActiveModalSeat(null);
              }}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              {assign.isLocked ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
              <span>{assign.isLocked ? 'Unlock Seat' : 'Lock Seat (Admin)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleUnassign(seat.seatKey);
              }}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium border border-rose-800/50 transition"
            >
              <UserX className="w-4 h-4 text-rose-400" />
              <span>Unassign Student</span>
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-500">
              Tip: Click any other desk in the room to swap this student into that position.
            </p>
          </div>
        </div>
      </div>
    );
  }
};
