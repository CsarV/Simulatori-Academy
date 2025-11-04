
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SimulationState, LogEntry, Alarm } from './types';
import TrainerPanel from './components/TrainerPanel';
import HmiPanel from './components/HmiPanel';
import LogPanel from './components/LogPanel';
import { playCritical, playWarning, startEvacuationSiren, stopEvacuationSiren, setMuted, getIsMuted } from './components/audio';

const INITIAL_STATE: SimulationState = {
  scenario: 3,
  impianto: "SPENTO",
  ventilazione: "OFF",
  analisi_gas: "OFF",
  illuminazione: "OFF",
  o2: 20.9,
  co: 5,
  ch4_lel: 0.1,
  pressione: 1.01,
  temperatura: 18.0,
  e_stop: false,
  loto: false,
  comms_status: "NORMAL",
  timer_evacuazione: 0,
  allarmi: [],
  auto_ramp: false,
  thr_o2_low: 19.5,
  thr_co_high: 30,
  thr_ch4_lel_high: 1.0
};

const SCENARIO_3_START_STATE: SimulationState = {
    ...INITIAL_STATE,
    impianto: "AVVIATO",
    ventilazione: "ON",
    analisi_gas: "ON",
    illuminazione: "ON",
    o2: 20.7,
    co: 8,
    ch4_lel: 0.3,
    pressione: 1.02,
    temperatura: 19.0,
};

