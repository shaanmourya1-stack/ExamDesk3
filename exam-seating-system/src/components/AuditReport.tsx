import React from 'react';
import {
  SeatingPlan,
  Student,
  Exam,
  Room,
} from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building,
  Zap,
  Download,
  Percent,
} from 'lucide-react';
import { downloadCSV, exportAllocationToCSV } from '../services/csvService';
import { generateRoomSeats } from '../services/allocationEngine';

interface AuditReportProps {
  plan: SeatingPlan;
  students: Student[];
  exams: Exam[];
  rooms: Room[];
}

export const AuditReport: React.FC<AuditReportProps> = ({
  plan,
  students,
  exams,
  rooms,
}) => {
  const studentsMap = new Map(students.map((s) => [s.id, s]));
  const examsMap = new Map(exams.map((e) => [e.id, e]));

  const stats = plan.stats;
  const violations = stats?.violations || [];
  const unallocated = stats?.unallocatedStudents || [];

  // Calculate room breakdown
  const roomBreakdowns = rooms.map((room) => {
    const seats = generateRoomSeats(room, plan.rules.densityPattern);
    const usable = seats.filter((s) => s.isUsable).length;
    let allocated = 0;
    seats.forEach((s) => {
      if (plan.assignments[s.seatKey]?.studentId) allocated++;
    });
    const fillRate = usable > 0 ? Math.round((allocated / usable) * 100) : 0;

    return {
      room,
      usable,
      allocated,
      empty: usable - allocated,
      fillRate,
    };
  });

  // Calculate department distribution
  const deptCounts: Record<string, number> = {};
  for (const assign of Object.values(plan.assignments)) {
    if (!assign || !assign.studentId) continue;
    const st = studentsMap.get(assign.studentId);
    if (st) {
      deptCounts[st.department] = (deptCounts[st.department] || 0) + 1;
    }
  }

  const adherenceScore = violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 15);

  const handleDownloadFullCSV = () => {
    const csv = exportAllocationToCSV(plan, students, exams, rooms);
    downloadCSV(`Full_Exam_Allocation_Audit_${plan.examDate}.csv`, csv);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(plan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SeatingPlan_Audit_${plan.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white">Allocation Analytics & Compliance Audit</h2>
          <p className="text-xs text-slate-400">
            Real-time verification of anti-cheating separation, space utilization, and conflict checks
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadFullCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Master CSV</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Audit</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Rule Adherence</span>
            <ShieldCheck className={`w-4 h-4 ${adherenceScore === 100 ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="text-3xl font-black text-white">{adherenceScore}%</div>
          <p className="text-[11px] text-slate-500">
            {violations.length === 0 ? 'Zero anti-cheating policy violations' : `${violations.length} policy conflict(s) detected`}
          </p>
        </div>

        {/* Allocation Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Candidates Seated</span>
            <Users className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-3xl font-black text-brand-400">
            {stats ? `${stats.allocatedStudents}/${stats.totalStudents}` : Object.keys(plan.assignments).length}
          </div>
          <p className="text-[11px] text-slate-500">
            {unallocated.length === 0 ? '100% of candidates allocated' : `${unallocated.length} candidates pending capacity`}
          </p>
        </div>

        {/* Utilization Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Hall Space Fill Rate</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-indigo-400">
            {stats ? `${stats.utilizationRate}%` : '0%'}
          </div>
          <p className="text-[11px] text-slate-500">
            Based on active {plan.rules.densityPattern} seating density
          </p>
        </div>

        {/* Solver Execution Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Algorithmic Solver Time</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            {stats ? `${stats.executionTimeMs}ms` : '0ms'}
          </div>
          <p className="text-[11px] text-slate-500">
            Heuristic constraint solver
          </p>
        </div>
      </div>

      {/* Conflict & Rule Violations Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Adjacency & Cheating Prevention Audit</h3>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              violations.length === 0
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}
          >
            {violations.length === 0 ? 'Passed Clean' : `${violations.length} Conflicts Found`}
          </span>
        </div>

        {violations.length === 0 ? (
          <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-4 flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="text-xs text-emerald-200">
              <strong className="text-emerald-300 font-semibold block">All Constraints Satisfied:</strong>
              No students taking the same examination are seated in adjacent desks (horizontal, vertical, or diagonal).
              Department interleaving and roll order requirements have been verified without conflict.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {violations.map((violation) => {
              const student1 = studentsMap.get(violation.studentId1);
              const student2 = violation.studentId2 ? studentsMap.get(violation.studentId2) : undefined;

              return (
                <div
                  key={violation.id}
                  className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-200">{violation.description}</p>
                    <p className="text-slate-400 text-[11px]">
                      Student 1: <strong className="text-slate-200">{student1?.name}</strong> ({student1?.rollNo})
                      {student2 && (
                        <span>
                          {' '}vs Student 2: <strong className="text-slate-200">{student2.name}</strong> ({student2.rollNo})
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-brand-300">
                      Recommendation: Go to Seating Matrix tab and click to swap one of these candidates with a student from a different department.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hall Capacity & Utilization Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Examination Hall Utilization Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Hall Name</th>
                <th className="py-3 px-4">Building / Floor</th>
                <th className="py-3 px-4">Bench Type</th>
                <th className="py-3 px-4">Effective Usable Desks</th>
                <th className="py-3 px-4">Allocated Candidates</th>
                <th className="py-3 px-4">Vacant Desks</th>
                <th className="py-3 px-4">Fill Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {roomBreakdowns.map(({ room, usable, allocated, empty, fillRate }) => (
                <tr key={room.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-semibold text-white">{room.name}</td>
                  <td className="py-3 px-4">{room.block} (Floor {room.floor})</td>
                  <td className="py-3 px-4">
                    <span className="capitalize">{room.deskType} seater</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">{usable}</td>
                  <td className="py-3 px-4 font-mono font-bold text-brand-300">{allocated}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{empty}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-brand-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, fillRate)}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-200">{fillRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-white">Department Interleaving Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(deptCounts).map(([dept, count]) => (
            <div key={dept} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400 block truncate">{dept}</span>
              <span className="text-xl font-bold text-white mt-1 block">{count} candidates</span>
            </div>
          ))}
        </div>
      </div>

      {/* Unallocated Students (if any) */}
      {unallocated.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-amber-400">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-sm font-bold text-white">Unassigned Candidates ({unallocated.length})</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-800 text-xs">
            {unallocated.map((item) => {
              const student = studentsMap.get(item.studentId);
              const exam = examsMap.get(item.examId);
              return (
                <div key={item.studentId} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">{student?.name}</span>{' '}
                    <span className="font-mono text-slate-400">({student?.rollNo})</span>
                    <span className="text-slate-500 ml-2">— {exam?.code}</span>
                  </div>
                  <span className="text-rose-400 text-[11px]">{item.reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
