import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { attendanceAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import StatCard from '../../components/StatCard';
import {
  Users,
  Building2,
  GraduationCap,
  Layers,
  UserCheck,
  UserX,
  Percent,
  BookOpen,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TeacherDashboard() {
  const { isSuperAdmin } = useAuth();
  const { latestScan } = useSocket();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await attendanceAPI.getDashboardSummary();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('[DASHBOARD ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  // Update summary counts dynamically when a real-time scan arrives via Socket.IO
  useEffect(() => {
    if (latestScan && data) {
      setData((prev) => {
        if (!prev) return prev;
        const newPresent = (prev.summary.todayPresent || 0) + 1;
        return {
          ...prev,
          summary: {
            ...prev.summary,
            todayPresent: newPresent
          },
          recentScans: [
            {
              id: latestScan.attendanceId,
              student_name: latestScan.studentName,
              roll_number: latestScan.rollNumber,
              subject_name: latestScan.subjectName,
              status: latestScan.status,
              scan_time: latestScan.scanTime,
              device_code: latestScan.deviceCode,
              classroom: latestScan.classroom
            },
            ...(prev.recentScans || []).slice(0, 9)
          ]
        };
      });
    }
  }, [latestScan]);

  const summary = data?.summary || {
    totalStudents: 0,
    totalDepartments: 0,
    totalTeachers: 0,
    totalDivisions: 0,
    totalSubjects: 0,
    totalTimetables: 0,
    totalDevices: 0,
    todayPresent: 0,
    todayAbsent: 0,
    overallPercentage: 0
  };

  const setupSteps = [
    { label: 'Department', done: summary.totalDepartments > 0, path: '/teacher/departments' },
    { label: 'Division', done: summary.totalDivisions > 0, path: '/teacher/divisions' },
    { label: 'Subjects', done: summary.totalSubjects > 0, path: '/teacher/subject-attendance' },
    { label: 'Teachers', done: summary.totalTeachers > 0, path: '/teacher/teachers' },
    { label: 'Students & Card UID', done: summary.totalStudents > 0, path: '/teacher/students' },
    { label: 'Timetable Lecture', done: summary.totalTimetables > 0, path: '/teacher/timetable' },
    ...(isSuperAdmin ? [{ label: 'Hardware Settings', done: summary.totalDevices > 0, path: '/teacher/devices' }] : [])
  ];
  const pendingSetupSteps = setupSteps.filter((s) => !s.done);

  // Department-wise Bar Chart Data
  const hasDepts = (data?.deptAttendance || []).length > 0;
  const deptLabels = hasDepts ? data.deptAttendance.map((d) => d.name) : ['No Departments'];
  const deptValues = hasDepts ? data.deptAttendance.map((d) => d.percentage) : [0];

  const deptChartData = {
    labels: deptLabels,
    datasets: [
      {
        label: 'Attendance Rate (%)',
        data: deptValues,
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        hoverBackgroundColor: 'rgba(37, 99, 235, 1)',
        borderRadius: 8
      }
    ]
  };

  // Today Attendance Snapshot Chart Data (live DB derived)
  const monthlyChartData = {
    labels: ['Today Present', 'Today Absent', 'Overall Rate'],
    datasets: [
      {
        label: 'Attendance Metrics',
        data: [summary.todayPresent, summary.todayAbsent, summary.overallPercentage],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointRadius: 4
      }
    ]
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono font-semibold text-emerald-600 uppercase tracking-wider">
              LIVE ACADEMIC ATTENDANCE PORTAL
            </span>
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-900 mt-1">
            Faculty & Administrative Console
          </h2>
          <p className="text-xs text-slate-500">
            Automated lecture attendance verified against trusted timetable server clock.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadSummary}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition flex items-center space-x-2"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Setup Readiness Banner (shown while required academic/system entries are incomplete) */}
      {!loading && data && pendingSetupSteps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-950 font-display">
                  Complete Setup to Start Recording Live Attendance
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Attendance scans match against active Subjects, Teachers, and scheduled Timetable lectures{isSuperAdmin ? ' (plus a registered Hardware Device)' : ''}. Finish the remaining step(s) below:
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {setupSteps.map((step) => (
              <Link
                key={step.path}
                to={step.path}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition ${
                  step.done
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>{step.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 8 Metric KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={summary.totalStudents}
          subtext={`Across ${summary.totalDepartments} department(s)`}
          icon={GraduationCap}
          color="blue"
        />
        <StatCard
          title="Active Departments"
          value={summary.totalDepartments}
          subtext="Academic wings"
          icon={Building2}
          color="indigo"
        />
        <StatCard
          title="Faculty Members"
          value={summary.totalTeachers}
          subtext="Registered professors"
          icon={Users}
          color="cyan"
        />
        <StatCard
          title="Active Classes"
          value={summary.totalDivisions}
          subtext="Division cohorts"
          icon={Layers}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Today's Present"
          value={summary.todayPresent}
          subtext="Verified today"
          icon={UserCheck}
          color="emerald"
        />
        <StatCard
          title="Today's Absent"
          value={summary.todayAbsent}
          subtext="Unrecorded or absent"
          icon={UserX}
          color="rose"
        />
        <StatCard
          title="Overall Attendance"
          value={`${summary.overallPercentage}%`}
          subtext="Campus average"
          icon={Percent}
          color="blue"
        />
        <StatCard
          title="Active Subjects"
          value={summary.totalSubjects}
          subtext="Curriculum courses"
          icon={BookOpen}
          color="emerald"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department-wise Attendance */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 font-display">Department-Wise Attendance Rates</h3>
              <p className="text-xs text-slate-500">Cumulative compliance across all engineering disciplines</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
              TARGET: 75%+
            </span>
          </div>

          <div className="h-64">
            <Bar
              data={deptChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>
        </div>

        {/* Daily Attendance Overview */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 font-display">Live Attendance Summary</h3>
              <p className="text-xs text-slate-500">Current session presence and overall percentage</p>
            </div>
          </div>

          <div className="h-64">
            <Line
              data={monthlyChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { min: 0, max: 100 },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity: Live Attendance Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm text-slate-900 font-display">
              Live Attendance Feed
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Auto-updates in real time
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Subject Lecture</th>
                <th className="py-3 px-4">Classroom</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {(data?.recentScans || []).length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                    No attendance records yet today.
                  </td>
                </tr>
              ) : (
                data.recentScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {scan.student_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {scan.roll_number}
                    </td>
                    <td className="py-3 px-4">
                      {scan.subject_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {scan.classroom || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {scan.scan_time || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                        scan.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : scan.status === 'Late'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {scan.status}
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
