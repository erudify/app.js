export interface PomodoroState {
  isRunning: boolean;
  isBreak: boolean;
  timeLeft: number;
}

export interface PomodoroConfig {
  workTimeSeconds: number;
  breakTimeSeconds: number;
  maxSessions: number;
}
