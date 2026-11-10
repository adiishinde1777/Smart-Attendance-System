import React, { useState, useEffect } from 'react';
import { divisionAPI, departmentAPI, teacherAPI, academicYearAPI } from '../../services/api';
import { Layers, Plus, Edit2, Trash2, Users, Check, X, AlertCircle, Eye } from 'lucide-react';

export default function DivisionManagement() {
  const [divisions, setDivisions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDivDetails, setSelectedDivDetails] = useState(null);
  const [editingDiv, setEditingDiv] = useState(null);
  const [formData, setFormData] = useState({ name: 'Division A', departmentId: '', academicYearId: '', classTeacherId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [divRes, deptRes, tchRes] = await Promise.all([
        divisionAPI.getAll(),
        departmentAPI.getAll(),
        teacherAPI.getAll()
      ]);
      if (divRes.success) setDivisions(divRes.divisions || []);
      if (deptRes.success) setDepartments(deptRes.departments || []);
      if (tchRes.success) setTeachers(tchRes.teachers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeptChange = async (deptId) => {
    setFormData(prev => ({ ...prev, departmentId: deptId }));
    try {
      const res = await academicYearAPI.getAll(deptId);
      if (res.success && res.academicYears?.length > 0) {
        setAcademicYears(res.academicYears);
        setFormData(prev => ({ ...prev, academicYearId: res.academicYears[0].id }));
      }
    } catch (e) {
      // ignore
    }
  };

  const handleOpenAdd = async () => {
    setEditingDiv(null);
    const firstDept = departments[0]?.id || '';
    setFormData({
      name: 'Division A',
      departmentId: firstDept,
      academicYearId: '',
      classTeacherId: ''
    });
    if (firstDept) {
      const res = await academicYearAPI.getAll(firstDept);
      if (res.success) {
        setAcademicYears(res.academicYears || []);
        if (res.academicYears?.length > 0) {
          setFormData(prev => ({ ...prev, academicYearId: res.academicYears[0].id }));
        }
      }
    }
    setModalOpen(true);
  };

  const handleOpenEdit = async (div) => {
    setEditingDiv(div);
    setFormData({
      name: div.name,
      departmentId: div.department_id,
      academicYearId: div.academic_year_id,
      classTeacherId: div.class_teacher_id || ''
    });
    const res = await academicYearAPI.getAll(div.department_id);
    if (res.success) setAcademicYears(res.academicYears || []);
    setModalOpen(true);
  };

  const handleViewDetails = async (divId) => {
    try {
      const res = await divisionAPI.getDetails(divId);
      if (res.success) {
        setSelectedDivDetails(res);
        setDetailsModalOpen(true);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingDiv) {
        await divisionAPI.update(editingDiv.id, formData);
        setSuccess('Division updated successfully.');
      } else {
        await divisionAPI.create(formData);
        setSuccess('New division created.');
      }
      setModalOpen(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, name, count) => {
    if (count > 0) {
      alert(`Cannot delete ${name}: It currently contains ${count} student(s). Reassign students first.`);
      return;
    }
    if (window.confirm(`Delete division ${name}?`)) {
      try {
        await divisionAPI.delete(id);
        setSuccess('Division removed.');
        loadData();
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
            <Layers className="w-5 h-5 text-blue-600" />
            Class & Division Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage classroom division cohorts (Division A, B, C) and assign class teachers.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Division</span>
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

      {/* Divisions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {divisions.map((div) => (
          <div key={div.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 font-display">
                  {div.name}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                  {div.department_code} - {div.year_code}
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                {div.department_name} ({div.academic_year_name})
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Class Teacher:</span>
                  <span className="font-semibold text-slate-900">{div.class_teacher_name || 'Not Assigned'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Student Roster:</span>
                  <span className="font-bold text-blue-600">{div.student_count || 0} Students</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleViewDetails(div.id)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> View Roster
              </button>

              <div className="space-x-1">
                <button
                  onClick={() => handleOpenEdit(div)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                  title="Edit division"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(div.id, div.name, div.student_count)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                  title="Delete division"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details & Roster Modal */}
      {detailsModalOpen && selectedDivDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-display">
                  {selectedDivDetails.division.name} — Student Roster & Stats
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedDivDetails.division.department_name} ({selectedDivDetails.division.academic_year_name})
                </p>
              </div>
              <button onClick={() => setDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Stats overview */}
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="font-bold text-blue-700 text-lg">{selectedDivDetails.students.length}</div>
                  <div className="text-slate-500">Enrolled Students</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="font-bold text-emerald-700 text-lg">{selectedDivDetails.stats?.present_count || 0}</div>
                  <div className="text-slate-500">Present Scans</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="font-bold text-amber-700 text-lg">{selectedDivDetails.stats?.late_count || 0}</div>
                  <div className="text-slate-500">Late Scans</div>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <div className="font-bold text-rose-700 text-lg">{selectedDivDetails.stats?.absent_count || 0}</div>
                  <div className="text-slate-500">Absent Records</div>
                </div>
              </div>

              {/* Roster Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-mono text-[11px] text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Roll</th>
                      <th className="py-2.5 px-3">PRN</th>
                      <th className="py-2.5 px-3">Student Full Name</th>
                      <th className="py-2.5 px-3">RFID Card UID</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDivDetails.students.map((st) => (
                      <tr key={st.student_id}>
                        <td className="py-2 px-3 font-mono font-semibold">{st.roll_number}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{st.prn}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{st.full_name}</td>
                        <td className="py-2 px-3 font-mono text-cyan-600">{st.card_uid || 'Unassigned'}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Division Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">
                {editingDiv ? 'Edit Division' : 'Add Division'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <select
                  required
                  value={formData.departmentId}
                  onChange={(e) => handleDeptChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year
                </label>
                <select
                  required
                  value={formData.academicYearId}
                  onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="">-- Select Academic Year --</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name} ({ay.year_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Division Cohort Name (e.g. Division A, Division B)
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Teacher
                </label>
                <select
                  value={formData.classTeacherId}
                  onChange={(e) => setFormData({ ...formData, classTeacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="">None / Unassigned</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} ({t.employee_code})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                >
                  Save Division
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
