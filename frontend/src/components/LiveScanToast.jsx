import React from 'react';
import { useSocket } from '../context/SocketContext';
import { CheckCircle2, AlertTriangle, X, Radio } from 'lucide-react';

export default function LiveScanToast() {
  const { activeToast, clearToast } = useSocket();

  if (!activeToast) return null;

  const isSuccess = activeToast.type === 'success';

  return (
    <div className="fixed top-16 right-6 z-50 max-w-md w-full animate-bounce-short shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 text-white">
      <div className="p-4 flex items-start space-x-3.5">
        <div className={`p-2 rounded-xl shrink-0 ${isSuccess ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
          {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              {activeToast.title}
            </h4>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              JUST NOW
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {activeToast.message}
          </p>

          {activeToast.data?.subjectName && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>{activeToast.data.classroom || 'Classroom 101'}</span>
              <span className="text-emerald-400 font-semibold">{activeToast.data.status || 'Present'}</span>
            </div>
          )}
        </div>

        <button
          onClick={clearToast}
          className="text-slate-400 hover:text-white transition p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress timer bar */}
      <div className={`h-1 w-full ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
    </div>
  );
}
