/**
 * Structured Logging
 * Cloud Logging compatible structured logging with log levels
 */

/**
 * Log severity levels (Cloud Logging compatible)
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'ALERT' | 'EMERGENCY';

/**
 * Structured log entry
 */
export interface LogEntry {
  /** Log severity */
  severity: LogLevel;
  /** Log message */
  message: string;
  /** Component/module name */
  component?: string;
  /** Trace ID for request correlation */
  traceId?: string;
  /** Span ID within trace */
  spanId?: string;
  /** Additional labels */
  labels?: Record<string, string>;
  /** HTTP request context */
  httpRequest?: {
    requestMethod?: string;
    requestUrl?: string;
    status?: number;
    latency?: string;
    userAgent?: string;
    remoteIp?: string;
  };
  /** Error details */
  error?: {
    message: string;
    name: string;
    stack?: string;
  };
  /** Additional data */
  data?: Record<string, unknown>;
  /** Timestamp */
  timestamp: string;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Include stack traces for errors */
  includeStack: boolean;
  /** Pretty print in development */
  prettyPrint: boolean;
  /** Default component name */
  defaultComponent?: string;
}

// Log level ordering
const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 100,
  NOTICE: 200,
  WARNING: 300,
  ERROR: 400,
  CRITICAL: 500,
  ALERT: 600,
  EMERGENCY: 700,
};

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
  includeStack: process.env.NODE_ENV !== 'production',
  prettyPrint: process.env.NODE_ENV !== 'production',
  defaultComponent: 'vaidya-agent',
};

let config: LoggerConfig = DEFAULT_CONFIG;

/**
 * Configure logger
 */
export function configureLogger(customConfig: Partial<LoggerConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  if (config.prettyPrint) {
    return JSON.stringify(entry, null, 2);
  }
  return JSON.stringify(entry);
}

/**
 * Create and output a log entry
 */
function log(
  level: LogLevel,
  message: string,
  options?: {
    component?: string;
    traceId?: string;
    spanId?: string;
    labels?: Record<string, string>;
    data?: Record<string, unknown>;
    error?: Error;
    httpRequest?: LogEntry['httpRequest'];
  }
): void {
  if (!shouldLog(level)) {
    return;
  }

  const entry: LogEntry = {
    severity: level,
    message,
    component: options?.component || config.defaultComponent,
    timestamp: new Date().toISOString(),
    ...(options?.traceId && { traceId: options.traceId }),
    ...(options?.spanId && { spanId: options.spanId }),
    ...(options?.labels && { labels: options.labels }),
    ...(options?.data && { data: options.data }),
    ...(options?.httpRequest && { httpRequest: options.httpRequest }),
  };

  // Add error details if present
  if (options?.error) {
    entry.error = {
      message: options.error.message,
      name: options.error.name,
      ...(config.includeStack && { stack: options.error.stack }),
    };
  }

  const output = formatLogEntry(entry);

  // Route to appropriate console method
  switch (level) {
    case 'DEBUG':
      console.debug(output);
      break;
    case 'INFO':
    case 'NOTICE':
      console.info(output);
      break;
    case 'WARNING':
      console.warn(output);
      break;
    case 'ERROR':
    case 'CRITICAL':
    case 'ALERT':
    case 'EMERGENCY':
      console.error(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Logger instance with component context
 */
export interface Logger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  notice: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, data?: Record<string, unknown>) => void;
  critical: (message: string, error?: Error, data?: Record<string, unknown>) => void;
  withTrace: (traceId: string, spanId?: string) => Logger;
  withLabels: (labels: Record<string, string>) => Logger;
}

/**
 * Create a logger for a component
 */
export function createLogger(component: string): Logger {
  let currentTraceId: string | undefined;
  let currentSpanId: string | undefined;
  let currentLabels: Record<string, string> | undefined;

  const logger: Logger = {
    debug: (message, data) => {
      log('DEBUG', message, {
        component,
        traceId: currentTraceId,
        spanId: currentSpanId,
        labels: currentLabels,
        data,
      });
    },

    info: (message, data) => {
      log('INFO', message, {
        component,
        traceId: currentTraceId,
        spanId: currentSpanId,
        labels: currentLabels,
        data,
      });
    },

    notice: (message, data) => {
      log('NOTICE', message, {
        component,
        traceId: currentTraceId,
        spanId: currentSpanId,
        labels: currentLabels,
        data,
      });
    },

    warn: (message, data) => {
      log('WARNING', message, {
        component,
        traceId: currentTraceId,
        spanId: currentSpanId,
        labels: currentLabels,
        data,
      });
    },

    error: (message, error, data) => {
      log('ERROR', message, {
        component,
        traceId: currentTraceId,
        spanId: currentSpanId,
        labels: currentLabels,
        data,
        error,
      });
    },

    critical: (message, error, data) => {
      log('CRITICAL', message, {
        component,
        traceId: currentTraceId,
        spanId: currentSpanId,
        labels: currentLabels,
        data,
        error,
      });
    },

    withTrace: (traceId, spanId) => {
      currentTraceId = traceId;
      currentSpanId = spanId;
      return logger;
    },

    withLabels: (labels) => {
      currentLabels = { ...currentLabels, ...labels };
      return logger;
    },
  };

  return logger;
}

/**
 * Log HTTP request (for middleware)
 */
export function logHttpRequest(
  method: string,
  url: string,
  status: number,
  latencyMs: number,
  options?: {
    userAgent?: string;
    remoteIp?: string;
    traceId?: string;
    component?: string;
  }
): void {
  const level: LogLevel = status >= 500 ? 'ERROR' : status >= 400 ? 'WARNING' : 'INFO';

  log(level, `${method} ${url} ${status} ${latencyMs}ms`, {
    component: options?.component || 'http',
    traceId: options?.traceId,
    httpRequest: {
      requestMethod: method,
      requestUrl: url,
      status,
      latency: `${latencyMs / 1000}s`,
      userAgent: options?.userAgent,
      remoteIp: options?.remoteIp,
    },
  });
}

/**
 * Default logger for quick access
 */
export const logger = createLogger('vaidya-agent');
