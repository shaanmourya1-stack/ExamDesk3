import { Student, Exam, Room, SeatingPlan, AllocationRules } from '../types';

export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'ex-cs301',
    code: 'CS-301',
    name: 'Data Structures & Algorithms',
    department: 'Computer Science',
    date: '2026-12-10',
    session: 'Morning',
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    durationMinutes: 180,
  },
  {
    id: 'ex-ee202',
    code: 'EE-202',
    name: 'Circuit Analysis & Network Synthesis',
    department: 'Electrical Engineering',
    date: '2026-12-10',
    session: 'Morning',
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    durationMinutes: 180,
  },
  {
    id: 'ex-me104',
    code: 'ME-104',
    name: 'Thermodynamics & Heat Transfer',
    department: 'Mechanical Engineering',
    date: '2026-12-10',
    session: 'Morning',
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    durationMinutes: 180,
  },
  {
    id: 'ex-bt201',
    code: 'BT-201',
    name: 'Molecular Genetics & Biotechnology',
    department: 'Biotechnology',
    date: '2026-12-10',
    session: 'Morning',
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    durationMinutes: 180,
  },
  {
    id: 'ex-cs302',
    code: 'CS-302',
    name: 'Operating Systems & Distributed Networks',
    department: 'Computer Science',
    date: '2026-12-10',
    session: 'Afternoon',
    startTime: '02:00 PM',
    endTime: '05:00 PM',
    durationMinutes: 180,
  },
  {
    id: 'ex-ee203',
    code: 'EE-203',
    name: 'Digital Signal Processing & Microcontrollers',
    department: 'Electrical Engineering',
    date: '2026-12-10',
    session: 'Afternoon',
    startTime: '02:00 PM',
    endTime: '05:00 PM',
    durationMinutes: 180,
  },
];

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-alpha',
    name: 'Hall 101 - Turing Hall',
    block: 'Block A',
    floor: 0,
    rows: 8,
    cols: 6,
    deskType: 'single',
    isGroundFloor: true,
    blockedSeats: ['room-alpha_r3_c2_s0'], // one broken desk
  },
  {
    id: 'room-theatre',
    name: 'Lecture Theatre 1 - Ramanujan Auditorium',
    block: 'Science Block',
    floor: 1,
    rows: 6,
    cols: 5,
    deskType: 'double', // 2 per bench (Left/Right) = 60 capacity
    isGroundFloor: false,
    blockedSeats: ['room-theatre_r0_c4_s1'], // damaged right seat
  },
  {
    id: 'room-beta',
    name: 'Hall 102 - Faraday Hall',
    block: 'Engineering Wing',
    floor: 0,
    rows: 5,
    cols: 4,
    deskType: 'single',
    isGroundFloor: true,
    blockedSeats: [],
  },
  {
    id: 'room-gamma',
    name: 'Hall 201 - Edison Complex',
    block: 'Tower B',
    floor: 2,
    rows: 6,
    cols: 4,
    deskType: 'single',
    isGroundFloor: false,
    blockedSeats: [],
  },
];

// Helper to generate realistic students
const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Aditya', 'Diya', 'Karan', 'Sneha',
  'Vikram', 'Isha', 'Arjun', 'Meera', 'Kabir', 'Tanvi', 'Rahul', 'Pooja',
  'Siddharth', 'Neha', 'Varun', 'Rhea', 'Manish', 'Kavita', 'Ayush', 'Simran',
  'Dev', 'Nandini', 'Harsh', 'Tara', 'Gaurav', 'Anika', 'Sahil', 'Shreya'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Iyer', 'Gupta', 'Singh', 'Nair',
  'Chopra', 'Malhotra', 'Bose', 'Rao', 'Das', 'Kapoor', 'Mehta', 'Joshi'
];

export function generateInitialStudents(): Student[] {
  const students: Student[] = [];
  let idCounter = 1;

  const cohorts = [
    { dept: 'Computer Science', prefix: 'CS', count: 32, examId: 'ex-cs301', afternoonExamId: 'ex-cs302' },
    { dept: 'Electrical Engineering', prefix: 'EE', count: 28, examId: 'ex-ee202', afternoonExamId: 'ex-ee203' },
    { dept: 'Mechanical Engineering', prefix: 'ME', count: 26, examId: 'ex-me104', afternoonExamId: undefined },
    { dept: 'Biotechnology', prefix: 'BT', count: 20, examId: 'ex-bt201', afternoonExamId: undefined },
  ];

  cohorts.forEach((cohort) => {
    for (let i = 1; i <= cohort.count; i++) {
      const fn = FIRST_NAMES[(idCounter + i * 3) % FIRST_NAMES.length];
      const ln = LAST_NAMES[(idCounter + i * 5) % LAST_NAMES.length];
      const rollNo = `${cohort.prefix}-2024-${String(i).padStart(3, '0')}`;
      
      const enrolled = [cohort.examId];
      if (cohort.afternoonExamId) {
        enrolled.push(cohort.afternoonExamId);
      }

      // Mark a couple students with special accommodations (wheelchair/mobility)
      const specialNeeds = (cohort.prefix === 'CS' && i === 3) || (cohort.prefix === 'EE' && i === 12);

      students.push({
        id: `stu-${cohort.prefix.toLowerCase()}-${i}`,
        rollNo,
        name: `${fn} ${ln}`,
        department: cohort.dept,
        semester: 5,
        email: `${rollNo.toLowerCase()}@university.edu`,
        specialNeeds,
        enrolledExamIds: enrolled,
      });

      idCounter++;
    }
  });

  return students;
}

export const DEFAULT_RULES: AllocationRules = {
  antiCheatStrictness: 'adjacent_all', // 8-direction anti-cheating check
  branchAlternation: true, // Alternate departments
  densityPattern: 'full', // Can be 'full', 'checkerboard', 'staggered'
  rollOrder: 'sequential_snake', // Snake order keeps cohorts orderly while interleaving
  roomStrategy: 'balance_evenly',
  prioritizeSpecialNeedsFrontRow: true,
};

export const INITIAL_SEATING_PLAN: SeatingPlan = {
  id: 'plan-dec-morning',
  name: 'Semester Final Examinations - Morning Session',
  examDate: '2026-12-10',
  session: 'Morning',
  selectedRoomIds: ['room-alpha', 'room-theatre', 'room-beta'],
  selectedExamIds: ['ex-cs301', 'ex-ee202', 'ex-me104', 'ex-bt201'],
  rules: { ...DEFAULT_RULES },
  assignments: {},
  stats: null,
  status: 'draft',
};
