
export type SystemStatus = "SPENTO" | "PRONTO" | "AVVIATO";
export type ComponentStatus = "ON" | "OFF" | "FAULT";
export type CommsStatus = "NORMAL" | "DEGRADED" | "LOST";

export interface Alarm {
  severita: "WARN" | "CRITICO";
  codice: string;
  msg: string;
}

export interface SimulationState {
  scenario: number;
  impianto: SystemStatus;
  ventilazione: ComponentStatus;
  analisi_gas: ComponentStatus;
  illuminazione: ComponentStatus;
  o2: number;
  co: number;
  ch4_lel: number;
  pressione: number;
  temperatura: number;
  e_stop: boolean;
  loto: boolean;
  comms_status: CommsStatus;
  timer_evacuazione: number;
  allarmi: Alarm[];
  auto_ramp: boolean;
  thr_o2_low: number;
  thr_co_high: number;
  thr_ch4_lel_high: number;
}

export interface LogEntry {
  timestamp: string;
  source: string;
  event: string;
  detail: string;
}
