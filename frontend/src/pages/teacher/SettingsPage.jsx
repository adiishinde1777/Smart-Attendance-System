import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Settings, ShieldCheck, Check, Cpu, Info, ArrowRight } from 'lucide-react';

export default function SettingsPage() {
  const { isSuperAdmin } = useAuth();
  const [collegeName, setCollegeName] = useState('College of Engineering and Technology');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [threshold, setThreshold] = useState('75');
  const [lateWindowMinutes, setLateWindowMinutes] = useState('15');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Institution & System Policy Configuration
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Global academic thresholds, timetable tolerances, and relational database parameters.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in font-medium">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Institutional configurations updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* College Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 font-display flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" /> General College Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">College / University Name</label>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Academic Session</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Attendance Policy Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 font-display flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Attendance Policy & Constraints
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attendance Shortage Threshold (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Students below this percentage receive automatic shortage alerts.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Late Arrival Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={lateWindowMinutes}
                onChange={(e) => setLateWindowMinutes(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Arrivals after this grace window are recorded as &apos;Late&apos; instead of &apos;Present&apos;.</span>
            </div>
          </div>
        </div>

        {/* Super Admin Exclusive Hardware Access Card */}
        {isSuperAdmin && (
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm font-display flex items-center gap-2 text-emerald-400">
                <Cpu className="w-4 h-4" /> Hardware Configuration (Super Admin Only)
              </h3>
              <p className="text-xs text-slate-300">
                Register, edit classroom assignments, or manage security tokens for connected hardware devices.
              </p>
            </div>
            <Link
              to="/teacher/devices"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
            >
              <span>Manage Hardware</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Save Policy Configurations
          </button>
        </div>
      </form>
    </div>
  );
}
