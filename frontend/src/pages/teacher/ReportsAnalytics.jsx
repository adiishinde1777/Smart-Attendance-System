import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { FileText, Download, Printer, Filter, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ReportsAnalytics() {
  const [reportType, setReportType] = useState('daily_attendance');
  const [reportData, setReportData] = useState([]);
  const [reportTitle, setReportTitle] = useState('Daily Attendance Report');
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.getData({
        reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      if (res.success) {
        setReportData(res.data || []);
        setReportTitle(res.title || 'Attendance Report');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const handleExportExcel = () => {
    window.open(`http://${window.location.hostname}:5000/api/reports/export?reportType=${reportType}&format=excel`, '_blank');
  };

  const handleExportPDF = () => {
    if (!reportData || reportData.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(reportTitle, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Smart Attendance System`, 14, 22);

    const headers = Object.keys(reportData[0]);
    const rows = reportData.map(r => headers.map(h => String(r[h] || '')));

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`${reportType}_report.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const reportOptions = [
    { id: 'daily_attendance', label: 'Daily Attendance Report' },
    { id: 'student_attendance', label: 'Student-Wise Attendance Percentage Report' },
    { id: 'marks_report', label: 'Internal Examination Marks Report' },
    { id: 'rfid_logs', label: 'Attendance Activity Logs' },
    { id: 'summary', label: 'Department / Subject Attendance Summary' },
  ];

  const headers = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Reports & Academic Analytics Generator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Export comprehensive college attendance, marks, and activity records to PDF, Excel, or Print.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Excel Export</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>PDF Export</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center space-x-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Select Report Type Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-2 print:hidden">
        {reportOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setReportType(opt.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              reportType === opt.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Report Sheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">{reportTitle}</h3>
            <p className="text-xs text-slate-400">Total Rows: {reportData.length} records</p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            OFFICIAL COLLEGE RECORD
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="py-3 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  {headers.map((h) => (
                    <td key={h} className="py-2.5 px-4">
                      {String(row[h] || '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
