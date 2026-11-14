import React, { useState } from 'react';
import {
  Student,
  Exam,
} from '../types';
import {
  UserPlus,
  BookOpen,
  Search,
  Upload,
  Download,
  Trash2,
  Edit,
  X,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Accessibility,
} from 'lucide-react';
import { downloadCSV, parseStudentsCSV } from '../services/csvService';

interface DataManagementProps {
  students: Student[];
  exams: Exam[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBulkAddStudents: (newStudents: Student[]) => void;
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({
  students,
  exams,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBulkAddStudents,
  onAddExam,
  onDeleteExam,
}) => {
  const [subTab, setSubTab] = useState<'students' | 'exams'>('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // New Student Form State
  const [newRoll, setNewRoll] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Computer Science');
  const [newSem, setNewSem] = useState(5);
  const [newSpecial, setNewSpecial] = useState(false);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);

  // New Exam Form State
  const [newExamCode, setNewExamCode] = useState('');
  const [newExamName, setNewExamName] = useState('');
  const [newExamDept, setNewExamDept] = useState('Computer Science');
  const [newExamDate, setNewExamDate] = useState('2026-12-10');
  const [newExamSession, setNewExamSession] = useState<'Morning' | 'Afternoon'>('Morning');
  const [newExamDuration, setNewExamDuration] = useState(180);

  // CSV Import State
  const [csvRaw, setCsvRaw] = useState('');
  const [importStatus, setImportStatus] = useState<{ count: number; errors: string[] } | null>(null);

  const departments = Array.from(new Set(students.map((s) => s.department)));

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = deptFilter === 'all' || s.department === deptFilter;
    return matchSearch && matchDept;
  });

