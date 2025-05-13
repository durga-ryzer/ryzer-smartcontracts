import { ethers } from 'ethers';
import { logger } from './logger';

/**
 * Verify an Ethereum signature
 * @param address Ethereum address that supposedly signed the message
 * @param signature The signature to verify
 * @param message The original message that was signed
 * @returns True if the signature is valid, false otherwise
 */
export const verifySignature = async (
  address: string,
  signature: string,
  message: string
): Promise<boolean> => {
  try {
    // Normalize the address
    const normalizedAddress = address.toLowerCase();
    
    // Recover the address from the signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature).toLowerCase();
    
    // Check if the recovered address matches the expected address
    return recoveredAddress === normalizedAddress;
  } catch (error) {
    logger.error('Error verifying signature:', error);
    return false;
  }
};

/**
 * Generate a random hex string
 * @param length Length of the hex string (number of bytes)
 * @returns Random hex string
 */
export const generateRandomHex = (length: number = 32): string => {
  try {
    return ethers.utils.hexlify(ethers.utils.randomBytes(length));
  } catch (error) {
    logger.error('Error generating random hex:', error);
    // Fallback to a less secure but functional method
    return '0x' + [...Array(length * 2)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  }
};

/**
 * Hash a message using keccak256
 * @param message Message to hash
 * @returns Hashed message
 */
export const hashMessage = (message: string): string => {
  try {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
  } catch (error) {
    logger.error('Error hashing message:', error);
    throw error;
  }
};

/**
 * Create a typed data signature (EIP-712)
 * @param domain Domain data
 * @param types Type definitions
 * @param value The data to sign
 * @param privateKey Private key to sign with
 * @returns Signature
 */
export const signTypedData = async (
  domain: any,
  types: any,
  value: any,
  privateKey: string
): Promise<string> => {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet._signTypedData(domain, types, value);
  } catch (error) {
    logger.error('Error signing typed data:', error);
    throw error;
  }
};

/**
 * Encrypt data using a public key
 * @param data Data to encrypt
 * @param publicKey Public key to encrypt with
 * @returns Encrypted data
 */
export const encryptWithPublicKey = async (
  data: string,
  publicKey: string
): Promise<string> => {
  try {
    // This is a placeholder - in a real implementation, you would use a proper encryption library
    // For example, you could use ecies-js or a similar library
    return ethers.utils.base64.encode(ethers.utils.toUtf8Bytes(data));
  } catch (error) {
    logger.error('Error encrypting data:', error);
    throw error;
  }
};

/**
 * Decrypt data using a private key
 * @param encryptedData Encrypted data
 * @param privateKey Private key to decrypt with
 * @returns Decrypted data
 */
export const decryptWithPrivateKey = async (
  encryptedData: string,
  privateKey: string
): Promise<string> => {
  try {
    // This is a placeholder - in a real implementation, you would use a proper decryption library
    return ethers.utils.toUtf8String(ethers.utils.base64.decode(encryptedData));
  } catch (error) {
    logger.error('Error decrypting data:', error);
    throw error;
  }
};
