import {
  Student,
  Exam,
  Room,
  AllocationRules,
  SeatPosition,
  SeatAssignment,
  RuleViolation,
  AllocationStats,
  SeatingPlan,
} from '../types';

export interface RoomGridSeat extends SeatPosition {
  isBlocked: boolean;
  isUsable: boolean;
  assignment?: SeatAssignment;
}

/**
 * Generates all possible seat coordinates for a given room.
 */
export function generateRoomSeats(room: Room, pattern: AllocationRules['densityPattern'] = 'full'): RoomGridSeat[] {
  const seats: RoomGridSeat[] = [];
  const slotsPerDesk = room.deskType === 'double' ? 2 : 1;

  for (let r = 0; r < room.rows; r++) {
    for (let c = 0; c < room.cols; c++) {
      for (let s = 0; s < slotsPerDesk; s++) {
        const seatKey = `${room.id}_r${r}_c${c}_s${s}`;
        const isBlocked = room.blockedSeats.includes(seatKey);
        
        // Density filter:
        let isUsable = !isBlocked;
        if (pattern === 'checkerboard') {
          // In checkerboard, alternate desks
          const deskChecker = (r + c) % 2 === 0;
          if (room.deskType === 'double') {
            // For double desk, only 1 student per bench in checkerboard mode (slot 0)
            isUsable = isUsable && deskChecker && s === 0;
          } else {
            isUsable = isUsable && deskChecker;
          }
        } else if (pattern === 'staggered') {
          // Staggered pattern: alternate columns in alternate rows
          const stagger = r % 2 === 0 ? c % 2 === 0 : c % 2 !== 0;
          isUsable = isUsable && stagger;
        }

        const slotSuffix = room.deskType === 'double' ? (s === 0 ? 'L' : 'R') : '';
        const label = `R${r + 1}-C${c + 1}${slotSuffix ? ' ' + slotSuffix : ''}`;

        seats.push({
          roomId: room.id,
          row: r,
          col: c,
          slotIndex: s,
          seatKey,
          label,
          isBlocked,
          isUsable,
        });
      }
    }
  }

  return seats;
}

/**
 * Checks all neighbors for conflicts (anti-cheating, branch alternation, duplicates)
 */
