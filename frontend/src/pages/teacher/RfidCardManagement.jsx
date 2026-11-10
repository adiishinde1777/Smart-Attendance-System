import React, { useState, useEffect } from 'react';
import { rfidAPI, studentAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { CreditCard, Plus, Search, ShieldAlert, CheckCircle2, UserX, ShieldCheck, X, Check, AlertCircle } from 'lucide-react';

export default function RfidCardManagement() {
  const { latestFailure } = useSocket();
  const [cards, setCards] = useState([]);
  const [students, setStudents] = useState([]);
  const [latestDetectedUid, setLatestDetectedUid] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const [newCardUid, setNewCardUid] = useState('');
  const [assignStudentId, setAssignStudentId] = useState('');
  const [blockReason, setBlockReason] = useState('Reported lost/stolen');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCards = async () => {
    try {
      setLoading(true);
      const res = await rfidAPI.getAll({
        search: search || undefined,
        status: statusFilter || undefined
      });
      if (res.success) setCards(res.cards || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await studentAPI.getAll({ limit: 150 });
      if (res.success) setStudents(res.students || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await rfidAPI.getLatestUnknown();
        if (res.success && res.latestCardScan?.cardUid) {
          setLatestDetectedUid(res.latestCardScan.cardUid);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchLatest();
  }, [regModalOpen, latestFailure]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCards();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleRegisterCard = async (e) => {
    e.preventDefault();
    if (!newCardUid) return;
    try {
      await rfidAPI.register({ cardUid: newCardUid, studentId: assignStudentId || null });
      setSuccess(`Card ${newCardUid.toUpperCase()} registered.`);
      setRegModalOpen(false);
      setNewCardUid('');
      setAssignStudentId('');
      loadCards();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    if (!selectedCard) return;
    try {
      await rfidAPI.assign(selectedCard.id, assignStudentId || null);
      setSuccess('Card assignment updated.');
      setAssignModalOpen(false);
      loadCards();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBlockCard = async (e) => {
    e.preventDefault();
    if (!selectedCard) return;
    try {
      await rfidAPI.updateStatus(selectedCard.id, {
        status: 'blocked',
        blockedReason: blockReason
      });
      setSuccess(`Card ${selectedCard.card_uid} is now blocked.`);
      setBlockModalOpen(false);
      loadCards();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnblockCard = async (card) => {
    try {
      await rfidAPI.updateStatus(card.id, { status: card.student_id ? 'active' : 'unassigned' });
      setSuccess(`Card ${card.card_uid} unblocked.`);
      loadCards();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnassignCard = async (card) => {
    if (window.confirm(`Unassign card ${card.card_uid} from ${card.student_name}?`)) {
      try {
        await rfidAPI.assign(card.id, null);
        setSuccess('Card unassigned.');
        loadCards();
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
            <CreditCard className="w-5 h-5 text-blue-600" />
            Student ID Card Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register student attendance card UIDs, pair with student PRNs, block lost tags, and replace damaged cards.
          </p>
        </div>

        <button
          onClick={() => { setNewCardUid(''); setAssignStudentId(''); setRegModalOpen(true); }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Card</span>
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
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by RFID Card UID, student name or PRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
        >
          <option value="">All Card Statuses</option>
          <option value="active">Active (Assigned)</option>
          <option value="unassigned">Unassigned (Available)</option>
          <option value="blocked">Blocked (Lost/Stolen)</option>
        </select>
      </div>

      {/* Cards Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">RFID UID</th>
                <th className="py-3.5 px-4">Card Status</th>
                <th className="py-3.5 px-4">Assigned Student</th>
                <th className="py-3.5 px-4">Roll / PRN</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Issued Timestamp</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {cards.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-cyan-800 border border-slate-200 font-mono text-[11px]">
                      {c.card_uid}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      c.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : c.status === 'blocked'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {c.status}
                    </span>
                    {c.blocked_reason && (
                      <div className="text-[10px] text-rose-500 italic mt-0.5">{c.blocked_reason}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {c.student_name || <span className="text-slate-400 italic">Unassigned</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {c.roll_number ? `${c.roll_number} / ${c.prn}` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    {c.department_name ? `${c.department_name} (${c.division_name})` : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {c.issued_at ? c.issued_at.slice(0, 16) : 'Not issued'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => { setSelectedCard(c); setAssignStudentId(c.student_id || ''); setAssignModalOpen(true); }}
                      className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      Assign / Swap
                    </button>
                    {c.status === 'blocked' ? (
                      <button
                        onClick={() => handleUnblockCard(c)}
                        className="px-2 py-1 text-[11px] rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => { setSelectedCard(c); setBlockModalOpen(true); }}
                        className="px-2 py-1 text-[11px] rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium"
                      >
                        Block
                      </button>
                    )}
                    {c.student_id && (
                      <button
                        onClick={() => handleUnassignCard(c)}
                        className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-500 font-medium"
                      >
                        Unassign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Card Modal */}
      {regModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">Register New RFID Card</h3>
              <button onClick={() => setRegModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleRegisterCard} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RFID Card UID (Hexadecimal, e.g. A3B5C821) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A3B5C821"
                  value={newCardUid}
                  onChange={(e) => setNewCardUid(e.target.value.replace(/[\s:-]+/g, '').toUpperCase())}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-1 focus:ring-blue-500 uppercase"
                />
                {latestDetectedUid && (
                  <button
                    type="button"
                    onClick={() => setNewCardUid(latestDetectedUid)}
                    className="mt-1.5 text-[11px] font-mono text-blue-600 hover:underline"
                  >
                    Last unrecognized card detected: {latestDetectedUid} (Click to fill)
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign To Student Immediately (Optional)
                </label>
                <select
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="">Leave Unassigned (Inventory)</option>
                  {students.map(st => (
                    <option key={st.student_id} value={st.student_id}>
                      {st.roll_number} - {st.full_name} ({st.department_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setRegModalOpen(false)} className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">Register Card</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModalOpen && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">Assign Card {selectedCard.card_uid}</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAssignStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student</label>
                <select
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="">Unassign / Free Card</option>
                  {students.map(st => (
                    <option key={st.student_id} value={st.student_id}>
                      {st.roll_number} - {st.full_name} ({st.prn})
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setAssignModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">Save Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {blockModalOpen && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-rose-900 font-display flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Block RFID Card {selectedCard.card_uid}
              </h3>
              <button onClick={() => setBlockModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleBlockCard} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Blocking this card will instantly disable attendance validation for this tag across the institution.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Blocking</label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setBlockModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold">Confirm Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
