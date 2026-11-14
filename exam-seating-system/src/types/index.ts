export interface Student {
  id: string;
  rollNo: string;
  name: string;
  department: string;
  semester: number;
  email?: string;
  specialNeeds?: boolean; // requires ground floor / front row
  enrolledExamIds: string[]; // IDs of exams student is taking
}

export interface Exam {
  id: string;
  code: string;
  name: string;
  department: string;
  date: string;
  session: 'Morning' | 'Afternoon';
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export type DeskType = 'single' | 'double';

export interface Room {
  id: string;
  name: string;
  block: string;
  floor: number;
  rows: number;
  cols: number;
  deskType: DeskType; // 'single' = 1 seat per desk, 'double' = 2 seats per bench (Left/Right)
  isGroundFloor: boolean;
  blockedSeats: string[]; // Array of seat keys that are broken or unavailable, e.g. "r0-c2-0"
}

export interface SeatPosition {
  roomId: string;
  row: number;
  col: number;
  slotIndex: number; // 0 for single / left, 1 for right in double
  seatKey: string;
  label: string; // e.g., "R1-C2-L"
}

export interface SeatAssignment {
  studentId: string;
  examId: string;
  isLocked?: boolean;
}

export interface RuleViolation {
  id: string;
  type: 'same_exam_adjacent' | 'same_department_adjacent' | 'duplicate_student' | 'capacity_exceeded';
  severity: 'error' | 'warning';
  roomId: string;
  seatKey1: string;
  seatKey2?: string;
  studentId1: string;
  studentId2?: string;
  description: string;
}

export interface AllocationRules {
  antiCheatStrictness: 'none' | 'adjacent_horizontal' | 'adjacent_all'; // horizontal only or 8-way
  branchAlternation: boolean; // alternate departments
  densityPattern: 'full' | 'checkerboard' | 'staggered';
  rollOrder: 'sequential_snake' | 'sequential_col' | 'randomized';
  roomStrategy: 'balance_evenly' | 'fill_largest_first';
  prioritizeSpecialNeedsFrontRow: boolean;
}

export interface AllocationStats {
  totalStudents: number;
  allocatedStudents: number;
  unallocatedStudents: { studentId: string; examId: string; reason: string }[];
  totalCapacity: number;
  effectiveCapacity: number;
  utilizationRate: number;
  violations: RuleViolation[];
  executionTimeMs: number;
  timestamp: string;
}

export interface SeatingPlan {
  id: string;
  name: string;
  examDate: string;
  session: 'Morning' | 'Afternoon';
  selectedRoomIds: string[];
  selectedExamIds: string[];
  rules: AllocationRules;
  // seatKey -> Assignment
  assignments: Record<string, SeatAssignment>;
  stats: AllocationStats | null;
  status: 'draft' | 'allocated' | 'published';
}
