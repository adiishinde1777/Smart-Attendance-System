import React, { useState, useEffect } from 'react';
import { marksAPI, divisionAPI, subjectsAPI, studentAPI } from '../../services/api';
import { Award, Plus, Edit2, Download, Check, X, AlertCircle } from 'lucide-react';

export default function MarksManagement() {
  const [marks, setMarks] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedDiv, setSelectedDiv] = useState('');
  const [selectedSub, setSelectedSub] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
    examinationId: '1',
    marksObtained: '',
    remarks: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFilters = async () => {
    try {
      const [divRes, subRes] = await Promise.all([
        divisionAPI.getAll(),
        subjectsAPI.getAll()
      ]);
      if (divRes.success) setDivisions(divRes.divisions || []);
      if (subRes.success) setSubjects(subRes.subjects || []);
    } catch (e) {
      // ignore
    }
  };

  const loadMarks = async () => {
    try {
      setLoading(true);
      const res = await marksAPI.getAll({
        divisionId: selectedDiv || undefined,
        subjectId: selectedSub || undefined
      });
      if (res.success) setMarks(res.marks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsInDiv = async (divId) => {
    try {
      const res = await studentAPI.getAll({ divisionId: divId || undefined, limit: 150 });
      if (res.success) setStudents(res.students || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadMarks();
    loadStudentsInDiv(selectedDiv);
  }, [selectedDiv, selectedSub]);

  const handleOpenAdd = () => {
    setFormData({
      studentId: students[0]?.student_id || '',
      subjectId: subjects[0]?.id || '',
      examinationId: '1',
      marksObtained: '',
      remarks: 'Continuous Evaluation'
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await marksAPI.save(formData);
      setSuccess('Marks recorded and audited successfully.');
      setModalOpen(false);
      loadMarks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportExcel = () => {
    window.open(`http://${window.location.hostname}:5000/api/marks/export?divisionId=${selectedDiv || ''}&subjectId=${selectedSub || ''}`, '_blank');
  };

  const exams = [
    { id: 1, name: 'Class Test 1 (CT1)', max: 10 },
    { id: 2, name: 'Mid Semester Examination', max: 20 },
    { id: 3, name: 'Class Test 2 (CT2)', max: 10 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Internal Marks Management (40 Marks Matrix)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            CT1 (Max 10) + Mid-Sem (Max 20) + CT2 (Max 10) = 40 Total Internal Marks with boundary validation.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-300 flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Marks</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Enter / Edit Marks</span>
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

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          value={selectedSub}
          onChange={(e) => setSelectedSub(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
        >
          <option value="">All Subjects</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
          ))}
        </select>
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Roll</th>
                <th className="py-3 px-4">Student Name & PRN</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Examination</th>
                <th className="py-3 px-4">Marks Obtained</th>
                <th className="py-3 px-4">Max Marks</th>
                <th className="py-3 px-4">Evaluator</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {marks.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.roll_number}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{m.student_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{m.prn}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{m.subject_name}</td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                      {m.exam_code}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-sm text-slate-900">
                    {parseFloat(m.marks_obtained).toFixed(1)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{m.max_marks}</td>
                  <td className="py-3 px-4 text-slate-600">{m.evaluator_name || 'Department Faculty'}</td>
                  <td className="py-3 px-4 text-[11px] text-slate-500 italic">{m.remarks || '—'}</td>
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
              <h3 className="font-bold text-sm text-slate-900 font-display">Record Examination Marks</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student</label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {students.map(st => (
                    <option key={st.student_id} value={st.student_id}>
                      {st.roll_number} - {st.full_name} ({st.prn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Examination Component</label>
                <select
                  value={formData.examinationId}
                  onChange={(e) => setFormData({ ...formData, examinationId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="1">Class Test 1 (Max Marks: 10)</option>
                  <option value="2">Mid Semester Examination (Max Marks: 20)</option>
                  <option value="3">Class Test 2 (Max Marks: 10)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marks Obtained (Numeric) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0"
                  max={formData.examinationId === '2' ? '20' : '10'}
                  placeholder="e.g. 8.5"
                  value={formData.marksObtained}
                  onChange={(e) => setFormData({ ...formData, marksObtained: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Evaluation feedback..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">Save Marks</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
