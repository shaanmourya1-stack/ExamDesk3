import React, { useState, useEffect } from 'react';
import {
  Student,
  Exam,
  Room,
  SeatingPlan,
  SeatAssignment,
  AllocationRules,
} from './types';
import {
  INITIAL_EXAMS,
  INITIAL_ROOMS,
  INITIAL_SEATING_PLAN,
  DEFAULT_RULES,
  generateInitialStudents,
} from './services/mockData';
import {
  runAllocationSolver,
  validateAllocations,
  checkPreAllocationConflicts,
} from './services/allocationEngine';
import { Navbar } from './components/Navbar';
import { RoomGrid } from './components/RoomGrid';
import { DataManagement } from './components/DataManagement';
import { RoomManagement } from './components/RoomManagement';
import { PrintSuite } from './components/PrintSuite';
import { StudentSearch } from './components/StudentSearch';
import { AuditReport } from './components/AuditReport';
import { RulesConfig } from './components/RulesConfig';
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => generateInitialStudents());
  const [exams, setExams] = useState<Exam[]>(() => INITIAL_EXAMS);
  const [rooms, setRooms] = useState<Room[]>(() => INITIAL_ROOMS);
  const [plan, setPlan] = useState<SeatingPlan>(() => INITIAL_SEATING_PLAN);

  const [activeTab, setActiveTab] = useState<string>('matrix');
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isAllocating, setIsAllocating] = useState<boolean>(false);
  const [highlightedSeatKey, setHighlightedSeatKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'warn'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'warn', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  // Run initial allocation on mount so the user has an immediate, working plan
  useEffect(() => {
    if (Object.keys(plan.assignments).length === 0) {
      const result = runAllocationSolver(plan, students, exams, rooms);
      setPlan((prev) => ({
        ...prev,
        assignments: result.assignments,
        stats: result.stats,
        status: 'allocated',
      }));
    }
  }, []);

  // Primary Solver Trigger
  const handleRunAllocation = () => {
    setIsAllocating(true);

    setTimeout(() => {
      // 1. Pre-allocation conflict check
      const selectedRooms = rooms.filter((r) => plan.selectedRoomIds.includes(r.id));
      const selectedExams = exams.filter((e) => plan.selectedExamIds.includes(e.id));
      const preCheck = checkPreAllocationConflicts(students, selectedExams, selectedRooms, plan.rules);

      if (!preCheck.canProceed) {
        showToast('warn', preCheck.errors[0] || 'Unable to allocate. Please resolve conflicts.');
        setIsAllocating(false);
        return;
      }

      // 2. Run solver
      const { assignments, stats } = runAllocationSolver(plan, students, exams, rooms);

      setPlan((prev) => ({
        ...prev,
        assignments,
        stats,
        status: 'allocated',
      }));

      setIsAllocating(false);

      if (stats.violations.length === 0) {
        showToast(
          'success',
          `Generated seating plan: ${stats.allocatedStudents} students seated with 100% anti-cheating compliance!`
        );
      } else {
        showToast(
          'warn',
          `Allocated ${stats.allocatedStudents} candidates. ${stats.violations.length} policy alerts detected.`
        );
      }
    }, 400);
  };

  // Update Seating Rules
  const handleSaveRules = (newRules: AllocationRules) => {
    const updatedPlan: SeatingPlan = {
      ...plan,
      rules: newRules,
    };
    setPlan(updatedPlan);

    // Re-run solver with new rules
    const { assignments, stats } = runAllocationSolver(updatedPlan, students, exams, rooms);
    setPlan((prev) => ({
      ...prev,
      rules: newRules,
      assignments,
      stats,
    }));

    showToast('success', 'Rules updated and seating automatically optimized.');
  };

  // Reset to initial mock dataset
  const handleResetData = () => {
    const initStudents = generateInitialStudents();
    const initExams = [...INITIAL_EXAMS];
    const initRooms = [...INITIAL_ROOMS];
    const initPlan: SeatingPlan = {
      ...INITIAL_SEATING_PLAN,
      rules: { ...DEFAULT_RULES },
    };

    setStudents(initStudents);
    setExams(initExams);
    setRooms(initRooms);

    const { assignments, stats } = runAllocationSolver(initPlan, initStudents, initExams, initRooms);
    setPlan({
      ...initPlan,
      assignments,
      stats,
      status: 'allocated',
    });

    showToast('success', 'Reset system to default demonstration state with fresh cohort.');
  };

  // Manual Assignment Update (e.g. Lock / Unlock or Unassign)
  const handleUpdateAssignment = (seatKey: string, assignment: SeatAssignment | null) => {
    setPlan((prev) => {
      const nextAssignments = { ...prev.assignments };
      if (assignment) {
        nextAssignments[seatKey] = assignment;
      } else {
        delete nextAssignments[seatKey];
      }

      // Re-validate violations
      const studentsMap = new Map(students.map((s) => [s.id, s]));
      const examsMap = new Map(exams.map((e) => [e.id, e]));
      const activeRooms = rooms.filter((r) => prev.selectedRoomIds.includes(r.id));
      const violations = validateAllocations(nextAssignments, activeRooms, studentsMap, examsMap, prev.rules);

      return {
        ...prev,
        assignments: nextAssignments,
        stats: prev.stats
          ? {
              ...prev.stats,
              allocatedStudents: Object.keys(nextAssignments).length,
              violations,
            }
          : null,
      };
    });
  };

  // Manual Swap Two Seats
  const handleSwapAssignments = (seatKey1: string, seatKey2: string) => {
    setPlan((prev) => {
      const nextAssignments = { ...prev.assignments };
      const assign1 = nextAssignments[seatKey1];
      const assign2 = nextAssignments[seatKey2];

      if (assign1) {
        nextAssignments[seatKey2] = assign1;
      } else {
        delete nextAssignments[seatKey2];
      }

      if (assign2) {
        nextAssignments[seatKey1] = assign2;
      } else {
        delete nextAssignments[seatKey1];
      }

      // Re-validate violations
      const studentsMap = new Map(students.map((s) => [s.id, s]));
      const examsMap = new Map(exams.map((e) => [e.id, e]));
      const activeRooms = rooms.filter((r) => prev.selectedRoomIds.includes(r.id));
      const violations = validateAllocations(nextAssignments, activeRooms, studentsMap, examsMap, prev.rules);

      return {
        ...prev,
        assignments: nextAssignments,
        stats: prev.stats
          ? {
              ...prev.stats,
              violations,
            }
          : null,
      };
    });
  };

  // Toggle Broken / Out-of-order Seat
  const handleToggleSeatBlocked = (roomId: string, seatKey: string) => {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId) return room;
        const isBlocked = room.blockedSeats.includes(seatKey);
        const newBlocked = isBlocked
          ? room.blockedSeats.filter((k) => k !== seatKey)
          : [...room.blockedSeats, seatKey];
        return {
          ...room,
          blockedSeats: newBlocked,
        };
      })
    );

    // If occupied, unassign student from broken seat
    if (plan.assignments[seatKey]) {
      handleUpdateAssignment(seatKey, null);
    }
  };

  // Jump from Student Lookup to Visual Room Grid
  const handleLocateOnMap = (roomId: string, seatKey: string) => {
    setActiveTab('matrix');
    setHighlightedSeatKey(seatKey);
    setTimeout(() => {
      setHighlightedSeatKey(null);
    }, 6000);
  };

  // Data management delegates
  const handleAddStudent = (student: Student) => {
    setStudents((prev) => [student, ...prev]);
    showToast('success', `Added candidate ${student.name} (${student.rollNo})`);
  };

  const handleUpdateStudent = (student: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
    showToast('success', `Updated student ${student.name}`);
  };

  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    // also unassign if in plan
    for (const [seatKey, assign] of Object.entries(plan.assignments)) {
      if (assign.studentId === id) {
        handleUpdateAssignment(seatKey, null);
      }
    }
    showToast('warn', 'Candidate deleted from records.');
  };

  const handleBulkAddStudents = (newStudents: Student[]) => {
    setStudents((prev) => [...newStudents, ...prev]);
    showToast('success', `Imported ${newStudents.length} candidates from CSV.`);
  };

  const handleAddExam = (exam: Exam) => {
    setExams((prev) => [...prev, exam]);
    setPlan((prev) => ({
      ...prev,
      selectedExamIds: [...prev.selectedExamIds, exam.id],
    }));
    showToast('success', `Registered course ${exam.code} (${exam.name})`);
  };

  const handleDeleteExam = (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    setPlan((prev) => ({
      ...prev,
      selectedExamIds: prev.selectedExamIds.filter((eId) => eId !== id),
    }));
    showToast('warn', 'Examination removed.');
  };

  const handleAddRoom = (room: Room) => {
    setRooms((prev) => [...prev, room]);
    setPlan((prev) => ({
      ...prev,
      selectedRoomIds: [...prev.selectedRoomIds, room.id],
    }));
    showToast('success', `Added hall ${room.name}`);
  };

  const handleDeleteRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    setPlan((prev) => ({
      ...prev,
      selectedRoomIds: prev.selectedRoomIds.filter((rId) => rId !== id),
    }));
    showToast('warn', 'Examination hall removed.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center space-x-2.5 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
                : 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-amber-950/50'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        plan={plan}
        onOpenRules={() => setIsRulesOpen(true)}
        onRunAllocation={handleRunAllocation}
        onResetData={handleResetData}
        isAllocating={isAllocating}
      />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'matrix' && (
          <RoomGrid
            rooms={rooms.filter((r) => plan.selectedRoomIds.includes(r.id))}
            students={students}
            exams={exams}
            plan={plan}
            onUpdateAssignment={handleUpdateAssignment}
            onSwapAssignments={handleSwapAssignments}
            onToggleSeatBlocked={handleToggleSeatBlocked}
            highlightedSeatKey={highlightedSeatKey}
          />
        )}

        {activeTab === 'data' && (
          <DataManagement
            students={students}
            exams={exams}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onBulkAddStudents={handleBulkAddStudents}
            onAddExam={handleAddExam}
            onDeleteExam={handleDeleteExam}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomManagement
            rooms={rooms}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        )}

        {activeTab === 'search' && (
          <StudentSearch
            students={students}
            exams={exams}
            rooms={rooms}
            plan={plan}
            onLocateOnMap={handleLocateOnMap}
          />
        )}

        {activeTab === 'print' && (
          <PrintSuite
            plan={plan}
            students={students}
            exams={exams}
            rooms={rooms.filter((r) => plan.selectedRoomIds.includes(r.id))}
          />
        )}

        {activeTab === 'reports' && (
          <AuditReport
            plan={plan}
            students={students}
            exams={exams}
            rooms={rooms.filter((r) => plan.selectedRoomIds.includes(r.id))}
          />
        )}
      </main>

      {/* Rules & Policy Configuration Modal */}
      <RulesConfig
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        rules={plan.rules}
        onSaveRules={handleSaveRules}
      />

      {/* Footer */}
      <footer className="no-print border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        ExamDesk Pro • Institutional Examination Seating Allocation & Anti-Cheating Suite • Dec 2026
      </footer>
    </div>
  );
};
