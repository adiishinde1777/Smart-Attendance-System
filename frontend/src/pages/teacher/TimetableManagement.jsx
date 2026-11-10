import React, { useState, useEffect } from 'react';
import { timetableAPI, departmentAPI, divisionAPI, subjectsAPI, teacherAPI, academicYearAPI } from '../../services/api';
import { Clock, Plus, Trash2, Calendar, Check, X, AlertCircle, Building2 } from 'lucide-react';

export default function TimetableManagement() {
  const [timetable, setTimetable] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    departmentId: '',
    academicYearId: '',
    divisionId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: 'Monday',
    startTime: '10:00:00',
    endTime: '11:00:00',
    classroom: 'Classroom 101'
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFilters = async () => {
    try {
      const [deptRes, divRes, subRes, tchRes] = await Promise.all([
        departmentAPI.getAll(),
        divisionAPI.getAll(),
        subjectsAPI.getAll(),
        teacherAPI.getAll()
      ]);
      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (divRes.success) setDivisions(divRes.divisions || []);
      if (subRes.success) setSubjects(subRes.subjects || []);
      if (tchRes.success) setTeachers(tchRes.teachers || []);
    } catch (e) {
      // ignore
    }
  };

  const loadTimetable = async () => {
    try {
      setLoading(true);
      const res = await timetableAPI.getAll({
        departmentId: selectedDept || undefined,
        divisionId: selectedDiv || undefined,
        dayOfWeek: selectedDay || undefined
      });
      if (res.success) setTimetable(res.timetable || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [selectedDept, selectedDiv, selectedDay]);

  const handleDeptChange = async (deptId) => {
    setFormData(prev => ({ ...prev, departmentId: deptId }));
    try {
      const [ayRes, divRes, subRes] = await Promise.all([
        academicYearAPI.getAll(deptId),
        divisionAPI.getAll({ departmentId: deptId }),
        subjectsAPI.getAll({ departmentId: deptId })
      ]);
      if (ayRes.success && ayRes.academicYears?.length > 0) {
        setAcademicYears(ayRes.academicYears);
        setFormData(prev => ({ ...prev, academicYearId: ayRes.academicYears[0].id }));
      }
      if (divRes.success && divRes.divisions?.length > 0) {
        setFormData(prev => ({ ...prev, divisionId: divRes.divisions[0].id }));
      }
      if (subRes.success && subRes.subjects?.length > 0) {
        setFormData(prev => ({ ...prev, subjectId: subRes.subjects[0].id }));
      }
    } catch (e) {
      // ignore
    }
  };

  const handleOpenAdd = async () => {
    const firstDept = departments[0]?.id || '';
    setFormData({
      departmentId: firstDept,
      academicYearId: '',
      divisionId: '',
      subjectId: '',
      teacherId: teachers[0]?.id || '',
      dayOfWeek: 'Monday',
      startTime: '10:00:00',
      endTime: '11:00:00',
      classroom: 'Classroom 101'
    });
    if (firstDept) {
      await handleDeptChange(firstDept);
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await timetableAPI.create(formData);
      setSuccess('Timetable slot scheduled successfully with conflict verification.');
      setModalOpen(false);
      loadTimetable();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, subName, day, time) => {
    if (window.confirm(`Delete timetable slot: ${subName} on ${day} at ${time}?`)) {
      try {
        await timetableAPI.delete(id);
        setSuccess('Timetable slot deleted.');
        loadTimetable();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Timetable & Dynamic Schedule Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Backend validates attendance against trusted server time and each class&apos;s scheduled timetable.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lecture Slot</span>
        </button>
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

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
        >
          <option value="">All Weekdays</option>
          {weekdays.map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Day of Week</th>
                <th className="py-3 px-4">Timing Slot</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Division Cohort</th>
                <th className="py-3 px-4">Assigned Professor</th>
                <th className="py-3 px-4">Classroom</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {timetable.map((tt) => (
                <tr key={tt.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px]">
                      {tt.day_of_week}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                    {tt.start_time.slice(0, 5)} - {tt.end_time.slice(0, 5)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{tt.subject_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{tt.subject_code}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {tt.department_code} • {tt.division_name}
                  </td>
                  <td className="py-3 px-4">
                    {tt.teacher_name} ({tt.teacher_code})
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-cyan-700">
                    {tt.classroom}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(tt.id, tt.subject_name, tt.day_of_week, tt.start_time)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Delete slot"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Slot Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">Schedule New Timetable Slot</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3">
              {(departments.length === 0 || divisions.length === 0 || subjects.length === 0 || teachers.length === 0) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  Make sure you have added at least one Department, Division, Subject (in Subject Attendance), and Teacher before creating a timetable slot.
                </div>
              )}

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
                      <option key={ay.id} value={ay.id}>{ay.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Division *</label>
                  <select
                    required
                    value={formData.divisionId}
                    onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select Division --</option>
                    {divisions.filter(dv => !formData.departmentId || String(dv.department_id) === String(formData.departmentId)).map(dv => (
                      <option key={dv.id} value={dv.id}>{dv.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                  <select
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.filter(s => !formData.departmentId || String(s.department_id) === String(formData.departmentId)).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty Professor *</label>
                  <select
                    required
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select Faculty --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Classroom Location</label>
                  <input
                    type="text"
                    required
                    value={formData.classroom}
                    onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="e.g. Classroom 101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Week</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    {weekdays.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time (HH:MM:SS)</label>
                  <input
                    type="text"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="10:00:00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time (HH:MM:SS)</label>
                  <input
                    type="text"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="11:00:00"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md">Add to Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
