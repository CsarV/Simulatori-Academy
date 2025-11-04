
import React from 'react';
import { SimulationState } from '../types';

interface TrainerPanelProps {
  state: SimulationState;
  onStartScenario3: () => void;
  onInjectFault: (component: 'ventilazione' | 'analisi_gas' | 'illuminazione') => void;
  onControlledShutdown: () => void;
  onResetSystem: () => void;
  onToggle: (key: 'auto_ramp' | 'e_stop' | 'loto') => void;
  onSliderChange: (key: keyof SimulationState, value: number) => void;
  onClearAlarm: (code: string) => void;
  onSimulateCommsLoss: () => void;
  isEmergency: boolean;
}

const TrainerPanel: React.FC<TrainerPanelProps> = ({
  state, onStartScenario3, onInjectFault, onControlledShutdown, onResetSystem, onToggle, onSliderChange, onClearAlarm, onSimulateCommsLoss, isEmergency
}) => {
  const isSystemOff = state.impianto === 'SPENTO';
  const isShutdownDisabled = isSystemOff || isEmergency;

  return (
    <div className="bg-slate-800 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-xl font-bold text-cyan-300 border-b border-slate-700 pb-2">Pannello Formatore</h2>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button onClick={onStartScenario3} className="p-3 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-semibold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed h-full">Avvia Scenario 3</button>
        <button onClick={() => onInjectFault('ventilazione')} className="p-3 bg-yellow-600 hover:bg-yellow-500 rounded-md text-sm font-semibold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed h-full" disabled={isSystemOff}>Inietta Guasto Ventilazione</button>
        <button onClick={onControlledShutdown} className="p-3 bg-orange-600 hover:bg-orange-500 rounded-md text-sm font-semibold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed h-full" disabled={isShutdownDisabled}>Esegui Arresto</button>
        <button onClick={onResetSystem} className="p-3 bg-red-700 hover:bg-red-600 rounded-md text-sm font-semibold transition-colors h-full">Reset Globale</button>
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-900/50 rounded-md">
          <ToggleButton label="Auto-Ramp" isEnabled={state.auto_ramp} onToggle={() => onToggle('auto_ramp')} />
          <ToggleButton label="E-STOP" isEnabled={state.e_stop} onToggle={() => onToggle('e_stop')} color="red" />
          <ToggleButton label="LOTO" isEnabled={state.loto} onToggle={() => onToggle('loto')} color="red" />
          <button onClick={onSimulateCommsLoss} className="p-2 bg-purple-600 hover:bg-purple-500 rounded-md text-xs font-semibold transition-colors">Simula Perdita Comms</button>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-300">Parametri Manuali</h3>
        <SliderControl label="O₂" value={state.o2} min={15} max={22} step={0.1} unit="%" onChange={v => onSliderChange('o2', v)} isOutOfRange={state.o2 < state.thr_o2_low} />
        <SliderControl label="CO" value={state.co} min={0} max={100} step={1} unit="ppm" onChange={v => onSliderChange('co', v)} isOutOfRange={state.co > state.thr_co_high} />
        <SliderControl label="CH₄" value={state.ch4_lel} min={0} max={5} step={0.1} unit="% LEL" onChange={v => onSliderChange('ch4_lel', v)} isOutOfRange={state.ch4_lel > state.thr_ch4_lel_high} />
        <SliderControl label="Pressione" value={state.pressione} min={0.8} max={1.2} step={0.01} unit="bar" onChange={v => onSliderChange('pressione', v)} />
        <SliderControl label="Temperatura" value={state.temperatura} min={-10} max={40} step={0.1} unit="°C" onChange={v => onSliderChange('temperatura', v)} />
      </div>

      {/* Alarms & Evacuation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Allarmi Attivi</h3>
            <div className="bg-slate-900/50 rounded-md p-2 min-h-[100px] text-sm space-y-1">
                {state.allarmi.length > 0 ? state.allarmi.map(alarm => (
                    <div key={alarm.codice} className={`flex justify-between items-center p-1 rounded ${alarm.severita === 'CRITICO' ? 'bg-red-900/50' : 'bg-yellow-800/50'}`}>
                        <span><strong>{alarm.codice}:</strong> {alarm.msg}</span>
                        <button onClick={() => onClearAlarm(alarm.codice)} className="text-xs bg-red-600 hover:bg-red-500 px-2 py-0.5 rounded">X</button>
                    </div>
                )) : <p className="text-slate-500 text-center pt-4">Nessun allarme attivo</p>}
            </div>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Evacuazione</h3>
            <div className="bg-slate-900/50 rounded-md p-2 h-[100px] flex items-center justify-center">
                <span className="text-5xl font-mono font-bold text-orange-400">{state.timer_evacuazione}s</span>
            </div>
        </div>
      </div>
    </div>
  );
};

const ToggleButton: React.FC<{label: string, isEnabled: boolean, onToggle: () => void, color?: string}> = ({ label, isEnabled, onToggle, color = 'blue' }) => {
    const bgColor = isEnabled ? (color === 'red' ? 'bg-red-600' : 'bg-green-600') : 'bg-slate-600';
    const hoverBgColor = isEnabled ? (color === 'red' ? 'hover:bg-red-500' : 'hover:bg-green-500') : 'hover:bg-slate-500';
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-slate-400">{label}</span>
            <button onClick={onToggle} className={`w-full p-2 rounded-md font-bold text-sm transition-colors ${bgColor} ${hoverBgColor}`}>
                {isEnabled ? 'ON' : 'OFF'}
            </button>
        </div>
    );
};

const SliderControl: React.FC<{label: string, value: number, min: number, max: number, step: number, unit: string, onChange: (value: number) => void, isOutOfRange?: boolean}> = ({label, value, min, max, step, unit, onChange, isOutOfRange}) => (
    <div className="grid grid-cols-5 items-center gap-2 text-sm">
        <label className="col-span-1 font-semibold text-slate-400">{label}</label>
        <input 
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="col-span-3 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className={`col-span-1 text-right font-mono p-1 rounded ${isOutOfRange ? 'bg-red-500 text-white font-bold' : 'bg-slate-700'}`}>
            {value.toFixed(label === 'CO' ? 0 : 2)} <span className="text-xs">{unit}</span>
        </div>
    </div>
);


export default TrainerPanel;