export function validateAllocations(
  assignments: Record<string, SeatAssignment>,
  rooms: Room[],
  studentsMap: Map<string, Student>,
  examsMap: Map<string, Exam>,
  rules: AllocationRules
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const assignedStudents = new Map<string, string>(); // studentId -> seatKey

  // Check 1: Duplicate student assignments
  for (const [seatKey, assign] of Object.entries(assignments)) {
    if (!assign || !assign.studentId) continue;
    if (assignedStudents.has(assign.studentId)) {
      const prevSeat = assignedStudents.get(assign.studentId)!;
      violations.push({
        id: `dup-${assign.studentId}-${seatKey}`,
        type: 'duplicate_student',
        severity: 'error',
        roomId: seatKey.split('_')[0],
        seatKey1: prevSeat,
        seatKey2: seatKey,
        studentId1: assign.studentId,
        studentId2: assign.studentId,
        description: `Student ${studentsMap.get(assign.studentId)?.rollNo || assign.studentId} is allocated to multiple seats!`,
      });
    } else {
      assignedStudents.set(assign.studentId, seatKey);
    }
  }

  // Check 2: Spatial adjacency violations per room
  for (const room of rooms) {
    const seats = generateRoomSeats(room, 'full'); // check all physical locations
    const seatMap = new Map<string, RoomGridSeat>();
    seats.forEach((s) => seatMap.set(s.seatKey, s));

    for (const seat of seats) {
      const assign1 = assignments[seat.seatKey];
      if (!assign1 || !assign1.studentId) continue;

      const student1 = studentsMap.get(assign1.studentId);
      const exam1 = examsMap.get(assign1.examId);
      if (!student1 || !exam1) continue;

      // Define neighbors based on strictness
      const neighborDeltas: { dr: number; dc: number; ds?: number; name: string; isDirect: boolean }[] = [];

      // Same bench neighbor (if double desk and opposite slot)
      if (room.deskType === 'double') {
        const otherSlot = seat.slotIndex === 0 ? 1 : 0;
        neighborDeltas.push({ dr: 0, dc: 0, ds: otherSlot, name: 'same bench', isDirect: true });
      }

      // Horizontal immediate neighbors
      neighborDeltas.push({ dr: 0, dc: -1, name: 'left', isDirect: true });
      neighborDeltas.push({ dr: 0, dc: 1, name: 'right', isDirect: true });

      // Vertical immediate neighbors
      neighborDeltas.push({ dr: -1, dc: 0, name: 'front', isDirect: true });
      neighborDeltas.push({ dr: 1, dc: 0, name: 'behind', isDirect: true });

      // Diagonal neighbors if strict
      if (rules.antiCheatStrictness === 'adjacent_all') {
        neighborDeltas.push({ dr: -1, dc: -1, name: 'front-left diagonal', isDirect: false });
        neighborDeltas.push({ dr: -1, dc: 1, name: 'front-right diagonal', isDirect: false });
        neighborDeltas.push({ dr: 1, dc: -1, name: 'back-left diagonal', isDirect: false });
        neighborDeltas.push({ dr: 1, dc: 1, name: 'back-right diagonal', isDirect: false });
      }

      for (const delta of neighborDeltas) {
        let neighborKey: string;
        if (delta.ds !== undefined) {
          neighborKey = `${room.id}_r${seat.row}_c${seat.col}_s${delta.ds}`;
        } else {
          // For other desks, check slots in that desk
          const targetRow = seat.row + delta.dr;
          const targetCol = seat.col + delta.dc;
          // check slot 0 or slot 1
          const slotsToCheck = room.deskType === 'double' ? [0, 1] : [0];
          for (const s of slotsToCheck) {
            neighborKey = `${room.id}_r${targetRow}_c${targetCol}_s${s}`;
            checkAdjacencyPair(seat, neighborKey, delta.name);
          }
          continue;
        }

        checkAdjacencyPair(seat, neighborKey, delta.name);
      }

      function checkAdjacencyPair(s1: RoomGridSeat, nKey: string, directionName: string) {
        // Prevent duplicate symmetric violation reports (only report when seatKey1 < seatKey2)
        if (s1.seatKey >= nKey) return;

        const assign2 = assignments[nKey];
        if (!assign2 || !assign2.studentId) return;

        const student2 = studentsMap.get(assign2.studentId);
        const exam2 = examsMap.get(assign2.examId);
        if (!student2 || !exam2) return;

        // Anti-cheating rule: same exam adjacent
        if (rules.antiCheatStrictness !== 'none' && assign1.examId === assign2.examId) {
          violations.push({
            id: `cheat-${s1.seatKey}-${nKey}`,
            type: 'same_exam_adjacent',
            severity: 'error',
            roomId: room.id,
            seatKey1: s1.seatKey,
            seatKey2: nKey,
            studentId1: student1.id,
            studentId2: student2.id,
            description: `Same exam (${exam1.code}) assigned to adjacent desks (${s1.label} and ${seatMap.get(nKey)?.label || nKey}) [${directionName}]`,
          });
        }

        // Branch alternation rule
        if (rules.branchAlternation && student1.department === student2.department && assign1.examId === assign2.examId) {
          // If already flagged under same_exam, don't duplicate unless separate
          if (rules.antiCheatStrictness === 'none') {
            violations.push({
              id: `branch-${s1.seatKey}-${nKey}`,
              type: 'same_department_adjacent',
              severity: 'warning',
              roomId: room.id,
              seatKey1: s1.seatKey,
              seatKey2: nKey,
              studentId1: student1.id,
              studentId2: student2.id,
              description: `Same department (${student1.department}) students adjacent on ${s1.label} & ${seatMap.get(nKey)?.label || nKey}`,
            });
          }
        }
      }
    }
  }

  return violations;
}

/**
 * Pre-allocation conflict check:
 * - Checks for students with overlapping exams in the same session
 * - Checks total capacity vs total candidate students
 */
