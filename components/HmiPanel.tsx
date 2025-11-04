
import React from 'react';
import { SimulationState, SystemStatus, ComponentStatus, CommsStatus } from '../types';
import { playClick } from './audio';

interface HmiPanelProps {
  state: SimulationState;
  onControlledShutdown: () => void;
  onRequestSupport: () => void;
  isEmergency: boolean;
  hasCriticalAlarm: boolean;
}

const HmiPanel: React.FC<HmiPanelProps> = ({
  state, onControlledShutdown, onRequestSupport, isEmergency, hasCriticalAlarm
}) => {
    
  const alarmSeverity = state.allarmi.some(a => a.severita === 'CRITICO') ? 'CRITICO' : state.allarmi.length > 0 ? 'WARN' : 'NONE';
  const isShutdownEnabled = hasCriticalAlarm && !isEmergency && state.impianto === 'AVVIATO';

  const handleControlledShutdownClick = () => {
    playClick();
    onControlledShutdown();
  };

  const handleRequestSupportClick = () => {
    playClick();
    onRequestSupport();
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 flex flex-col gap-4 border-4 border-slate-700">
      <h2 className="text-xl font-bold text-cyan-300 border-b border-slate-700 pb-2 flex justify-between items-center">
        <span>Pannello Allievo (HMI)</span>
        <CommsIndicator status={state.comms_status} />
      </h2>

      {/* Main Status & Alarm Banner */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
            <h3 className="text-center font-semibold text-slate-400 mb-1">Stato Impianto</h3>
            <SystemStatusBadge status={state.impianto} />
        </div>
        <div className="flex-1">
            <h3 className="text-center font-semibold text-slate-400 mb-1">Stato Allarmi</h3>
            <AlarmBanner severity={alarmSeverity} />
        </div>
      </div>
      
      {state.timer_evacuazione > 0 && (
          <div className="text-center bg-red-900 p-4 rounded-lg">
              <h3 className="text-xl font-bold text-red-300 animate-pulse">EVACUARE IMPIANTO</h3>
              <p className="text-6xl font-mono font-bold text-white mt-2">{state.timer_evacuazione}</p>
          </div>
      )}

      {/* System Indicators */}
      <div className="grid grid-cols-3 gap-4 text-center p-4 bg-slate-900/50 rounded-md">
        <ComponentIndicator label="Ventilazione" status={state.ventilazione} />
        <ComponentIndicator label="Analisi Gas" status={state.analisi_gas} />
        <ComponentIndicator label="Illuminazione" status={state.illuminazione} />
      </div>

      {/* Sensor Readings */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <ValueDisplay label="O₂" value={state.o2} unit="%" threshold={state.thr_o2_low} isLowBad={true} />
        <ValueDisplay label="CO" value={state.co} unit="ppm" threshold={state.thr_co_high} />
        <ValueDisplay label="CH₄" value={state.ch4_lel} unit="% LEL" threshold={state.thr_ch4_lel_high} />
        <ValueDisplay label="Pressione" value={state.pressione} unit="bar" />
        <ValueDisplay label="Temperatura" value={state.temperatura} unit="°C" />
      </div>

      {/* HMI Actions */}
      <div className="grid grid-cols-2 gap-4 mt-auto pt-4">
        <button onClick={handleControlledShutdownClick} disabled={!isShutdownEnabled} className="h-16 text-lg font-bold bg-orange-600 hover:bg-orange-500 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center">Arresto Controllato</button>
        <button onClick={handleRequestSupportClick} disabled={isEmergency} className="h-16 text-lg font-bold bg-blue-600 hover:bg-blue-500 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center">Richiedi Supporto</button>
      </div>

    </div>
  );
};

const SystemStatusBadge: React.FC<{status: SystemStatus}> = ({ status }) => {
    const colors = {
        SPENTO: 'bg-slate-600 text-slate-200',
        PRONTO: 'bg-yellow-500 text-yellow-900',
        AVVIATO: 'bg-green-500 text-green-900',
    };
    return <div className={`w-full text-center p-3 rounded-md font-bold text-lg ${colors[status]}`}>{status}</div>;
};

const AlarmBanner: React.FC<{severity: 'NONE' | 'WARN' | 'CRITICO'}> = ({ severity }) => {
    const config = {
        NONE: { text: 'Nessun Allarme', color: 'bg-green-800/80 text-green-200' },
        WARN: { text: 'Allarme di Avvertimento', color: 'bg-yellow-600 text-yellow-100' },
        CRITICO: { text: 'Allarme Critico - Evacuare', color: 'bg-red-600 text-red-100 animate-pulse' },
    };
    return <div className={`w-full text-center p-3 rounded-md font-bold text-lg ${config[severity].color}`}>{config[severity].text}</div>
};

const ComponentIndicator: React.FC<{label: string, status: ComponentStatus}> = ({ label, status }) => {
    const colors = {
        ON: 'bg-green-500',
        OFF: 'bg-slate-600',
        FAULT: 'bg-red-500 animate-pulse'
    };
    return (
        <div>
            <span className="font-semibold text-slate-400 text-sm">{label}</span>
            <div className={`mt-1 p-2 rounded-md font-bold text-lg ${colors[status]}`}>{status}</div>
        </div>
    );
};

const ValueDisplay: React.FC<{label: string, value: number, unit: string, threshold?: number, isLowBad?: boolean}> = ({ label, value, unit, threshold, isLowBad=false }) => {
    let isBad = false;
    if (threshold !== undefined) {
        isBad = isLowBad ? value < threshold : value > threshold;
    }
    const valueColor = isBad ? 'text-red-400' : 'text-cyan-300';

    return (
        <div className="bg-slate-900/50 p-3 rounded-lg text-center">
            <div className="text-sm font-semibold text-slate-400">{label}</div>
            <div className={`text-3xl font-mono font-bold ${valueColor}`}>{value.toFixed(label === 'CO' ? 0 : 2)}</div>
            <div className="text-xs text-slate-500">{unit}</div>
        </div>
    );
};

const CommsIndicator: React.FC<{status: CommsStatus}> = ({status}) => {
    const config = {
        NORMAL: { text: 'ONLINE', color: 'text-green-400' },
        DEGRADED: { text: 'DEGRADED', color: 'text-yellow-400' },
        LOST: { text: 'LOST', color: 'text-red-400 animate-pulse' },
    };
    return <span className={`text-sm font-bold ${config[status].color}`}>{config[status].text}</span>
}

export default HmiPanel;
