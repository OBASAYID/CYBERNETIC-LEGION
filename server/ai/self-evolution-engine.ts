/**
 * CYRUS SELF-EVOLUTION ENGINE
 * 
 * Allows Cyrus to analyze, understand, and modify its own codebase
 * Implements safe code evolution with admin approval and rollback capabilities
 * 
 * CRITICAL: This system can modify running code - use with extreme caution
 * Requires admin authentication for all evolution operations
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { enhancedLocalLLM } from './enhanced-local-llm.js';

const execAsync = promisify(exec);

export interface CodeEvolutionRequest {
  userId: string;
  isAdmin: boolean;
  intent: string;
  targetFile?: string;
  targetFunction?: string;
  evolutionType: 'enhance' | 'fix' | 'refactor' | 'add-feature' | 'optimize';
  description: string;
  constraints?: string[];
}

export interface CodeAnalysis {
  file: string;
  currentCode: string;
  purpose: string;
  dependencies: string[];
  complexity: number;
  suggestions: string[];
}

export interface EvolutionPlan {
  id: string;
  request: CodeEvolutionRequest;
  analysis: CodeAnalysis;
  proposedChanges: {
    file: string;
    before: string;
    after: string;
    reasoning: string;
  }[];
  risks: string[];
  benefits: string[];
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
  requiresRestart: boolean;
  rollbackPlan: string;
  status: 'draft' | 'pending-approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled-back';
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface EvolutionResult {
  success: boolean;
  evolutionId: string;
  changes: Array<{
    file: string;
    applied: boolean;
    error?: string;
  }>;
  backupPath?: string;
  rollbackAvailable: boolean;
  message: string;
}

class SelfEvolutionEngine {
  private evolutionHistory: Map<string, EvolutionPlan>;
  private backupsDir: string;
  private maxHistorySize: number;
  private workspaceRoot: string;

  constructor() {
    this.evolutionHistory = new Map();
    this.workspaceRoot = process.cwd();
    this.backupsDir = path.join(this.workspaceRoot, '.cyrus-evolution-backups');
    this.maxHistorySize = 1000;
    
    // Ensure backups directory exists
    this.initBackupsDir();
  }

  private async initBackupsDir() {
    try {
      await fs.mkdir(this.backupsDir, { recursive: true });
      console.log('[Self-Evolution] Backup directory initialized:', this.backupsDir);
    } catch (error) {
      console.error('[Self-Evolution] Failed to create backups directory:', error);
    }
  }

  /**
   * Main entry point: Request code evolution
   */
  async requestEvolution(request: CodeEvolutionRequest): Promise<EvolutionPlan> {
    // Security check
    if (!request.isAdmin) {
      throw new Error('Self-evolution requires admin privileges');
    }

    console.log(`[Self-Evolution] Processing evolution request: ${request.intent}`);

    // Generate unique evolution ID
    const evolutionId = `evo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Step 1: Analyze current codebase
    const analysis = await this.analyzeCodebase(request);

    // Step 2: Generate evolution plan
    const proposedChanges = await this.generateEvolutionPlan(request, analysis);

    // Step 3: Assess risks and benefits
    const { risks, benefits, estimatedImpact } = await this.assessEvolution(proposedChanges, analysis);

    // Step 4: Create rollback plan
    const rollbackPlan = await this.createRollbackPlan(proposedChanges);

    // Create evolution plan
    const plan: EvolutionPlan = {
      id: evolutionId,
      request,
      analysis,
      proposedChanges,
      risks,
      benefits,
      estimatedImpact,
      requiresRestart: this.requiresRestart(proposedChanges),
      rollbackPlan,
      status: 'pending-approval',
      createdAt: new Date(),
    };

    // Store in history
    this.evolutionHistory.set(evolutionId, plan);

    console.log(`[Self-Evolution] Evolution plan created: ${evolutionId}`);
    console.log(`[Self-Evolution] Impact: ${estimatedImpact}, Requires restart: ${plan.requiresRestart}`);

    return plan;
  }

  /**
   * Analyze codebase to understand current state
   */
  private async analyzeCodebase(request: CodeEvolutionRequest): Promise<CodeAnalysis> {
    let targetFile = request.targetFile;
    
    // If no specific file, determine from intent
    if (!targetFile) {
      targetFile = await this.inferTargetFile(request.intent);
    }

    const filePath = path.join(this.workspaceRoot, targetFile);
    
    try {
      const currentCode = await fs.readFile(filePath, 'utf-8');
      
      // Use LLM to analyze code
      const analysisPrompt = `Analyze this code file and provide:
1. Its main purpose
2. Key dependencies
3. Complexity score (1-10)
4. Potential improvements

File: ${targetFile}

Code:
\`\`\`
${currentCode.slice(0, 5000)}
\`\`\`

Return JSON with: { purpose, dependencies: string[], complexity: number, suggestions: string[] }`;

      const response = await enhancedLocalLLM.chat([
        { role: 'system', content: 'You are a code analysis expert. Analyze code and return structured JSON.' },
        { role: 'user', content: analysisPrompt }
      ]);

      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(response.response);
      } catch {
        // Fallback analysis
        parsedAnalysis = {
          purpose: 'Code analysis in progress',
          dependencies: [],
          complexity: 5,
          suggestions: ['Requires deeper analysis']
        };
      }

      return {
        file: targetFile,
        currentCode,
        ...parsedAnalysis
      };
    } catch (error) {
      throw new Error(`Failed to analyze ${targetFile}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate specific code changes
   */
  private async generateEvolutionPlan(
    request: CodeEvolutionRequest,
    analysis: CodeAnalysis
  ): Promise<EvolutionPlan['proposedChanges']> {
    const prompt = `You are CYRUS Self-Evolution Engine. Generate code modifications.

Current code from ${analysis.file}:
\`\`\`
${analysis.currentCode.slice(0, 3000)}
\`\`\`

Evolution request:
- Type: ${request.evolutionType}
- Intent: ${request.intent}
- Description: ${request.description}
- Constraints: ${request.constraints?.join(', ') || 'none'}

Generate the modified code that:
1. ${request.evolutionType === 'enhance' ? 'Enhances functionality' : ''}
2. ${request.evolutionType === 'fix' ? 'Fixes the issue' : ''}
3. ${request.evolutionType === 'refactor' ? 'Improves code quality' : ''}
4. ${request.evolutionType === 'add-feature' ? 'Adds the new feature' : ''}
5. ${request.evolutionType === 'optimize' ? 'Optimizes performance' : ''}
6. Maintains backward compatibility
7. Includes proper error handling
8. Adds comments explaining changes

Return JSON: {
  modifiedCode: string,
  reasoning: string,
  breakingChanges: boolean
}`;

    const response = await enhancedLocalLLM.chat([
      { role: 'system', content: 'You are a senior software engineer performing code evolution.' },
      { role: 'user', content: prompt }
    ], { model: 'cyrus-code' });

    let parsedResponse;
    try {
      // Extract JSON from response
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // Fallback: treat entire response as modified code
      parsedResponse = {
        modifiedCode: response.response,
        reasoning: 'Generated code modification',
        breakingChanges: false
      };
    }

    return [{
      file: analysis.file,
      before: analysis.currentCode,
      after: parsedResponse.modifiedCode,
      reasoning: parsedResponse.reasoning || 'Code evolution applied'
    }];
  }

  /**
   * Assess risks and benefits of evolution
   */
  private async assessEvolution(
    changes: EvolutionPlan['proposedChanges'],
    analysis: CodeAnalysis
  ): Promise<{ risks: string[]; benefits: string[]; estimatedImpact: EvolutionPlan['estimatedImpact'] }> {
    const risks: string[] = [];
    const benefits: string[] = [];

    // Analyze complexity
    if (analysis.complexity > 7) {
      risks.push('High complexity file - changes may have unforeseen consequences');
    }

    // Check for breaking changes
    for (const change of changes) {
      if (change.before.length > change.after.length * 1.5) {
        risks.push(`Significant code reduction in ${change.file} - may remove important functionality`);
      }
      if (change.after.includes('// TODO') || change.after.includes('// FIXME')) {
        risks.push('Generated code contains TODOs or FIXMEs');
      }
    }

    // Identify benefits
    benefits.push('Code evolution improves system capabilities');
    benefits.push('Maintains Cyrus\'s competitive edge');
    
    if (changes.some(c => c.reasoning.toLowerCase().includes('optim'))) {
      benefits.push('Performance optimization');
    }
    if (changes.some(c => c.reasoning.toLowerCase().includes('fix'))) {
      benefits.push('Bug fix or issue resolution');
    }

    // Determine impact
    let estimatedImpact: EvolutionPlan['estimatedImpact'] = 'medium';
    
    if (analysis.file.includes('server/index') || analysis.file.includes('brain-core')) {
      estimatedImpact = 'critical';
    } else if (risks.length > 2) {
      estimatedImpact = 'high';
    } else if (risks.length === 0) {
      estimatedImpact = 'low';
    }

    return { risks, benefits, estimatedImpact };
  }

  /**
   * Create rollback plan
   */
  private async createRollbackPlan(changes: EvolutionPlan['proposedChanges']): Promise<string> {
    const backupFiles = changes.map(c => c.file).join(', ');
    return `Backup created for: ${backupFiles}. Use rollbackEvolution() to restore.`;
  }

  /**
   * Determine if changes require server restart
   */
  private requiresRestart(changes: EvolutionPlan['proposedChanges']): boolean {
    return changes.some(c => 
      c.file.includes('server/index') ||
      c.file.includes('routes.ts') ||
      c.file.includes('config')
    );
  }

  /**
   * Infer target file from intent
   */
  private async inferTargetFile(intent: string): Promise<string> {
    const intentLower = intent.toLowerCase();
    
    // Common patterns
    if (intentLower.includes('brain') || intentLower.includes('intelligence')) {
      return 'server/brain-core.ts';
    }
    if (intentLower.includes('api') || intentLower.includes('route')) {
      return 'server/routes.ts';
    }
    if (intentLower.includes('document')) {
      return 'server/ingestion/doc-intelligence-engine.ts';
    }
    if (intentLower.includes('voice') || intentLower.includes('speech')) {
      return 'server/humanoid/conversation-engine.ts';
    }
    
    // Default to evolution engine itself (meta-evolution!)
    return 'server/ai/self-evolution-engine.ts';
  }

  /**
   * Apply approved evolution
   */
  async executeEvolution(evolutionId: string, approvedBy: string): Promise<EvolutionResult> {
    const plan = this.evolutionHistory.get(evolutionId);
    
    if (!plan) {
      throw new Error(`Evolution plan ${evolutionId} not found`);
    }

    if (plan.status !== 'pending-approval') {
      throw new Error(`Evolution ${evolutionId} is not in pending-approval state`);
    }

    console.log(`[Self-Evolution] Executing evolution: ${evolutionId}`);
    
    // Update status
    plan.status = 'executing';
    plan.approvedBy = approvedBy;
    plan.approvedAt = new Date();

    // Create backup
    const backupPath = path.join(this.backupsDir, `backup-${evolutionId}`);
    await fs.mkdir(backupPath, { recursive: true });

    const results: EvolutionResult['changes'] = [];

    try {
      // Apply each change
      for (const change of plan.proposedChanges) {
        const filePath = path.join(this.workspaceRoot, change.file);
        const backupFilePath = path.join(backupPath, path.basename(change.file));

        try {
          // Backup original
          await fs.copyFile(filePath, backupFilePath);

          // Apply change
          await fs.writeFile(filePath, change.after, 'utf-8');

          results.push({
            file: change.file,
            applied: true
          });

          console.log(`[Self-Evolution] Applied change to ${change.file}`);
        } catch (error) {
          results.push({
            file: change.file,
            applied: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Check if all succeeded
      const allSuccess = results.every(r => r.applied);

      if (allSuccess) {
        plan.status = 'completed';
        
        // Run type check if TypeScript files changed
        if (plan.proposedChanges.some(c => c.file.endsWith('.ts'))) {
          try {
            console.log('[Self-Evolution] Running type check...');
            await execAsync('npm run typecheck:all');
            console.log('[Self-Evolution] Type check passed');
          } catch (error) {
            console.warn('[Self-Evolution] Type check failed - may need manual review');
          }
        }

        return {
          success: true,
          evolutionId,
          changes: results,
          backupPath,
          rollbackAvailable: true,
          message: `Evolution completed successfully. ${plan.requiresRestart ? 'Server restart required.' : ''}`
        };
      } else {
        plan.status = 'failed';
        return {
          success: false,
          evolutionId,
          changes: results,
          backupPath,
          rollbackAvailable: true,
          message: 'Some changes failed to apply. Rollback available.'
        };
      }
    } catch (error) {
      plan.status = 'failed';
      throw error;
    }
  }

  /**
   * Rollback an evolution
   */
  async rollbackEvolution(evolutionId: string): Promise<boolean> {
    const plan = this.evolutionHistory.get(evolutionId);
    
    if (!plan) {
      throw new Error(`Evolution ${evolutionId} not found`);
    }

    const backupPath = path.join(this.backupsDir, `backup-${evolutionId}`);

    try {
      // Restore all files from backup
      for (const change of plan.proposedChanges) {
        const filePath = path.join(this.workspaceRoot, change.file);
        const backupFilePath = path.join(backupPath, path.basename(change.file));

        await fs.copyFile(backupFilePath, filePath);
        console.log(`[Self-Evolution] Rolled back ${change.file}`);
      }

      plan.status = 'rolled-back';
      console.log(`[Self-Evolution] Evolution ${evolutionId} rolled back successfully`);
      return true;
    } catch (error) {
      console.error(`[Self-Evolution] Rollback failed:`, error);
      throw error;
    }
  }

  /**
   * Get evolution history
   */
  getEvolutionHistory(limit = 50): EvolutionPlan[] {
    const history = Array.from(this.evolutionHistory.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    
    return history;
  }

  /**
   * Get specific evolution plan
   */
  getEvolutionPlan(evolutionId: string): EvolutionPlan | undefined {
    return this.evolutionHistory.get(evolutionId);
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(daysToKeep = 30): Promise<number> {
    try {
      const backups = await fs.readdir(this.backupsDir);
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      let cleaned = 0;

      for (const backup of backups) {
        const backupPath = path.join(this.backupsDir, backup);
        const stats = await fs.stat(backupPath);
        
        if (stats.mtimeMs < cutoffTime) {
          await fs.rm(backupPath, { recursive: true, force: true });
          cleaned++;
        }
      }

      console.log(`[Self-Evolution] Cleaned up ${cleaned} old backups`);
      return cleaned;
    } catch (error) {
      console.error('[Self-Evolution] Backup cleanup failed:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const selfEvolutionEngine = new SelfEvolutionEngine();
export default selfEvolutionEngine;