export function checkPreAllocationConflicts(
  students: Student[],
  exams: Exam[],
  rooms: Room[],
  rules: AllocationRules
): { canProceed: boolean; errors: string[]; warnings: string[]; totalEligible: number; totalCapacity: number } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const examMap = new Map(exams.map((e) => [e.id, e]));

  // Check 1: Student slot overlaps
  let totalEligible = 0;
  for (const student of students) {
    const activeExams = student.enrolledExamIds.filter((id) => examMap.has(id));
    if (activeExams.length > 1) {
      errors.push(
        `Conflict: Student ${student.name} (${student.rollNo}) is enrolled in ${activeExams.length} simultaneous exams (${activeExams.map((id) => examMap.get(id)?.code).join(', ')})!`
      );
    }
    if (activeExams.length > 0) {
      totalEligible++;
    }
  }

  // Check 2: Total usable capacity
  let totalCapacity = 0;
  for (const room of rooms) {
    const usableSeats = generateRoomSeats(room, rules.densityPattern).filter((s) => s.isUsable);
    totalCapacity += usableSeats.length;
  }

  if (totalEligible > totalCapacity) {
    warnings.push(
      `Insufficient Capacity: Total students (${totalEligible}) exceeds total usable seats (${totalCapacity}). Some students will remain unallocated.`
    );
  }

  if (totalEligible === 0) {
    errors.push('No students enrolled in the selected exams for this session.');
  }

  return {
    canProceed: errors.length === 0,
    errors,
    warnings,
    totalEligible,
    totalCapacity,
  };
}

/**
 * Primary Automated Seating Allocation Solver
 */
