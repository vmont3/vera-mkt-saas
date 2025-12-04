import { exec } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { apiLogger, securityLogger } from '../../utils/logger';

const execAsync = promisify(exec);

export interface BackupOptions {
    type: 'FULL' | 'INCREMENTAL';
    encrypt: boolean;
}

export interface BackupMetadata {
    id: string;
    timestamp: string;
    type: 'FULL' | 'INCREMENTAL';
    sizeBytes: number;
    checksum: string;
    encrypted: boolean;
    path: string;
}

export class BackupService {
    private static readonly BACKUP_DIR = path.join(process.cwd(), 'backups');
    private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
    private static readonly ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'default-insecure-key-change-me-32b'; // Must be 32 chars

    constructor() {
        this.ensureBackupDir();
    }

    private ensureBackupDir() {
        if (!fs.existsSync(BackupService.BACKUP_DIR)) {
            fs.mkdirSync(BackupService.BACKUP_DIR, { recursive: true });
        }
    }

    /**
     * Creates a database backup
     */
    async createBackup(options: BackupOptions = { type: 'FULL', encrypt: true }): Promise<BackupMetadata> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `backup-${options.type.toLowerCase()}-${timestamp}`;
        const filename = `${backupId}.sql`;
        const filePath = path.join(BackupService.BACKUP_DIR, filename);

        apiLogger.info(`Starting ${options.type} backup: ${backupId}`);

