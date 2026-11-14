import React, { useState } from 'react';
import {
  Student,
  Exam,
  Room,
  SeatingPlan,
} from '../types';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Compass,
  ArrowRight,
  Accessibility,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface StudentSearchProps {
  students: Student[];
  exams: Exam[];
  rooms: Room[];
  plan: SeatingPlan;
  onLocateOnMap: (roomId: string, seatKey: string) => void;
}

export const StudentSearch: React.FC<StudentSearchProps> = ({
  students,
  exams,
  rooms,
  plan,
  onLocateOnMap,
}) => {
  const [query, setQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const studentsMap = new Map(students.map((s) => [s.id, s]));
  const examsMap = new Map(exams.map((e) => [e.id, e]));
  const roomsMap = new Map(rooms.map((r) => [r.id, r]));

  // Find all student assignments in current plan
  const studentToSeatMap = new Map<string, { seatKey: string; roomId: string; examId: string }>();

  for (const [seatKey, assign] of Object.entries(plan.assignments)) {
    if (assign && assign.studentId) {
      const roomId = seatKey.split('_')[0];
      studentToSeatMap.set(assign.studentId, {
        seatKey,
        roomId,
        examId: assign.examId,
      });
    }
  }

  // Filter students based on query
  const matchingStudents = students.filter((s) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q);
  });

  const activeStudent = selectedStudentId
    ? studentsMap.get(selectedStudentId)
    : matchingStudents[0];

  const activeAllocation = activeStudent
    ? studentToSeatMap.get(activeStudent.id)
    : undefined;

  const activeRoom = activeAllocation ? roomsMap.get(activeAllocation.roomId) : undefined;
  const activeExam = activeAllocation ? examsMap.get(activeAllocation.examId) : undefined;

  // Format seat label
  let seatLabel = 'Not Allocated';
  if (activeAllocation && activeRoom) {
    const parts = activeAllocation.seatKey.split('_');
    const rMatch = parseInt(parts[1]?.replace('r', '') || '0') + 1;
    const cMatch = parseInt(parts[2]?.replace('c', '') || '0') + 1;
    const sMatch = parts[3]?.replace('s', '') || '0';
    const slotSuffix = activeRoom.deskType === 'double' ? (sMatch === '0' ? ' Left' : ' Right') : '';
    seatLabel = `Row ${rMatch}, Desk ${cMatch}${slotSuffix}`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-brand-900/60 via-slate-900 to-indigo-950/60 border border-brand-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/30">
          <Compass className="w-3.5 h-3.5" />
          <span>Real-time Candidate Seating Finder</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Find Your Examination Seat & Hall
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
          Enter your official Roll Number or Full Name to view your designated hall, floor, desk coordinates, and timings.
        </p>

        {/* Big Search Input */}
        <div className="max-w-xl mx-auto relative pt-2">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-5" />
          <input
            type="text"
            placeholder="Type your Roll Number (e.g. CS-2024-001) or Name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedStudentId(null);
            }}
            className="w-full bg-slate-950 border-2 border-slate-700 hover:border-brand-500/50 focus:border-brand-500 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none shadow-inner transition"
            autoFocus
          />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-400">
          <span>Try quick demo lookups:</span>
          {['CS-2024-001', 'EE-2024-012', 'ME-2024-005', 'BT-2024-003'].map((code) => (
            <button
              key={code}
              onClick={() => {
                setQuery(code);
                setSelectedStudentId(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[11px] border border-slate-700 transition"
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Multiple Matching Results List */}
      {matchingStudents.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-xs text-slate-400 font-semibold block">
            Matching Candidates ({matchingStudents.length}):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {matchingStudents.slice(0, 6).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                  activeStudent?.id === s.id
                    ? 'bg-brand-500/20 border-brand-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-white">{s.name}</p>
                  <p className="text-[11px] font-mono text-slate-400">{s.rollNo}</p>
                </div>
                <span className="text-[11px] text-slate-400">{s.department.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Result Card */}
      {activeStudent ? (
        activeAllocation && activeRoom && activeExam ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 animate-fade-in">
            {/* Top Verification Pill */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmed Hall & Seat Allocation</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Verified: {new Date().toLocaleDateString()}
              </span>
            </div>

            {/* Candidate Identity Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-brand-500/20 flex-shrink-0">
                  {activeStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">{activeStudent.name}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono font-bold text-brand-300">{activeStudent.rollNo}</span>
                    <span>•</span>
                    <span>{activeStudent.department}</span>
                    <span>•</span>
                    <span>Semester {activeStudent.semester}</span>
                  </div>
                </div>
              </div>

              {activeStudent.specialNeeds && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium">
                  <Accessibility className="w-4 h-4" />
                  <span>Front Row Ground Floor Priority</span>
                </div>
              )}
            </div>

            {/* Seating Location Callout Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hall Card */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-brand-400 text-xs font-semibold uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>Designated Hall & Location</span>
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">{activeRoom.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeRoom.block} — Floor {activeRoom.floor}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                  Enter via: <strong className="text-white">Main Entrance West</strong>
                </div>
              </div>

              {/* Exact Desk Card */}
              <div className="bg-gradient-to-br from-brand-950/40 to-slate-950/80 p-5 rounded-2xl border border-brand-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-300 uppercase tracking-wider">
                    Allocated Desk
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono font-bold">
                    {activeAllocation.seatKey.split('_').slice(1).join('-').toUpperCase()}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {seatLabel}
                </div>
                <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                  Bench Type: <strong className="text-white">{activeRoom.deskType === 'double' ? 'Shared Bench' : 'Individual Desk'}</strong>
                </div>
              </div>
            </div>

            {/* Examination Time & Subject Details */}
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block">Exam Date</span>
                  <span className="font-bold text-white">{plan.examDate}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block">Session & Timings</span>
                  <span className="font-bold text-white">
                    {plan.session} ({activeExam.startTime} - {activeExam.endTime})
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block">Course Code</span>
                <span className="font-bold text-brand-300">
                  {activeExam.code} — {activeExam.name}
                </span>
              </div>
            </div>

            {/* Locate on Visual Map Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onLocateOnMap(activeRoom.id, activeAllocation.seatKey)}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition group"
              >
                <span>Spotlight My Desk on Room Grid</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Student Found, but Seat Not Yet Assigned</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Candidate <strong>{activeStudent.name}</strong> ({activeStudent.rollNo}) is registered for {activeStudent.enrolledExamIds.length} course(s), but has not been allocated a seat in the active plan.
            </p>
            <p className="text-xs text-slate-500">
              Click &quot;Generate Seating&quot; or &quot;Re-allocate Seats&quot; in the navigation bar to assign them.
            </p>
          </div>
        )
      ) : query.trim() ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-white">No candidate matching &quot;{query}&quot;</p>
          <p className="text-xs text-slate-400">
            Please check the roll number spelling or search by student first name.
          </p>
        </div>
      ) : null}
    </div>
  );
};
