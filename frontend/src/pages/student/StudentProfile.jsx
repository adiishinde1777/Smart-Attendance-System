import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, CreditCard, Mail, Phone, Building2, Calendar, Layers, ShieldCheck } from 'lucide-react';

export default function StudentProfile() {
  const { user } = useAuth();
  const student = user?.student;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          Academic Student Identity Profile
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Verified college student record and institutional identity details.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Profile Card Header */}
        <div className="p-8 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-500 to-emerald-400 p-0.5 shadow-xl shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center font-bold text-3xl text-white font-display">
              {user?.full_name?.charAt(0) || 'S'}
            </div>
          </div>

          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Roll #{student?.roll_number || '—'}
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRN: {student?.prn || '—'}
              </span>
            </div>
            <h3 className="text-2xl font-bold font-display mt-1 text-white">{user?.full_name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Profile Attributes Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> DEPARTMENT
              </div>
              <div className="font-bold text-slate-900 text-sm">{student?.department_name || '—'}</div>
              <div className="text-slate-500 text-[11px]">Code: {student?.department_code || '—'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> ACADEMIC YEAR
              </div>
              <div className="font-bold text-slate-900 text-sm">{student?.academic_year_name || '—'}</div>
              <div className="text-slate-500 text-[11px]">Year Code: {student?.year_code || '—'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-600" /> CLASS DIVISION COHORT
              </div>
              <div className="font-bold text-slate-900 text-sm">{student?.division_name || '—'}</div>
            </div>
          </div>

          <div className="space-y-4">
            {/* ID Card Status */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2">
              <div className="text-emerald-400 text-[11px] font-mono flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> REGISTERED ID CARD NUMBER
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-lg font-bold text-white tracking-widest">
                    {student?.card_uid || 'Not Assigned'}
                  </div>
                  <div className="text-[11px] text-slate-400">College Smart Attendance Card</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {student?.card_uid ? 'ACTIVE' : 'PENDING'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" /> REGISTERED CONTACT PHONE
              </div>
              <div className="font-bold text-slate-900 font-mono text-sm">{user?.phone || 'Not Provided'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> ACCOUNT ACCESS PERMISSION
              </div>
              <div className="font-bold text-slate-900 text-sm">Read-Only Academic Access</div>
              <div className="text-slate-400 text-[10px]">Students cannot modify attendance or examination grades.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
