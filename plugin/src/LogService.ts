export enum LogLevel {
  Info = 'info',
  Success = 'success',
  Warn = 'warn',
  Error = 'error',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

function nowHHMMSS(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export class LogService {
  readonly entries: LogEntry[] = [];
  private listeners: (() => void)[] = [];

  private add(level: LogLevel, message: string): void {
    this.entries.push({ timestamp: nowHHMMSS(), level, message });
    this.listeners.forEach(cb => cb());
  }

  info(message: string): void { this.add(LogLevel.Info, message); }
  success(message: string): void { this.add(LogLevel.Success, message); }
  warn(message: string): void { this.add(LogLevel.Warn, message); }
  error(message: string): void { this.add(LogLevel.Error, message); }

  clear(): void {
    this.entries.length = 0;
    this.listeners.forEach(cb => cb());
  }

  onChange(cb: () => void): void {
    this.listeners.push(cb);
  }
}
