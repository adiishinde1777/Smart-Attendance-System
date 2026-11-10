import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { timetableAPI } from '../../services/api';
import { CalendarCheck, Clock, MapPin, User } from 'lucide-react';

export default function StudentTimetable() {
  const { user } = useAuth();
  const student = user?.student;
  const [timetable, setTimetable] = useState([]);
  const [activeDay, setActiveDay] = useState('Monday');
  const [loading, setLoading] = useState(true);

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    async function loadSchedule() {
      if (!student?.division_id) return;
      try {
        setLoading(true);
        const res = await timetableAPI.getAll({ divisionId: student.division_id });
        if (res.success) setTimetable(res.timetable || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [student?.division_id]);

  const activeDaySlots = timetable.filter(t => t.day_of_week === activeDay);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            Class Lecture Timetable
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {student?.department_name} • {student?.academic_year_name} ({student?.division_name})
          </p>
        </div>
      </div>

      {/* Weekday Switcher */}
      <div className="flex rounded-2xl bg-slate-200/60 p-1.5 overflow-x-auto gap-1">
        {weekdays.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition shrink-0 ${
              activeDay === day
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Lecture Slots Timeline */}
      <div className="space-y-3">
        {activeDaySlots.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            No scheduled lectures on {activeDay}.
          </div>
        ) : (
          activeDaySlots.map((slot) => (
            <div
              key={slot.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex flex-col items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-blue-600">{slot.subject_code}</div>
                  <h3 className="font-bold text-sm text-slate-900 font-display">{slot.subject_name}</h3>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {slot.teacher_name}</span>
                    <span className="flex items-center gap-1 font-mono text-slate-700 font-semibold"><MapPin className="w-3.5 h-3.5 text-rose-500" /> {slot.classroom}</span>
                  </div>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 shrink-0">
                <div className="text-base font-bold font-mono text-slate-900">
                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">1 Hour Lecture</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
