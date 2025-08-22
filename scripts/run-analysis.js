const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class CodeSplittingAnalyzer {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.results = [];
  }

  async analyze() {
    console.log('🔍 Analyzing components for code splitting opportunities...');
    
    const files = await this.findComponentFiles();
    console.log(`📁 Found ${files.length} component files`);

    for (const filePath of files) {
      try {
        const analysis = this.analyzeFile(filePath);
        this.results.push(analysis);
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${filePath}:`, error.message);
      }
    }

    this.results.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
      return priorityOrder[b.recommendation] - priorityOrder[a.recommendation] || b.complexity - a.complexity;
    });

    return this.results;
  }

  async findComponentFiles() {
    const patterns = [
      'components/**/*.{ts,tsx}',
      'app/**/page.{ts,tsx}',
      'app/**/layout.{ts,tsx}'
    ];

    const files = [];
    for (const pattern of patterns) {
      try {
        const matches = glob.sync(pattern, { cwd: this.projectRoot });
        files.push(...matches.map(f => path.join(this.projectRoot, f)));
      } catch (error) {
        console.warn(`Failed to glob pattern ${pattern}:`, error.message);
      }
    }

    return [...new Set(files)];
  }

  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const size = Buffer.byteLength(content, 'utf8');
    const lineCount = content.split('\n').length;

    const dependencies = this.extractDependencies(content);
    const heavyDependencies = dependencies.filter(dep => 
      ['@radix-ui', 'lucide-react', 'react-hook-form', '@hookform/resolvers', 'zod', '@supabase/supabase-js'].some(heavy => dep.includes(heavy))
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

  extractDependencies(content) {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const dependencies = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  calculateComplexity(content, dependencies, heavyDependencies, lineCount, size) {
    let complexity = 0;

    // Size factor
    complexity += Math.min(size / 1000, 50);
    // Line count factor
    complexity += Math.min(lineCount / 10, 30);
    // Heavy dependencies factor
    complexity += heavyDependencies.length * 15;
    // Total dependencies factor
    complexity += Math.min(dependencies.length * 2, 20);

    // Complex patterns
    const complexPatterns = [
      /useForm\(/g, /zodResolver/g, /useState\(/g, /useEffect\(/g,
      /useMemo\(/g, /useCallback\(/g, /createContext/g, /forwardRef/g, /memo\(/g
    ];

    complexPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length * 3;
    });

    // UI component indicators
    const uiPatterns = [
      /Dialog/g, /Modal/g, /Sheet/g, /Popover/g, /Dropdown/g,
      /Command/g, /DataTable/g, /Form/g
    ];

    uiPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length * 5;
    });

    return Math.round(complexity);
  }

  getRecommendation(complexity, heavyDependencies, lineCount, size, filePath) {
    const reasons = [];
    let score = 0;

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

    if (size > 10000) {
      score += 2;
      reasons.push(`Large file size (${Math.round(size / 1024)}KB)`);
    } else if (size > 5000) {
      score += 1;
      reasons.push(`Medium file size (${Math.round(size / 1024)}KB)`);
    }

    if (lineCount > 200) {
      score += 2;
      reasons.push(`Many lines of code (${lineCount})`);
    } else if (lineCount > 100) {
      score += 1;
      reasons.push(`Moderate lines of code (${lineCount})`);
    }

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

    let recommendation;
    if (score >= 6) {
      recommendation = 'high';
    } else if (score >= 4) {
      recommendation = 'medium';
    } else if (score >= 2) {
      recommendation = 'low';
    } else {
      recommendation = 'none';
      reasons.push('Component is lightweight and doesn\'t need code splitting');
    }

    return { recommendation, reasons };
  }

  generateReport() {
    console.log('\n📊 Code Splitting Analysis Report');
    console.log('='.repeat(50));

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

  async saveReport(outputPath = 'code-splitting-analysis.json') {
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

// Run the analysis
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