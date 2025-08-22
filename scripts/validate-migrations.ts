#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { logger } from '@/lib/services/logger';

// Load environment variables
config({ path: '.env.local' });

interface MigrationFile {
  filename: string;
  timestamp: string;
  description: string;
  content: string;
  isReversible: boolean;
  hasTransaction: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  migrations: MigrationFile[];
}

class MigrationValidator {
  private supabase;
  private migrationsPath = './supabase/migrations';

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials. Please check your environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async validateMigrations(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      migrations: []
    };

    try {
      // Get all migration files
      const migrationFiles = this.getMigrationFiles();
      result.migrations = migrationFiles;

      // Validate each migration
      for (const migration of migrationFiles) {
        await this.validateSingleMigration(migration, result);
      }

      // Check migration order and naming
      this.validateMigrationOrder(migrationFiles, result);

      // Validate against current database state
      await this.validateDatabaseState(result);

      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  private getMigrationFiles(): MigrationFile[] {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      return files.map(filename => {
        const content = readFileSync(join(this.migrationsPath, filename), 'utf8');
        const parts = filename.replace('.sql', '').split('_');
        const timestamp = parts[0];
        const description = parts.slice(1).join('_');

        return {
          filename,
          timestamp,
          description,
          content,
          isReversible: this.checkReversibility(content),
          hasTransaction: this.checkTransaction(content)
        };
      });
    } catch (error) {
      throw new Error(`Failed to read migration files: ${error}`);
    }
  }

  private checkReversibility(content: string): boolean {
    const dangerousOperations = [
      'DROP TABLE',
      'DROP COLUMN',
      'DELETE FROM',
      'TRUNCATE',
      'ALTER TABLE.*DROP'
    ];

    return !dangerousOperations.some(op => 
      new RegExp(op, 'i').test(content)
    );
  }

  private checkTransaction(content: string): boolean {
    return content.includes('BEGIN;') && content.includes('COMMIT;');
  }

  private async validateSingleMigration(migration: MigrationFile, result: ValidationResult) {
    // Check naming convention
    if (!/^\d{8}_/.test(migration.filename)) {
      result.errors.push(`Invalid naming: ${migration.filename} should start with YYYYMMDD_`);
    }

    // Check for dangerous operations without transactions
    if (!migration.isReversible && !migration.hasTransaction) {
      result.warnings.push(`${migration.filename} contains irreversible operations without explicit transaction`);
    }

    // Check SQL syntax (basic validation)
    if (!this.validateSQLSyntax(migration.content)) {
      result.errors.push(`${migration.filename} contains potential SQL syntax errors`);
    }

    // Check for missing dependencies
    const dependencies = this.extractDependencies(migration.content);
    for (const dep of dependencies) {
      if (!await this.checkTableExists(dep)) {
        result.warnings.push(`${migration.filename} references table '${dep}' which may not exist`);
      }
    }
  }

  private validateSQLSyntax(content: string): boolean {
    // Basic SQL syntax validation
    const sqlStatements = content.split(';').filter(stmt => stmt.trim());
    
    for (const statement of sqlStatements) {
      const trimmed = statement.trim().toUpperCase();
      
      // Check for balanced parentheses
      const openParens = (statement.match(/\(/g) || []).length;
      const closeParens = (statement.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        return false;
      }

      // Check for common SQL keywords at start
      const validStartKeywords = [
        'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 
        'SELECT', 'GRANT', 'REVOKE', 'BEGIN', 'COMMIT', 'ROLLBACK',
        '--', '/*', 'SET', 'TRUNCATE'
      ];
      
      if (trimmed && !validStartKeywords.some(keyword => trimmed.startsWith(keyword))) {
        return false;
      }
    }

    return true;
  }

  private extractDependencies(content: string): string[] {
    const tableReferences: string[] = [];
    
    // Extract table references from common patterns
    const patterns = [
      /REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
      /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
      /JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
      /ALTER\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        tableReferences.push(match[1]);
      }
    });

    return [...new Set(tableReferences)];
  }

  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', tableName)
        .eq('table_schema', 'public');

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }

  private validateMigrationOrder(migrations: MigrationFile[], result: ValidationResult) {
    for (let i = 1; i < migrations.length; i++) {
      const prev = migrations[i - 1];
      const current = migrations[i];

      if (current.timestamp <= prev.timestamp) {
        result.errors.push(`Migration order issue: ${current.filename} should have a timestamp after ${prev.filename}`);
      }
    }
  }

  private async validateDatabaseState(result: ValidationResult) {
    try {
      // Check if migrations table exists
      const { data: migrationTable } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'schema_migrations')
        .eq('table_schema', 'public');

      if (!migrationTable || migrationTable.length === 0) {
        result.warnings.push('No schema_migrations table found. Database may not be properly initialized.');
        return;
      }

      // Get applied migrations from database
      const { data: appliedMigrations, error } = await this.supabase
        .from('schema_migrations')
        .select('version')
        .order('version');

      if (error) {
        result.warnings.push(`Could not fetch applied migrations: ${error.message}`);
        return;
      }

      // Compare with file system migrations
      const fileMigrations = result.migrations.map(m => m.timestamp);
      const dbMigrations = appliedMigrations?.map(m => m.version) || [];

      // Find missing migrations
      const missingInDb = fileMigrations.filter(version => !dbMigrations.includes(version));
      const missingInFiles = dbMigrations.filter(version => !fileMigrations.includes(version));

      if (missingInDb.length > 0) {
        result.warnings.push(`Migrations in files but not in DB: ${missingInDb.join(', ')}`);
      }

      if (missingInFiles.length > 0) {
        result.warnings.push(`Migrations in DB but missing files: ${missingInFiles.join(', ')}`);
      }

    } catch (error) {
      result.warnings.push(`Database state validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateReport(): Promise<string> {
    const validation = await this.validateMigrations();
    
    let report = '# Migration Validation Report\n\n';
    report += `**Status:** ${validation.isValid ? '✅ VALID' : '❌ INVALID'}\n`;
    report += `**Migrations Found:** ${validation.migrations.length}\n\n`;

    if (validation.errors.length > 0) {
      report += '## ❌ Errors\n';
      validation.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }

    if (validation.warnings.length > 0) {
      report += '## ⚠️ Warnings\n';
      validation.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }

    report += '## 📋 Migration Summary\n';
    validation.migrations.forEach(migration => {
      const status = migration.isReversible ? '✅' : '⚠️';
      const transaction = migration.hasTransaction ? 'TX' : 'NO-TX';
      report += `- ${status} **${migration.filename}** (${transaction}) - ${migration.description}\n`;
    });

    return report;
  }
}

// CLI usage
async function main() {
  try {
    logger.info('🔍 Starting migration validation...\n');
    
    const validator = new MigrationValidator();
    const report = await validator.generateReport();
    
    logger.info(report);
    
    const validation = await validator.validateMigrations();
    process.exit(validation.isValid ? 0 : 1);
    
  } catch (error) {
    logger.error('❌ Validation failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MigrationValidator };