        try {
            // 1. Dump Database
            // Secure implementation using spawn to avoid shell injection
            const dbUrl = process.env.DATABASE_URL;
            if (!dbUrl) throw new Error('DATABASE_URL not configured');

            // Parse DB URL safely
            // Format: postgres://user:pass@host:port/dbname
            const url = new URL(dbUrl);

            // Construct arguments for pg_dump
            // We use PGPASSWORD env var for password to avoid leaking it in process list
            const env = { ...process.env, PGPASSWORD: url.password };

            const args = [
                '-h', url.hostname,
                '-p', url.port,
                '-U', url.username,
                '-F', 'p', // Plain text format
                '-f', filePath,
                url.pathname.substring(1) // Remove leading slash
            ];

            await new Promise<void>((resolve, reject) => {
                const { spawn } = require('child_process');
                const child = spawn('pg_dump', args, { env });

                child.on('exit', (code: number) => {
                    if (code === 0) resolve();
                    else reject(new Error(`pg_dump failed with code ${code}`));
                });

                child.on('error', (err: Error) => reject(err));
            });

            let finalPath = filePath;
            let isEncrypted = false;

            // 2. Encrypt if requested
            if (options.encrypt) {
                finalPath = await this.encryptFile(filePath);
                // Remove original plain file
                fs.unlinkSync(filePath);
                isEncrypted = true;
            }

            // 3. Calculate Checksum
            const checksum = await this.calculateChecksum(finalPath);
            const stats = fs.statSync(finalPath);

            const metadata: BackupMetadata = {
                id: backupId,
                timestamp: new Date().toISOString(),
                type: options.type,
                sizeBytes: stats.size,
                checksum,
                encrypted: isEncrypted,
                path: finalPath,
            };

            // 4. Save Metadata
            fs.writeFileSync(`${finalPath}.meta.json`, JSON.stringify(metadata, null, 2));

            // 5. Simulate Upload to Object Storage
            await this.uploadToObjectStorage(finalPath, metadata);

            securityLogger.info('Backup created successfully', { backupId, size: stats.size });
            return metadata;

        } catch (error) {
            apiLogger.error('Backup creation failed', { error });
            throw error;
        }
    }

    /**
     * Verifies backup integrity
     */
    async verifyBackup(backupId: string): Promise<boolean> {
        try {
            const files = fs.readdirSync(BackupService.BACKUP_DIR);
            const metaFile = files.find(f => f.startsWith(backupId) && f.endsWith('.meta.json'));

            if (!metaFile) throw new Error('Backup metadata not found');

            const metaPath = path.join(BackupService.BACKUP_DIR, metaFile);
            const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

            const currentChecksum = await this.calculateChecksum(metadata.path);

            if (currentChecksum !== metadata.checksum) {
                securityLogger.warn('Backup integrity check failed: Checksum mismatch', { backupId });
                return false;
            }

            return true;
        } catch (error) {
            apiLogger.error('Backup verification failed', { error });
            return false;
        }
    }

    /**
     * Restores a backup
     */
    async restoreBackup(backupId: string): Promise<void> {
        securityLogger.warn('Initiating Backup Restore', { backupId });

        try {
            const files = fs.readdirSync(BackupService.BACKUP_DIR);
            const metaFile = files.find(f => f.startsWith(backupId) && f.endsWith('.meta.json'));
            if (!metaFile) throw new Error('Backup metadata not found');

            const metaPath = path.join(BackupService.BACKUP_DIR, metaFile);
            const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

            let restorePath = metadata.path;

            // 1. Decrypt if needed
            if (metadata.encrypted) {
                restorePath = await this.decryptFile(metadata.path);
            }

            // 2. Restore Database
            const dbUrl = process.env.DATABASE_URL;
            if (!dbUrl) throw new Error('DATABASE_URL not configured');

            // WARNING: This overwrites the DB. In prod, we might want to restore to a temp DB first.
            const command = `psql "${dbUrl}" -f "${restorePath}"`;
            await execAsync(command);

            // Cleanup decrypted file if it was temporary
            if (metadata.encrypted) {
                fs.unlinkSync(restorePath);
            }

            securityLogger.info('Backup restored successfully', { backupId });

        } catch (error) {
            securityLogger.error('Backup restore failed', { error });
            throw error;
        }
    }

    async listBackups(): Promise<BackupMetadata[]> {
        const files = fs.readdirSync(BackupService.BACKUP_DIR);
        const metaFiles = files.filter(f => f.endsWith('.meta.json'));

        return metaFiles.map(f => {
            const content = fs.readFileSync(path.join(BackupService.BACKUP_DIR, f), 'utf-8');
            return JSON.parse(content);
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    private async encryptFile(filePath: string): Promise<string> {
        const outputPath = `${filePath}.enc`;
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(BackupService.ENCRYPTION_KEY, 'salt', 32);
        const cipher = crypto.createCipheriv(BackupService.ENCRYPTION_ALGORITHM, key, iv);

        const input = fs.createReadStream(filePath);
        const output = fs.createWriteStream(outputPath);

        // Write IV at the beginning of the file
        output.write(iv);

        return new Promise((resolve, reject) => {
            input.pipe(cipher).pipe(output)
                .on('finish', () => resolve(outputPath))
                .on('error', reject);
        });
    }

    private async decryptFile(filePath: string): Promise<string> {
        const outputPath = filePath.replace('.enc', '.restored');
        const key = crypto.scryptSync(BackupService.ENCRYPTION_KEY, 'salt', 32);

        return new Promise((resolve, reject) => {
            const input = fs.createReadStream(filePath);

            // Read IV first
            let iv: Buffer | null = null;

            input.once('readable', () => {
                iv = input.read(16);
                if (!iv) {
                    reject(new Error('Could not read IV from encrypted file'));
                    return;
                }

                const decipher = crypto.createDecipheriv(BackupService.ENCRYPTION_ALGORITHM, key, iv);
                const output = fs.createWriteStream(outputPath);

                input.pipe(decipher).pipe(output)
                    .on('finish', () => resolve(outputPath))
                    .on('error', reject);
            });
        });
    }

    private async calculateChecksum(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const input = fs.createReadStream(filePath);

            input.on('data', chunk => hash.update(chunk));
            input.on('end', () => resolve(hash.digest('hex')));
            input.on('error', reject);
        });
    }

    private async uploadToObjectStorage(filePath: string, metadata: BackupMetadata): Promise<void> {
        // Stub for IBM Cloud Object Storage / S3
        // In a real implementation, use aws-sdk or ibm-cos-sdk
        apiLogger.info('Simulating upload to Object Storage (Primary & Secondary regions)', {
            file: path.basename(filePath),
            size: metadata.sizeBytes
        });
    }
}
