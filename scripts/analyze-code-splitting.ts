#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ComponentAnalysis {
  filePath: string;
  fileName: string;
  size: number;
  dependencies: string[];
  heavyDependencies: string[];
  lineCount: number;
  complexity: number;
  recommendation: 'high' | 'medium' | 'low' | 'none';
  reasons: string[];
}

const HEAVY_DEPENDENCIES = [
  '@radix-ui',
  'lucide-react',
  'react-hook-form',
  '@hookform/resolvers',
  'zod',
  '@supabase/supabase-js',
  'framer-motion',
  'recharts',
  'react-table',
  '@tanstack/react-table'
];

const COMPONENT_PATTERNS = [
  /components\/.*\.tsx?$/,
  /app\/.*\/page\.tsx?$/,
  /app\/.*\/layout\.tsx?$/
];

class CodeSplittingAnalyzer {
  private projectRoot: string;
  private results: ComponentAnalysis[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async analyze(): Promise<ComponentAnalysis[]> {
    console.log('🔍 Analyzing components for code splitting opportunities...');
    
    const files = await this.findComponentFiles();
    console.log(`📁 Found ${files.length} component files`);

    for (const filePath of files) {
      try {
        const analysis = await this.analyzeFile(filePath);
        this.results.push(analysis);
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${filePath}:`, error);
      }
    }

    this.results.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
      return priorityOrder[b.recommendation] - priorityOrder[a.recommendation] || b.complexity - a.complexity;
    });

    return this.results;
  }

  private async findComponentFiles(): Promise<string[]> {
    const patterns = [
      'components/**/*.{ts,tsx}',
      'app/**/page.{ts,tsx}',
      'app/**/layout.{ts,tsx}',
      'modules/**/components/**/*.{ts,tsx}'
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.projectRoot });
      files.push(...matches.map(f => path.join(this.projectRoot, f)));
    }

    return [...new Set(files)];
  }

  private async analyzeFile(filePath: string): Promise<ComponentAnalysis> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const size = Buffer.byteLength(content, 'utf8');
    const lineCount = content.split('\n').length;

    const dependencies = this.extractDependencies(content);
    const heavyDependencies = dependencies.filter(dep => 
      HEAVY_DEPENDENCIES.some(heavy => dep.includes(heavy))
    );

    const complexity = this.calculateComplexity(content, dependencies, heavyDependencies, lineCount, size);
    const { recommendation, reasons } = this.getRecommendation(complexity, heavyDependencies, lineCount, size, filePath);

    return {
      filePath: path.relative(this.projectRoot, filePath),
      fileName,
      size,
      dependencies,
      heavyDependencies,
      lineCount,
      complexity,
      recommendation,
      reasons
    };
  }

  private extractDependencies(content: string): string[] {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const dependencies: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  private calculateComplexity(
    content: string, 
    dependencies: string[], 
    heavyDependencies: string[], 
    lineCount: number, 
    size: number
  ): number {
    let complexity = 0;

    // Size factor (larger files are more complex)
    complexity += Math.min(size / 1000, 50); // Max 50 points for size

    // Line count factor
    complexity += Math.min(lineCount / 10, 30); // Max 30 points for lines

    // Heavy dependencies factor
    complexity += heavyDependencies.length * 15; // 15 points per heavy dependency

    // Total dependencies factor
    complexity += Math.min(dependencies.length * 2, 20); // Max 20 points for dependencies

    // Component patterns that indicate complexity
    const complexPatterns = [
      /useForm\(/g,
      /zodResolver/g,
      /useState\(/g,
      /useEffect\(/g,
      /useMemo\(/g,
      /useCallback\(/g,
      /createContext/g,
      /forwardRef/g,
      /memo\(/g
    ];

    complexPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length * 3; // 3 points per complex pattern
      }
    });

    // UI component indicators
    const uiPatterns = [
      /Dialog/g,
      /Modal/g,
      /Sheet/g,
      /Popover/g,
      /Dropdown/g,
      /Command/g,
      /DataTable/g,
      /Form/g
    ];

    uiPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length * 5; // 5 points per UI component
      }
    });

    return Math.round(complexity);
  }

  private getRecommendation(
    complexity: number, 
    heavyDependencies: string[], 
    lineCount: number, 
    size: number, 
    filePath: string
  ): { recommendation: ComponentAnalysis['recommendation'], reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // High complexity threshold
    if (complexity > 80) {
      score += 3;
      reasons.push(`High complexity score (${complexity})`);
    } else if (complexity > 50) {
      score += 2;
      reasons.push(`Medium complexity score (${complexity})`);
    } else if (complexity > 25) {
      score += 1;
      reasons.push(`Low complexity score (${complexity})`);
    }

    // Heavy dependencies
    if (heavyDependencies.length >= 3) {
      score += 3;
      reasons.push(`Multiple heavy dependencies (${heavyDependencies.length})`);
    } else if (heavyDependencies.length >= 2) {
      score += 2;
      reasons.push(`Some heavy dependencies (${heavyDependencies.length})`);
    } else if (heavyDependencies.length >= 1) {
      score += 1;
      reasons.push(`Has heavy dependencies (${heavyDependencies.join(', ')})`);
    }

    // File size
    if (size > 10000) {
      score += 2;
      reasons.push(`Large file size (${Math.round(size / 1024)}KB)`);
    } else if (size > 5000) {
      score += 1;
      reasons.push(`Medium file size (${Math.round(size / 1024)}KB)`);
    }

    // Line count
    if (lineCount > 200) {
      score += 2;
      reasons.push(`Many lines of code (${lineCount})`);
    } else if (lineCount > 100) {
      score += 1;
      reasons.push(`Moderate lines of code (${lineCount})`);
    }

    // Component type patterns
    if (filePath.includes('settings') || filePath.includes('admin')) {
      score += 2;
      reasons.push('Admin/settings component (conditional loading)');
    }

    if (filePath.includes('modal') || filePath.includes('dialog')) {
      score += 1;
      reasons.push('Modal/dialog component (on-demand loading)');
    }

    if (filePath.includes('form')) {
      score += 1;
      reasons.push('Form component (heavy validation libraries)');
    }

    // Determine recommendation
    if (score >= 6) {
      return { recommendation: 'high', reasons };
    } else if (score >= 4) {
      return { recommendation: 'medium', reasons };
    } else if (score >= 2) {
      return { recommendation: 'low', reasons };
    } else {
      return { recommendation: 'none', reasons: ['Component is lightweight and doesn\'t need code splitting'] };
    }
  }

  generateReport(): void {
    console.log('\n📊 Code Splitting Analysis Report');
    console.log('=' .repeat(50));

    const recommendations = {
      high: this.results.filter(r => r.recommendation === 'high'),
      medium: this.results.filter(r => r.recommendation === 'medium'),
      low: this.results.filter(r => r.recommendation === 'low'),
      none: this.results.filter(r => r.recommendation === 'none')
    };

    console.log(`\n🔴 HIGH Priority (${recommendations.high.length} components):`);
    recommendations.high.forEach(comp => {
      console.log(`  📁 ${comp.filePath}`);
      console.log(`     Size: ${Math.round(comp.size / 1024)}KB | Lines: ${comp.lineCount} | Complexity: ${comp.complexity}`);
      console.log(`     Heavy deps: ${comp.heavyDependencies.join(', ') || 'None'}`);
      console.log(`     Reasons: ${comp.reasons.join(', ')}`);
      console.log('');
    });

    console.log(`\n🟡 MEDIUM Priority (${recommendations.medium.length} components):`);
    recommendations.medium.slice(0, 5).forEach(comp => {
      console.log(`  📁 ${comp.filePath} (${Math.round(comp.size / 1024)}KB, ${comp.lineCount} lines)`);
    });
    if (recommendations.medium.length > 5) {
      console.log(`  ... and ${recommendations.medium.length - 5} more`);
    }

    console.log(`\n🟢 LOW Priority (${recommendations.low.length} components):`);
    recommendations.low.slice(0, 3).forEach(comp => {
      console.log(`  📁 ${comp.filePath} (${Math.round(comp.size / 1024)}KB)`);
    });
    if (recommendations.low.length > 3) {
      console.log(`  ... and ${recommendations.low.length - 3} more`);
    }

    console.log(`\n⚪ No Action Needed: ${recommendations.none.length} components`);

    // Summary statistics
    const totalSize = this.results.reduce((sum, comp) => sum + comp.size, 0);
    const highPrioritySize = recommendations.high.reduce((sum, comp) => sum + comp.size, 0);
    const potentialSavings = Math.round((highPrioritySize / totalSize) * 100);

    console.log('\n📈 Summary:');
    console.log(`  Total components analyzed: ${this.results.length}`);
    console.log(`  Total size: ${Math.round(totalSize / 1024)}KB`);
    console.log(`  High priority components: ${recommendations.high.length}`);
    console.log(`  Potential bundle size reduction: ~${potentialSavings}%`);

    console.log('\n💡 Next Steps:');
    console.log('  1. Start with HIGH priority components');
    console.log('  2. Use createDynamicImport() from lib/utils/dynamic-imports.tsx');
    console.log('  3. Test loading states and error boundaries');
    console.log('  4. Monitor bundle size with npm run analyze');
  }

  async saveReport(outputPath: string = 'code-splitting-analysis.json'): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalComponents: this.results.length,
        highPriority: this.results.filter(r => r.recommendation === 'high').length,
        mediumPriority: this.results.filter(r => r.recommendation === 'medium').length,
        lowPriority: this.results.filter(r => r.recommendation === 'low').length,
        totalSize: this.results.reduce((sum, comp) => sum + comp.size, 0)
      },
      components: this.results
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to ${outputPath}`);
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    const analyzer = new CodeSplittingAnalyzer();
    
    try {
      await analyzer.analyze();
      analyzer.generateReport();
      await analyzer.saveReport();
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }

  main();
}

export { CodeSplittingAnalyzer };