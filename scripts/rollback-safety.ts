#!/usr/bin/env ts-node

import { MigrationValidator } from './validate-migrations';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/services/logger';

interface RollbackPlan {
  migration: string;
  canRollback: boolean;
  rollbackSQL: string | null;
  risks: string[];
  dependencies: string[];
}

class RollbackAnalyzer {
  private migrationsPath = './supabase/migrations';

  async analyzeRollbackSafety(migrationFile?: string): Promise<RollbackPlan[]> {
    const validator = new MigrationValidator();
    const validation = await validator.validateMigrations();
    
    const migrationsToAnalyze = migrationFile 
      ? validation.migrations.filter(m => m.filename === migrationFile)
      : validation.migrations;

    return migrationsToAnalyze.map(migration => this.analyzeSingleMigration(migration));
  }

  private analyzeSingleMigration(migration: any): RollbackPlan {
    const content = migration.content;
    const risks: string[] = [];
    let canRollback = true;
    let rollbackSQL: string | null = null;

    // Analyze for rollback risks
    const dangerousOperations = [
      { pattern: /DROP\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi, risk: 'Table deletion - data loss' },
      { pattern: /DROP\s+COLUMN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi, risk: 'Column deletion - data loss' },
      { pattern: /DELETE\s+FROM/gi, risk: 'Data deletion' },
      { pattern: /TRUNCATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi, risk: 'Table truncation - all data lost' },
      { pattern: /ALTER\s+TABLE.*DROP/gi, risk: 'Structure modification with DROP' }
    ];

    dangerousOperations.forEach(({ pattern, risk }) => {
      if (pattern.test(content)) {
        risks.push(risk);
        canRollback = false;
      }
    });

    // Try to generate rollback SQL for safe operations
    if (canRollback) {
      rollbackSQL = this.generateRollbackSQL(content);
    }

    // Extract dependencies
    const dependencies = this.extractDependencies(content);

    return {
      migration: migration.filename,
      canRollback,
      rollbackSQL,
      risks,
      dependencies
    };
  }

  private generateRollbackSQL(content: string): string | null {
    const lines = content.split('\n').filter(line => line.trim());
    const rollbackStatements: string[] = [];

    for (const line of lines.reverse()) {
      const trimmed = line.trim().toUpperCase();

      // Generate reverse operations for common patterns
      if (trimmed.startsWith('CREATE TABLE')) {
        const match = line.match(/CREATE TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
        if (match) {
          rollbackStatements.push(`DROP TABLE IF EXISTS ${match[1]};`);
        }
      } else if (trimmed.startsWith('ALTER TABLE') && trimmed.includes('ADD COLUMN')) {
        const tableMatch = line.match(/ALTER TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
        const columnMatch = line.match(/ADD COLUMN\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
        if (tableMatch && columnMatch) {
          rollbackStatements.push(`ALTER TABLE ${tableMatch[1]} DROP COLUMN IF EXISTS ${columnMatch[1]};`);
        }
      } else if (trimmed.startsWith('CREATE INDEX')) {
        const match = line.match(/CREATE.*INDEX\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
        if (match) {
          rollbackStatements.push(`DROP INDEX IF EXISTS ${match[1]};`);
        }
      } else if (trimmed.startsWith('INSERT INTO')) {
        const match = line.match(/INSERT INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
        if (match) {
          rollbackStatements.push(`-- Manual cleanup required for INSERT INTO ${match[1]}`);
        }
      }
    }

    return rollbackStatements.length > 0 ? rollbackStatements.join('\n') : null;
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Extract foreign key dependencies
    const fkPattern = /REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    let match;
    while ((match = fkPattern.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  async generateRollbackReport(migrationFile?: string): Promise<string> {
    const plans = await this.analyzeRollbackSafety(migrationFile);
    
    let report = '# Rollback Safety Analysis\n\n';
    
    const safeMigrations = plans.filter(p => p.canRollback);
    const unsafeMigrations = plans.filter(p => !p.canRollback);
    
    report += `**Total Migrations:** ${plans.length}\n`;
    report += `**Safe to Rollback:** ${safeMigrations.length}\n`;
    report += `**Unsafe to Rollback:** ${unsafeMigrations.length}\n\n`;

    if (unsafeMigrations.length > 0) {
      report += '## ⚠️ Unsafe Migrations (Cannot Rollback)\n\n';
      unsafeMigrations.forEach(plan => {
        report += `### ${plan.migration}\n`;
        report += '**Risks:**\n';
        plan.risks.forEach(risk => {
          report += `- ${risk}\n`;
        });
        if (plan.dependencies.length > 0) {
          report += '**Dependencies:**\n';
          plan.dependencies.forEach(dep => {
            report += `- ${dep}\n`;
          });
        }
        report += '\n';
      });
    }

    if (safeMigrations.length > 0) {
      report += '## ✅ Safe Migrations (Can Rollback)\n\n';
      safeMigrations.forEach(plan => {
        report += `### ${plan.migration}\n`;
        if (plan.rollbackSQL) {
          report += '**Generated Rollback SQL:**\n';
          report += '```sql\n';
          report += plan.rollbackSQL;
          report += '\n```\n\n';
        }
        if (plan.dependencies.length > 0) {
          report += '**Dependencies to consider:**\n';
          plan.dependencies.forEach(dep => {
            report += `- ${dep}\n`;
          });
          report += '\n';
        }
      });
    }

    return report;
  }
}

// CLI usage
async function main() {
  const migrationFile = process.argv[2];
  
  try {
    logger.info('🔄 Analyzing rollback safety...\n');
    
    const analyzer = new RollbackAnalyzer();
    const report = await analyzer.generateRollbackReport(migrationFile);
    
    logger.info(report);
    
  } catch (error) {
    logger.error('❌ Rollback analysis failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { RollbackAnalyzer };
