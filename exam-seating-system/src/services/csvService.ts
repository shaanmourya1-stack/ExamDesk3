import { Student, Exam, Room, SeatingPlan } from '../types';

/**
 * Downloads a string as a CSV file in the browser.
 */
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports current seating allocation to CSV (Room-wise or Overall).
 */
export function exportAllocationToCSV(
  plan: SeatingPlan,
  students: Student[],
  exams: Exam[],
  rooms: Room[],
  roomIdFilter?: string
): string {
  const studentsMap = new Map(students.map((s) => [s.id, s]));
  const examsMap = new Map(exams.map((e) => [e.id, e]));
  const roomsMap = new Map(rooms.map((r) => [r.id, r]));

  const headers = [
    'Room Name',
    'Block / Floor',
    'Seat Label',
    'Student Roll No',
    'Student Name',
    'Department',
    'Semester',
    'Subject Code',
    'Subject Name',
    'Date',
    'Session',
    'Seat Status',
  ];

  const rows: string[][] = [];

  for (const [seatKey, assign] of Object.entries(plan.assignments)) {
    const parts = seatKey.split('_'); // roomId, rX, cY, sZ
    const roomId = parts[0];

    if (roomIdFilter && roomId !== roomIdFilter) continue;

    const room = roomsMap.get(roomId);
    const student = assign?.studentId ? studentsMap.get(assign.studentId) : undefined;
    const exam = assign?.examId ? examsMap.get(assign.examId) : undefined;

    // Parse row, col, slot
    const rMatch = parts[1]?.replace('r', '') || '0';
    const cMatch = parts[2]?.replace('c', '') || '0';
    const sMatch = parts[3]?.replace('s', '') || '0';
    const slotSuffix = room?.deskType === 'double' ? (sMatch === '0' ? ' Left' : ' Right') : '';
    const seatLabel = `Row ${parseInt(rMatch) + 1}, Desk ${parseInt(cMatch) + 1}${slotSuffix}`;

    rows.push([
      escapeCSV(room?.name || roomId),
      escapeCSV(`${room?.block || ''} (Floor ${room?.floor ?? ''})`),
      escapeCSV(seatLabel),
      escapeCSV(student?.rollNo || 'N/A'),
      escapeCSV(student?.name || 'Unassigned'),
      escapeCSV(student?.department || 'N/A'),
      escapeCSV(student?.semester?.toString() || 'N/A'),
      escapeCSV(exam?.code || 'N/A'),
      escapeCSV(exam?.name || 'N/A'),
      escapeCSV(plan.examDate),
      escapeCSV(plan.session),
      escapeCSV(assign?.isLocked ? 'Admin Locked' : 'Allocated'),
    ]);
  }

  // Sort rows by Room name, then Roll number
  rows.sort((a, b) => a[0].localeCompare(b[0]) || a[3].localeCompare(b[3]));

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Exports invigilator attendance sheet as CSV
 */
export function exportAttendanceSheetCSV(
  plan: SeatingPlan,
  students: Student[],
  exams: Exam[],
  rooms: Room[],
  roomId: string
): string {
  const studentsMap = new Map(students.map((s) => [s.id, s]));
  const examsMap = new Map(exams.map((e) => [e.id, e]));
  const room = rooms.find((r) => r.id === roomId);

  const headers = [
    'S.No',
    'Seat Label',
    'Roll Number',
    'Student Name',
    'Subject Code',
    'Answer Booklet No',
    'Signature',
  ];

  const rows: string[][] = [];
  let index = 1;

  for (const [seatKey, assign] of Object.entries(plan.assignments)) {
    if (!seatKey.startsWith(roomId) || !assign.studentId) continue;

    const student = studentsMap.get(assign.studentId);
    const exam = examsMap.get(assign.examId);
    const parts = seatKey.split('_');
    const rMatch = parts[1]?.replace('r', '') || '0';
    const cMatch = parts[2]?.replace('c', '') || '0';
    const sMatch = parts[3]?.replace('s', '') || '0';
    const slotSuffix = room?.deskType === 'double' ? (sMatch === '0' ? 'L' : 'R') : '';
    const seatLabel = `R${parseInt(rMatch) + 1}-C${parseInt(cMatch) + 1}${slotSuffix}`;

    rows.push([
      (index++).toString(),
      escapeCSV(seatLabel),
      escapeCSV(student?.rollNo || ''),
      escapeCSV(student?.name || ''),
      escapeCSV(exam?.code || ''),
      '_______________',
      '_______________',
    ]);
  }

  return [
    `# Invigilator Attendance Sheet - ${room?.name || 'Hall'}`,
    `# Date: ${plan.examDate} | Session: ${plan.session}`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');
}

/**
 * Parses user-uploaded student CSV file
 */
export function parseStudentsCSV(csvText: string): { students: Student[]; errors: string[] } {
  const lines = csvText.trim().split(/\r?\n/);
  const students: Student[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push('CSV must have a header row and at least one student data row.');
    return { students, errors };
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rollIndex = header.findIndex((h) => h.includes('roll'));
  const nameIndex = header.findIndex((h) => h.includes('name'));
  const deptIndex = header.findIndex((h) => h.includes('dept') || h.includes('branch'));
  const semIndex = header.findIndex((h) => h.includes('sem'));
  const examIndex = header.findIndex((h) => h.includes('exam') || h.includes('subject'));

  if (rollIndex === -1 || nameIndex === -1) {
    errors.push('CSV is missing required headers: "Roll No" and "Name".');
    return { students, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    const rollNo = cols[rollIndex];
    const name = cols[nameIndex];
    if (!rollNo || !name) {
      errors.push(`Row ${i + 1}: Missing roll number or student name.`);
      continue;
    }

    const department = deptIndex !== -1 && cols[deptIndex] ? cols[deptIndex] : 'General';
    const semester = semIndex !== -1 && parseInt(cols[semIndex]) ? parseInt(cols[semIndex]) : 1;
    const examsRaw = examIndex !== -1 && cols[examIndex] ? cols[examIndex] : '';
    const enrolledExamIds = examsRaw
      ? examsRaw.split(';').map((s) => s.trim().toLowerCase())
      : [];

    students.push({
      id: `imported-${rollNo.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      rollNo,
      name,
      department,
      semester,
      enrolledExamIds,
    });
  }

  return { students, errors };
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
