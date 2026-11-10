import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { marksAPI } from '../../services/api';
import { Award, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StudentMarks() {
  const { user } = useAuth();
  const studentId = user?.student?.student_id;
  const [subjectsMarks, setSubjectsMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMarks() {
      if (!studentId) return;
      try {
        setLoading(true);
        const res = await marksAPI.getStudentMarks(studentId);
        if (res.success) setSubjectsMarks(res.subjectsMarks || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMarks();
  }, [studentId]);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          Internal Continuous Assessment Marks
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Breakdown of Class Test 1 (10M), Mid-Semester Exam (20M), Class Test 2 (10M) with consolidated internal score out of 40.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {subjectsMarks.map((sm) => {
          const percentage = ((sm.totalObtained / sm.totalMax) * 100).toFixed(1);
          return (
            <div key={sm.subjectId} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {sm.subjectCode}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 font-display mt-2">{sm.subjectName}</h3>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-extrabold text-indigo-600 font-display">
                    {sm.totalObtained.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 40</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-emerald-600">{percentage}% Score</span>
                </div>
              </div>

              {/* Assessment Breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center font-mono text-xs">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Class Test 1</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {sm.ct1 !== null ? `${sm.ct1}` : '—'}<span className="text-[10px] text-slate-400 font-normal">/10</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Mid-Sem Exam</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {sm.midSem !== null ? `${sm.midSem}` : '—'}<span className="text-[10px] text-slate-400 font-normal">/20</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Class Test 2</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {sm.ct2 !== null ? `${sm.ct2}` : '—'}<span className="text-[10px] text-slate-400 font-normal">/10</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
