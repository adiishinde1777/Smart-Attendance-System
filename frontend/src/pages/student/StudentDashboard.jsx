import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { attendanceAPI, marksAPI, timetableAPI } from '../../services/api';
import StatCard from '../../components/StatCard';
import {
  GraduationCap, CheckSquare, Award, Clock, AlertTriangle,
  CheckCircle2, Radio, User, BookOpen, Calendar, ChevronRight
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { latestScan } = useSocket();
  const student = user?.student;
  const studentId = student?.student_id;

  const [loading, setLoading] = useState(true);
  const [attData, setAttData] = useState(null);
  const [marksData, setMarksData] = useState([]);
  const [todayLectures, setTodayLectures] = useState([]);

  const loadStudentData = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const [attRes, marksRes, ttRes] = await Promise.all([
        attendanceAPI.getStudentAttendance(studentId),
        marksAPI.getStudentMarks(studentId),
        timetableAPI.getAll({ divisionId: student.division_id })
      ]);

      if (attRes.success) setAttData(attRes);
      if (marksRes.success) setMarksData(marksRes.subjectsMarks || []);
      if (ttRes.success) {
        // Filter for today's weekday
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayDay = days[new Date().getDay()];
        const todaySlots = (ttRes.timetable || []).filter(t => t.day_of_week === todayDay);
        setTodayLectures(todaySlots.length > 0 ? todaySlots : (ttRes.timetable || []).slice(0, 4));
      }
    } catch (err) {
      console.error('[STUDENT DASHBOARD ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  // Real-time update when attendance recorded for this student
  useEffect(() => {
    if (latestScan && latestScan.studentId === studentId) {
      loadStudentData();
    }
  }, [latestScan, studentId]);

  const stats = attData?.stats || {
    totalLectures: 0,
    attendedLectures: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    percentage: 0,
    isShortage: false
  };

  // Calculate total internal marks out of 40 across primary subject
  const primarySubjectMarks = marksData.length > 0 ? marksData[0] : null;
  const totalInternalObtained = primarySubjectMarks ? primarySubjectMarks.totalObtained.toFixed(1) : '0.0';

  // Subject Chart Data
  const subjectLabels = (attData?.subjectWise || []).map(s => s.subject_code || s.subject_name);
  const subjectPcts = (attData?.subjectWise || []).map(s => s.percentage);

  const subjectChartData = {
    labels: subjectLabels.length > 0 ? subjectLabels : ['No Subjects'],
    datasets: [
      {
        label: 'Attendance %',
        data: subjectPcts.length > 0 ? subjectPcts : [0],
        backgroundColor: (context) => {
          const val = context.raw;
          return val < 75 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)';
        },
        borderRadius: 8
      }
    ]
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-400 p-0.5 shadow-xl shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center font-bold text-2xl text-white font-display">
                {user?.full_name?.charAt(0) || 'S'}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {student?.prn || 'PRN'}
                </span>
                {student?.card_uid && (
                  <span className="text-xs font-mono text-emerald-400 font-semibold">
                    ID Card: {student.card_uid}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display mt-1">
                Welcome back, {user?.full_name || 'Student'}!
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {student?.department_name || 'Department'} • {student?.academic_year_name || 'Academic Year'} • {student?.division_name || 'Division'} (Roll #{student?.roll_number || '—'})
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 flex items-center space-x-6 backdrop-blur shrink-0">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Enrollment Status</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4" /> ACTIVE STUDENT
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Overall Attendance"
          value={`${stats.percentage}%`}
          subtext={stats.isShortage ? '⚠️ Below 75% Criteria' : 'Compliant with college criteria'}
          icon={CheckSquare}
          color={stats.isShortage ? 'rose' : 'emerald'}
          trend={stats.isShortage ? { positive: false, text: 'Shortage' } : { positive: true, text: 'Healthy' }}
        />
        <StatCard
          title="Lectures Attended"
          value={stats.attendedLectures}
          subtext={`${stats.totalLectures} total eligible sessions`}
          icon={CheckCircle2}
          color="blue"
        />
        <StatCard
          title="Absent Count"
          value={stats.absentCount}
          subtext="Missed lecture sessions"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Total Internal Marks"
          value={`${totalInternalObtained} / 40`}
          subtext="CT1 (10) + Mid-Sem (20) + CT2 (10)"
          icon={Award}
          color="indigo"
        />
      </div>

      {/* Main Grid: Subject Attendance & Marks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Subject Wise Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 font-display">Subject-Wise Attendance Breakdown</h3>
              <p className="text-xs text-slate-500">Live attendance percentage per enrolled subject</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              MINIMUM 75%
            </span>
          </div>

          <div className="h-56">
            <Bar
              data={subjectChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { min: 0, max: 100, ticks: { callback: v => `${v}%` } },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>

          {/* Subject Roster List */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {(attData?.subjectWise || []).map((sub) => (
              <div key={sub.subject_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{sub.subject_name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {sub.attended_lectures} / {sub.total_lectures} lectures attended
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-bold font-mono text-sm ${sub.percentage < 75 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {sub.percentage}%
                  </div>
                  {sub.percentage < 75 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                      SHORTAGE WARNING
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Internal Marks & Today's Timetable (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Internal Marks Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                Internal Examination Scores (40M)
              </h3>
            </div>

            {marksData.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Evaluation results pending release by department faculty.
              </div>
            ) : (
              marksData.slice(0, 2).map((sm) => (
                <div key={sm.subjectId} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{sm.subjectName}</span>
                    <span className="text-sm font-bold text-indigo-700 font-mono">
                      {sm.totalObtained.toFixed(1)} / 40
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center font-mono">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-400">Class Test 1</div>
                      <div className="font-bold text-slate-900">{sm.ct1 !== null ? `${sm.ct1}/10` : '—'}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-400">Mid-Sem</div>
                      <div className="font-bold text-slate-900">{sm.midSem !== null ? `${sm.midSem}/20` : '—'}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-400">Class Test 2</div>
                      <div className="font-bold text-slate-900">{sm.ct2 !== null ? `${sm.ct2}/10` : '—'}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Today's Timetable Lecture Schedule */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Lecture Timetable Schedule
              </h3>
            </div>

            <div className="space-y-2">
              {todayLectures.map((lec) => (
                <div key={lec.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-900">{lec.subject_name}</div>
                    <div className="text-[11px] text-slate-500">{lec.teacher_name} • {lec.classroom}</div>
                  </div>
                  <div className="text-right font-mono font-bold text-blue-600 text-[11px]">
                    {lec.start_time.slice(0, 5)} - {lec.end_time.slice(0, 5)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
