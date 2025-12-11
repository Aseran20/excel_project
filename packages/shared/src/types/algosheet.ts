/**
 * Shared types for AlgoSheet backend and frontend
 * Extracted from backend/src/types/algosheet.ts and frontend queue types
 */

// ===== BACKEND API TYPES =====

export interface ParsedOptions {
  web: boolean;
  sources: boolean;
  lang: string;
}

export interface AlgoSheetRequest {
  prompt: string;
  responseMode?: "free" | "structured" | null;
  schema?: string | null;
  options?: string | null;
}

export interface AlgoSheetResponse {
  value: string | number | null;
  reasoning?: string | null;
  confidence?: number | null;
  sources?: {
    url: string;
    title?: string | null;
    snippet?: string | null;
  }[];
}

export interface AlgoSheetError {
  error: string;
  details?: any;
}

// ===== QUEUE MANAGEMENT TYPES =====
// Currently frontend-only, sharing for future backend integration

export interface QueuedRequest {
  id: string;
  cellAddress: string; // e.g., "Sheet1!A5"
  prompt: string;
  responseMode: string;
  schema: string;
  options: string;
  status: "queued" | "in-progress" | "completed" | "failed";
  startTime?: number;
  endTime?: number;
  duration?: number;
  result?: any;
  error?: string;
  cacheHit?: boolean;
}

export interface QueueStats {
  total: number;
  queued: number;
  inProgress: number;
  completed: number;
  failed: number;
  maxConcurrency: number;
  requests: QueuedRequest[]; // Last 100 for display
}
