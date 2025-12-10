/**
 * Queue Manager for AlgoSheet Excel Add-in
 * Manages concurrent requests with rate limiting, timeout handling, and cell coloring
 */

/* global Excel */

// ===== INTERFACES =====

export interface QueuedRequest {
  id: string;
  cellAddress: string;  // e.g., "Sheet1!A5"
  prompt: string;
  responseMode: string;
  schema: string;
  options: string;
  status: 'queued' | 'in-progress' | 'completed' | 'failed';
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
  requests: QueuedRequest[];  // Last 100 for display
}

// ===== QUEUE MANAGER CLASS =====

class QueueManager {
  private queue: QueuedRequest[] = [];
  private maxConcurrency: number = 5;  // Default: 5 concurrent requests
  private inFlightCount: number = 0;

  // Rate limiting: 50 requests per minute
  private rateLimitWindow: number = 60000; // 1 minute in ms
  private maxRequestsPerWindow: number = 50;
  private requestTimestamps: number[] = [];

  // Request deduplication: map of request key -> Promise
  private pendingRequests: Map<string, Promise<any>> = new Map();

  // Timeout configuration
  private readonly TIMEOUT_MS = 90000; // 90 seconds (IA can be slow)

  // Backend URL (injected by Webpack)
  private get backendUrl(): string {
    // @ts-ignore
    return process.env.BACKEND_URL || "https://algosheet.auraia.ch/api/algosheet";
  }

