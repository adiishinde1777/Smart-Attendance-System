import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { subscribeToAttendance, subscribeToScanFailure, subscribeToDeviceHeartbeat } from '../services/socket';

const SocketContext = createContext(null);

// Audio synthesizer using Web Audio API (zero external audio file dependency)
function playSynthesizedBeep(type = 'success') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else {
      // Error triple buzz
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.09);
      }
    }
  } catch (e) {
    // Audio autoplay policy on some browsers before user gesture
  }
}

export function SocketProvider({ children }) {
  const [latestScan, setLatestScan] = useState(null);
  const [liveScanFeed, setLiveScanFeed] = useState([]);
  const [latestFailure, setLatestFailure] = useState(null);
  const [activeToast, setActiveToast] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // 1. Subscribe to successful attendance scans
    const unsubAttendance = subscribeToAttendance((data) => {
      setLatestScan(data);
      setLiveScanFeed((prev) => [data, ...prev.slice(0, 19)]); // keep latest 20
      setActiveToast({
        type: 'success',
        title: 'Attendance Recorded',
        message: `${data.studentName} (${data.rollNumber}) marked ${data.status} for ${data.subjectName}`,
        data
      });

      if (soundEnabled) playSynthesizedBeep('success');

      // Auto dismiss toast after 4s
      setTimeout(() => {
        setActiveToast((current) => (current?.data?.attendanceId === data.attendanceId ? null : current));
      }, 4000);
    });

    // 2. Subscribe to failed scans
    const unsubFail = subscribeToScanFailure((data) => {
      setLatestFailure(data);
      setActiveToast({
        type: 'error',
        title: 'Attendance Scan Rejected',
        message: data.reason || 'Unauthorized card scanned',
        data
      });

      if (soundEnabled) playSynthesizedBeep('error');

      setTimeout(() => {
        setActiveToast((current) => (current?.data?.cardUid === data.cardUid ? null : current));
      }, 4000);
    });

    // 3. Heartbeats
    const unsubHeartbeat = subscribeToDeviceHeartbeat((data) => {
      // Optional logging or device indicator
    });

    return () => {
      unsubAttendance();
      unsubFail();
      unsubHeartbeat();
    };
  }, [soundEnabled]);

  const triggerHardwareAudio = useCallback((type) => {
    if (soundEnabled) playSynthesizedBeep(type);
  }, [soundEnabled]);

  return (
    <SocketContext.Provider value={{
      latestScan,
      liveScanFeed,
      latestFailure,
      activeToast,
      clearToast: () => setActiveToast(null),
      soundEnabled,
      setSoundEnabled,
      triggerHardwareAudio
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
