import React, { useState, useEffect } from 'react';
import { attendanceAPI, departmentAPI, divisionAPI, academicYearAPI, subjectsAPI } from '../../services/api';
import { BarChart2, AlertTriangle, CheckCircle2, Plus, Trash2, X, Check, AlertCircle } from 'lucide-react';

export default function SubjectWiseAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    departmentId: '',
    academicYearId: '',
    credits: 4,
    totalHours: 40,
    semester: 5
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFilterData = async () => {
    try {
      const [deptRes, divRes] = await Promise.all([
        departmentAPI.getAll(),
        divisionAPI.getAll()
      ]);
      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (divRes.success) setDivisions(divRes.divisions || []);
    } catch (e) {
      // ignore
    }
  };

  const loadSubjectStats = async () => {
    try {
      setLoading(true);
      const res = await attendanceAPI.getSubjectStats({
        departmentId: selectedDept || undefined,
        divisionId: selectedDiv || undefined
      });
      if (res.success) setSubjects(res.subjects || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    loadSubjectStats();
  }, [selectedDept, selectedDiv]);

  const handleDeptChange = async (deptId) => {
    setFormData(prev => ({ ...prev, departmentId: deptId, academicYearId: '' }));
    if (!deptId) {
      setAcademicYears([]);
      return;
    }
    try {
      const ayRes = await academicYearAPI.getAll(deptId);
      if (ayRes.success) {
        setAcademicYears(ayRes.academicYears || []);
        if (ayRes.academicYears?.length > 0) {
          setFormData(prev => ({ ...prev, academicYearId: ayRes.academicYears[0].id }));
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const handleOpenAdd = async () => {
    setError('');
    const firstDept = departments[0]?.id || '';
    setFormData({
      code: '',
      name: '',
      departmentId: firstDept,
      academicYearId: '',
      credits: 4,
      totalHours: 40,
      semester: 5
    });
    if (firstDept) await handleDeptChange(firstDept);
    setModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await subjectsAPI.create(formData);
      setSuccess(`Subject ${formData.code.toUpperCase()} - ${formData.name} added successfully.`);
      setModalOpen(false);
      loadSubjectStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSubject = async (id, code, name) => {
    if (window.confirm(`Delete subject "${code} - ${name}"?`)) {
      try {
        await subjectsAPI.delete(id);
        setSuccess('Subject deleted.');
        loadSubjectStats();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Subjects & Subject-Wise Attendance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create curriculum subjects and monitor attendance percentages with 75% compliance alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
            ))}
          </select>

          <select
            value={selectedDiv}
            onChange={(e) => setSelectedDiv(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
          >
            <option value="">All Divisions</option>
            {divisions.map(dv => (
              <option key={dv.id} value={dv.id}>{dv.department_code} - {dv.name}</option>
            ))}
          </select>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
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

      {/* Subject Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {subjects.map((sub) => {
          const hasLectures = sub.total_attendance_entries > 0;
          const isWarning = hasLectures && sub.percentage < 75.0;
          return (
            <div key={sub.subject_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {sub.subject_code}
                  </span>
                  {!hasLectures ? (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                      NO LECTURES
                    </span>
                  ) : isWarning ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> SHORTAGE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> HEALTHY
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-3 font-display">
                  {sub.subject_name}
                </h3>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-display text-slate-900">{sub.percentage}%</span>
                  <span className="text-xs text-slate-500 font-mono">
                    {sub.present_count} / {sub.total_attendance_entries} Present
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      !hasLectures ? 'bg-slate-300' : isWarning ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-display font-bold text-xs text-slate-800">
          Curriculum Subject Attendance Summary Table
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-4">Total Eligible Lectures</th>
                <th className="py-3 px-4">Attended (Present + Late)</th>
                <th className="py-3 px-4">Absent Count</th>
                <th className="py-3 px-4">Attendance Percentage</th>
                <th className="py-3 px-4">Status Compliance</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    {loading ? 'Loading subjects...' : 'No subjects added yet. Click "Add Subject" to add curriculum courses.'}
                  </td>
                </tr>
              ) : (
                subjects.map((s) => (
                  <tr key={s.subject_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.subject_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{s.subject_name}</td>
                    <td className="py-3 px-4 font-mono">{s.total_attendance_entries}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-600">{s.present_count}</td>
                    <td className="py-3 px-4 font-mono text-rose-500">{s.absent_count}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{s.percentage}%</td>
                    <td className="py-3 px-4">
                      {s.total_attendance_entries === 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          No Lectures Yet
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.percentage >= 75
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {s.percentage >= 75 ? 'Above 75% Criteria' : 'Attendance Shortage Alert'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteSubject(s.subject_id, s.subject_code, s.subject_name)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete subject"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subject Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">Add New Curriculum Subject</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveSubject} className="p-6 space-y-3">
              {departments.length === 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  Please create a Department first before adding subjects.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase"
                    placeholder="e.g. CS501"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  placeholder="e.g. Data Structures & Algorithms"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select Dept --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year *</label>
                  <select
                    required
                    value={formData.academicYearId}
                    onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select Year --</option>
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id}>{ay.name} ({ay.year_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value, 10) || 4 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.totalHours}
                    onChange={(e) => setFormData({ ...formData, totalHours: parseInt(e.target.value, 10) || 40 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md">Add Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
