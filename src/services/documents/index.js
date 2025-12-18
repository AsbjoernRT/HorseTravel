// Barrel export for certificate/document services
// This enables cleaner imports: import { uploadCertificate, getCertificates } from '../services/documents';

// Core certificate operations (upload, get, delete, update)
export * from './certificateService';

// AI-powered extraction
export * from './certificateParserService';

// Entity synchronization (sync to vehicle/organization)
export * from './certificateSyncService';

// Compliance checking (map certificates to transport requirements)
export * from './certificateComplianceService';
