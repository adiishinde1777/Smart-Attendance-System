import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { attendanceAPI } from '../../services/api';
import { CheckSquare, Calendar, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function StudentAttendanceHistory() {
  const { user } = useAuth();
  const { latestScan } = useSocket();
  const studentId = user?.student?.student_id;

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await attendanceAPI.getStudentAttendance(studentId);
      if (res.success) {
        setHistory(res.history || []);
        setStats(res.stats);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  useEffect(() => {
    if (latestScan && latestScan.studentId === studentId) {
      loadData();
    }
  }, [latestScan, studentId]);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            My Attendance Verification History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete chronological record of all verified lecture attendance sessions.
          </p>
        </div>

        {stats && (
          <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-mono">
            <div>
              <span className="text-slate-400">Total: </span>
              <strong className="text-slate-900">{stats.totalLectures}</strong>
            </div>
            <div>
              <span className="text-slate-400">Present: </span>
              <strong className="text-emerald-600">{stats.presentCount}</strong>
            </div>
            <div>
              <span className="text-slate-400">Percentage: </span>
              <strong className={`font-bold ${stats.isShortage ? 'text-rose-600' : 'text-emerald-600'}`}>
                {stats.percentage}%
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Lecture Date</th>
                <th className="py-3.5 px-4">Scan Timestamp</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Faculty Professor</th>
                <th className="py-3.5 px-4">Classroom</th>
                <th className="py-3.5 px-4">Verification Mode</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No attendance records logged yet.
                  </td>
                </tr>
              ) : (
                history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {rec.lecture_date}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {rec.scan_time}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{rec.subject_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{rec.subject_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {rec.teacher_name || 'Department Faculty'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {rec.classroom || 'Classroom 101'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        rec.verification_method === 'manual'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {rec.verification_method === 'manual' ? 'FACULTY MANUAL' : 'AUTOMATED'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        rec.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rec.status === 'Late'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
