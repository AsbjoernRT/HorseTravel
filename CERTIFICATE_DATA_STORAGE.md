# Certificate Data Storage & Logging

## Overview

When a certificate image is uploaded with AI extraction enabled, the data flows through multiple storage locations for different purposes.

## Data Flow

```
Upload Image → AI Extraction → Store in Multiple Locations → Validate → Notify User
```

## Storage Locations

### 1. **Firebase Storage (File + Metadata)**
**Path:** `certificates/{entityType}/{entityId}/{timestamp}_{filename}`

**Purpose:** Store the actual certificate image file WITH custom metadata

**Example:**
```
certificates/organization/4ZhrRM2Q4Izcz12id7Rm/1763402542062_IMG_2628.heic
```

**Custom Metadata Stored:**
```javascript
{
  // Standard metadata
  contentType: "image/heic",

  // Custom metadata (searchable!)
  customMetadata: {
    entityType: "organization",
    entityId: "4ZhrRM2Q4Izcz12id7Rm",
    uploadedBy: "user_uid_123",
    certificateType: "Billede",

    // Extracted data summary (if AI extraction succeeded)
    hasExtractedData: "true",
    companyName: "Horse Transport IO",
    authNumber: "DK-2024-001",
    journeyType: "TYPE_2",
    expiryDate: "2025-12-31",
    issueDate: "2024-01-01"
  }
}
```

**Why Storage Metadata?**
- ✅ Searchable without downloading the file
- ✅ Fast queries for expiring certificates
- ✅ No need to query Firestore just to check basic info
- ✅ Redundancy - data is backed up in multiple places

---

### 2. **Firestore: `certificates` Collection**
**Path:** `certificates/{certificateId}`

**Purpose:** Store certificate metadata and extracted data

**Document Structure:**
```javascript
{
  // File metadata
  id: "cert_abc123",
  fileName: "IMG_2628.heic",
  fileSize: 4670633,
  mimeType: "image/heic",
  storagePath: "certificates/organization/...",
  downloadURL: "https://firebasestorage...",

  // Entity reference
  entityType: "organization",  // or "vehicle"
  entityId: "4ZhrRM2Q4Izcz12id7Rm",

  // Tracking
  uploadedAt: Timestamp,
  uploadedBy: "user_uid_123",

  // Certificate type
  certificateType: "Billede",  // or "PDF"

  // AI EXTRACTED DATA (if available)
  extractedData: {
    company_authorisation_id: "AUTH-12345",
    company: {
      name: "Horse Transport IO",
      address: {
        street: "Hovedgaden 1",
        postal_code: "8000",
        city: "Aarhus",
        country: "Denmark"
      },
      contact: {
        phone: "+45 12345678",
        email: "contact@horsetransport.dk"
      }
    },
    authorisation: {
      authorisation_number: "DK-2024-001",
      journey_type: "TYPE_2",
      animal_categories: ["Horses"],
      transport_modes: ["Road"],
      issue_date: "2024-01-01",
      expiry_date: "2025-12-31"
    },
    issuing_authority: {
      name: "Fødevarestyrelsen",
      address: "Stationsparken 31-33, 2600 Glostrup",
      contact: {
        phone: "+45 72 27 69 00",
        fax: null,
        email: "info@fvst.dk"
      },
      official_name: "John Doe"
    },
    meta: {
      document_language: "da",
      notes: null
    }
  }
}
```

---

### 3. **Firestore: Organization `companyAuthorization` Field**
**Path:** `organizations/{organizationId}`

**Purpose:** Store the CURRENT/ACTIVE authorization for the organization

**Field Structure:**
```javascript
{
  companyAuthorization: {
    // All extracted data from above
    ...extractedData,

    // Tracking
    lastUpdated: Timestamp,
    source: "ai_extraction"
  }
}
```

**Why:** Quick access to current authorization status without querying certificates

---

### 4. **Firestore: Organization Authorization History**
**Path:** `organizations/{organizationId}/authorizations/{authorizationNumber}`

