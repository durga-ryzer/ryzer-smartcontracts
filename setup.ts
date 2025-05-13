import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Colors for console output
const colors: { [key: string]: string } = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

// Helper function to run commands and handle errors
function runCommand(command: string, cwd: string = process.cwd()): boolean {
  try {
    console.log(`${colors.yellow}> ${command}${colors.reset}`);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error: unknown) {
    console.error(`${colors.red}Error executing command: ${command}${colors.reset}`);
    return false;
  }
}

// Install root dependencies
console.log(`${colors.bright}Installing root dependencies...${colors.reset}`);
if (!runCommand('npm ci')) {
  process.exit(1);
}

// Install backend dependencies
console.log(`${colors.bright}Installing backend dependencies...${colors.reset}`);
if (!runCommand('npm ci', path.join(process.cwd(), 'backend'))) {
  process.exit(1);
}

// Install frontend dependencies
console.log(`${colors.bright}Installing frontend dependencies...${colors.reset}`);
if (!runCommand('npm ci', path.join(process.cwd(), 'frontend'))) {
  process.exit(1);
}

// Create .env file if it doesn't exist
const envPath: string = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log(`${colors.bright}Creating .env file for production...${colors.reset}`);
  const envContent: string = `# Server Configuration
PORT=5000
NODE_ENV=production

# Frontend Configuration
NEXT_PUBLIC_API_URL=/api
`;
  fs.writeFileSync(envPath, envContent);
  console.log(`${colors.green}.env file created${colors.reset}`);
}

console.log(`${colors.bright}${colors.green}Production setup completed successfully!${colors.reset}`);