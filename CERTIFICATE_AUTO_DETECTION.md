# Certificate Auto-Detection for Compliance

## Overview
The app now automatically detects uploaded certificates and uses them to auto-confirm compliance requirements! This makes it much easier for organizations to start transports since they only need to upload certificates once.

## How It Works

### 1. Certificate Upload
Organizations and vehicles can upload certificates through the existing `CertificateUploader` component:
- Navigate to Organization or Vehicle details
- Upload certificates (PDF or images)
- Name them appropriately (e.g., "Kompetencebevis", "Godkendelsescertifikat")

### 2. Automatic Mapping
When starting a transport, the system automatically:
1. Loads all certificates for the organization and selected vehicle
2. Matches certificate types/names to compliance requirements
3. Auto-confirms matching documents
4. Shows a success toast: "X dokument(er) auto-bekræftet fra uploadede certifikater"

### 3. Visual Indicators
Auto-confirmed documents show:
- ✅ Green checkmark (same as manual confirmation)
- 🔵 Blue "CERTIFIKAT" badge
- ℹ️ "Auto-bekræftet fra uploadet certifikat" message

## Certificate Type Mapping

### Base Documents
| Certificate Name | Auto-Confirms |
|-----------------|---------------|
| Hestepas / Pas / Passport | Hestepas |
| Registreringsattest / Registration | Registreringsattest |
| Godkendelsescertifikat / Approval Certificate | Godkendelsescertifikat |
| Autorisation / Authorization | Autorisation |

### Distance-Based Documents
| Certificate Name | Auto-Confirms |
|-----------------|---------------|
| Kompetencebevis / Competence Certificate | Kompetencebevis |

### Border Crossing Documents
| Certificate Name | Auto-Confirms |
|-----------------|---------------|
| Traces Certifikat / Traces Certificate / Traces | Traces Certifikat |

### Country-Specific Documents
| Certificate Name | Auto-Confirms |
|-----------------|---------------|
| Letter of Authority | Letter of Authority (France) |
| Egenförsäkran / Selvforsikring | Egenförsäkran (Sweden) |
| Tolddokument / Customs Document | Tolddokument (Norway) |
| ATA-Carnet / ATA Carnet | ATA-Carnet (Switzerland/UK) |
| Franske Klistermærker / French Stickers | Franske Klistermærker (France trucks) |

## Best Practices for Naming Certificates

### When Uploading
1. Use the **Display Name** field or **Certificate Type** field
2. Match the names from the table above as closely as possible
3. The system is case-insensitive and supports partial matching

### Examples
✅ Good names:
- "Kompetencebevis"
- "kompetencebevis"
- "Competence Certificate"
- "Traces Certificate"
- "Letter of Authority"

❌ Names that won't match:
- "Document1.pdf"
- "Scan_20231215.jpg"
- "Certificate" (too generic)

### Pro Tip
After uploading, use the edit button (📄 icon) to set a clear **Display Name** like "Kompetencebevis" even if the file is named something like "scan123.pdf".

## Expiry Date Handling

Certificates with expiry dates are automatically validated:
- Only **valid (non-expired)** certificates auto-confirm requirements
- Expired certificates are ignored
- If no expiry date is set, the certificate is considered valid

### Setting Expiry Dates
1. Upload certificate
2. Click edit button (📄 icon)
3. Add expiry date in notes or extracted data
4. System will check expiry when auto-confirming

## Organization vs Private Mode

### Organization Mode
- ✅ Auto-detection **enabled**
- Checks organization certificates + vehicle certificates
- Shows toast when certificates are found

### Private Mode
- ❌ Auto-detection **disabled**
- Users must manually confirm all documents
- Can still upload certificates for record-keeping

## User Flow Example

### Scenario: Organization Transport to France (> 65km)

**Step 1: Pre-Upload Certificates** (One-time setup)
1. Go to Organization Settings
2. Upload certificates:
   - Godkendelsescertifikat
   - Registreringsattest
   - Autorisation
   - Kompetencebevis
   - Letter of Authority
   - Traces Certifikat

**Step 2: Start Transport**
1. Enter route: København → Paris, France
2. Select vehicle (truck)
3. System calculates: 1,100 km, border crossing detected
4. Compliance requirements appear:
   - 7 total documents required
   - 6 auto-confirmed instantly! ✨
   - Only "Franske Klistermærker" needs manual confirmation

**Step 3: Final Confirmation**
1. Check the "Franske Klistermærker" box manually
2. Start transport - all requirements met!

## Technical Details

### New Files
1. **`src/services/certificateComplianceService.js`**
   - Core auto-detection logic
   - Certificate-to-requirement mapping
   - Expiry validation

### Modified Files
1. **`src/screens/StartTransportScreen.js`**
   - Calls auto-detection when route calculated
   - Merges auto-confirmed with manual confirmations
   - Shows loading state and success toast

2. **`src/components/ComplianceChecklist.js`**
   - Accepts `autoConfirmedDocuments` prop
   - Shows blue "CERTIFIKAT" badge
   - Displays auto-confirmation message

### Key Functions

```javascript
// Get auto-confirmed documents
const autoConfirmed = await getAutoConfirmedDocuments(
  requirements,
  organizationId,
  vehicleId
);

// Get certificate coverage summary
const coverage = await getCertificateCoverage(
  requirements,
  confirmedDocuments,
  organizationId,
  vehicleId
);
```

## Debugging

### Check if Certificates Are Detected
1. Upload certificate
2. Set clear display name
3. Start a transport
4. Watch for toast message: "X dokument(er) auto-bekræftet..."

### Certificate Not Detected?
Check:
- ✅ Certificate display name matches mapping table
- ✅ Certificate not expired
- ✅ In organization mode (not private)
- ✅ Certificate uploaded to organization or selected vehicle

### Console Logging
Enable console logs to debug:
```javascript
console.log('Auto-confirmed documents:', autoConfirmed);
console.log('All certificates:', allCertificates);
```

## Benefits

### For Users
- ⏱️ **Faster**: No need to manually check documents every time
- 🎯 **Accurate**: Certificates are validated automatically
- 📱 **Convenient**: Upload once, use many times
- ✅ **Compliant**: Never forget required documents

### For Organizations
- 📋 **Centralized**: Manage all certificates in one place
- 🔄 **Reusable**: Certificates work across all transports
- 📊 **Trackable**: See which certificates are used
- ⏰ **Expiry Alerts**: System tracks certificate validity

## Future Enhancements

Potential improvements:
- [ ] Push notifications when certificates expire
- [ ] Bulk certificate upload
- [ ] Certificate templates for common types
- [ ] Integration with external certificate providers
- [ ] AI extraction of expiry dates from images
- [ ] Certificate sharing between organizations
- [ ] QR code scanning for certificates

## Summary

The certificate auto-detection system makes compliance effortless:
1. **Upload** certificates to organization/vehicle
2. **Start** a transport
3. **Done** - documents auto-confirmed!

This feature leverages your existing certificate infrastructure to streamline the transport compliance process. 🎉
