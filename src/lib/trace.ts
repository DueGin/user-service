/**
 * Trace ID utilities for distributed tracing.
 *
 * Flow: Nginx generates X-Trace-Id → Middleware extracts → API routes read via getTraceId()
 * → Internal fetch calls propagate via fetchWithTrace() → Audit logs record traceId
 * → OAuth authorize/exchange pass traceId to third-party apps
 */

import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

const TRACE_HEADER = "x-trace-id";

/** Extract trace ID from incoming request headers, fallback to generating a new one */
export function getTraceId(request: NextRequest): string {
  return request.headers.get(TRACE_HEADER) || randomUUID();
}

/** Get trace ID from request, or return the provided fallback */
export function getTraceIdOrDefault(request: NextRequest, fallback: string): string {
  return request.headers.get(TRACE_HEADER) || fallback;
}

/** Fetch wrapper that propagates trace ID to downstream services */
export async function fetchWithTrace(
  url: string,
  traceId: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!headers.has(TRACE_HEADER)) {
    headers.set(TRACE_HEADER, traceId);
  }
  return fetch(url, { ...options, headers });
}

/** Format a log prefix with trace ID for structured logging */
export function traceLog(traceId: string, message: string, data?: Record<string, unknown>): string {
  const base = `[trace:${traceId}] ${message}`;
  if (data) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}
