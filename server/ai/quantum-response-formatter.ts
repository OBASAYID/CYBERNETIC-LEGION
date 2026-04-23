/**
 * Quantum Response Formatter
 * Applies data science algorithms and formatting to AI responses
 * based on query classification and quantum analysis
 */

import { quantumBridge, type EnhancementResult } from './quantum-bridge-client.js';

interface FormattedResponse {
  content: string;
  format: 'standard' | 'analytical' | 'data' | 'research' | 'technical' | 'creative';
  sections?: string[];
  metrics?: Record<string, any>;
  visualizationData?: any;
}

interface AnalyticalSection {
  title: string;
  content: string;
  confidence?: number;
  metrics?: Record<string, number>;
}

class QuantumResponseFormatter {
  
  /**
   * Sanitize markdown symbols from response
   * Converts markdown to clean, professional text
   */
  private sanitizeMarkdown(text: string): string {
    return text
      // Remove markdown headers (###, ##, #)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold markdown (**text** or __text__)
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      // Remove italic markdown (*text* or _text_) - careful with underscores in words
      .replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '$1')
      .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '$1')
      // Remove horizontal rules (---, ___, ***)
      .replace(/^[-_*]{3,}\s*$/gm, '')
      // Remove markdown bullet points at start of lines, convert to numbered
      .replace(/^[\s]*[-*+]\s+/gm, '• ')
      // Remove code blocks but preserve content
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
      // Remove inline code backticks
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Format response based on quantum analysis
   */
  async formatResponse(
    rawResponse: string,
    enhancement: EnhancementResult | null,
    queryType?: string
  ): Promise<FormattedResponse> {
    // Always sanitize markdown first
    const cleanedResponse = this.sanitizeMarkdown(rawResponse);
    
    if (!enhancement) {
      return { content: cleanedResponse, format: 'standard' };
    }

    const classification = enhancement.query_classification || queryType || 'analytical';
    
    switch (classification.toLowerCase()) {
      case 'analytical':
        return this.formatAnalytical(cleanedResponse, enhancement);
      case 'data':
        return this.formatData(cleanedResponse, enhancement);
      case 'research':
        return this.formatResearch(cleanedResponse, enhancement);
      case 'technical':
        return this.formatTechnical(cleanedResponse, enhancement);
      case 'mathematical':
        return this.formatMathematical(cleanedResponse, enhancement);
      case 'creative':
        return this.formatCreative(cleanedResponse, enhancement);
      default:
        return { content: cleanedResponse, format: 'standard' };
    }
  }

  /**
   * Format the natural response to ensure it follows personality guidelines
   */
  private formatNaturalResponse(content: string): string {
    // Remove any leftover quantum markers if they leaked into natural part
    return content.replace(/◈ QUANTUM ANALYSIS (START|END) ◈/g, '')
                 .replace(/\d+\. (Engineering\/Science Processing Pathway|Technical Results & Metrics|Core Interpretation).*/g, '')
                 .trim();
  }

  /**
   * Format analytical responses with structured sections and metrics
   */
  private formatAnalytical(response: string, enhancement: EnhancementResult): FormattedResponse {
    // Extract sections
    const quantumSectionMatch = response.match(/◈ QUANTUM ANALYSIS START ◈([\s\S]*?)◈ QUANTUM ANALYSIS END ◈/);
    const naturalResponse = response.replace(/◈ QUANTUM ANALYSIS START ◈[\s\S]*?◈ QUANTUM ANALYSIS END ◈/, '').trim();
    
    let formattedContent = '';
    
    if (quantumSectionMatch) {
      formattedContent += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      formattedContent += '◈ QUANTUM ANALYTICAL INTELLIGENCE REPORT ◈\n';
      formattedContent += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      
      const quantumContent = quantumSectionMatch[1].trim()
        .replace(/^\d+\.\s+/gm, '▸ ') // Convert numbered steps to bullet points
        .replace(/^(Engineering\/Science Processing Pathway|Technical Results & Metrics|Core Interpretation)/gm, (match) => `[ ${match.toUpperCase()} ]`);
      
      formattedContent += quantumContent + '\n\n';
    }

    formattedContent += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    formattedContent += '◈ CORE INTELLIGENCE RESPONSE ◈\n';
    formattedContent += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    formattedContent += this.formatNaturalResponse(naturalResponse);

    return {
      content: formattedContent,
      format: 'analytical'
    };
  }

  /**
   * Format data-focused responses with tables and statistics
   */
  private formatData(response: string, enhancement: EnhancementResult): FormattedResponse {
    let formattedContent = '';
    
    formattedContent += '╔══════════════════════════════════════════╗\n';
    formattedContent += '║   QUANTUM DATA INTELLIGENCE REPORT       ║\n';
    formattedContent += '╚══════════════════════════════════════════╝\n\n';
    
    // Extract any numerical data from the response
    const numbers = response.match(/\d+\.?\d*/g) || [];
    const hasData = numbers.length > 0;
    
    if (hasData && numbers.length >= 3) {
      // Calculate basic statistics
      const numericData = numbers.slice(0, 10).map(n => parseFloat(n)).filter(n => !isNaN(n));
      if (numericData.length >= 2) {
        const stats = this.calculateStats(numericData);
        
        formattedContent += '┌─── STATISTICAL ANALYSIS ─────────────────\n';
        formattedContent += `│  Data Points:   ${numericData.length}\n`;
        formattedContent += `│  Mean:          ${stats.mean.toFixed(2)}\n`;
        formattedContent += `│  Median:        ${stats.median.toFixed(2)}\n`;
        formattedContent += `│  Std Dev:       ${stats.stdDev.toFixed(2)}\n`;
        formattedContent += `│  Range:         ${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}\n`;
        formattedContent += '└────────────────────────────────────────\n\n';
      }
    }
    
    // Format the main content with data presentation
    formattedContent += '┌─── DATA INSIGHTS ────────────────────────\n';
    formattedContent += '│\n';
    
    const wrappedContent = this.wrapText(response, 58);
    wrappedContent.forEach(line => {
      formattedContent += `│  ${line}\n`;
    });
    
    formattedContent += '│\n';
    formattedContent += '└────────────────────────────────────────\n';

    return {
      content: formattedContent,
      format: 'data'
    };
  }

  /**
   * Format research responses with citations and sources structure
   */
  private formatResearch(response: string, enhancement: EnhancementResult): FormattedResponse {
    let formattedContent = '';
    
    formattedContent += '╭──────────────────────────────────────────╮\n';
    formattedContent += '│  ◈ QUANTUM RESEARCH INTELLIGENCE        │\n';
    formattedContent += '╰──────────────────────────────────────────╯\n\n';
    
    // Split into potential sections based on common research markers
    const researchSections = this.extractResearchSections(response);
    
    researchSections.forEach((section, idx) => {
      const sectionNum = String(idx + 1).padStart(2, '0');
      formattedContent += `[${sectionNum}] ▶ ${section.title}\n`;
      formattedContent += '    ─────────────────────────────────\n';
      
      const wrapped = this.wrapText(section.content, 55);
      wrapped.forEach(line => {
        formattedContent += `    ${line}\n`;
      });
      formattedContent += '\n';
    });

    // Add methodology note
    if (enhancement.enhancements.analytical_framework) {
      formattedContent += '╭─── METHODOLOGY ────────────────────────╮\n';
      formattedContent += `│  Approach: ${enhancement.enhancements.analytical_framework.approach}\n`;
      formattedContent += '╰────────────────────────────────────────╯\n';
    }

    return {
      content: formattedContent,
      format: 'research',
      sections: researchSections.map(s => s.title)
    };
  }

  /**
   * Format technical responses with code-like structure
   */
  private formatTechnical(response: string, enhancement: EnhancementResult): FormattedResponse {
    let formattedContent = '';
    
    formattedContent += '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n';
    formattedContent += '┃  QUANTUM TECHNICAL ANALYSIS ENGINE      ┃\n';
    formattedContent += '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n';
    
    formattedContent += '▸ Processing Mode: Technical Analysis\n';
    formattedContent += '▸ Output Format: Structured Technical Report\n\n';
    
    // Check for code blocks and format them
    const codeBlockRegex = /```[\s\S]*?```/g;
    let hasCode = codeBlockRegex.test(response);
    
    formattedContent += '┌─── TECHNICAL DETAILS ─────────────────────\n';
    formattedContent += '│\n';
    
    const wrapped = this.wrapText(response.replace(/```/g, ''), 58);
    wrapped.forEach(line => {
      formattedContent += `│  ${line}\n`;
    });
    
    formattedContent += '│\n';
    formattedContent += '└────────────────────────────────────────\n';

    return {
      content: formattedContent,
      format: 'technical'
    };
  }

  /**
   * Format mathematical responses with proper notation hints
   */
  private formatMathematical(response: string, enhancement: EnhancementResult): FormattedResponse {
    let formattedContent = '';
    
    formattedContent += '╔══════════════════════════════════════════╗\n';
    formattedContent += '║   QUANTUM MATHEMATICAL PROCESSOR         ║\n';
    formattedContent += '╚══════════════════════════════════════════╝\n\n';
    
    const mathContext = enhancement.enhancements.mathematical_context;
    if (mathContext) {
      formattedContent += `▸ Notation: ${mathContext.notation_style}\n`;
      formattedContent += `▸ Precision: ${mathContext.decimal_precision} decimal places\n`;
      if (mathContext.include_derivations) formattedContent += '▸ Derivations: Included\n';
      formattedContent += '\n';
    }
    
    formattedContent += '┌─── MATHEMATICAL ANALYSIS ─────────────────\n';
    formattedContent += '│\n';
    
    const wrapped = this.wrapText(response, 58);
    wrapped.forEach(line => {
      formattedContent += `│  ${line}\n`;
    });
    
    formattedContent += '│\n';
    formattedContent += '└────────────────────────────────────────\n';

    return {
      content: formattedContent,
      format: 'analytical'
    };
  }

  /**
   * Format creative responses with artistic presentation
   */
  private formatCreative(response: string, enhancement: EnhancementResult): FormattedResponse {
    let formattedContent = '';
    
    formattedContent += '✧ ═══════════════════════════════════════ ✧\n';
    formattedContent += '       QUANTUM CREATIVE INTELLIGENCE        \n';
    formattedContent += '✧ ═══════════════════════════════════════ ✧\n\n';
    
    // For creative, preserve the natural flow more
    formattedContent += response;
    formattedContent += '\n\n';
    formattedContent += '✧ ═══════════════════════════════════════ ✧\n';

    return {
      content: formattedContent,
      format: 'creative'
    };
  }

  // Helper methods
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private formatPercent(value: number): string {
    const percent = Math.round(value * 100);
    const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
    return `${bar} ${percent}%`;
  }

  private calculateStats(data: number[]): { mean: number; median: number; stdDev: number; min: number; max: number } {
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const median = sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 
      : sorted[Math.floor(sorted.length / 2)];
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }

  private extractResearchSections(response: string): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];
    const paragraphs = response.split(/\n\n+/);
    
    const sectionTitles = ['Introduction', 'Background', 'Methodology', 'Findings', 'Analysis', 'Conclusion', 'Recommendations'];
    let currentTitle = 'Overview';
    let currentContent = '';

    for (const para of paragraphs) {
      const matchedTitle = sectionTitles.find(t => para.toLowerCase().includes(t.toLowerCase()));
      if (matchedTitle && currentContent) {
        sections.push({ title: currentTitle, content: currentContent.trim() });
        currentTitle = matchedTitle;
        currentContent = para;
      } else {
        currentContent += (currentContent ? '\n\n' : '') + para;
      }
    }
    
    if (currentContent) {
      sections.push({ title: currentTitle, content: currentContent.trim() });
    }
    
    return sections.length > 0 ? sections : [{ title: 'Research Summary', content: response }];
  }
}

export const quantumResponseFormatter = new QuantumResponseFormatter();
export type { FormattedResponse };
