import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  outputPath?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imagePath?: string;
  error?: string;
  metadata?: any;
}

export class LocalImageGenerator {
  private modelPath: string;

  constructor(modelPath = 'runwayml/stable-diffusion-v1-5') {
    this.modelPath = modelPath;
  }

  async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const {
      prompt,
      width = 512,
      height = 512,
      steps = 20,
      guidance = 7.5,
      outputPath
    } = options;

    const outputFile = outputPath || path.join(tmpdir(), `generated-${Date.now()}.png`);

    try {
      await this.runStableDiffusion({
        prompt,
        width,
        height,
        steps,
        guidance,
        output: outputFile
      });

      return {
        success: true,
        imagePath: outputFile,
        metadata: {
          prompt,
          width,
          height,
          steps,
          guidance,
          model: this.modelPath
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async runStableDiffusion(params: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [
        '-c',
        `
from diffusers import StableDiffusionPipeline
import torch
import sys

try:
    # Load model (this will download if not cached)
    pipe = StableDiffusionPipeline.from_pretrained(
        '${this.modelPath}',
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
    )

    if torch.cuda.is_available():
        pipe = pipe.to('cuda')
    else:
        print("Warning: CUDA not available, using CPU (slower)", file=sys.stderr)

    # Generate image
    image = pipe(
        '${params.prompt}',
        width=${params.width},
        height=${params.height},
        num_inference_steps=${params.steps},
        guidance_scale=${params.guidance}
    ).images[0]

    # Save image
    image.save('${params.output}')
    print("Image generated successfully")

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
        `
      ]);

      let errorOutput = '';

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Stable Diffusion failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const python = spawn('python3', [
        '-c',
        'import diffusers; print("Available")'
      ]);

      python.on('close', (code) => {
        resolve(code === 0);
      });

      python.on('error', () => {
        resolve(false);
      });
    });
  }
}

export const localImageGen = new LocalImageGenerator();
export default localImageGen;