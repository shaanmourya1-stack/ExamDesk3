import React, { useState } from 'react';
import {
  SeatingPlan,
  Student,
  Exam,
  Room,
} from '../types';
import {
  Printer,
  Download,
  FileText,
  Grid,
  CheckSquare,
  QrCode,
  Building,
} from 'lucide-react';
import { downloadCSV, exportAllocationToCSV, exportAttendanceSheetCSV } from '../services/csvService';
import { generateRoomSeats } from '../services/allocationEngine';

interface PrintSuiteProps {
  plan: SeatingPlan;
  students: Student[];
  exams: Exam[];
  rooms: Room[];
}

export const PrintSuite: React.FC<PrintSuiteProps> = ({
  plan,
  students,
  exams,
  rooms,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [viewMode, setViewMode] = useState<'door' | 'attendance' | 'slips' | 'matrix'>('door');

  const studentsMap = new Map(students.map((s) => [s.id, s]));
  const examsMap = new Map(exams.map((e) => [e.id, e]));
  const currentRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  if (!currentRoom) {
    return <div className="p-8 text-center text-slate-400">No rooms available.</div>;
  }

  // Gather allocations for the selected room
  interface RoomAllocationItem {
    seatKey: string;
    seatLabel: string;
    row: number;
    col: number;
    slotIndex: number;
    student?: Student;
    exam?: Exam;
  }

  const roomSeats = generateRoomSeats(currentRoom, plan.rules.densityPattern);
  const roomItems: RoomAllocationItem[] = [];

  roomSeats.forEach((seat) => {
    const assign = plan.assignments[seat.seatKey];
    if (assign && assign.studentId) {
      roomItems.push({
        seatKey: seat.seatKey,
        seatLabel: seat.label,
        row: seat.row,
        col: seat.col,
        slotIndex: seat.slotIndex,
        student: studentsMap.get(assign.studentId),
        exam: examsMap.get(assign.examId),
      });
    }
  });

  // Sort by Roll Number for Door Notice, or by Seat Label for Invigilator
  const doorList = [...roomItems].sort((a, b) => {
    const rA = a.student?.rollNo || '';
    const rB = b.student?.rollNo || '';
    return rA.localeCompare(rB, undefined, { numeric: true });
  });

  const seatOrderList = [...roomItems].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    if (a.col !== b.col) return a.col - b.col;
    return a.slotIndex - b.slotIndex;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportRoomCSV = () => {
    const csv = exportAllocationToCSV(plan, students, exams, rooms, currentRoom.id);
    downloadCSV(`${currentRoom.name.replace(/\s+/g, '_')}_Seating_Plan.csv`, csv);
  };

  const handleExportAttendanceCSV = () => {
    const csv = exportAttendanceSheetCSV(plan, students, exams, rooms, currentRoom.id);
    downloadCSV(`${currentRoom.name.replace(/\s+/g, '_')}_Attendance_Sheet.csv`, csv);
  };

  return (
    <div className="space-y-6">
      {/* Non-Printable Controls Bar */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Room Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Select Hall:</span>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500 font-semibold"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.block})
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={viewMode === 'attendance' ? handleExportAttendanceCSV : handleExportRoomCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>
          </div>
        </div>

        {/* View Mode Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {[
            { id: 'door', label: 'Door Notice Chart', icon: FileText, desc: 'Sorted by Roll No for entrance display' },
            { id: 'attendance', label: 'Invigilator Attendance Registry', icon: CheckSquare, desc: 'With signature & booklet columns' },
            { id: 'slips', label: 'Desk Cut-Out Slips', icon: QrCode, desc: 'Printable 6-per-sheet desk tags' },
            { id: 'matrix', label: 'Visual Room Layout Map', icon: Grid, desc: '2D grid map for invigilator' },
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white text-slate-900 rounded-2xl p-8 sm:p-12 shadow-2xl border border-slate-200 min-h-[800px] print:shadow-none print:border-none print:p-0 print:m-0">
        {/* Institutional Formal Header (Shown on all print views) */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
          <div className="text-xs uppercase tracking-widest font-extrabold text-slate-600">
            National Institute of Higher Sciences & Technology
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
            Office of the Controller of Examinations
          </h1>
          <div className="text-sm font-semibold text-slate-700 mt-1">
            {plan.name} — {plan.session} Session ({plan.examDate})
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-800 mt-2 bg-slate-100 py-1.5 px-4 rounded-lg">
            <span>EXAMINATION HALL: {currentRoom.name.toUpperCase()}</span>
            <span>•</span>
            <span>LOCATION: {currentRoom.block.toUpperCase()} (FLOOR {currentRoom.floor})</span>
            <span>•</span>
            <span>ALLOCATED CANDIDATES: {roomItems.length}</span>
          </div>
        </div>

        {/* 1. Door Notice Chart */}
        {viewMode === 'door' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                Official Hall Seating Chart (Door Notice)
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Order: Natural Roll Number Sequence
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-800 uppercase font-black tracking-wider text-[11px]">
                  <th className="py-2.5 px-2 w-12 text-center">S.No</th>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Subject Code & Course</th>
                  <th className="py-2.5 px-3 text-right font-black text-slate-950">
                    Allocated Desk
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {doorList.map((item, idx) => (
                  <tr key={item.seatKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-2 px-2 text-center font-mono font-medium text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-950">
                      {item.student?.rollNo}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {item.student?.name}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {item.student?.department}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-slate-900">{item.exam?.code}</span>{' '}
                      <span className="text-slate-600 text-[11px]">— {item.exam?.name}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-950 text-sm">
                      {item.seatLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Door Notice Instructions Footer */}
            <div className="mt-8 pt-4 border-t border-slate-300 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Important Instructions for Candidates:</p>
              <p>1. Candidates must occupy their designated seats at least 15 minutes prior to the start of the examination.</p>
              <p>2. Possession of mobile phones, smartwatches, or unauthorized study materials will lead to immediate disqualification.</p>
              <p>3. Do not alter or swap allocated desks without prior written permission from the Chief Invigilator.</p>
            </div>
          </div>
        )}

        {/* 2. Invigilator Attendance Registry */}
        {viewMode === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                Invigilator Attendance & Answer Booklet Registry
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Sorted by Desk Code Sequence
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-800 uppercase font-black text-[11px]">
                  <th className="py-2.5 px-2 w-10 text-center">S.No</th>
                  <th className="py-2.5 px-2 font-mono">Desk ID</th>
                  <th className="py-2.5 px-3 font-mono">Roll Number</th>
                  <th className="py-2.5 px-3">Student Full Name</th>
                  <th className="py-2.5 px-2">Subject</th>
                  <th className="py-2.5 px-3 text-center">Booklet Serial No.</th>
                  <th className="py-2.5 px-4 text-center">Student Signature</th>
                  <th className="py-2.5 px-2 text-center">Att.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {seatOrderList.map((item, idx) => (
                  <tr key={item.seatKey} className="h-10">
                    <td className="py-1 px-2 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-1 px-2 font-mono font-bold text-slate-950">
                      {item.seatLabel}
                    </td>
                    <td className="py-1 px-3 font-mono font-semibold text-slate-900">
                      {item.student?.rollNo}
                    </td>
                    <td className="py-1 px-3 font-medium text-slate-800">
                      {item.student?.name}
                    </td>
                    <td className="py-1 px-2 font-bold text-slate-700">
                      {item.exam?.code}
                    </td>
                    <td className="py-1 px-3 text-center border-l border-r border-slate-200">
                      <span className="inline-block w-24 border-b border-dotted border-slate-400"></span>
                    </td>
                    <td className="py-1 px-4 text-center border-r border-slate-200">
                      <span className="inline-block w-28 border-b border-dotted border-slate-400"></span>
                    </td>
                    <td className="py-1 px-2 text-center">
                      <span className="inline-block w-4 h-4 border border-slate-400 rounded-sm"></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Invigilator Sign-Off Block */}
            <div className="mt-12 pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs text-slate-800">
              <div>
                <p className="font-bold">Total Present: ______________</p>
                <p className="font-bold mt-2">Total Absent: ______________</p>
              </div>
              <div className="text-center">
                <div className="border-b border-slate-400 pb-8 mb-1"></div>
                <p className="font-bold">Invigilator 1 Signature</p>
                <p className="text-[10px] text-slate-500">Name: ______________________</p>
              </div>
              <div className="text-center">
                <div className="border-b border-slate-400 pb-8 mb-1"></div>
                <p className="font-bold">Chief Superintendent Sign</p>
                <p className="text-[10px] text-slate-500">Seal & Date</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Printable Student Desk Slips (Cut-out Cards) */}
        {viewMode === 'slips' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                Examination Desk Slips (Cut-out Desk Tags)
              </h2>
              <span className="text-xs text-slate-500">
                Print and paste on corresponding desks
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {seatOrderList.map((item) => (
                <div
                  key={item.seatKey}
                  className="border-2 border-dashed border-slate-400 p-4 rounded-xl bg-slate-50/50 space-y-2 relative"
                >
                  <div className="flex justify-between items-start border-b border-slate-300 pb-1.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Exam Desk Slip
                      </span>
                      <h4 className="text-sm font-black text-slate-900">{currentRoom.name}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                        {item.seatLabel}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Candidate Name:</span>
                      <span className="font-bold text-slate-950">{item.student?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Roll Number:</span>
                      <span className="font-mono font-bold text-slate-900">{item.student?.rollNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span className="text-slate-800">{item.student?.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subject:</span>
                      <span className="font-bold text-slate-900">
                        {item.exam?.code} — {item.exam?.name.slice(0, 20)}...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date & Slot:</span>
                      <span className="text-slate-800 font-medium">
                        {plan.examDate} ({plan.session})
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Invigilator Initials: ________</span>
                    <span className="font-mono">Security Code: {item.seatKey.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Visual Room Layout Map */}
        {viewMode === 'matrix' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                Visual Room Desk Layout Matrix
              </h2>
              <span className="text-xs text-slate-500">
                Grid layout for Invigilator Floor Supervision
              </span>
            </div>

            {/* Blackboard / Podium Indicator */}
            <div className="bg-slate-200 border border-slate-400 text-slate-800 font-bold text-xs py-2 text-center rounded tracking-wider uppercase mb-6">
              [ FRONT OF EXAMINATION HALL — INSTRUCTOR PODIUM & BLACKBOARD ]
            </div>

            <div className="space-y-3">
              {Array.from({ length: currentRoom.rows }).map((_, rIdx) => (
                <div key={rIdx} className="flex items-center space-x-2">
                  <span className="w-8 text-center text-xs font-bold text-slate-600">R{rIdx + 1}</span>
                  <div className="flex-grow grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {Array.from({ length: currentRoom.cols }).map((_, cIdx) => {
                      const isDouble = currentRoom.deskType === 'double';
                      const slots = isDouble ? [0, 1] : [0];

                      return (
                        <div
                          key={cIdx}
                          className="border border-slate-300 p-1.5 rounded bg-white text-slate-900 text-[10px] space-y-1"
                        >
                          {slots.map((sIdx) => {
                            const key = `${currentRoom.id}_r${rIdx}_c${cIdx}_s${sIdx}`;
                            const assign = plan.assignments[key];
                            const student = assign ? studentsMap.get(assign.studentId) : null;
                            const exam = assign ? examsMap.get(assign.examId) : null;
                            const label = `R${rIdx + 1}C${cIdx + 1}${isDouble ? (sIdx === 0 ? 'L' : 'R') : ''}`;

                            return (
                              <div
                                key={sIdx}
                                className={`p-1 rounded border ${
                                  student
                                    ? 'bg-slate-100 border-slate-300'
                                    : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'
                                }`}
                              >
                                <div className="flex justify-between font-mono font-bold">
                                  <span>{label}</span>
                                  <span>{exam?.code || '-'}</span>
                                </div>
                                <div className="font-semibold truncate">{student?.name || 'Empty'}</div>
                                <div className="font-mono text-[9px] text-slate-600 truncate">
                                  {student?.rollNo || ''}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  <span className="w-8 text-center text-xs font-bold text-slate-600">R{rIdx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