  // Handle Save Student
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoll || !newName) return;

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        rollNo: newRoll,
        name: newName,
        department: newDept,
        semester: newSem,
        specialNeeds: newSpecial,
        enrolledExamIds: selectedExams,
      });
      setEditingStudent(null);
    } else {
      const student: Student = {
        id: `stu-${Date.now()}`,
        rollNo: newRoll,
        name: newName,
        department: newDept,
        semester: newSem,
        specialNeeds: newSpecial,
        enrolledExamIds: selectedExams,
      };
      onAddStudent(student);
    }

    // Reset
    setNewRoll('');
    setNewName('');
    setNewSpecial(false);
    setSelectedExams([]);
    setIsAddStudentOpen(false);
  };

  const handleEditClick = (s: Student) => {
    setEditingStudent(s);
    setNewRoll(s.rollNo);
    setNewName(s.name);
    setNewDept(s.department);
    setNewSem(s.semester);
    setNewSpecial(!!s.specialNeeds);
    setSelectedExams([...s.enrolledExamIds]);
    setIsAddStudentOpen(true);
  };

  // Handle Save Exam
  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamCode || !newExamName) return;

    const exam: Exam = {
      id: `ex-${Date.now()}`,
      code: newExamCode,
      name: newExamName,
      department: newExamDept,
      date: newExamDate,
      session: newExamSession,
      startTime: newExamSession === 'Morning' ? '09:30 AM' : '02:00 PM',
      endTime: newExamSession === 'Morning' ? '12:30 PM' : '05:00 PM',
      durationMinutes: newExamDuration,
    };
    onAddExam(exam);

    setNewExamCode('');
    setNewExamName('');
    setIsAddExamOpen(false);
  };

  // Handle CSV Import
  const handleParseAndImportCSV = () => {
    const { students: parsed, errors } = parseStudentsCSV(csvRaw);
    setImportStatus({ count: parsed.length, errors });

    if (parsed.length > 0) {
      onBulkAddStudents(parsed);
      setTimeout(() => {
        setIsImportOpen(false);
        setCsvRaw('');
        setImportStatus(null);
      }, 1500);
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCSV = () => {
    const sample = `Roll No,Name,Department,Semester,Subjects\nCS-2024-101,John Doe,Computer Science,5,ex-cs301\nEE-2024-102,Jane Smith,Electrical Engineering,5,ex-ee202`;
    downloadCSV('sample_student_import.csv', sample);
  };

  // Export all students
  const handleExportStudents = () => {
    const headers = ['Roll No', 'Name', 'Department', 'Semester', 'Enrolled Exams', 'Special Needs'];
    const rows = students.map((s) => [
      s.rollNo,
      `"${s.name}"`,
      `"${s.department}"`,
      s.semester,
      `"${s.enrolledExamIds.join(';')}"`,
      s.specialNeeds ? 'Yes' : 'No',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV('students_roster.csv', csv);
  };

  return (
    <div className="space-y-6">
      {/* Top Controller */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSubTab('students')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              subTab === 'students'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Students Roster ({students.length})
          </button>
          <button
            onClick={() => setSubTab('exams')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              subTab === 'exams'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Examinations & Courses ({exams.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subTab === 'students' ? (
            <>
              <button
                onClick={handleExportStudents}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setNewRoll('');
                  setNewName('');
                  setNewSpecial(false);
                  setSelectedExams([]);
                  setIsAddStudentOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition flex items-center space-x-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAddExamOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition flex items-center space-x-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Add Examination Course</span>
            </button>
          )}
        </div>
      </div>

      {/* Students SubTab View */}
      {subTab === 'students' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-900/60">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Roll Number or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Department:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Departments ({students.length})</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department / Branch</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Enrolled Exams</th>
                  <th className="py-3 px-4">Accommodations</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No matching students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-brand-300">
                        {s.rollNo}
                      </td>
                      <td className="py-3 px-4 font-medium text-white">{s.name}</td>
                      <td className="py-3 px-4">{s.department}</td>
                      <td className="py-3 px-4">Sem {s.semester}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {s.enrolledExamIds.map((exId) => {
                            const exam = exams.find((e) => e.id === exId);
                            return (
                              <span
                                key={exId}
                                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
                              >
                                {exam?.code || exId}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {s.specialNeeds ? (
                          <span className="inline-flex items-center space-x-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 text-[10px] font-medium">
                            <Accessibility className="w-3 h-3" />
                            <span>Front Row Required</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Standard</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleEditClick(s)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                            title="Edit Student"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteStudent(s.id)}
                            className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exams SubTab View */}
      {subTab === 'exams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((ex) => {
            const count = students.filter((s) => s.enrolledExamIds.includes(ex.id)).length;
            return (
              <div
                key={ex.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 relative group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      {ex.code}
                    </span>
                    <h3 className="text-base font-bold text-white mt-2">{ex.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{ex.department}</p>
                  </div>
                  <button
                    onClick={() => onDeleteExam(ex.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Delete Exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block">Date</span>
                    <span className="text-slate-200 font-medium">{ex.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Session</span>
                    <span className="text-slate-200 font-medium">{ex.session}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Time Slot</span>
                    <span className="text-slate-200 font-medium">
                      {ex.startTime} - {ex.endTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Registered Candidates</span>
                    <span className="text-brand-400 font-bold">{count} students</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveStudent}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingStudent ? 'Edit Student Details' : 'Add New Candidate'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Roll Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-2024-099"
                  value={newRoll}
                  onChange={(e) => setNewRoll(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Department</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Semester</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={newSem}
                  onChange={(e) => setNewSem(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Enroll in Exams</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                {exams.map((ex) => (
                  <label key={ex.id} className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedExams.includes(ex.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedExams([...selectedExams, ex.id]);
                        } else {
                          setSelectedExams(selectedExams.filter((id) => id !== ex.id));
                        }
                      }}
                      className="rounded bg-slate-800 text-brand-600 focus:ring-0"
                    />
                    <span>{ex.code} — {ex.name} ({ex.session})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-200 font-medium block">Special Accommodation</span>
                <span className="text-slate-400 text-[11px]">Requires Row 1 ground-floor seat</span>
              </div>
              <input
                type="checkbox"
                checked={newSpecial}
                onChange={(e) => setNewSpecial(e.target.checked)}
                className="rounded bg-slate-700 text-brand-600 w-4 h-4"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-600/25"
              >
                {editingStudent ? 'Update Candidate' : 'Save Candidate'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Exam Modal */}
      {isAddExamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveExam}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Schedule New Examination</h3>
              <button
                type="button"
                onClick={() => setIsAddExamOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-401"
                  value={newExamCode}
                  onChange={(e) => setNewExamCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Department</label>
                <input
                  type="text"
                  value={newExamDept}
                  onChange={(e) => setNewExamDept(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Subject / Course Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Artificial Intelligence & Neural Networks"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Session Slot</label>
                <select
                  value={newExamSession}
                  onChange={(e) => setNewExamSession(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Morning">Morning (09:30 AM)</option>
                  <option value="Afternoon">Afternoon (02:00 PM)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddExamOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-600/25"
              >
                Save Exam Course
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-400" />
                <h3 className="text-base font-bold text-white">Import Students from CSV</h3>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste CSV contents below or download our sample template. Header row required: <code>Roll No,Name,Department,Semester,Subjects</code>
            </p>

            <textarea
              rows={6}
              value={csvRaw}
              onChange={(e) => setCsvRaw(e.target.value)}
              placeholder="Paste comma-separated values here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500"
            />

            {importStatus && (
              <div
                className={`p-3 rounded-xl text-xs border ${
                  importStatus.errors.length > 0
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {importStatus.count > 0 && (
                  <div className="flex items-center space-x-1.5 font-medium mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Successfully imported {importStatus.count} students!</span>
                  </div>
                )}
                {importStatus.errors.map((err, i) => (
                  <div key={i} className="flex items-center space-x-1 text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="text-xs text-brand-400 hover:underline flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParseAndImportCSV}
                  disabled={!csvRaw.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-600/25 disabled:opacity-50"
                >
                  Parse & Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