export function runAllocationSolver(
  plan: SeatingPlan,
  allStudents: Student[],
  allExams: Exam[],
  allRooms: Room[]
): { assignments: Record<string, SeatAssignment>; stats: AllocationStats } {
  const startTime = performance.now();

  const selectedRooms = allRooms.filter((r) => plan.selectedRoomIds.includes(r.id));
  const selectedExams = allExams.filter((e) => plan.selectedExamIds.includes(e.id));
  const examMap = new Map(selectedExams.map((e) => [e.id, e]));
  const studentsMap = new Map(allStudents.map((s) => [s.id, s]));

  // 1. Preserve existing locked seats
  const newAssignments: Record<string, SeatAssignment> = {};
  const alreadyAllocatedStudentIds = new Set<string>();

  for (const [seatKey, assign] of Object.entries(plan.assignments)) {
    if (assign && assign.isLocked && assign.studentId) {
      newAssignments[seatKey] = { ...assign };
      alreadyAllocatedStudentIds.add(assign.studentId);
    }
  }

  // 2. Identify candidate students for this plan
  interface Candidate {
    student: Student;
    examId: string;
  }
  const candidatePool: Candidate[] = [];

  for (const student of allStudents) {
    if (alreadyAllocatedStudentIds.has(student.id)) continue;

    const matchedExam = student.enrolledExamIds.find((id) => examMap.has(id));
    if (matchedExam) {
      candidatePool.push({
        student,
        examId: matchedExam,
      });
    }
  }

  // 3. Sort / Group candidates according to rules
  // Group by examId
  const examGroups = new Map<string, Candidate[]>();
  selectedExams.forEach((e) => examGroups.set(e.id, []));

  candidatePool.forEach((c) => {
    const list = examGroups.get(c.examId);
    if (list) list.push(c);
  });

  // Sort within each group by roll number or random
  examGroups.forEach((group) => {
    if (plan.rules.rollOrder === 'randomized') {
      group.sort(() => Math.random() - 0.5);
    } else {
      // Natural sort roll numbers
      group.sort((a, b) => a.student.rollNo.localeCompare(b.student.rollNo, undefined, { numeric: true }));
    }
  });

  // Separate special needs students if prioritization is on
  const specialNeedsCandidates: Candidate[] = [];
  const standardCandidates: Candidate[] = [];

  if (plan.rules.prioritizeSpecialNeedsFrontRow) {
    examGroups.forEach((group) => {
      group.forEach((cand) => {
        if (cand.student.specialNeeds) {
          specialNeedsCandidates.push(cand);
        } else {
          standardCandidates.push(cand);
        }
      });
    });
  } else {
    examGroups.forEach((group) => {
      standardCandidates.push(...group);
    });
  }

  // Multi-Exam Interleaving (Anti-cheating / Branch alternation core strategy):
  // We interleave candidates round-robin from each exam cohort
  const interleavedCandidates: Candidate[] = [];
  const groupArrays = Array.from(examGroups.values());
  let hasMore = true;
  let round = 0;

  while (hasMore) {
    hasMore = false;
    for (const group of groupArrays) {
      // Filter out special needs if already placed in special needs list
      const candidate = group[round];
      if (candidate) {
        if (!plan.rules.prioritizeSpecialNeedsFrontRow || !candidate.student.specialNeeds) {
          interleavedCandidates.push(candidate);
        }
        hasMore = true;
      }
    }
    round++;
  }

  // 4. Collect and Order Seats across all selected rooms
  // Sort rooms based on strategy
  const orderedRooms = [...selectedRooms];
  if (plan.rules.roomStrategy === 'fill_largest_first') {
    orderedRooms.sort((a, b) => b.rows * b.cols - a.rows * a.cols);
  } else {
    // balance evenly or keep defined order
  }

  // Gather usable seats
  const roomSeatsMap = new Map<string, RoomGridSeat[]>();
  let totalUsableSeats = 0;
  let totalPhysicalCapacity = 0;

  for (const room of orderedRooms) {
    const allSeats = generateRoomSeats(room, plan.rules.densityPattern);
    const usable = allSeats.filter((s) => s.isUsable && !newAssignments[s.seatKey]);
    roomSeatsMap.set(room.id, usable);
    totalUsableSeats += usable.length;
    totalPhysicalCapacity += allSeats.filter((s) => !s.isBlocked).length;
  }

  // 5. Special Needs Placement (Front row, ground floor accessible)
  for (const specialCand of specialNeedsCandidates) {
    let placed = false;
    // Find ground floor room, row 0
    for (const room of orderedRooms) {
      if (room.isGroundFloor || room.floor === 0) {
        const seats = roomSeatsMap.get(room.id) || [];
        const frontSeatIndex = seats.findIndex((s) => s.row === 0 && !newAssignments[s.seatKey]);
        if (frontSeatIndex !== -1) {
          const seat = seats[frontSeatIndex];
          newAssignments[seat.seatKey] = {
            studentId: specialCand.student.id,
            examId: specialCand.examId,
          };
          seats.splice(frontSeatIndex, 1);
          placed = true;
          break;
        }
      }
    }
    // If not placed in ground row 0, fallback to standard queue
    if (!placed) {
      interleavedCandidates.unshift(specialCand);
    }
  }

  // 6. Ordered Seat Traversal (Snake pattern vs Column-first vs Row-first)
  // For each room, arrange seats in snake pattern:
  // Col 0 (down), Col 1 (up), Col 2 (down) — this provides optimal spatial separation!
  interface TraversalSeat {
    seat: RoomGridSeat;
    room: Room;
  }
  const orderedSeatQueue: TraversalSeat[] = [];

  for (const room of orderedRooms) {
    const seats = roomSeatsMap.get(room.id) || [];
    const seatGrid: (RoomGridSeat | null)[][][] = []; // [row][col][slot]

    for (let r = 0; r < room.rows; r++) {
      seatGrid[r] = [];
      for (let c = 0; c < room.cols; c++) {
        seatGrid[r][c] = [];
      }
    }

    seats.forEach((s) => {
      seatGrid[s.row][s.col][s.slotIndex] = s;
    });

    if (plan.rules.rollOrder === 'sequential_snake') {
      // Snake pattern: Column by Column, alternating up and down
      for (let c = 0; c < room.cols; c++) {
        const rowIndices = Array.from({ length: room.rows }, (_, i) => i);
        if (c % 2 === 1) rowIndices.reverse(); // snake up

        for (const r of rowIndices) {
          const slots = seatGrid[r][c];
          if (slots) {
            slots.forEach((s) => {
              if (s && !newAssignments[s.seatKey]) {
                orderedSeatQueue.push({ seat: s, room });
              }
            });
          }
        }
      }
    } else {
      // Row by row standard
      for (let r = 0; r < room.rows; r++) {
        for (let c = 0; c < room.cols; c++) {
          const slots = seatGrid[r][c];
          if (slots) {
            slots.forEach((s) => {
              if (s && !newAssignments[s.seatKey]) {
                orderedSeatQueue.push({ seat: s, room });
              }
            });
          }
        }
      }
    }
  }

  // 7. Allocation Placement with Lookahead Conflict Avoidance
  const unallocatedList: { studentId: string; examId: string; reason: string }[] = [];
  const candidateQueue = [...interleavedCandidates];

  for (const { seat, room } of orderedSeatQueue) {
    if (candidateQueue.length === 0) break;

    // Find the first candidate in queue that doesn't violate anti-cheating with adjacent seats
    let chosenIndex = -1;

    for (let i = 0; i < candidateQueue.length; i++) {
      const cand = candidateQueue[i];

      // Check conflict against already placed neighbors in this room
      const hasConflict = checkSeatCandidateConflict(
        seat,
        cand,
        room,
        newAssignments,
        plan.rules
      );

      if (!hasConflict) {
        chosenIndex = i;
        break;
      }
    }

    // If all candidates in queue have conflict (e.g. only 1 exam cohort remains),
    // pick the first one and let the post-validator log it
    if (chosenIndex === -1 && candidateQueue.length > 0) {
      chosenIndex = 0;
    }

    if (chosenIndex !== -1) {
      const [cand] = candidateQueue.splice(chosenIndex, 1);
      newAssignments[seat.seatKey] = {
        studentId: cand.student.id,
        examId: cand.examId,
      };
    }
  }

  // Any remaining candidates could not be placed due to room capacity
  for (const cand of candidateQueue) {
    unallocatedList.push({
      studentId: cand.student.id,
      examId: cand.examId,
      reason: 'Room capacity exhausted. Add additional rooms or adjust density rules.',
    });
  }

  // 8. Run Audit & Validation
  const violations = validateAllocations(
    newAssignments,
    selectedRooms,
    studentsMap,
    examMap,
    plan.rules
  );

  const allocatedCount = Object.keys(newAssignments).length;
  const totalStudents = candidatePool.length + alreadyAllocatedStudentIds.size;
  const utilizationRate = totalUsableSeats > 0 ? Math.round((allocatedCount / totalUsableSeats) * 100) : 0;
  const executionTimeMs = Math.round(performance.now() - startTime);

  const stats: AllocationStats = {
    totalStudents,
    allocatedStudents: allocatedCount,
    unallocatedStudents: unallocatedList,
    totalCapacity: totalPhysicalCapacity,
    effectiveCapacity: totalUsableSeats,
    utilizationRate,
    violations,
    executionTimeMs,
    timestamp: new Date().toISOString(),
  };

  return {
    assignments: newAssignments,
    stats,
  };
}

