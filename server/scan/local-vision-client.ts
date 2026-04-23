import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

export interface VisionResult {
  ocrText: string;
  notes: string;
  warnings: string[];
  objects?: string[];
  text?: string[];
}

export class LocalVisionClient {
  async ocr(buffer: Buffer): Promise<VisionResult> {
    const warnings: string[] = [];

    try {
      // Save buffer to temporary file
      const tempPath = path.join(tmpdir(), `ocr-${Date.now()}.png`);
      fs.writeFileSync(tempPath, buffer);

      // Use tesseract for OCR
      const result = await this.runTesseract(tempPath);

      // Cleanup
      fs.unlinkSync(tempPath);

      return {
        ocrText: result,
        notes: 'Local OCR processing completed',
        warnings
      };
    } catch (error) {
      warnings.push(`OCR failed: ${error}`);
      return {
        ocrText: '',
        notes: 'OCR unavailable',
        warnings
      };
    }
  }

  private async runTesseract(imagePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const tesseract = spawn('tesseract', [imagePath, 'stdout', '--psm', '6']);

      let output = '';
      let errorOutput = '';

      tesseract.stdout.on('data', (data) => {
        output += data.toString();
      });

      tesseract.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      tesseract.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Tesseract failed: ${errorOutput}`));
        }
      });

      tesseract.on('error', (error) => {
        reject(error);
      });
    });
  }

  async analyzeImage(buffer: Buffer): Promise<VisionResult> {
    const warnings: string[] = [];

    try {
      // Basic image analysis using Python script
      const result = await this.runPythonAnalysis(buffer);

      return {
        ocrText: result.ocr || '',
        notes: result.analysis || 'Image analysis completed',
        warnings,
        objects: result.objects || [],
        text: result.text || []
      };
    } catch (error) {
      warnings.push(`Image analysis failed: ${error}`);
      return {
        ocrText: '',
        notes: 'Image analysis unavailable',
        warnings
      };
    }
  }

  private async runPythonAnalysis(buffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(tmpdir(), `analysis-${Date.now()}.png`);
      fs.writeFileSync(tempPath, buffer);

      const python = spawn('python3', [
        '-c',
        `
import cv2
import pytesseract
import sys
import json

try:
    image = cv2.imread('${tempPath}')
    if image is None:
        print(json.dumps({'error': 'Could not load image'}))
        sys.exit(1)

    # OCR
    ocr_text = pytesseract.image_to_string(image)

    # Basic analysis
    height, width = image.shape[:2]
    analysis = f"Image dimensions: {width}x{height}"

    result = {
        'ocr': ocr_text.strip(),
        'analysis': analysis,
        'objects': [],  # Could add object detection here
        'text': [line.strip() for line in ocr_text.split('\n') if line.strip()]
    }

    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
        `
      ]);

      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        // Cleanup
        try { fs.unlinkSync(tempPath); } catch {}

        if (code === 0) {
          try {
            resolve(JSON.parse(output.trim()));
          } catch {
            resolve({ ocr: output.trim(), analysis: 'Basic analysis' });
          }
        } else {
          reject(new Error(`Python analysis failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        // Cleanup
        try { fs.unlinkSync(tempPath); } catch {}
        reject(error);
      });
    });
  }
}

export const localVision = new LocalVisionClient();
export default localVision;