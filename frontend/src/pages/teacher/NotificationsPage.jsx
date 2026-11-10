import React, { useState, useEffect } from 'react';
import { notificationAPI } from '../../services/api';
import { Bell, Check, Plus, AlertCircle, X, ExternalLink, Radio } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [success, setSuccess] = useState('');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll();
      if (res.success) setNotifications(res.notifications || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markRead('all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setSuccess('All notifications marked as read.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      // ignore
    }
  };

  const handleSendNotice = async (e) => {
    e.preventDefault();
    if (!title || !message) return;
    try {
      await notificationAPI.create({ title, message, type });
      setSuccess('Broadcast announcement dispatched to all students and faculty.');
      setModalOpen(false);
      setTitle('');
      setMessage('');
      loadNotifications();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Institutional Notifications & Announcements
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time notifications sent to student dashboards upon attendance updates, marks release, and campus bulletins.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300"
          >
            Mark All Read
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Broadcast Notice</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            No active notifications in system.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition ${
                n.is_read
                  ? 'bg-white border-slate-200'
                  : 'bg-blue-50/40 border-blue-200 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${n.is_read ? 'bg-slate-300' : 'bg-blue-600'}`} />
                  <h4 className="text-sm font-bold text-slate-900 font-display">{n.title}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {n.type}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {n.created_at ? n.created_at.slice(0, 16) : ''}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{n.message}</p>
            </div>
          ))
        )}
      </div>

      {/* Broadcast Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">Broadcast College Announcement</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSendNotice} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Revision / Mid-Sem Exam Announcement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="system">General Campus System Bulletin</option>
                  <option value="attendance">Attendance Policy Notice</option>
                  <option value="marks">Examination & Marks Notice</option>
                  <option value="timetable">Timetable Revision</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Announcement Message *</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Type message text here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md">Dispatch Notice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
