import React, { useState, useEffect } from 'react';
import { studentAPI, departmentAPI, academicYearAPI, divisionAPI, rfidAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  GraduationCap, Plus, Search, Filter, Download, Edit2, Trash2,
  CreditCard, CheckCircle2, AlertTriangle, X, Check, Eye
} from 'lucide-react';

export default function StudentManagement() {
  const { latestFailure } = useSocket();
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [latestDetectedUid, setLatestDetectedUid] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    rollNumber: '',
    prn: '',
    departmentId: '',
    academicYearId: '',
    divisionId: '',
    cardUid: '',
    password: '',
    status: 'active'
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

  const loadStudents = async (page = 1) => {
    try {
      setLoading(true);
      const res = await studentAPI.getAll({
        page,
        limit: 50,
        search: search || undefined,
        departmentId: selectedDept || undefined,
        divisionId: selectedDiv || undefined,
        status: selectedStatus || undefined
      });
      if (res.success) {
        setStudents(res.students || []);
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterData();
  }, []);

  const refreshDetectedCard = async () => {
    try {
      const res = await rfidAPI.getLatestUnknown();
      if (res.success && res.latestCardScan?.cardUid) {
        setLatestDetectedUid(res.latestCardScan.cardUid);
      } else {
        setLatestDetectedUid('');
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (modalOpen) refreshDetectedCard();
  }, [modalOpen, latestFailure]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadStudents(1);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedDept, selectedDiv, selectedStatus]);

  const handleDeptChange = async (deptId) => {
    setFormData(prev => ({ ...prev, departmentId: deptId, academicYearId: '', divisionId: '' }));
    if (!deptId) {
      setAcademicYears([]);
      return;
    }
    try {
      const [ayRes, divRes] = await Promise.all([
        academicYearAPI.getAll(deptId),
        divisionAPI.getAll({ departmentId: deptId })
      ]);
      const yearsList = ayRes.success ? (ayRes.academicYears || []) : [];
      const divsList = divRes.success ? (divRes.divisions || []) : [];
      setAcademicYears(yearsList);

      // Prefer a division's matching academic year so Year & Division stay consistent
      if (divsList.length > 0) {
        setFormData(prev => ({
          ...prev,
          departmentId: deptId,
          academicYearId: divsList[0].academic_year_id || (yearsList[0]?.id || ''),
          divisionId: divsList[0].id
        }));
      } else if (yearsList.length > 0) {
        setFormData(prev => ({ ...prev, departmentId: deptId, academicYearId: yearsList[0].id, divisionId: '' }));
      }
    } catch (e) {
      // ignore
    }
  };

  const handleOpenAdd = async () => {
    setError('');
    setEditingStudent(null);
    const firstDept = departments[0]?.id || '';
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      rollNumber: '',
      prn: '',
      departmentId: firstDept,
      academicYearId: '',
      divisionId: '',
      cardUid: '',
      password: 'Student@123',
      status: 'active'
    });

    if (firstDept) {
      const [ayRes, divRes] = await Promise.all([
        academicYearAPI.getAll(firstDept),
        divisionAPI.getAll({ departmentId: firstDept })
      ]);
      const yearsList = ayRes.success ? (ayRes.academicYears || []) : [];
      const divsList = divRes.success ? (divRes.divisions || []) : [];
      setAcademicYears(yearsList);

      if (divsList.length > 0) {
        setFormData(prev => ({
          ...prev,
          academicYearId: divsList[0].academic_year_id || (yearsList[0]?.id || ''),
          divisionId: divsList[0].id
        }));
      } else if (yearsList.length > 0) {
        setFormData(prev => ({ ...prev, academicYearId: yearsList[0].id }));
      }
    }
    setModalOpen(true);
  };

  const handleOpenEdit = async (st) => {
    setEditingStudent(st);
    setFormData({
      fullName: st.full_name,
      email: st.email,
      phone: st.phone || '',
      rollNumber: st.roll_number,
      prn: st.prn,
      departmentId: st.department_id,
      academicYearId: st.academic_year_id,
      divisionId: st.division_id,
      cardUid: st.card_uid || '',
      password: '',
      status: st.status
    });

    const [ayRes, divRes] = await Promise.all([
      academicYearAPI.getAll(st.department_id),
      divisionAPI.getAll({ departmentId: st.department_id })
    ]);
    if (ayRes.success) setAcademicYears(ayRes.academicYears || []);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await studentAPI.update(editingStudent.student_id, formData);
        setSuccess('Student profile updated successfully.');
      } else {
        await studentAPI.create(formData);
        setSuccess('New student added and enrolled successfully.');
      }
      setModalOpen(false);
      loadStudents(pagination.page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, name, roll) => {
    if (window.confirm(`Permanently remove student ${name} (Roll ${roll})? This will also remove attendance and marks records.`)) {
      try {
        await studentAPI.delete(id);
        setSuccess('Student record deleted.');
        loadStudents(pagination.page);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleExportExcel = () => {
    window.open(`http://${window.location.hostname}:5000/api/students/export?departmentId=${selectedDept || ''}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            Student Management & Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage enrolled students, unique PRNs, attendance card UIDs, and live attendance metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center space-x-1.5 border border-slate-300"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
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
          <AlertTriangle className="w-4 h-4 text-rose-600" /> {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student, roll, PRN, RFID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
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
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
        >
          <option value="">All Account Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="detained">Detained</option>
        </select>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Roll</th>
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4">PRN Number</th>
                <th className="py-3 px-4">Dept & Division</th>
                <th className="py-3 px-4">RFID UID</th>
                <th className="py-3 px-4">Attendance Rate</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {students.map((st) => (
                <tr key={st.student_id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {st.roll_number}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{st.full_name}</div>
                    <div className="text-[11px] text-slate-400">{st.email}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    {st.prn}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">{st.department_code}</span>
                    <span className="text-slate-400"> • {st.division_name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {st.card_uid ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-cyan-700 border border-slate-200 text-[11px] font-bold">
                        {st.card_uid}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold ${st.is_shortage ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {st.attendance_percentage}%
                      </span>
                      {st.is_shortage && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-bold border border-rose-200">
                          SHORTAGE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      st.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {st.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(st)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition"
                      title="Edit student"
                    >
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(st.student_id, st.full_name, st.roll_number)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Delete student"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>Showing {students.length} of {pagination.total} registered students</div>
          <div className="flex space-x-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => loadStudents(pagination.page - 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-mono font-semibold text-slate-700">
              Page {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadStudents(pagination.page + 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">
                {editingStudent ? `Edit Student: ${editingStudent.full_name}` : 'Register New Student'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="e.g. Full Student Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="student@college.edu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PRN Number (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.prn}
                    onChange={(e) => setFormData({ ...formData, prn: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="PRN2024001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ID Card UID
                  </label>
                  <input
                    type="text"
                    value={formData.cardUid}
                    onChange={(e) => setFormData({ ...formData, cardUid: e.target.value.replace(/[\s:-]+/g, '').toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="e.g. A3B5C821"
                  />
                  {latestDetectedUid && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, cardUid: latestDetectedUid }))}
                      className="mt-1 text-[10px] font-mono text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>Last scanned ID: {latestDetectedUid} (Click to use)</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select Dept --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year *
                  </label>
                  <select
                    required
                    value={formData.academicYearId}
                    onChange={(e) => {
                      const nextYearId = e.target.value;
                      const matchedDiv = divisions.find(
                        dv => (!formData.departmentId || String(dv.department_id) === String(formData.departmentId)) &&
                              String(dv.academic_year_id) === String(nextYearId)
                      );
                      setFormData(prev => ({
                        ...prev,
                        academicYearId: nextYearId,
                        divisionId: matchedDiv ? matchedDiv.id : ''
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select Year --</option>
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id}>{ay.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Division Cohort *
                  </label>
                  <select
                    required
                    value={formData.divisionId}
                    onChange={(e) => {
                      const nextDivId = e.target.value;
                      const pickedDiv = divisions.find(dv => String(dv.id) === String(nextDivId));
                      setFormData(prev => ({
                        ...prev,
                        divisionId: nextDivId,
                        academicYearId: pickedDiv?.academic_year_id || prev.academicYearId
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select Division --</option>
                    {divisions
                      .filter(dv => !formData.departmentId || String(dv.department_id) === String(formData.departmentId))
                      .map(dv => (
                        <option key={dv.id} value={dv.id}>
                          {dv.year_code ? `[${dv.year_code}] ` : ''}{dv.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password {editingStudent ? '(Leave blank to keep)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="Default: Student@123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs capitalize"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="detained">Detained</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  {editingStudent ? 'Save Changes' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
