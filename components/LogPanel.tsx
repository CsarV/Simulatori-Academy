
import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';

interface LogPanelProps {
  log: LogEntry[];
}

const LogPanel: React.FC<LogPanelProps> = ({ log }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [log]);

  return (
    <div className="bg-slate-800 rounded-lg p-4 h-full flex flex-col">
      <h2 className="text-lg font-bold text-cyan-300 border-b border-slate-700 pb-2 mb-2">Log / Telemetria</h2>
      <div className="font-mono text-xs grid grid-cols-12 gap-2 text-slate-400 font-bold px-2">
        <div className="col-span-2">Timestamp</div>
        <div className="col-span-2">Source</div>
        <div className="col-span-2">Event</div>
        <div className="col-span-6">Detail</div>
      </div>
      <div ref={logContainerRef} className="flex-grow overflow-y-auto mt-1 pr-2">
        {log.map((entry, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 font-mono text-xs p-2 hover:bg-slate-700/50 rounded">
            <span className="col-span-2 text-slate-500">{entry.timestamp}</span>
            <span className={`col-span-2 font-semibold ${getSourceColor(entry.source)}`}>{entry.source}</span>
            <span className="col-span-2 text-slate-300">{entry.event}</span>
            <span className="col-span-6 text-slate-400 whitespace-pre-wrap break-words">{entry.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function getSourceColor(source: string): string {
    switch (source) {
        case 'TRAINER': return 'text-cyan-400';
        case 'HMI': return 'text-orange-400';
        case 'SYSTEM': return 'text-green-400';
        case 'AUTO_RAMP': return 'text-yellow-400';
        default: return 'text-slate-400';
    }
}

export default LogPanel;
