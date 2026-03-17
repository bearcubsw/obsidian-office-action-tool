import { LogService, LogLevel } from '../src/LogService';

describe('LogService', () => {
  let log: LogService;

  beforeEach(() => {
    log = new LogService();
  });

  test('starts empty', () => {
    expect(log.entries).toHaveLength(0);
  });

  test('adds an info entry with timestamp', () => {
    log.info('test message');
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0].message).toBe('test message');
    expect(log.entries[0].level).toBe(LogLevel.Info);
    expect(log.entries[0].timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  test('adds entries of each level', () => {
    log.info('info');
    log.success('success');
    log.warn('warn');
    log.error('error');
    expect(log.entries.map(e => e.level)).toEqual([
      LogLevel.Info, LogLevel.Success, LogLevel.Warn, LogLevel.Error
    ]);
  });

  test('clear removes all entries', () => {
    log.info('a');
    log.info('b');
    log.clear();
    expect(log.entries).toHaveLength(0);
  });

  test('onChange callback fires when entry is added', () => {
    const cb = jest.fn();
    log.onChange(cb);
    log.info('hello');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('onChange callback fires when cleared', () => {
    const cb = jest.fn();
    log.onChange(cb);
    log.clear();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
