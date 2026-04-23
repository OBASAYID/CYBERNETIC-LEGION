import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface DistributedTask {
  id: string;
  type: 'inference' | 'analysis' | 'embedding' | 'translation' | 'emotion' | 'synthesis';
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  createdAt: Date;
  timeout: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
  workerId: string;
}

export interface WorkerNode {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  tasksCompleted: number;
  averageProcessingTime: number;
  lastActivity: Date;
  specialization?: string[];
}

export interface ClusterStats {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  tasksInQueue: number;
  tasksProcessing: number;
  tasksCompleted: number;
  averageLatency: number;
  throughput: number;
}

export class DecentralizedIntelligenceNetwork extends EventEmitter {
  private workers: Map<string, WorkerNode> = new Map();
  private taskQueue: DistributedTask[] = [];
  private processingTasks: Map<string, DistributedTask> = new Map();
  private completedTasks: Map<string, TaskResult> = new Map();
  private taskPromises: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  
  private maxWorkers: number = 4;
  private maxQueueSize: number = 1000;
  private defaultTimeout: number = 30000;
  private tasksCompletedTotal: number = 0;
  private totalProcessingTime: number = 0;

  constructor(config?: { maxWorkers?: number; maxQueueSize?: number }) {
    super();
    this.maxWorkers = config?.maxWorkers || 4;
    this.maxQueueSize = config?.maxQueueSize || 1000;
    
    console.log(`[Decentralized Intelligence] Initializing distributed processing network with ${this.maxWorkers} worker capacity`);
    this.initializeWorkerPool();
    this.startTaskScheduler();
  }

