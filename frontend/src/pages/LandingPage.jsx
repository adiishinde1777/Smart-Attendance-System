import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Award, Clock, Users, ArrowRight, CheckCircle2, ChevronRight, BarChart3, CalendarCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-2">
                Smart Attendance System
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  College ERP
                </span>
              </span>
              <p className="text-xs text-slate-400">Automated Attendance & Academic Management Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition flex items-center space-x-1.5"
            >
              <span>Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-Time College Attendance & Academic Management</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-[1.15] text-white">
              Next-Gen Automated <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400">
                Smart Attendance
              </span> <br />
              & College ERP
            </h1>

            <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
              Eliminate paper roll-calls. Student attendance is verified in real time using authoritative server timestamps, 
              validated against dynamic department timetable schedules, and streamed live to faculty and student portals.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <Link
                to="/login"
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition flex items-center space-x-2"
              >
                <span>Access College Portal</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition"
              >
                View Platform Modules
              </a>
            </div>

            {/* Quick Badges */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Anti-Duplicate Validation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Timetable Conflict Rules</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Live Portal Updates</span>
              </div>
            </div>
          </div>

          {/* Right Card: Academic Console Preview */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl p-1 bg-gradient-to-b from-blue-500/30 via-slate-700/50 to-emerald-500/30 shadow-2xl">
              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-mono text-slate-400">Institutional Portal Overview</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Attendance Engine Status</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Configure departments, academic years, divisions, subjects, faculty schedules, student records, and examination marks from one unified portal.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Attendance Criteria:</span>
                    <span className="font-semibold text-white">75% Minimum Compliance</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Role-Based Portals:</span>
                    <span className="text-white">Admin, Faculty & Students</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Time Verification:</span>
                    <span className="text-emerald-400 font-mono">Authoritative Clock</span>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-center block text-xs font-semibold text-white transition"
                >
                  Sign In to College Portal
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-16 bg-slate-950/60 border-t border-slate-800 px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white">Comprehensive College Modules</h2>
            <p className="text-xs text-slate-400">Engineered for colleges with multi-role access, automated attendance tracking, and internal marks management.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">Automated Attendance Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Validates lecture attendance against scheduled timetables, checks division enrollment, prevents duplicate entries, and tracks late arrivals with full audit trails.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">Subject & Shortage Analytics</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculates eligible lecture percentages automatically. Flags attendance shortage (&lt;75%) warnings instantly with student alert notifications.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">Internal Marks Management</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Class Test 1 (10M), Mid-Semester Exam (20M), Class Test 2 (10M). Automatically calculates Total Internal Marks out of 40 with strict boundary validation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-6 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© 2026 Smart Attendance System. College Academic Management Platform.</div>
          <div className="flex items-center space-x-6 text-slate-400">
            <span>Node.js / Express</span>
            <span>React / Tailwind</span>
            <span>Relational Database</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
