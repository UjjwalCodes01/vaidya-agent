/**
 * Performance Metrics Collection
 * Tracks execution times and performance data
 */

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timing';

/**
 * Metric entry
 */
interface MetricEntry {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

// In-memory metrics storage (for development)
const metrics: MetricEntry[] = [];
const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const histograms = new Map<string, number[]>();

// Max metrics to keep in memory
const MAX_METRICS = 10000;

/**
 * Build metric key from name and labels
 */
function buildKey(name: string, labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) {
    return name;
  }
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return `${name}{${labelStr}}`;
}

/**
 * Record a metric
 */
function recordMetric(entry: MetricEntry): void {
  metrics.push(entry);
  
  // Trim if too many
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS);
  }
}

/**
 * Increment a counter
 */
export function incrementCounter(
  name: string,
  value: number = 1,
  labels?: Record<string, string>
): void {
  const key = buildKey(name, labels);
  const current = counters.get(key) || 0;
  counters.set(key, current + value);

  recordMetric({
    name,
    type: 'counter',
    value: current + value,
    labels,
    timestamp: new Date(),
  });
}

/**
 * Set a gauge value
 */
export function setGauge(
  name: string,
  value: number,
  labels?: Record<string, string>
): void {
  const key = buildKey(name, labels);
  gauges.set(key, value);

  recordMetric({
    name,
    type: 'gauge',
    value,
    labels,
    timestamp: new Date(),
  });
}

/**
 * Record a histogram value
 */
export function recordHistogram(
  name: string,
  value: number,
  labels?: Record<string, string>
): void {
  const key = buildKey(name, labels);
  const values = histograms.get(key) || [];
  values.push(value);
  
  // Keep last 1000 values
  if (values.length > 1000) {
    values.shift();
  }
  
  histograms.set(key, values);

  recordMetric({
    name,
    type: 'histogram',
    value,
    labels,
    timestamp: new Date(),
  });
}

/**
 * Record a timing (convenience for histogram)
 */
export function recordTiming(
  name: string,
  durationMs: number,
  labels?: Record<string, string>
): void {
  recordHistogram(name, durationMs, labels);
  
  recordMetric({
    name,
    type: 'timing',
    value: durationMs,
    labels,
    timestamp: new Date(),
  });
}

/**
 * Timer helper for measuring execution time
 */
export interface Timer {
  stop: () => number;
}

/**
 * Start a timer
 */
export function startTimer(
  name: string,
  labels?: Record<string, string>
): Timer {
  const startTime = Date.now();
  
  return {
    stop: () => {
      const duration = Date.now() - startTime;
      recordTiming(name, duration, labels);
      return duration;
    },
  };
}

/**
 * Time an async function
 */
export async function timeAsync<T>(
  name: string,
  fn: () => Promise<T>,
  labels?: Record<string, string>
): Promise<{ result: T; durationMs: number }> {
  const timer = startTimer(name, labels);
  try {
    const result = await fn();
    const durationMs = timer.stop();
    return { result, durationMs };
  } catch (error) {
    timer.stop();
    throw error;
  }
}

/**
 * Time a sync function
 */
export function timeSync<T>(
  name: string,
  fn: () => T,
  labels?: Record<string, string>
): { result: T; durationMs: number } {
  const timer = startTimer(name, labels);
  try {
    const result = fn();
    const durationMs = timer.stop();
    return { result, durationMs };
  } catch (error) {
    timer.stop();
    throw error;
  }
}

/**
 * Get histogram statistics
 */
export function getHistogramStats(
  name: string,
  labels?: Record<string, string>
): {
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
} | null {
  const key = buildKey(name, labels);
  const values = histograms.get(key);

  if (!values || values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    count,
    min: sorted[0],
    max: sorted[count - 1],
    mean: sum / count,
    p50: sorted[Math.floor(count * 0.5)],
    p95: sorted[Math.floor(count * 0.95)],
    p99: sorted[Math.floor(count * 0.99)],
  };
}

/**
 * Get all current metrics
 */
export function getMetrics(): {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, ReturnType<typeof getHistogramStats>>;
} {
  const histogramStats: Record<string, ReturnType<typeof getHistogramStats>> = {};
  
  for (const key of histograms.keys()) {
    histogramStats[key] = getHistogramStats(key);
  }

  return {
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    histograms: histogramStats,
  };
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  metrics.length = 0;
  counters.clear();
  gauges.clear();
  histograms.clear();
}

/**
 * Common metric names
 */
export const METRICS = {
  // Request metrics
  REQUEST_COUNT: 'http_requests_total',
  REQUEST_DURATION: 'http_request_duration_ms',
  REQUEST_ERRORS: 'http_request_errors_total',
  
  // Agent metrics
  AGENT_REQUESTS: 'agent_requests_total',
  AGENT_DURATION: 'agent_request_duration_ms',
  TOOL_EXECUTIONS: 'tool_executions_total',
  TOOL_DURATION: 'tool_execution_duration_ms',
  TOOL_ERRORS: 'tool_execution_errors_total',
  
  // Auth metrics
  AUTH_ATTEMPTS: 'auth_attempts_total',
  AUTH_FAILURES: 'auth_failures_total',
  
  // Rate limit metrics
  RATE_LIMIT_HITS: 'rate_limit_hits_total',
  
  // External API metrics
  ABDM_REQUESTS: 'abdm_requests_total',
  ABDM_DURATION: 'abdm_request_duration_ms',
  UHI_REQUESTS: 'uhi_requests_total',
  UHI_DURATION: 'uhi_request_duration_ms',
} as const;