**Purpose:** Keep historical record of all authorizations

**Document Structure:**
```javascript
{
  // All extracted data
  ...extractedData,

  // Tracking
  createdAt: Timestamp,
  status: "active",  // or "expired", "revoked"
}
```

**Why:**
- Track authorization changes over time
- Audit trail
- See when authorizations were updated

---

## Logging

### Console Logs

**Certificate Service:**
```javascript
[certificateService] Saving certificate to Firestore: {
  fileName: "IMG_2628.heic",
  entityType: "organization",
  entityId: "4ZhrRM2Q4Izcz12id7Rm",
  hasExtractedData: true
}

[certificateService] Certificate saved with ID: cert_abc123

[certificateService] Extracted data stored: {
  company: "Horse Transport IO",
  authNumber: "DK-2024-001",
  expiryDate: "2025-12-31"
}
```

**Certificate Uploader:**
```javascript
[CertUploader] Syncing extracted data to organization...

[CertUploader] Authorization warnings: [
  "Authorization expires in 25 days"
]
```

**Certificate Sync:**
```javascript
[certificateSync] Syncing data to organization: 4ZhrRM2Q4Izcz12id7Rm

[certificateSync] Successfully synced to organization

[certificateSync] Authorization expires in 25 days!
```

**Cloud Function:**
```javascript
Calling OpenAI Vision API...
Received response from OpenAI
Successfully parsed certificate data
```

---

## Validation & Warnings

After extraction, the system automatically validates:

### ✅ Valid Authorization
- All required fields present
- Expiry date > 90 days away
- Authorization number exists

### ⚠️ Warnings
- Expiry date < 90 days
- Missing optional fields
- Partial extraction

### ❌ Errors
- Authorization expired
- Missing authorization number
- Invalid journey type

---

## Querying the Data

### Get Current Organization Authorization
```javascript
import { getOrganizationAuthorization } from '../services/documents/certificateSyncService';

const auth = await getOrganizationAuthorization('orgId');
console.log(auth.authorisation.expiry_date);
```

### Get Authorization History
```javascript
import { getOrganizationAuthorizationHistory } from '../services/documents/certificateSyncService';

const history = await getOrganizationAuthorizationHistory('orgId');
console.log(`Found ${history.length} authorizations`);
```

### Get All Certificates
```javascript
import { getCertificates } from '../services/documents/certificateService';

const certs = await getCertificates('organization', 'orgId');
certs.forEach(cert => {
  if (cert.extractedData) {
    console.log('Has AI data:', cert.extractedData.company.name);
  }
});
```

---

## Summary

| Location | Purpose | Update Frequency | Data Stored |
|----------|---------|------------------|-------------|
| **Firebase Storage (file)** | Original image | Once (on upload) | Binary image file |
| **Firebase Storage (metadata)** | Searchable summary | Once (on upload) | Key extracted fields |
| **`certificates` collection** | Full certificate metadata | Once (on upload) | Complete extracted JSON |
| **Organization `companyAuthorization`** | Current active authorization | On new certificate upload | Latest extracted data |
| **Organization `authorizations` subcollection** | Historical records | Append only | All past authorizations |

**Key Point:** The extracted data is stored in **4 places** for different purposes:

1. **Storage Metadata** - Fast searchable summary (no file download needed)
2. **Certificates Collection** - Complete extracted data with file reference
3. **Organization Field** - Current active authorization (quick access)
4. **Authorization History** - Audit trail of all authorizations

### Why Store in Multiple Locations?

**Storage Metadata:**
- Search/filter files without downloading
- Fast expiry checks
- File-level information

**Firestore `certificates`:**
- Complete extracted data
- Link file to entity
- Rich querying

**Organization Profile:**
- Single source of truth for current auth
- No joins needed
- Fast validation checks

**Authorization History:**
- Compliance & auditing
- Track changes over time
- Rollback capability