const App: React.FC = () => {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [isCommsFrozen, setIsCommsFrozen] = useState(false);
  const [isMuted, setIsMuted] = useState(getIsMuted());

  const addLog = useCallback((source: string, event: string, detail: string) => {
    const timestamp = new Date().toLocaleTimeString('it-IT');
    setLog(prevLog => [{ timestamp, source, event, detail }, ...prevLog]);
  }, []);

  // Main simulation timer (1s tick)
  useEffect(() => {
    const timer = setInterval(() => {
      setState(prevState => {
        let newState = { ...prevState };
        let loggable = false;
        let logDetails: string[] = [];

        // Auto-ramp logic
        if (newState.impianto === "AVVIATO" && newState.ventilazione === 'FAULT' && newState.auto_ramp) {
          newState.o2 = Math.max(0, parseFloat((newState.o2 - 0.02).toFixed(2)));
          newState.co = parseFloat((newState.co + 1).toFixed(0));
          newState.ch4_lel = Math.min(100, parseFloat((newState.ch4_lel + 0.02).toFixed(2)));
          loggable = true;
          logDetails.push(`o2=${newState.o2}%`, `co=${newState.co}ppm`, `ch4=${newState.ch4_lel}%LEL`);
        }

        if(loggable) {
            addLog('AUTO_RAMP', 'gas_tick', logDetails.join(' '));
        }

        // Evacuation countdown
        if (newState.timer_evacuazione > 0) {
          newState.timer_evacuazione -= 1;
          if (newState.timer_evacuazione === 0) {
            addLog('SYSTEM', 'evacuazione_fine', 'Timer a 0, comandi bloccati.');
            newState.impianto = 'SPENTO';
          }
        }
        return newState;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [addLog, state.auto_ramp, state.impianto, state.ventilazione]);

  // Alarm management
  useEffect(() => {
    const newAlarms: Alarm[] = [];
    if (state.impianto !== 'AVVIATO') {
        if (state.allarmi.length > 0) {
             setState(s => ({...s, allarmi: []}));
        }
        return;
    }

    if (state.o2 < state.thr_o2_low) {
      newAlarms.push({ severita: 'WARN', codice: 'O2_BASSO', msg: `O2 Sotto Soglia (${state.o2}%)` });
    }
    if (state.co > state.thr_co_high) {
      newAlarms.push({ severita: 'WARN', codice: 'CO_ALTO', msg: `CO Sopra Soglia (${state.co} ppm)` });
    }
    if (state.ch4_lel > state.thr_ch4_lel_high) {
      newAlarms.push({ severita: 'CRITICO', codice: 'GAS_ALTO', msg: `CH4 Sopra Soglia (${state.ch4_lel}% LEL)` });
    }

    if (JSON.stringify(newAlarms) !== JSON.stringify(state.allarmi)) {
        if (newAlarms.length > state.allarmi.length) {
            const addedAlarm = newAlarms.find(na => !state.allarmi.some(oa => oa.codice === na.codice));
            if (addedAlarm) {
                addLog('SYSTEM', 'allarme_generato', `${addedAlarm.severita}: ${addedAlarm.codice}`);
                if (addedAlarm.severita === 'CRITICO') {
                    playCritical();
                } else if (addedAlarm.severita === 'WARN') {
                    playWarning();
                }
            }
        }
        setState(s => ({ ...s, allarmi: newAlarms }));
    }
  }, [state.o2, state.co, state.ch4_lel, state.thr_o2_low, state.thr_co_high, state.thr_ch4_lel_high, state.allarmi, addLog, state.impianto]);
  
  // Evacuation siren sound effect
  useEffect(() => {
    if (state.timer_evacuazione > 0) {
      startEvacuationSiren();
    } else {
      stopEvacuationSiren();
    }
  }, [state.timer_evacuazione]);


  // FIX: Explicitly type the useMemo hook to ensure frozenState is always of type SimulationState.
  // This resolves a TypeScript type inference issue where `comms_status` was being widened to `string`,
  // causing an assignment error in the HmiPanel component.
  const frozenState = useMemo<SimulationState>(() => {
    if (isCommsFrozen) {
      return {...state, comms_status: 'LOST'};
    }
    return state;
  }, [isCommsFrozen, state]);

  // Trainer Actions
  const handleStartScenario3 = () => {
    setState(SCENARIO_3_START_STATE);
    addLog('TRAINER', 'start_scenario_3', 'Stato iniziale scenario 3 caricato.');
  };

  const handleInjectFault = (component: 'ventilazione' | 'analisi_gas' | 'illuminazione') => {
    setState(s => ({ ...s, [component]: 'FAULT' }));
    addLog('TRAINER', `inject_fault_${component}`, `Guasto iniettato su ${component}.`);
  };

  const handleControlledShutdown = (source: 'TRAINER' | 'HMI') => {
      setState(s => ({...s, impianto: "SPENTO", timer_evacuazione: 120}));
      addLog(source, 'arresto_controllato', 'Avviata procedura di arresto controllato.');
  };
  
  const handleResetSystem = () => {
      stopEvacuationSiren();
      setState(INITIAL_STATE);
      setLog([]);
      addLog('TRAINER', 'reset_impianto', 'Simulazione resettata allo stato iniziale.');
  };

  const handleToggle = (key: 'auto_ramp' | 'e_stop' | 'loto') => {
      setState(s => ({...s, [key]: !s[key]}));
      addLog('TRAINER', `toggle_${key}`, `Stato ${key} impostato a ${!state[key]}`);
  };

  const handleSliderChange = (key: keyof SimulationState, value: number) => {
    setState(s => ({ ...s, [key]: value }));
  };

  const handleClearAlarm = (code: string) => {
    setState(s => ({ ...s, allarmi: s.allarmi.filter(a => a.codice !== code) }));
    addLog('TRAINER', 'clear_alarm', `Allarme ${code} cancellato manualmente.`);
  };

  const handleSimulateCommsLoss = () => {
    addLog('TRAINER', 'sim_comms_loss', 'Simulazione perdita comunicazione per 10s.');
    setIsCommsFrozen(true);
    setTimeout(() => {
        setIsCommsFrozen(false);
        addLog('SYSTEM', 'comms_restored', 'Comunicazione ripristinata.');
    }, 10000);
  };

  // HMI Actions
  const handleRequestSupport = () => {
    addLog('HMI', 'request_support', 'Richiesta di supporto inviata.');
  };
  
  const hasCriticalAlarm = state.allarmi.some(a => a.severita === 'CRITICO');
  const isEmergency = state.e_stop || state.loto || state.timer_evacuazione > 0;

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setMuted(newMutedState);
    setIsMuted(newMutedState);
    addLog('SYSTEM', 'audio_toggle', newMutedState ? 'Audio disattivato' : 'Audio attivato');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 font-sans flex flex-col gap-4">
      <header className="text-center relative">
        <h1 className="text-3xl font-bold text-cyan-400">Simulatore Guasto Impianto Confinato</h1>
        <p className="text-slate-400">Scenario 3: Guasto Ventilazione in Marcia</p>
        <button 
          onClick={toggleMute} 
          className="absolute top-0 right-0 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          aria-label={isMuted ? "Attiva suoni" : "Disattiva suoni"}
          title={isMuted ? "Attiva suoni" : "Disattiva suoni"}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l-2.25 2.25M19.5 12l2.25-2.25M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          )}
        </button>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrainerPanel 
            state={state}
            onStartScenario3={handleStartScenario3}
            onInjectFault={handleInjectFault}
            onControlledShutdown={() => handleControlledShutdown('TRAINER')}
            onResetSystem={handleResetSystem}
            onToggle={handleToggle}
            onSliderChange={handleSliderChange}
            onClearAlarm={handleClearAlarm}
            onSimulateCommsLoss={handleSimulateCommsLoss}
            isEmergency={isEmergency}
        />
        <HmiPanel 
            state={isCommsFrozen ? frozenState : state}
            onControlledShutdown={() => handleControlledShutdown('HMI')}
            onRequestSupport={handleRequestSupport}
            isEmergency={isEmergency}
            hasCriticalAlarm={hasCriticalAlarm}
        />
      </main>

      <footer className="h-64">
        <LogPanel log={log} />
      </footer>
    </div>
  );
};

export default App;
