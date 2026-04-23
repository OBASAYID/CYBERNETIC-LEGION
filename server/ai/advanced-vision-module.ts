/**
 * Advanced Vision Module Interface
 * TypeScript interface for the Python-based computer vision system
 * Provides comprehensive computer vision capabilities for object identification, analysis, and live feed processing
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VisionAnalysisResult {
  timestamp: string;
  image_shape?: [number, number, number];
  analysis_type: string;
  processing_time: number;
  object_detection?: {
    objects: Array<{
      id: number;
      label: string;
      confidence: number;
      bbox: [number, number, number, number];
      area: number;
    }>;
    total_count: number;
    clusters?: any[];
    relationships?: any[];
    dominant_objects?: any[];
  };
  classification?: {
    top_classification: {
      class_id: number;
      class_name: string;
      confidence: number;
    };
    all_classifications: Array<{
      class_id: number;
      class_name: string;
      confidence: number;
    }>;
    scene_analysis?: any;
    confidence_distribution?: any;
  };
  features?: number[];
  scene_analysis?: any;
  mission_analysis?: {
    threat_assessment: {
      threats: Array<{
        object: any;
        threat_level: number;
        threat_type: string;
      }>;
      overall_threat_level: number;
      threat_count: number;
      recommendations: string[];
    };
    situational_awareness: {
      scene_complexity: number;
      object_distribution: any;
      environmental_factors: {
        brightness: number;
        contrast: number;
        visibility: number;
      };
      crowd_density: number;
      spatial_analysis: any;
    };
    behavioral_analysis: any;
    risk_evaluation: any;
  };
  anomaly_score?: number;
  error?: string;
}

interface ProcessingStats {
  frames_processed: number;
  objects_detected: number;
  analysis_time: number;
  last_frame_time: string | null;
}

interface VisionConfig {
  model_confidence_threshold: number;
  max_objects_per_frame: number;
  enable_live_processing: boolean;
  processing_fps: number;
  image_size: [number, number];
  enable_gpu_acceleration: boolean;
  cache_embeddings: boolean;
  mission_mode: 'standard' | 'combat' | 'recon' | 'medical';
  anomaly_detection: boolean;
  behavioral_analysis: boolean;
  threat_assessment: boolean;
}

export class AdvancedVisionProcessor {
  private config: VisionConfig;
  private pythonProcess: any = null;
  private isProcessing: boolean = false;
  private processingStats: ProcessingStats = {
    frames_processed: 0,
    objects_detected: 0,
    analysis_time: 0,
    last_frame_time: null
  };

  constructor(config: Partial<VisionConfig> = {}) {
    this.config = {
      model_confidence_threshold: 0.5,
      max_objects_per_frame: 50,
      enable_live_processing: true,
      processing_fps: 30,
      image_size: [640, 480],
      enable_gpu_acceleration: true,
      cache_embeddings: true,
      mission_mode: 'standard',
      anomaly_detection: true,
      behavioral_analysis: true,
      threat_assessment: true,
      ...config
    };
  }

  async processImage(image: string | Buffer, analysisType: string = 'comprehensive'): Promise<VisionAnalysisResult> {
    const startTime = Date.now();

    try {
      // Convert image to base64 if it's a buffer
      let imageData: string;
      if (Buffer.isBuffer(image)) {
        imageData = image.toString('base64');
      } else if (typeof image === 'string') {
        // Assume it's already base64 or a file path
        imageData = image;
      } else {
        throw new Error('Invalid image format');
      }

      const result = await this.callPythonVision('process_image', {
        image: imageData,
        analysis_type: analysisType,
        config: this.config
      });

      this.processingStats.frames_processed++;
      this.processingStats.analysis_time += Date.now() - startTime;

      return {
        ...result,
        processing_time: Date.now() - startTime
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        analysis_type: analysisType,
        processing_time: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async processLiveFeed(videoSource: string | number, duration?: number, callback?: (result: VisionAnalysisResult, frame: any) => void): Promise<any> {
    this.isProcessing = true;

    try {
      const result = await this.callPythonVision('process_live_feed', {
        video_source: videoSource,
        duration: duration,
        config: this.config
      });

      return result;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        frames_processed: 0
      };
    } finally {
      this.isProcessing = false;
    }
  }

  private async callPythonVision(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../core_algorithms/vision_integration.py');
      const pythonProcess = spawn('python3', [pythonScript, method], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONPATH: path.join(__dirname, '../../core_algorithms') }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${parseError}`));
          }
        } else {
          reject(new Error(`Python process failed: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      // Send parameters to Python script
      pythonProcess.stdin?.write(JSON.stringify(params));
      pythonProcess.stdin?.end();
    });
  }

  getProcessingStats(): ProcessingStats {
    return { ...this.processingStats };
  }

  getConfig(): VisionConfig {
    return { ...this.config };
  }

  stopProcessing(): void {
    this.isProcessing = false;
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }

  isActive(): boolean {
    return this.isProcessing;
  }
}