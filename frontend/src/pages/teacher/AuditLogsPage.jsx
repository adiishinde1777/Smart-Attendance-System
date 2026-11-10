import React, { useState, useEffect } from 'react';
import { auditAPI } from '../../services/api';
import { ShieldCheck, Search, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await auditAPI.getAll();
      if (res.success) setLogs(res.logs || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    const term = search.toLowerCase();
    return (
      (l.action && l.action.toLowerCase().includes(term)) ||
      (l.entity_type && l.entity_type.toLowerCase().includes(term)) ||
      (l.user_name && l.user_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          Institutional Audit Logs & Change History
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable audit trail tracking all manual attendance corrections, grade modifications, and system updates.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit actions, user, or entity type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Triggered By</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Details / Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {log.created_at ? log.created_at.slice(0, 19) : ''}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                    {log.entity_type} (ID: {log.entity_id || 'N/A'})
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {log.user_name || 'System Auto Engine'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                    {log.new_values || 'Record created/updated'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
