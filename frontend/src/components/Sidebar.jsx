import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Layers,
  Users,
  GraduationCap,
  CreditCard,
  CheckSquare,
  BarChart2,
  Clock,
  Award,
  Cpu,
  FileText,
  ShieldCheck,
  Bell,
  Settings,
  UserCheck,
  CalendarCheck
} from 'lucide-react';

export default function Sidebar() {
  const { user, isSuperAdmin, isStudent } = useAuth();

  const teacherNavLinks = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Departments', path: '/teacher/departments', icon: Building2 },
    { label: 'Academic Years', path: '/teacher/academic-years', icon: CalendarDays },
    { label: 'Divisions & Classes', path: '/teacher/divisions', icon: Layers },
    { label: 'Student Directory', path: '/teacher/students', icon: GraduationCap },
    { label: 'Teacher Directory', path: '/teacher/teachers', icon: Users },
    { label: 'ID Card Registry', path: '/teacher/rfid-cards', icon: CreditCard },
    { label: 'Smart Attendance', path: '/teacher/attendance', icon: CheckSquare },
    { label: 'Subject Attendance', path: '/teacher/subject-attendance', icon: BarChart2 },
    { label: 'Timetable Schedule', path: '/teacher/timetable', icon: Clock },
    { label: 'Internal Marks', path: '/teacher/marks', icon: Award },
    ...(isSuperAdmin ? [{ label: 'Hardware Settings', path: '/teacher/devices', icon: Cpu }] : []),
    { label: 'Reports & Analytics', path: '/teacher/reports', icon: FileText },
    { label: 'Audit Log Trail', path: '/teacher/audit-logs', icon: ShieldCheck },
    { label: 'Notifications', path: '/teacher/notifications', icon: Bell },
    { label: 'System Settings', path: '/teacher/settings', icon: Settings },
  ];

  const studentNavLinks = [
    { label: 'My Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Attendance History', path: '/student/attendance', icon: CheckSquare },
    { label: 'Examination Marks', path: '/student/marks', icon: Award },
    { label: 'My Timetable', path: '/student/timetable', icon: CalendarCheck },
    { label: 'Academic Profile', path: '/student/profile', icon: UserCheck },
    { label: 'Notifications', path: '/student/notifications', icon: Bell },
  ];

  const navItems = isStudent ? studentNavLinks : teacherNavLinks;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-61px)] text-slate-300">
      {/* College Identity Badge */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
            {isStudent ? 'STU' : 'ADM'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-white truncate font-display">
              {isStudent ? (user?.full_name || 'Student Portal') : 'College Administration'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {isStudent ? (user?.student?.prn || 'PRN Verified') : 'Academic ERP Console'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
          {isStudent ? 'Student Academic Modules' : 'College Management Modules'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>Smart Attendance</span>
          <span className="text-emerald-400 font-mono">v2.4 Online</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">Academic Management ERP</div>
      </div>
    </aside>
  );
}
