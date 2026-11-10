import React, { useState, useEffect } from 'react';
import { academicYearAPI, departmentAPI } from '../../services/api';
import { CalendarDays, Plus, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react';

export default function AcademicYearManagement() {
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [formData, setFormData] = useState({ yearCode: 'FE', name: 'First Year', departmentId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [ayRes, dRes] = await Promise.all([
        academicYearAPI.getAll(selectedDept || undefined),
        departmentAPI.getAll()
      ]);
      if (ayRes.success) setAcademicYears(ayRes.academicYears || []);
      if (dRes.success) {
        setDepartments(dRes.departments || []);
        if (!formData.departmentId && dRes.departments?.length > 0) {
          setFormData(prev => ({ ...prev, departmentId: dRes.departments[0].id }));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDept]);

  const handleOpenAdd = () => {
    setEditingYear(null);
    setFormData({
      yearCode: 'FE',
      name: 'First Year',
      departmentId: departments[0]?.id || ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (yr) => {
    setEditingYear(yr);
    setFormData({
      yearCode: yr.year_code,
      name: yr.name,
      departmentId: yr.department_id
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingYear) {
        await academicYearAPI.update(editingYear.id, formData);
        setSuccess('Academic year updated.');
      } else {
        await academicYearAPI.create(formData);
        setSuccess('Academic year added.');
      }
      setModalOpen(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete academic year "${name}"?`)) {
      try {
        await academicYearAPI.delete(id);
        setSuccess('Deleted academic year.');
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
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Academic Year Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure First Year (FE), Second Year (SE), Third Year (TE), and Final Year (BE) programs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 font-medium"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Academic Year</span>
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

      {/* Academic Years Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Year Code</th>
                <th className="py-3.5 px-5">Academic Level Name</th>
                <th className="py-3.5 px-5">Department</th>
                <th className="py-3.5 px-5">Student Roster</th>
                <th className="py-3.5 px-5">Divisions</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {academicYears.map((ay) => (
                <tr key={ay.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-5 font-mono font-bold text-blue-600">
                    {ay.year_code}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {ay.name}
                  </td>
                  <td className="py-3.5 px-5">
                    {ay.department_name} ({ay.department_code})
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="font-semibold text-slate-800">{ay.student_count || 0}</span> students
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="font-semibold text-slate-800">{ay.division_count || 0}</span> divisions
                  </td>
                  <td className="py-3.5 px-5 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(ay)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(ay.id, ay.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">
                {editingYear ? 'Edit Academic Year' : 'Add Academic Year'}
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
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Year Code (FE, SE, TE, BE)
                </label>
                <select
                  value={formData.yearCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const nameMap = { FE: 'First Year', SE: 'Second Year', TE: 'Third Year', BE: 'Final Year' };
                    setFormData({ ...formData, yearCode: code, name: nameMap[code] || 'Academic Year' });
                  }}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="FE">FE (First Year)</option>
                  <option value="SE">SE (Second Year)</option>
                  <option value="TE">TE (Third Year)</option>
                  <option value="BE">BE (Final Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs"
                />
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
