import React, { useState, useEffect } from 'react';
import { attendanceAPI, departmentAPI, divisionAPI, subjectsAPI, timetableAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  CheckSquare, Edit2, Check, X, AlertCircle, Clock
} from 'lucide-react';

export default function AttendanceManagement() {
  const { latestScan } = useSocket();
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50 });

  // Manual Correction Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('Present');
  const [mandatoryReason, setMandatoryReason] = useState('');

  // Finalize Lecture Modal
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeTtId, setFinalizeTtId] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFilterOptions = async () => {
    try {
      const [deptRes, divRes, subRes, ttRes] = await Promise.all([
        departmentAPI.getAll(),
        divisionAPI.getAll(),
        subjectsAPI.getAll(),
        timetableAPI.getAll()
      ]);
      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (divRes.success) setDivisions(divRes.divisions || []);
      if (subRes.success) setSubjects(subRes.subjects || []);
      if (ttRes.success) {
        setTimetables(ttRes.timetable || []);
        if (ttRes.timetable?.length > 0) setFinalizeTtId(ttRes.timetable[0].id);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadAttendance = async (page = 1) => {
    try {
      setLoading(true);
      const res = await attendanceAPI.getRecords({
        page,
        limit: 50,
        date: selectedDate || undefined,
        departmentId: selectedDept || undefined,
        divisionId: selectedDiv || undefined,
        subjectId: selectedSub || undefined,
        status: selectedStatus || undefined
      });
      if (res.success) {
        setRecords(res.records || []);
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadAttendance(1);
  }, [selectedDate, selectedDept, selectedDiv, selectedSub, selectedStatus]);

  // Real-time update when Socket.IO emits a new attendance record
  useEffect(() => {
    if (latestScan) {
      loadAttendance(pagination.page);
    }
  }, [latestScan]);

  const handleOpenEdit = (rec) => {
    setSelectedRecord(rec);
    setNewStatus(rec.status);
    setMandatoryReason('');
    setEditModalOpen(true);
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!mandatoryReason || mandatoryReason.trim().length < 3) {
      setError('A mandatory reason is required to audit manual attendance modifications.');
      return;
    }
    try {
      await attendanceAPI.updateStatus(selectedRecord.id, {
        status: newStatus,
        remarks: mandatoryReason.trim()
      });
      setSuccess('Attendance record updated and audit logged.');
      setEditModalOpen(false);
      loadAttendance(pagination.page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFinalizeLecture = async (e) => {
    e.preventDefault();
    if (!finalizeTtId || !selectedDate) return;
    try {
      const res = await attendanceAPI.finalize({
        timetableId: finalizeTtId,
        lectureDate: selectedDate
      });
      setSuccess(res.message || 'Lecture attendance finalized.');
      setFinalizeModalOpen(false);
      loadAttendance(pagination.page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-wider">
              LIVE ATTENDANCE ENGINE
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900 mt-0.5 flex items-center gap-2">
            Smart Attendance Management & Audit Log
          </h2>
          <p className="text-xs text-slate-500">
            Attendance validated against student division, active class timetable, and server clock.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setFinalizeModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition"
          >
            Finalize Lecture Session
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> {success}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" /> {error}
        </div>
      )}

      {(subjects.length === 0 || timetables.length === 0) && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            No Subjects or Timetable Lectures scheduled yet. Add at least one Subject, Teacher, and Timetable Lecture slot before students scan attendance.
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Lecture Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Division</label>
          <select
            value={selectedDiv}
            onChange={(e) => setSelectedDiv(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          >
            <option value="">All Divisions</option>
            {divisions.map(dv => (
              <option key={dv.id} value={dv.id}>{dv.department_code} - {dv.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subject</label>
          <select
            value={selectedSub}
            onChange={(e) => setSelectedSub(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          >
            <option value="">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late (&gt;15 min)</option>
            <option value="Absent">Absent</option>
            <option value="Excused">Excused</option>
          </select>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Roll</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Subject Lecture</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Audit / Remarks</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No attendance records match the selected date and filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-slate-800">{r.lecture_date}</div>
                      <div className="text-[11px] text-slate-400">{r.scan_time}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {r.roll_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.student_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.prn}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{r.subject_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.classroom || 'Classroom 101'}</div>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {r.department_name} • {r.division_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        r.verification_method === 'manual'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : r.verification_method === 'offline_sync'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {r.verification_method === 'manual' ? 'MANUAL FACULTY' : r.verification_method === 'offline_sync' ? 'SYNCED' : 'AUTOMATED'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        r.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.status === 'Late'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                      {r.remarks || 'Verified Attendance'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition"
                        title="Manual Correction"
                      >
                        <Edit2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>Showing {records.length} of {pagination.total} records</div>
          <div className="flex space-x-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => loadAttendance(pagination.page - 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-mono font-semibold text-slate-700">
              Page {pagination.page}
            </span>
            <button
              disabled={records.length < pagination.limit}
              onClick={() => loadAttendance(pagination.page + 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Manual Correction Modal */}
      {editModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">
                Manual Attendance Correction
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveCorrection} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs space-y-1">
                <div><strong>Student:</strong> {selectedRecord.student_name} (Roll: {selectedRecord.roll_number})</div>
                <div><strong>Subject:</strong> {selectedRecord.subject_name}</div>
                <div><strong>Date / Time:</strong> {selectedRecord.lecture_date} at {selectedRecord.scan_time}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corrected Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Excused">Excused (Medical/Official)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Correction Reason (Audit Trail) *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Student verified physically present in classroom."
                  value={mandatoryReason}
                  onChange={(e) => setMandatoryReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md">Save & Log Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finalize Lecture Modal */}
      {finalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">Finalize Lecture Attendance</h3>
              <button onClick={() => setFinalizeModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleFinalizeLecture} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Finalizing closes the attendance window for this lecture. All enrolled students in the division who were <strong>not</strong> marked present will be officially recorded as <strong>Absent</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Timetable Lecture Slot</label>
                <select
                  value={finalizeTtId}
                  onChange={(e) => setFinalizeTtId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {timetables.map(tt => (
                    <option key={tt.id} value={tt.id}>
                      {tt.subject_name} ({tt.division_name}) - {tt.day_of_week} {tt.start_time}-{tt.end_time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Date</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setFinalizeModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md">Finalize & Mark Absentees</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
