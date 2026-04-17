import { Platform } from 'react-native';

const DEFAULT_LOCAL = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

// Populated at build time by Metro from .env / env var. Fallback to local dev default.
declare const process: { env: Record<string, string | undefined> };
export const API_BASE_URL: string = process.env.API_BASE_URL || `${DEFAULT_LOCAL}/api/v1`;
