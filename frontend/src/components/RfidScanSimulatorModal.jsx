import React, { useState } from 'react';
import { Cpu, Radio, AlertTriangle, CheckCircle2, XCircle, Volume2, VolumeX, Sparkles, X } from 'lucide-react';
import { attendanceAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

export default function RfidScanSimulatorModal({ isOpen, onClose }) {
  const { soundEnabled, setSoundEnabled, triggerHardwareAudio } = useSocket();
  const [deviceCode, setDeviceCode] = useState('ESP32-TY-A-01');
  const [selectedUid, setSelectedUid] = useState('A3B5C821');
  const [customUid, setCustomUid] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  // Simulated Hardware State
  const [lcdLine1, setLcdLine1] = useState('Smart Attendance');
  const [lcdLine2, setLcdLine2] = useState('Tap RFID Card...');
  const [greenLed, setGreenLed] = useState(false);
  const [redLed, setRedLed] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const demoCards = [
    { name: 'Rahul Patil (Roll 101, VLSI Div A)', uid: 'A3B5C821', note: 'Standard Valid Student' },
    { name: 'Priya Sharma (Roll 102, VLSI Div A)', uid: 'B4C6D932', note: 'Standard Valid Student' },
    { name: 'Aditya Joshi (Roll 103, VLSI Div A)', uid: 'C5D7EA43', note: 'Standard Valid Student' },
    { name: 'Siddharth More (Roll 113, VLSI Div A)', uid: '1A2C3F98', note: 'Standard Valid Student' },
    { name: 'Kunal Tambe (Roll 143, VLSI Div B)', uid: '785BC921', note: 'Division B (Test Wrong Div on Div A device)' },
    { name: 'Blocked Card (Reported Stolen)', uid: 'BLOCKED99', note: 'Error Test: Card Blocked' },
    { name: 'Unassigned Blank Card', uid: 'UNASSIGN01', note: 'Error Test: Card Unassigned' },
    { name: 'Unknown Alien RFID Card', uid: 'UNKNOWN_9A7B', note: 'Error Test: Card Not in DB' },
  ];

  const handleSimulateScan = async () => {
    const cardToScan = (useCustom ? customUid : selectedUid).trim().toUpperCase();
    if (!cardToScan) return;

    setLoading(true);
    setScanResult(null);
    setGreenLed(false);
    setRedLed(false);

    // Hardware LCD animation: Reading
    setLcdLine1(`UID: ${cardToScan.slice(0, 10)}`);
    setLcdLine2('Verifying API...');

    try {
      const res = await attendanceAPI.scan({
        cardUid: cardToScan,
        deviceCode
      });

      // Hardware Success
      setGreenLed(true);
      setRedLed(false);
      setLcdLine1(res.studentName || 'Student Verified');
      setLcdLine2(res.displayMessage || 'Attendance OK');
      triggerHardwareAudio('success');

      setScanResult({
        success: true,
        message: `${res.studentName} marked ${res.attendanceStatus} for ${res.subjectName}`,
        details: res
      });

      setTimeout(() => {
        setGreenLed(false);
      }, 2500);

    } catch (err) {
      // Hardware Failure
      setGreenLed(false);
      setRedLed(true);
      const errMsg = err.message || 'Scan Rejected';
      setLcdLine1('Scan Rejected');
      setLcdLine2(errMsg.length > 16 ? errMsg.slice(0, 16) : errMsg);
      triggerHardwareAudio('error');

      setScanResult({
        success: false,
        message: errMsg
      });

      setTimeout(() => {
        setRedLed(false);
      }, 2500);
    } finally {
      setLoading(false);
    }
  };

  const handleResetHardware = () => {
    setLcdLine1('Smart Attendance');
    setLcdLine2('Tap RFID Card...');
    setGreenLed(false);
    setRedLed(false);
    setScanResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white font-display flex items-center gap-2">
                IoT ESP32 & RFID Hardware Simulator
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  LIVE VIRTUAL BENCH
                </span>
              </h3>
              <p className="text-xs text-slate-400">Emulates real ESP32 microcontroller, RC522 reader, LEDs & I2C LCD</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute buzzer sound' : 'Enable buzzer sound'}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* VIRTUAL HARDWARE BENCH */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-mono uppercase tracking-wider">
              <span>ESP32 Physical Peripherals</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ONLINE (I2C 0x27 / SPI VSPI)
              </span>
            </div>

            {/* LCD Screen Display */}
            <div className="lcd-screen p-4 rounded-lg select-none mb-4">
              <div className="text-sm font-mono tracking-widest text-emerald-300 truncate h-6">
                {lcdLine1.padEnd(16, ' ')}
              </div>
              <div className="text-sm font-mono tracking-widest text-emerald-400 truncate h-6">
                {lcdLine2.padEnd(16, ' ')}
              </div>
            </div>

            {/* Hardware LEDs & Buzzer Status */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              {/* Green LED */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full transition-all duration-300 ${greenLed ? 'bg-emerald-400 led-glow-green scale-110' : 'bg-emerald-950 border border-emerald-800'}`} />
                <div>
                  <div className="font-semibold text-slate-200">Green LED (GPIO 2)</div>
                  <div className="text-[11px] text-slate-400">{greenLed ? 'CONFIRMED' : 'STANDBY'}</div>
                </div>
              </div>

              {/* Red LED */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full transition-all duration-300 ${redLed ? 'bg-rose-500 led-glow-red scale-110' : 'bg-rose-950 border border-rose-800'}`} />
                <div>
                  <div className="font-semibold text-slate-200">Red LED (GPIO 4)</div>
                  <div className="text-[11px] text-slate-400">{redLed ? 'REJECTED' : 'STANDBY'}</div>
                </div>
              </div>

              {/* Buzzer */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${soundEnabled ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-slate-800 text-slate-500'}`}>
                  ♪
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Buzzer (GPIO 15)</div>
                  <div className="text-[11px] text-slate-400">{soundEnabled ? '880Hz / 220Hz' : 'Muted'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* SIMULATION CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target ESP32 Hardware Device
              </label>
              <select
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ESP32-TY-A-01">ESP32-TY-A-01 (Classroom 101 - VLSI TE Div A)</option>
                <option value="ESP32-CSE-TY-A">ESP32-CSE-TY-A (Computer Lab 201 - CSE TE Div A)</option>
                <option value="ESP32-AIDS-SY-B">ESP32-AIDS-SY-B (Seminar Hall B - AIDS SE Div B)</option>
              </select>
            </div>

            {/* Mode Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Card Input Method
              </label>
              <div className="flex rounded-lg overflow-hidden border border-slate-700">
                <button
                  type="button"
                  onClick={() => setUseCustom(false)}
                  className={`flex-1 py-2 text-xs font-medium transition ${!useCustom ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  Preset Demo Cards
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  className={`flex-1 py-2 text-xs font-medium transition ${useCustom ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  Custom UID Input
                </button>
              </div>
            </div>
          </div>

          {/* Card Selection */}
          {!useCustom ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Select RFID Card to Tap:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {demoCards.map((card) => (
                  <button
                    key={card.uid}
                    type="button"
                    onClick={() => setSelectedUid(card.uid)}
                    className={`p-2.5 rounded-lg text-left border text-xs transition flex flex-col justify-between ${
                      selectedUid === card.uid
                        ? 'border-blue-500 bg-blue-500/10 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span className="truncate">{card.name}</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 ml-2">
                        {card.uid}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">{card.note}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Enter Custom RFID UID (Hexadecimal):
              </label>
              <input
                type="text"
                placeholder="e.g. A3B5C821 or 4F82C109"
                value={customUid}
                onChange={(e) => setCustomUid(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Scan Result Feedback Alert */}
          {scanResult && (
            <div className={`p-4 rounded-xl border text-sm flex items-start space-x-3 animate-fade-in ${
              scanResult.success
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800 text-rose-200'
            }`}>
              {scanResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">
                  {scanResult.success ? 'Attendance Saved Successfully' : 'Attendance Scan Rejected'}
                </div>
                <div className="text-xs mt-0.5 text-slate-300">{scanResult.message}</div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetHardware}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Reset Screen
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSimulateScan}
              className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Radio className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Transmitting to ESP32...' : 'Simulate RFID Tap'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
