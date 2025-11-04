# Certificate Upload Feature

## Overview
The certificate upload feature allows users to store and manage certificates (PDFs and images) for both organizations and vehicles. This is useful for storing documents like:
- Insurance certificates
- Vehicle inspection reports (MOT/Syn)
- Registration documents
- Safety certifications
- Any other relevant documentation

## Features

### Upload Methods
1. **Take Photo** - Use device camera to capture certificate images
2. **Choose Image** - Select images from device photo library
3. **Upload PDF** - Select PDF documents from device storage

### File Management
- View all uploaded certificates with metadata
- Edit certificate information (name, type, notes)
- Delete certificates
- View file size and upload date
- Organize by certificate type

### Permissions
#### Organizations
- **Owner/Admin** - Can upload, edit, and delete certificates
- **Members** - Can view certificates

#### Vehicles
- **Private Mode** - Only vehicle owner can manage certificates
- **Organization Mode** - Members with "canManageVehicles" permission can manage certificates

## Technical Implementation

### Components
- **CertificateUploader** (`src/components/CertificateUploader.js`)
  - Main component for certificate management
  - Handles file picking, uploading, and display
  - Manages modals for upload options and editing

### Services
- **certificateService** (`src/services/documents/certificateService.js`)
  - `uploadCertificate()` - Uploads file to Firebase Storage and creates metadata
  - `getCertificates()` - Retrieves all certificates for an entity
  - `deleteCertificate()` - Removes certificate from storage and database
  - `updateCertificateMetadata()` - Updates certificate information

### Storage Structure
```
certificates/
├── organization/
│   └── {organizationId}/
│       └── {timestamp}_{filename}
└── vehicle/
    └── {vehicleId}/
        └── {timestamp}_{filename}
```

### Database Structure (Firestore)
Collection: `certificates`
```javascript
{
  id: "certificateId",
  fileName: "certificate.pdf",
  displayName: "Insurance Certificate 2025",
  fileSize: 1024000,
  mimeType: "application/pdf",
  storagePath: "certificates/vehicle/{vehicleId}/...",
  downloadURL: "https://...",
  entityType: "vehicle" | "organization",
  entityId: "vehicleId" | "organizationId",
  certificateType: "Insurance" | "Inspection" | "Custom",
  notes: "Optional notes",
  uploadedAt: Timestamp,
  updatedAt: Timestamp
}
```

## Security

### Firebase Storage Rules
- Authenticated users only
- File size limit: 10MB
- Allowed types: Images (image/*) and PDFs (application/pdf)
- Organization certificates: Members can read, Admins can write
- Vehicle certificates: Based on vehicle ownership and permissions

### Firestore Rules
- Read access based on organization membership or vehicle ownership
- Write access based on role and permissions
- Secure deletion requires proper authorization

## Usage

### Organization Details Screen
```javascript
<CertificateUploader
  entityType="organization"
  entityId={organizationId}
  canManage={isOwnerOrAdmin}
/>
```

### Vehicle Management Screen
- Click the document icon on any vehicle card
- Opens modal with certificate management
- Upload, view, edit, or delete certificates

## Permissions Setup

### Required Permissions
**iOS** (app.json):
```json
{
  "infoPlist": {
    "NSCameraUsageDescription": "HorseTravel bruger dit kamera til at tage billeder af certifikater.",
    "NSPhotoLibraryUsageDescription": "HorseTravel har brug for adgang til dit fotobibliotek for at uploade certifikater."
  }
}
```

**Android** (app.json):
```json
{
  "permissions": [
    "CAMERA",
    "READ_EXTERNAL_STORAGE",
    "WRITE_EXTERNAL_STORAGE"
  ]
}
```

## Dependencies
- `expo-document-picker` - For PDF selection
- `expo-image-picker` - For image selection and camera
- `@react-native-firebase/storage` - For file storage
- `@react-native-firebase/firestore` - For metadata storage

## Deployment

After implementing this feature, deploy the security rules:
```bash
firebase deploy --only storage:rules
firebase deploy --only firestore:rules
```

## Future Enhancements
- [ ] Add certificate expiry date tracking
- [ ] Send notifications for expiring certificates
- [ ] Generate QR codes for certificate verification
- [ ] Add certificate templates
- [ ] Bulk download option
- [ ] Share certificates with other users
- [ ] OCR for automatic certificate data extraction
