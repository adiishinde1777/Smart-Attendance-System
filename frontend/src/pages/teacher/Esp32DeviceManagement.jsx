import React, { useState, useEffect } from 'react';
import { deviceAPI, departmentAPI, divisionAPI, academicYearAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  Cpu, Plus, RotateCw, Trash2, Edit2, AlertTriangle,
  Eye, X, Check, ShieldCheck
} from 'lucide-react';

export default function Esp32DeviceManagement() {
  const { latestScan, latestFailure } = useSocket();
  const [devices, setDevices] = useState([]);
  const [unregisteredAttempts, setUnregisteredAttempts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceLogs, setDeviceLogs] = useState([]);

  const [formData, setFormData] = useState({
    deviceCode: 'ESP32-TY-A-01',
    name: 'Classroom Attendance Reader',
    departmentId: '',
    academicYearId: '',
    divisionId: '',
    classroom: 'Classroom 101',
    ipAddress: '',
    apiToken: 'esp32_secret_token_101',
    isActive: true
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadFilters = async () => {
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

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await deviceAPI.getAll();
      if (res.success) {
        setDevices(res.devices || []);
        setUnregisteredAttempts(res.unregisteredAttempts || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
    loadDevices();
  }, []);

  useEffect(() => {
    if (latestScan || latestFailure) {
      loadDevices();
    }
  }, [latestScan, latestFailure]);

  const handleDeptChange = async (deptId, preferredDivId = '') => {
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
      const deptDivs = divRes.success ? (divRes.divisions || []) : [];
      setAcademicYears(yearsList);

      const pickedDiv = (preferredDivId && deptDivs.find(dv => String(dv.id) === String(preferredDivId))) || deptDivs[0];
      if (pickedDiv) {
        setFormData(prev => ({
          ...prev,
          departmentId: deptId,
          academicYearId: pickedDiv.academic_year_id || (yearsList[0]?.id || ''),
          divisionId: pickedDiv.id
        }));
      } else if (yearsList.length > 0) {
        setFormData(prev => ({
          ...prev,
          departmentId: deptId,
          academicYearId: yearsList[0].id,
          divisionId: ''
        }));
      }
    } catch (e) {
      // ignore
    }
  };

  const handleOpenAdd = async (prefillAttempt = null) => {
    setError('');
    setEditingDevice(null);
    const firstDept = departments[0]?.id || '';
    const defaultCode = prefillAttempt?.deviceCode || (devices.length === 0 ? 'ESP32-TY-A-01' : `ESP32-TERM-${devices.length + 1}`);
    setFormData({
      deviceCode: defaultCode,
      name: 'Classroom Attendance Reader',
      departmentId: firstDept,
      academicYearId: '',
      divisionId: '',
      classroom: 'Classroom 101',
      ipAddress: prefillAttempt?.ip || '',
      apiToken: 'esp32_secret_token_101',
      isActive: true
    });
    if (firstDept) await handleDeptChange(firstDept);
    setModalOpen(true);
  };

  const handleOpenEdit = async (dev) => {
    setError('');
    setEditingDevice(dev);
    try {
      const ayRes = await academicYearAPI.getAll(dev.department_id);
      if (ayRes.success) setAcademicYears(ayRes.academicYears || []);
    } catch (e) {
      // ignore
    }
    setFormData({
      deviceCode: dev.device_code || '',
      name: dev.name || '',
      departmentId: dev.department_id || '',
      academicYearId: dev.academic_year_id || '',
      divisionId: dev.division_id || '',
      classroom: dev.classroom || '',
      ipAddress: dev.ip_address || '',
      apiToken: dev.api_token_raw || '',
      isActive: dev.is_active !== 0 && dev.is_active !== false
    });
    setModalOpen(true);
  };

  const handleSaveDevice = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingDevice) {
        await deviceAPI.update(editingDevice.id, formData);
        setSuccess(`Hardware device ${formData.deviceCode} updated successfully.`);
      } else {
        const res = await deviceAPI.register(formData);
        setSuccess(`Device ${formData.deviceCode} registered. Token: ${res.device.apiToken}`);
      }
      setModalOpen(false);
      loadDevices();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRotateToken = async (id, code) => {
    if (window.confirm(`Rotate API security credentials for ${code}? The hardware firmware will need the new token.`)) {
      try {
        const res = await deviceAPI.rotateToken(id);
        setSuccess(`New token generated for ${code}: ${res.apiToken}`);
        loadDevices();
        setTimeout(() => setSuccess(''), 6000);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleViewLogs = async (dev) => {
    setSelectedDevice(dev);
    try {
      const res = await deviceAPI.getLogs(dev.id);
      if (res.success) {
        setDeviceLogs(res.logs || []);
        setLogsModalOpen(true);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, code) => {
    if (window.confirm(`Unregister hardware device ${code}?`)) {
      try {
        await deviceAPI.delete(id);
        setSuccess('Device unregistered.');
        loadDevices();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const filteredModalDivisions = divisions.filter(dv => {
    if (formData.departmentId && String(dv.department_id) !== String(formData.departmentId)) return false;
    if (formData.academicYearId && String(dv.academic_year_id) !== String(formData.academicYearId)) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-[11px] font-mono font-bold text-blue-600 uppercase tracking-wider">
              SUPER ADMIN EXCLUSIVE ACCESS
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900 mt-0.5 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            Hardware Settings & Device Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register, edit classroom assignments, update credentials, and monitor hardware devices. Only visible to Super Admin.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => handleOpenAdd()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hardware Device</span>
          </button>
        </div>
      </div>

      {unregisteredAttempts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
          <div className="text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Unregistered Hardware Connection Detected!</span>
          </div>
          {unregisteredAttempts.map((att, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white/80 p-3 rounded-xl border border-amber-200/70">
              <div>
                <div className="font-mono font-bold text-slate-900">{att.deviceCode} <span className="text-slate-500 font-normal">(IP: {att.ip})</span></div>
                <div className="text-[11px] text-amber-800">{att.reason}{att.cardUid ? ` • Scanned UID: ${att.cardUid}` : ''}</div>
              </div>
              <button
                onClick={() => handleOpenAdd(att)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shrink-0"
              >
                Register {att.deviceCode} Now
              </button>
            </div>
          ))}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-mono">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State Helper */}
      {!loading && devices.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <Cpu className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-800 font-display">No Hardware Devices Registered</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create at least one Department and Division first, then click <strong>Add Hardware Device</strong> to register your physical reader (e.g., <code className="font-mono text-blue-600">ESP32-TY-A-01</code>).
          </p>
        </div>
      )}

      {/* Devices Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {devices.map((dev) => {
          const isOnline = dev.status === 'online';
          return (
            <div key={dev.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                    <span className="font-mono text-xs font-bold text-slate-900">{dev.device_code}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {!dev.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                        DISABLED
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isOnline
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {dev.status}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-3 font-display">
                  {dev.name}
                </h3>
                <div className="text-xs text-blue-600 font-medium">{dev.classroom}</div>
                <div className="text-xs text-slate-500">{dev.department_name} • {dev.academic_year_name} • {dev.division_name}</div>

                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs font-mono text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>IP Address:</span>
                    <span className="text-slate-900">{dev.ip_address || 'DHCP Assigned'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Last Heartbeat:</span>
                    <span className="text-slate-900">{dev.last_heartbeat ? dev.last_heartbeat.slice(11, 19) : 'None'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Last Scan:</span>
                    <span className="text-emerald-700">{dev.last_scan_time ? dev.last_scan_time.slice(11, 19) : 'No scans yet'}</span>
                  </div>
                </div>

                {/* API Token Box */}
                <div className="mt-3 p-2 rounded-lg bg-slate-950 text-slate-300 font-mono text-[10px] flex items-center justify-between border border-slate-800">
                  <div className="truncate mr-2">
                    <span className="text-slate-500">TOKEN: </span>
                    <span className="text-emerald-400">{dev.api_token_raw || 'configured'}</span>
                  </div>
                  <button
                    onClick={() => handleRotateToken(dev.id, dev.device_code)}
                    title="Rotate token"
                    className="text-slate-400 hover:text-white"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleViewLogs(dev)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Hardware Logs
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(dev)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                    title="Edit hardware settings"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(dev.id, dev.device_code)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                    title="Unregister device"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs Modal */}
      {logsModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-display">
                  Hardware Scan Logs: {selectedDevice.device_code}
                </h3>
                <p className="text-xs text-slate-500">{selectedDevice.classroom} — Physical Ingestion Trail</p>
              </div>
              <button onClick={() => setLogsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-2">
              {deviceLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No logs found for this device.</div>
              ) : (
                deviceLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900">{log.card_uid}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.is_success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.is_success ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{log.failure_reason || 'Verified attendance recorded'}</div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono shrink-0">
                      {log.scanned_at ? log.scanned_at.slice(11, 19) : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 font-display">
                {editingDevice ? `Edit Hardware: ${editingDevice.device_code}` : 'Register Hardware Device'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveDevice} className="p-6 space-y-3 overflow-y-auto">
              {(departments.length === 0 || divisions.length === 0) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  Please create a Department and a Division first before registering a hardware terminal.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unique Device ID Code *</label>
                <input
                  type="text"
                  required
                  value={formData.deviceCode}
                  onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase"
                  placeholder="ESP32-TY-A-01"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Friendly Terminal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  placeholder="Classroom 101 Reader Terminal"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year *</label>
                  <select
                    required
                    value={formData.academicYearId}
                    onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value, divisionId: '' })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select --</option>
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id}>{ay.year_code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Division *</label>
                  <select
                    required
                    value={formData.divisionId}
                    onChange={(e) => setFormData({ ...formData, divisionId: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="">-- Select --</option>
                    {filteredModalDivisions.map(dv => (
                      <option key={dv.id} value={dv.id}>{dv.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Classroom Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.classroom}
                    onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="Classroom 101"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Static IP (Optional)</label>
                  <input
                    type="text"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="Auto DHCP"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Device API Token {editingDevice ? '(Leave as-is or edit)' : '(Optional, auto-generated if empty)'}
                </label>
                <input
                  type="text"
                  value={formData.apiToken}
                  onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                  placeholder="esp32_secret_token_101"
                />
              </div>

              {editingDevice && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    id="deviceActiveCheck"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <label htmlFor="deviceActiveCheck" className="text-xs font-medium text-slate-700">
                    Hardware device active & allowed to submit scans
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                  {editingDevice ? 'Save Changes' : 'Register Hardware'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