/**
 * Checks if placing a candidate in a seat creates an immediate conflict with adjacent assigned seats.
 */
function checkSeatCandidateConflict(
  seat: RoomGridSeat,
  candidate: { student: Student; examId: string },
  room: Room,
  currentAssignments: Record<string, SeatAssignment>,
  rules: AllocationRules
): boolean {
  if (rules.antiCheatStrictness === 'none' && !rules.branchAlternation) {
    return false;
  }

  // Check same bench opposite slot
  if (room.deskType === 'double') {
    const otherSlot = seat.slotIndex === 0 ? 1 : 0;
    const benchPartnerKey = `${room.id}_r${seat.row}_c${seat.col}_s${otherSlot}`;
    const partner = currentAssignments[benchPartnerKey];
    if (partner && partner.examId === candidate.examId) {
      return true; // NEVER sit same exam on same 2-person bench
    }
  }

  // Check left, right, front, back
  const neighborOffsets = [
    { dr: 0, dc: -1 }, // Left
    { dr: 0, dc: 1 },  // Right
    { dr: -1, dc: 0 }, // Front
    { dr: 1, dc: 0 },  // Back
  ];

  if (rules.antiCheatStrictness === 'adjacent_all') {
    neighborOffsets.push(
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 }
    );
  }

  const slots = room.deskType === 'double' ? [0, 1] : [0];

  for (const { dr, dc } of neighborOffsets) {
    const nr = seat.row + dr;
    const nc = seat.col + dc;
    if (nr < 0 || nr >= room.rows || nc < 0 || nc >= room.cols) continue;

    for (const s of slots) {
      const neighborKey = `${room.id}_r${nr}_c${nc}_s${s}`;
      const neighborAssign = currentAssignments[neighborKey];
      if (neighborAssign && neighborAssign.examId === candidate.examId) {
        return true;
      }
    }
  }

  return false;
}
