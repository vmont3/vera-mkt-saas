import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to rotate critical secrets and generate a new secure .env file
 * This addresses the "Secrets in History" finding by ensuring new deployments use fresh keys.
 */

const generateSecret = (length = 64) => {
    return crypto.randomBytes(length).toString('hex');
};

const generateRSAKeyPair = () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return {
        privateKey: Buffer.from(privateKey).toString('base64'),
        publicKey: Buffer.from(publicKey).toString('base64')
    };
};

const rotateSecrets = () => {
    console.log('🔄 Rotating Secrets...');

    const jwtKeys = generateRSAKeyPair();

    const newSecrets = {
        JWT_PRIVATE_KEY: jwtKeys.privateKey,
        JWT_PUBLIC_KEY: jwtKeys.publicKey,
        JWT_SECRET: generateSecret(32),
        AUDIT_SECRET: generateSecret(32),
        SESSION_SECRET: generateSecret(32),
        API_KEY_SALT: generateSecret(16)
    };

    const envPath = path.join(__dirname, '../.env.rotated');
    let envContent = '';

    // Read existing .env if exists to preserve non-secret values
    try {
        const currentEnv = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
        envContent = currentEnv;
    } catch (e) {
        console.log('⚠️ No existing .env found, creating fresh.');
    }

    // Replace or Append
    Object.entries(newSecrets).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
    });

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Secrets rotated! New file created at: ${envPath}`);
    console.log('⚠️ ACTION REQUIRED: Replace your production .env with .env.rotated');
    console.log('⚠️ ACTION REQUIRED: If using Git, ensure .env is in .gitignore (it is).');
    console.log('⚠️ ACTION REQUIRED: To clean git history, run: java -jar bfg.jar --replace-text secrets.txt');
};

rotateSecrets();
