import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Layout & Overlays
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LiveScanToast from './components/LiveScanToast';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

// Teacher / Admin Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import DepartmentManagement from './pages/teacher/DepartmentManagement';
import AcademicYearManagement from './pages/teacher/AcademicYearManagement';
import DivisionManagement from './pages/teacher/DivisionManagement';
import StudentManagement from './pages/teacher/StudentManagement';
import TeacherManagement from './pages/teacher/TeacherManagement';
import RfidCardManagement from './pages/teacher/RfidCardManagement';
import AttendanceManagement from './pages/teacher/AttendanceManagement';
import SubjectWiseAttendance from './pages/teacher/SubjectWiseAttendance';
import TimetableManagement from './pages/teacher/TimetableManagement';
import MarksManagement from './pages/teacher/MarksManagement';
import Esp32DeviceManagement from './pages/teacher/Esp32DeviceManagement';
import ReportsAnalytics from './pages/teacher/ReportsAnalytics';
import AuditLogsPage from './pages/teacher/AuditLogsPage';
import NotificationsPage from './pages/teacher/NotificationsPage';
import SettingsPage from './pages/teacher/SettingsPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendanceHistory from './pages/student/StudentAttendanceHistory';
import StudentMarks from './pages/student/StudentMarks';
import StudentTimetable from './pages/student/StudentTimetable';
import StudentProfile from './pages/student/StudentProfile';

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying institutional session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
      <LiveScanToast />
    </div>
  );
}

function SuperAdminRoute({ children }) {
  const { isSuperAdmin, isStudent } = useAuth();
  if (!isSuperAdmin) {
    return <Navigate to={isStudent ? '/student/dashboard' : '/teacher/dashboard'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Portal Routes */}
            <Route element={<ProtectedLayout />}>
              {/* Teacher / Admin Routes */}
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/departments" element={<DepartmentManagement />} />
              <Route path="/teacher/academic-years" element={<AcademicYearManagement />} />
              <Route path="/teacher/divisions" element={<DivisionManagement />} />
              <Route path="/teacher/students" element={<StudentManagement />} />
              <Route path="/teacher/teachers" element={<TeacherManagement />} />
              <Route path="/teacher/rfid-cards" element={<RfidCardManagement />} />
              <Route path="/teacher/attendance" element={<AttendanceManagement />} />
              <Route path="/teacher/subject-attendance" element={<SubjectWiseAttendance />} />
              <Route path="/teacher/timetable" element={<TimetableManagement />} />
              <Route path="/teacher/marks" element={<MarksManagement />} />
              <Route
                path="/teacher/devices"
                element={
                  <SuperAdminRoute>
                    <Esp32DeviceManagement />
                  </SuperAdminRoute>
                }
              />
              <Route path="/teacher/reports" element={<ReportsAnalytics />} />
              <Route path="/teacher/audit-logs" element={<AuditLogsPage />} />
              <Route path="/teacher/notifications" element={<NotificationsPage />} />
              <Route path="/teacher/settings" element={<SettingsPage />} />

              {/* Student Routes */}
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/attendance" element={<StudentAttendanceHistory />} />
              <Route path="/student/marks" element={<StudentMarks />} />
              <Route path="/student/timetable" element={<StudentTimetable />} />
              <Route path="/student/profile" element={<StudentProfile />} />
              <Route path="/student/notifications" element={<NotificationsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
