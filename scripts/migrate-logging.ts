#!/usr/bin/env tsx

import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { logger } from '../lib/services/logger';

interface LogReplacement {
  pattern: RegExp;
  replacement: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  requiresImport: boolean;
}

const LOG_REPLACEMENTS: LogReplacement[] = [
  {
    pattern: /console\.log\(([^)]+)\)/g,
    replacement: 'logger.info($1)',
    logLevel: 'info',
    requiresImport: true
  },
  {
    pattern: /console\.error\(([^)]+)\)/g,
    replacement: 'logger.error($1)',
    logLevel: 'error',
    requiresImport: true
  },
  {
    pattern: /console\.warn\(([^)]+)\)/g,
    replacement: 'logger.warn($1)',
    logLevel: 'warn',
    requiresImport: true
  },
  {
    pattern: /console\.info\(([^)]+)\)/g,
    replacement: 'logger.info($1)',
    logLevel: 'info',
    requiresImport: true
  },
  {
    pattern: /console\.debug\(([^)]+)\)/g,
    replacement: 'logger.debug($1)',
    logLevel: 'debug',
    requiresImport: true
  }
];

const IMPORT_STATEMENT = "import { logger } from '@/lib/services/logger';";
const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const EXCLUDED_DIRS = ['node_modules', '.next', 'dist', 'build', '.git'];
const EXCLUDED_FILES = ['migrate-logging.ts', 'logger.ts'];

interface MigrationResult {
  filePath: string;
  replacements: number;
  success: boolean;
  error?: string;
}

class LoggingMigrator {
  private results: MigrationResult[] = [];
  private dryRun: boolean;

  constructor(dryRun = false) {
    this.dryRun = dryRun;
  }

  private async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private shouldProcessFile(filePath: string): boolean {
    const ext = extname(filePath);
    const fileName = filePath.split(/[\\/]/).pop() || '';
    
    return SUPPORTED_EXTENSIONS.includes(ext) && 
           !EXCLUDED_FILES.includes(fileName);
  }

  private shouldProcessDirectory(dirPath: string): boolean {
    const dirName = dirPath.split(/[\\/]/).pop() || '';
    return !EXCLUDED_DIRS.includes(dirName);
  }

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        
        if (await this.isDirectory(fullPath)) {
          if (this.shouldProcessDirectory(entry)) {
            const subFiles = await this.getAllFiles(fullPath);
            files.push(...subFiles);
          }
        } else if (this.shouldProcessFile(fullPath)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
    
    return files;
  }

  private hasConsoleStatements(content: string): boolean {
    return /console\.(log|error|warn|info|debug)\s*\(/.test(content);
  }

  private hasLoggerImport(content: string): boolean {
    return /import.*logger.*from.*['"]@?\/lib\/services\/logger['"]/.test(content) ||
           /import.*{.*logger.*}.*from.*['"]@?\/lib\/services\/logger['"]/.test(content);
  }

  private addLoggerImport(content: string): string {
    // Find the last import statement
    const importRegex = /^import\s+.*?;$/gm;
    const imports = content.match(importRegex) || [];
    
    if (imports.length === 0) {
      // No imports found, add at the top
      return `${IMPORT_STATEMENT}\n\n${content}`;
    }
    
    // Find the position after the last import
    let lastImportIndex = -1;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }
    
    if (lastImportIndex === -1) {
      return `${IMPORT_STATEMENT}\n\n${content}`;
    }
    
    // Insert after the last import
    return content.slice(0, lastImportIndex) + 
           `\n${IMPORT_STATEMENT}` + 
           content.slice(lastImportIndex);
  }

  private migrateConsoleStatements(content: string): { content: string; replacements: number } {
    let modifiedContent = content;
    let totalReplacements = 0;
    
    for (const replacement of LOG_REPLACEMENTS) {
      const matches = modifiedContent.match(replacement.pattern);
      if (matches) {
        modifiedContent = modifiedContent.replace(replacement.pattern, replacement.replacement);
        totalReplacements += matches.length;
      }
    }
    
    return { content: modifiedContent, replacements: totalReplacements };
  }

  private async migrateFile(filePath: string): Promise<MigrationResult> {
    try {
      const content = await readFile(filePath, 'utf-8');
      
      if (!this.hasConsoleStatements(content)) {
        return {
          filePath,
          replacements: 0,
          success: true
        };
      }
      
      let modifiedContent = content;
      
      // Add logger import if needed
      if (!this.hasLoggerImport(content)) {
        modifiedContent = this.addLoggerImport(modifiedContent);
      }
      
      // Replace console statements
      const { content: finalContent, replacements } = this.migrateConsoleStatements(modifiedContent);
      
      if (!this.dryRun && replacements > 0) {
        await writeFile(filePath, finalContent, 'utf-8');
      }
      
      return {
        filePath,
        replacements,
        success: true
      };
    } catch (error) {
      return {
        filePath,
        replacements: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async migrateProject(projectPath: string): Promise<void> {
    console.log(`🔄 Starting logging migration${this.dryRun ? ' (DRY RUN)' : ''}...\n`);
    
    const files = await this.getAllFiles(projectPath);
    console.log(`📁 Found ${files.length} files to process\n`);
    
    let processedFiles = 0;
    let totalReplacements = 0;
    
    for (const file of files) {
      const result = await this.migrateFile(file);
      this.results.push(result);
      
      if (result.success && result.replacements > 0) {
        const relativePath = file.replace(projectPath, '').replace(/^[\\/]/, '');
        console.log(`✅ ${relativePath}: ${result.replacements} replacements`);
        totalReplacements += result.replacements;
      } else if (!result.success) {
        const relativePath = file.replace(projectPath, '').replace(/^[\\/]/, '');
        console.log(`❌ ${relativePath}: ${result.error}`);
      }
      
      processedFiles++;
      
      // Progress indicator
      if (processedFiles % 10 === 0) {
        console.log(`📊 Progress: ${processedFiles}/${files.length} files processed`);
      }
    }
    
    this.printSummary(totalReplacements);
  }

  private printSummary(totalReplacements: number): void {
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const withReplacements = this.results.filter(r => r.replacements > 0).length;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`📁 Total files processed: ${this.results.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🔄 Files with replacements: ${withReplacements}`);
    console.log(`🔢 Total console statements replaced: ${totalReplacements}`);
    
    if (this.dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no files were modified');
      console.log('Run without --dry-run flag to apply changes');
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Test your application to ensure everything works');
      console.log('2. Update your environment variables for logging configuration');
      console.log('3. Consider adding LOG_LEVEL=debug for development');
    }
    
    if (failed > 0) {
      console.log('\n❌ Failed files:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`   ${r.filePath}: ${r.error}`));
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log('🔧 Logging Migration Tool');
    console.log('\nUsage: npx tsx scripts/migrate-logging.ts [options]');
    console.log('\nOptions:');
    console.log('  --dry-run, -d    Preview changes without modifying files');
    console.log('  --help, -h       Show this help message');
    console.log('\nThis tool will:');
    console.log('• Replace console.log/error/warn/info/debug with structured logger calls');
    console.log('• Add logger imports where needed');
    console.log('• Preserve existing functionality while improving logging');
    return;
  }
  
  const projectPath = process.cwd();
  const migrator = new LoggingMigrator(dryRun);
  
  try {
    await migrator.migrateProject(projectPath);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { LoggingMigrator };