  private initializeWorkerPool(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;
      this.workers.set(workerId, {
        id: workerId,
        status: 'idle',
        tasksCompleted: 0,
        averageProcessingTime: 0,
        lastActivity: new Date(),
        specialization: this.assignSpecialization(i)
      });
    }
    console.log(`[Decentralized Intelligence] Initialized ${this.workers.size} virtual workers`);
  }

  private assignSpecialization(index: number): string[] {
    const specializations = [
      ['inference', 'analysis'],
      ['embedding', 'synthesis'],
      ['translation', 'emotion'],
      ['inference', 'translation', 'emotion']
    ];
    return specializations[index % specializations.length];
  }

  private startTaskScheduler(): void {
    setInterval(() => this.processQueue(), 100);
    setInterval(() => this.cleanupCompletedTasks(), 60000);
    setInterval(() => this.emitStats(), 5000);
  }

  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    const idleWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'idle');

    if (idleWorkers.length === 0) return;

    this.taskQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const worker of idleWorkers) {
      const task = this.findBestTaskForWorker(worker);
      if (task) {
        this.assignTaskToWorker(worker, task);
      }
    }
  }

  private findBestTaskForWorker(worker: WorkerNode): DistributedTask | undefined {
    if (worker.specialization && worker.specialization.length > 0) {
      const specializedTask = this.taskQueue.find(t => 
        worker.specialization!.includes(t.type)
      );
      if (specializedTask) {
        this.taskQueue = this.taskQueue.filter(t => t.id !== specializedTask.id);
        return specializedTask;
      }
    }

    return this.taskQueue.shift();
  }

  private async assignTaskToWorker(worker: WorkerNode, task: DistributedTask): Promise<void> {
    worker.status = 'busy';
    worker.currentTask = task.id;
    worker.lastActivity = new Date();
    this.processingTasks.set(task.id, task);

    const startTime = Date.now();

    try {
      const result = await this.executeTask(task);
      const processingTime = Date.now() - startTime;

      const taskResult: TaskResult = {
        taskId: task.id,
        success: true,
        result,
        processingTime,
        workerId: worker.id
      };

      this.completedTasks.set(task.id, taskResult);
      this.tasksCompletedTotal++;
      this.totalProcessingTime += processingTime;

      worker.tasksCompleted++;
      worker.averageProcessingTime = 
        (worker.averageProcessingTime * (worker.tasksCompleted - 1) + processingTime) / worker.tasksCompleted;

      const taskPromise = this.taskPromises.get(task.id);
      if (taskPromise) {
        clearTimeout(taskPromise.timeout);
        taskPromise.resolve(taskResult);
        this.taskPromises.delete(task.id);
      }

      this.emit('taskCompleted', taskResult);
    } catch (error: any) {
      const taskResult: TaskResult = {
        taskId: task.id,
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        workerId: worker.id
      };

      this.completedTasks.set(task.id, taskResult);

      const taskPromise = this.taskPromises.get(task.id);
      if (taskPromise) {
        clearTimeout(taskPromise.timeout);
        taskPromise.reject(error);
        this.taskPromises.delete(task.id);
      }

      this.emit('taskFailed', taskResult);
    } finally {
      worker.status = 'idle';
      worker.currentTask = undefined;
      this.processingTasks.delete(task.id);
    }
  }

  private async executeTask(task: DistributedTask): Promise<any> {
    switch (task.type) {
      case 'inference':
        return this.executeInferenceTask(task.payload);
      case 'analysis':
        return this.executeAnalysisTask(task.payload);
      case 'embedding':
        return this.executeEmbeddingTask(task.payload);
      case 'translation':
        return this.executeTranslationTask(task.payload);
      case 'emotion':
        return this.executeEmotionTask(task.payload);
      case 'synthesis':
        return this.executeSynthesisTask(task.payload);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async executeInferenceTask(payload: any): Promise<any> {
    await this.simulateProcessing(50, 200);
    return { processed: true, type: 'inference', payload };
  }

  private async executeAnalysisTask(payload: any): Promise<any> {
    await this.simulateProcessing(100, 300);
    return { analyzed: true, type: 'analysis', insights: [] };
  }

  private async executeEmbeddingTask(payload: any): Promise<any> {
    await this.simulateProcessing(30, 100);
    return { embedded: true, dimensions: 1536 };
  }

  private async executeTranslationTask(payload: any): Promise<any> {
    await this.simulateProcessing(80, 250);
    return { translated: true, targetLanguage: payload.targetLanguage };
  }

  private async executeEmotionTask(payload: any): Promise<any> {
    await this.simulateProcessing(40, 150);
    return { analyzed: true, emotion: 'neutral', confidence: 0.8 };
  }

  private async executeSynthesisTask(payload: any): Promise<any> {
    await this.simulateProcessing(150, 400);
    return { synthesized: true, components: payload.components?.length || 0 };
  }

  private simulateProcessing(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async submitTask(
    type: DistributedTask['type'],
    payload: any,
    options?: { priority?: DistributedTask['priority']; timeout?: number }
  ): Promise<TaskResult> {
    if (this.taskQueue.length >= this.maxQueueSize) {
      throw new Error('Task queue is full');
    }

    const task: DistributedTask = {
      id: crypto.randomUUID(),
      type,
      payload,
      priority: options?.priority || 'normal',
      createdAt: new Date(),
      timeout: options?.timeout || this.defaultTimeout
    };

    this.taskQueue.push(task);
    this.emit('taskSubmitted', task);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.taskPromises.delete(task.id);
        reject(new Error(`Task ${task.id} timed out`));
      }, task.timeout);

      this.taskPromises.set(task.id, { resolve, reject, timeout });
    });
  }

  async submitBatch(
    tasks: Array<{ type: DistributedTask['type']; payload: any; priority?: DistributedTask['priority'] }>
  ): Promise<TaskResult[]> {
    const promises = tasks.map(t => 
      this.submitTask(t.type, t.payload, { priority: t.priority })
    );

    return Promise.all(promises);
  }

  async parallelProcess<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
    options?: { batchSize?: number; priority?: DistributedTask['priority'] }
  ): Promise<any[]> {
    const batchSize = options?.batchSize || this.maxWorkers;
    const results: any[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }

    return results;
  }

  getWorkerStatus(): WorkerNode[] {
    return Array.from(this.workers.values());
  }

  getQueueStatus(): { pending: number; processing: number; completed: number } {
    return {
      pending: this.taskQueue.length,
      processing: this.processingTasks.size,
      completed: this.completedTasks.size
    };
  }

  getStats(): ClusterStats {
    const workerArray = Array.from(this.workers.values());
    const activeWorkers = workerArray.filter(w => w.status === 'busy').length;
    const idleWorkers = workerArray.filter(w => w.status === 'idle').length;

    return {
      totalWorkers: this.workers.size,
      activeWorkers,
      idleWorkers,
      tasksInQueue: this.taskQueue.length,
      tasksProcessing: this.processingTasks.size,
      tasksCompleted: this.tasksCompletedTotal,
      averageLatency: this.tasksCompletedTotal > 0 
        ? this.totalProcessingTime / this.tasksCompletedTotal 
        : 0,
      throughput: this.calculateThroughput()
    };
  }

  private calculateThroughput(): number {
    const recentTasks = Array.from(this.completedTasks.values())
      .filter(t => Date.now() - t.processingTime < 60000);
    return recentTasks.length;
  }

  private cleanupCompletedTasks(): void {
    const maxAge = 5 * 60 * 1000;
    const now = Date.now();
    
    for (const [id, result] of this.completedTasks) {
      if (now - result.processingTime > maxAge) {
        this.completedTasks.delete(id);
      }
    }
  }

  private emitStats(): void {
    this.emit('stats', this.getStats());
  }

  async scaleWorkers(count: number): Promise<void> {
    const currentCount = this.workers.size;
    
    if (count > currentCount) {
      for (let i = currentCount; i < count; i++) {
        const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;
        this.workers.set(workerId, {
          id: workerId,
          status: 'idle',
          tasksCompleted: 0,
          averageProcessingTime: 0,
          lastActivity: new Date(),
          specialization: this.assignSpecialization(i)
        });
      }
      console.log(`[Decentralized Intelligence] Scaled up to ${this.workers.size} workers`);
    } else if (count < currentCount) {
      const workersToRemove = Array.from(this.workers.keys()).slice(count);
      for (const id of workersToRemove) {
        const worker = this.workers.get(id);
        if (worker?.status === 'idle') {
          this.workers.delete(id);
        }
      }
      console.log(`[Decentralized Intelligence] Scaled down to ${this.workers.size} workers`);
    }
  }

  getTaskResult(taskId: string): TaskResult | undefined {
    return this.completedTasks.get(taskId);
  }

  cancelTask(taskId: string): boolean {
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
      const promise = this.taskPromises.get(taskId);
      if (promise) {
        clearTimeout(promise.timeout);
        promise.reject(new Error('Task cancelled'));
        this.taskPromises.delete(taskId);
      }
      return true;
    }
    return false;
  }

  async shutdown(): Promise<void> {
    console.log('[Decentralized Intelligence] Shutting down distributed network...');
    
    for (const [id, promise] of this.taskPromises) {
      clearTimeout(promise.timeout);
      promise.reject(new Error('Network shutdown'));
    }
    
    this.taskQueue = [];
    this.taskPromises.clear();
    this.workers.clear();
    
    console.log('[Decentralized Intelligence] Network shutdown complete');
  }
}

export const decentralizedIntelligence = new DecentralizedIntelligenceNetwork();