  /**
   * Enqueue a request and return a promise that resolves with the result
   */
  async enqueue(request: Omit<QueuedRequest, 'id' | 'status'>): Promise<any> {
    // Generate unique ID
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create queued request
    const queuedRequest: QueuedRequest = {
      ...request,
      id,
      status: 'queued'
    };

    this.queue.push(queuedRequest);
    this.notifyTaskPane();

    console.log(`[QueueManager] Enqueued request ${id} for cell ${request.cellAddress}`);

    // Check for deduplication
    const requestKey = this.getRequestKey(request);
    if (this.pendingRequests.has(requestKey)) {
      console.log(`[QueueManager] Deduplicating request ${id} - using existing promise`);
      return this.pendingRequests.get(requestKey);
    }

    // Create promise and store for deduplication
    const promise = this.processRequest(queuedRequest);
    this.pendingRequests.set(requestKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Process a single request through the queue
   */
  private async processRequest(request: QueuedRequest): Promise<any> {
    // Wait for concurrency slot
    await this.waitForSlot();

    // Wait for rate limit window
    await this.waitForRateLimit();

    // Mark as in-progress
    request.status = 'in-progress';
    request.startTime = Date.now();
    this.inFlightCount++;
    this.notifyTaskPane();

    console.log(`[QueueManager] Processing request ${request.id} (${this.inFlightCount}/${this.maxConcurrency} in flight)`);

    try {
      // Make API call with timeout
      const result = await this.fetchWithTimeout(request);

      // Mark as completed
      request.status = 'completed';
      request.endTime = Date.now();
      request.duration = request.endTime - request.startTime!;
      request.result = result;
      request.cacheHit = request.duration < 500; // Fast response = cache hit

      console.log(`[QueueManager] Request ${request.id} completed in ${request.duration}ms ${request.cacheHit ? '(cached)' : ''}`);

      // Clear cell color on success
      await this.colorCell(request.cellAddress, 'success');

      return result;

    } catch (error: any) {
      // Mark as failed
      request.status = 'failed';
      request.endTime = Date.now();
      request.duration = request.endTime - (request.startTime || Date.now());
      request.error = error.message;

      console.error(`[QueueManager] Request ${request.id} failed:`, error.message);

      // Color cell red on error
      await this.colorCell(request.cellAddress, 'error');

      throw error;

    } finally {
      this.inFlightCount--;
      this.notifyTaskPane();

      // Trim queue to last 100 requests to manage memory
      if (this.queue.length > 100) {
        this.queue = this.queue.slice(-100);
      }
    }
  }

  /**
   * Make fetch request with timeout using AbortController
   */
  private async fetchWithTimeout(request: QueuedRequest): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(this.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: request.prompt,
          responseMode: request.responseMode,
          schema: request.schema,
          options: request.options
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Attach metadata for cache detection
      result._duration = Date.now() - (request.startTime || Date.now());
      result._cached = result._duration < 500;

      return result;

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.TIMEOUT_MS / 1000} seconds - AI taking too long`);
      }

      throw error;
    }
  }

  /**
   * Color a cell based on request status
   */
  private async colorCell(address: string, type: 'success' | 'error'): Promise<void> {
    // Skip if no address
    if (!address) return;

    try {
      await Excel.run(async (context) => {
        // Parse address to extract sheet name and cell reference
        // Address format: "Sheet1!A5" or "'Sheet Name'!A5"
        let sheetName: string;
        let cellRef: string;

        if (address.includes('!')) {
          const parts = address.split('!');
          sheetName = parts[0].replace(/'/g, ''); // Remove quotes
          cellRef = parts[1];
        } else {
          // No sheet specified, use active sheet
          sheetName = '';
          cellRef = address;
        }

        let range;
        if (sheetName) {
          const sheet = context.workbook.worksheets.getItem(sheetName);
          range = sheet.getRange(cellRef);
        } else {
          const sheet = context.workbook.worksheets.getActiveWorksheet();
          range = sheet.getRange(cellRef);
        }

        if (type === 'error') {
          // Light red background for errors
          range.format.fill.color = '#FFE6E6';
        } else {
          // Clear color on success
          range.format.fill.clear();
        }

        await context.sync();
      });
    } catch (error) {
      // Don't fail the request if cell coloring fails
      console.warn(`[QueueManager] Failed to color cell ${address}:`, error);
    }
  }

  /**
   * Wait until there's a free concurrency slot
   */
  private async waitForSlot(): Promise<void> {
    while (this.inFlightCount >= this.maxConcurrency) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Wait if rate limit has been reached
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than the rate limit window
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < this.rateLimitWindow
    );

    // Wait if we're at the limit
    while (this.requestTimestamps.length >= this.maxRequestsPerWindow) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = this.rateLimitWindow - (now - oldestTimestamp) + 100;

      console.log(`[QueueManager] Rate limit reached (${this.maxRequestsPerWindow}/${this.rateLimitWindow}ms), waiting ${waitTime}ms`);

      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Re-check after waiting
      const newNow = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(
        ts => newNow - ts < this.rateLimitWindow
      );
    }

    // Add current timestamp
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Generate a unique key for request deduplication
   */
  private getRequestKey(request: any): string {
    return JSON.stringify({
      prompt: request.prompt,
      responseMode: request.responseMode,
      schema: request.schema,
      options: request.options
    });
  }

  /**
   * Notify task pane with current queue statistics
   */
  private notifyTaskPane(): void {
    // Call global function to update task pane UI
    if (typeof window !== 'undefined' && (window as any).updateQueueStatus) {
      const stats: QueueStats = {
        total: this.queue.length,
        queued: this.queue.filter(r => r.status === 'queued').length,
        inProgress: this.inFlightCount,
        completed: this.queue.filter(r => r.status === 'completed').length,
        failed: this.queue.filter(r => r.status === 'failed').length,
        maxConcurrency: this.maxConcurrency,
        requests: this.queue.slice(-100) // Last 100 for display
      };

      (window as any).updateQueueStatus(stats);
    }
  }

  /**
   * Set maximum concurrency (called from task pane slider)
   */
  setMaxConcurrency(value: number): void {
    this.maxConcurrency = Math.max(1, Math.min(10, value));
    console.log(`[QueueManager] Max concurrency set to ${this.maxConcurrency}`);
    this.notifyTaskPane();
  }

  /**
   * Retry all failed requests
   */
  retryFailed(): void {
    const failedRequests = this.queue.filter(r => r.status === 'failed');

    console.log(`[QueueManager] Retrying ${failedRequests.length} failed requests`);

    failedRequests.forEach(request => {
      // Reset status to queued
      request.status = 'queued';
      request.error = undefined;
      request.startTime = undefined;
      request.endTime = undefined;
      request.duration = undefined;

      // Re-process the request
      this.processRequest(request).catch(error => {
        console.error(`[QueueManager] Retry failed for ${request.id}:`, error);
      });
    });

    this.notifyTaskPane();
  }

  /**
   * Clear completed requests from queue
   */
  clearCompleted(): void {
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter(r => r.status !== 'completed');
    const clearedCount = beforeCount - this.queue.length;

    console.log(`[QueueManager] Cleared ${clearedCount} completed requests`);

    this.notifyTaskPane();
  }

  /**
   * Get current queue statistics (for debugging)
   */
  getStats(): QueueStats {
    return {
      total: this.queue.length,
      queued: this.queue.filter(r => r.status === 'queued').length,
      inProgress: this.inFlightCount,
      completed: this.queue.filter(r => r.status === 'completed').length,
      failed: this.queue.filter(r => r.status === 'failed').length,
      maxConcurrency: this.maxConcurrency,
      requests: this.queue.slice(-100)
    };
  }
}

// ===== SINGLETON EXPORT =====

export const queueManager = new QueueManager();
