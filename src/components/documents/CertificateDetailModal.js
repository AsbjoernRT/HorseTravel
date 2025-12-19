import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Sparkles, Edit3, Save, Calendar } from 'lucide-react-native';
import { colors } from '../../styles/theme';
import { extractCertificateData } from '../../services/documents/certificateParserService';
import { updateCertificateData } from '../../services/documents/certificateService';
import Toast from 'react-native-toast-message';

// Helper to parse date string (DD-MM-YYYY) to Date object
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  // Handle various formats
  const formats = [
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
  ];

  for (const regex of formats) {
    const match = dateStr.match(regex);
    if (match) {
      if (regex === formats[0]) {
        // DD-MM-YYYY
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      } else {
        // YYYY-MM-DD
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }
    }
  }
  return null;
};

// Helper to format Date to DD-MM-YYYY string
const formatDate = (date) => {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const CertificateDetailModal = ({ visible, certificate, onClose, onUpdate, entityType, entityData }) => {
  const [extracting, setExtracting] = useState(false);
  const [mode, setMode] = useState(null); // null | 'extract' | 'manual' | 'view'
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Date picker state
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);

  // General fields
  const [displayName, setDisplayName] = useState('');
  const [documentType, setDocumentType] = useState(''); // What type of document (Autorisation, Hestepas, etc.)
  const [notes, setNotes] = useState('');

  // Generic certificate fields (work for all document types)
  const [holderName, setHolderName] = useState(''); // Company/Vehicle/Horse name
  const [certificateNumber, setCertificateNumber] = useState(''); // Auth number, passport number, reg number, etc.
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState(''); // Any document-specific details

  // Document type options - filtered based on entity type
  const ALL_DOCUMENT_TYPES = {
    organization: [
      { value: '', label: 'Vælg dokumenttype...' },
      { value: 'Autorisation', label: 'Autorisation (Virksomhed)' },
      { value: 'Godkendelsescertifikat', label: 'Godkendelsescertifikat' },
      { value: 'Letter of Authority', label: 'Letter of Authority (UK)' },
      { value: 'Egenförsäkran', label: 'Egenförsäkran (Sverige)' },
      { value: 'Kompetencebevis', label: 'Kompetencebevis' },
    ],
    vehicle: [
      { value: '', label: 'Vælg dokumenttype...' },
      { value: 'Registreringsattest', label: 'Registreringsattest' },
      { value: 'Godkendelsescertifikat', label: 'Godkendelsescertifikat' },
      { value: 'Autorisation', label: 'Autorisation (Køretøj)' },
    ],
    horse: [
      { value: '', label: 'Vælg dokumenttype...' },
      { value: 'Hestepas', label: 'Hestepas / Horse Passport' },
      { value: 'Traces Certifikat', label: 'Traces Certifikat' },
      { value: 'Tolddokument', label: 'Tolddokument (Hest)' },
      { value: 'ATA-Carnet', label: 'ATA-Carnet' },
    ],
  };

  // Get document types for current entity type
  const DOCUMENT_TYPES = ALL_DOCUMENT_TYPES[entityType] || ALL_DOCUMENT_TYPES.organization;

  // Reset form state when modal opens/closes or certificate changes
  React.useEffect(() => {
    if (!visible) {
      // Reset all state when modal closes
      setMode(null);
      setIsEditing(false);
      setDisplayName('');
      setDocumentType('');
      setNotes('');
      setHolderName('');
      setCertificateNumber('');
      setIssueDate('');
      setExpiryDate('');
      setAdditionalInfo('');
      setShowIssueDatePicker(false);
      setShowExpiryDatePicker(false);
      return;
    }

    if (certificate) {
      console.log('[CertDetailModal] Initializing with certificate:', certificate.id);
      console.log('[CertDetailModal] Has extractedData:', !!certificate.extractedData);

      setDisplayName(certificate.displayName || certificate.fileName || '');
      setDocumentType(certificate.documentType || certificate.extractedData?.document_type || '');
      setNotes(certificate.notes || '');

      // If certificate already has extracted data, pre-fill form and set to view mode
      if (certificate.extractedData) {
        const data = certificate.extractedData;
        console.log('[CertDetailModal] ExtractedData keys:', Object.keys(data));

        // Check for new flat structure first (generic fields)
        if (data.holder_name || data.certificate_number || data.expiry_date) {
          console.log('[CertDetailModal] Using flat structure');
          setHolderName(data.holder_name || '');
          setCertificateNumber(data.certificate_number || '');
          setIssueDate(data.issue_date || '');
          setExpiryDate(data.expiry_date || '');
          setAdditionalInfo(data.additional_info || '');
          setMode('view');
        }
        // Map old nested data structure to new generic fields
        else if (data.company) {
          console.log('[CertDetailModal] Using company structure');
          setHolderName(data.company.name || '');
          setCertificateNumber(data.authorisation?.authorisation_number || '');
          setIssueDate(data.authorisation?.issue_date || '');
          setExpiryDate(data.authorisation?.expiry_date || '');
          setAdditionalInfo(data.authorisation?.journey_type ? `Rejsetype: ${data.authorisation.journey_type}` : '');
          setMode('view');
        } else if (data.vehicle) {
          console.log('[CertDetailModal] Using vehicle structure');
          const vehicleInfo = `${data.vehicle.make || ''} ${data.vehicle.model || ''}`.trim();
          setHolderName(data.vehicle.registration_number || vehicleInfo);
          setCertificateNumber(data.certificate?.certificate_number || '');
          setExpiryDate(data.certificate?.expiry_date || '');
          setAdditionalInfo(data.vehicle.vin ? `VIN: ${data.vehicle.vin}` : '');
          setMode('view');
        } else if (data.horse) {
          console.log('[CertDetailModal] Using horse structure');
          setHolderName(data.horse?.name || '');
          setCertificateNumber(data.horse?.passport_number || '');
          setExpiryDate(data.horse?.expiry_date || '');
          setAdditionalInfo(data.horse?.chip_number ? `Chip: ${data.horse.chip_number}` : '');
          setMode('view');
        } else {
          console.log('[CertDetailModal] No matching structure found, mode stays null');
        }
      } else {
        console.log('[CertDetailModal] No extractedData, showing action buttons');
      }
    }
  }, [certificate, visible]);

  if (!certificate) return null;

  const handleExtractData = async () => {
    try {
      setExtracting(true);
      setMode('extract');

      Toast.show({
        type: 'info',
        text1: 'Udtrækker data...',
        text2: 'Dette kan tage op til 2 minutter',
      });

      const downloadUrl = certificate.downloadURL || certificate.downloadUrl;
      if (!downloadUrl) {
        throw new Error('Intet billede tilgængeligt for udtrækning');
      }

      // Extract data using AI
      const extractedData = await extractCertificateData(downloadUrl, entityType);

      // Pre-fill form based on entity type
      if (entityType === 'organization' && extractedData.company) {
        setHolderName(extractedData.company.name || '');
        setCertificateNumber(extractedData.authorisation?.authorisation_number || '');
        setIssueDate(extractedData.authorisation?.issue_date || '');
        setExpiryDate(extractedData.authorisation?.expiry_date || '');
        setAdditionalInfo(extractedData.authorisation?.journey_type ? `Rejsetype: ${extractedData.authorisation.journey_type}` : '');
      } else if (entityType === 'vehicle' && extractedData.vehicle) {
        const vehicleInfo = `${extractedData.vehicle.make || ''} ${extractedData.vehicle.model || ''}`.trim();
        setHolderName(extractedData.vehicle.registration_number || vehicleInfo);
        setCertificateNumber(extractedData.certificate?.certificate_number || '');
        setExpiryDate(extractedData.certificate?.expiry_date || '');
        setAdditionalInfo(extractedData.vehicle.vin ? `VIN: ${extractedData.vehicle.vin}` : '');
      } else if (entityType === 'horse' && extractedData.horse) {
        setHolderName(extractedData.horse?.name || '');
        setCertificateNumber(extractedData.horse?.passport_number || '');
        setExpiryDate(extractedData.horse?.expiry_date || '');
        setAdditionalInfo(extractedData.horse?.chip_number ? `Chip: ${extractedData.horse.chip_number}` : '');
      }

      Toast.show({
        type: 'success',
        text1: 'Data udtrukket!',
        text2: 'Gennemse og rediger før du gemmer',
      });
    } catch (error) {
      console.error('[CertDetailModal] Extraction error:', error);
      Toast.show({
        type: 'error',
        text1: 'Udtrækning fejlede',
        text2: error.message || 'Prøv igen eller indtast manuelt',
      });
      setMode(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleManualEntry = () => {
    setMode('manual');

    // Pre-populate with entity data if available
    console.log('[CertDetailModal] Entity data:', entityData);
    console.log('[CertDetailModal] Entity type:', entityType);

    if (entityData) {
      if (entityType === 'organization' && entityData.name) {
        console.log('[CertDetailModal] Pre-filling organization name:', entityData.name);
        setHolderName(entityData.name);
      } else if (entityType === 'vehicle') {
        console.log('[CertDetailModal] Pre-filling vehicle data:', entityData);
        const vehicleInfo = `${entityData.make || ''} ${entityData.model || ''}`.trim();
        setHolderName(entityData.licensePlate || vehicleInfo);
        if (entityData.vin) setAdditionalInfo(`VIN: ${entityData.vin}`);
      } else if (entityType === 'horse' && entityData.name) {
        console.log('[CertDetailModal] Pre-filling horse name:', entityData.name);
        setHolderName(entityData.name);
        if (entityData.chipNumber) setAdditionalInfo(`Chip: ${entityData.chipNumber}`);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // If no mode selected, just save name and notes
      if (!mode) {
        await updateCertificateData(certificate.id, {
          displayName: displayName || certificate.fileName,
          documentType: documentType,
          notes: notes,
        });

        Toast.show({
          type: 'success',
          text1: 'Gemt!',
          text2: 'Ændringer er gemt',
        });

        if (onUpdate) onUpdate();
        onClose();
        return;
      }

      // If in view mode and editing, save the edited data
      if (mode === 'view' && isEditing) {
        const extractedData = {
          document_type: documentType,
          holder_name: holderName,
          certificate_number: certificateNumber,
          issue_date: issueDate,
          expiry_date: expiryDate,
          additional_info: additionalInfo,
        };

        await updateCertificateData(certificate.id, {
          displayName: displayName || certificate.fileName,
          documentType: documentType,
          notes: notes,
          extractedData,
          hasExtractedData: true,
          extractedAt: new Date().toISOString(),
        });

        Toast.show({
          type: 'success',
          text1: 'Opdateret!',
          text2: 'Ændringerne er gemt',
        });

        if (onUpdate) onUpdate();
        onClose();
        return;
      }

      // If mode selected (extract/manual), save everything including certificate data
      const extractedData = {
        document_type: documentType,
        holder_name: holderName,
        certificate_number: certificateNumber,
        issue_date: issueDate,
        expiry_date: expiryDate,
        additional_info: additionalInfo,
      };

      await updateCertificateData(certificate.id, {
        displayName: displayName || certificate.fileName,
        documentType: documentType,
        notes: notes,
        extractedData,
        hasExtractedData: true,
        extractedAt: new Date().toISOString(),
        extractionMethod: mode === 'extract' ? 'ai' : 'manual',
      });

      Toast.show({
        type: 'success',
        text1: 'Data gemt!',
        text2: 'Certifikatdata er opdateret',
      });

      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('[CertDetailModal] Save error:', error);
      Toast.show({
        type: 'error',
        text1: 'Kunne ikke gemme',
        text2: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    // Require holder name, certificate number, and expiry date for all types
    return holderName && certificateNumber && expiryDate;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Certifikat Detaljer</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.black} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Certificate Image */}
          {(certificate.downloadURL || certificate.downloadUrl) && (
            <Image
              source={{ uri: certificate.downloadURL || certificate.downloadUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          )}

          {/* General Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generel Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Certifikat Navn</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={certificate.fileName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Dokumenttype *</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.pickerWrapper}>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      fontSize: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#ccc',
                      backgroundColor: '#fff',
                      color: colors.primary,
                    }}
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </View>
              ) : (
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={documentType}
                    onValueChange={(value) => setDocumentType(value)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <Picker.Item key={type.value} label={type.label} value={type.value} />
                    ))}
                  </Picker>
                </View>
              )}
              <Text style={styles.helpText}>
                Vælg hvilken type dokument dette er, så systemet kan matche det med transportkrav
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Noter</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Tilføj noter til certifikatet..."
                multiline
                textAlignVertical="top"
              />
            </View>

          </View>

          {/* Action Buttons (if no mode selected) */}
          {!mode && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.actionButton, styles.extractButton]}
                onPress={handleExtractData}
                disabled={extracting}
              >
                {extracting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Sparkles size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Udtræk Data</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.manualButton]}
                onPress={handleManualEntry}
              >
                <Edit3 size={20} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                  Indtast Manuelt
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form Fields */}
          {mode && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Certifikat Data</Text>
                {mode === 'view' && !isEditing ? (
                  <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.changeMethodButton}>
                    <Edit3 size={16} color={colors.primary} />
                    <Text style={styles.changeMethodText}>Rediger</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => {
                    setMode(null);
                    setIsEditing(false);
                  }} style={styles.changeMethodButton}>
                    <Text style={styles.changeMethodText}>Skift Metode</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Generic fields that work for all document types */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {entityType === 'organization' ? 'Firmanavn' : entityType === 'vehicle' ? 'Køretøj' : 'Hest'} *
                </Text>
                <TextInput
                  style={[styles.input, (mode === 'view' && !isEditing) && styles.inputReadOnly]}
                  value={holderName}
                  onChangeText={setHolderName}
                  placeholder={
                    entityType === 'organization' ? 'Indtast firmanavn' :
                    entityType === 'vehicle' ? 'Indtast nummerplade eller køretøjsnavn' :
                    'Indtast hestenavn'
                  }
                  editable={mode !== 'view' || isEditing}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {entityType === 'organization' ? 'Autorisationsnummer' :
                   entityType === 'vehicle' ? 'Registreringsnummer' :
                   'Pasnummer'} *
                </Text>
                <TextInput
                  style={[styles.input, (mode === 'view' && !isEditing) && styles.inputReadOnly]}
                  value={certificateNumber}
                  onChangeText={setCertificateNumber}
                  placeholder={
                    entityType === 'organization' ? 'Indtast autorisationsnummer' :
                    entityType === 'vehicle' ? 'Indtast registreringsnummer' :
                    'Indtast pasnummer'
                  }
                  editable={mode !== 'view' || isEditing}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Udstedelsesdato</Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    (mode === 'view' && !isEditing) && styles.inputReadOnly
                  ]}
                  onPress={() => (mode !== 'view' || isEditing) && setShowIssueDatePicker(true)}
                  disabled={mode === 'view' && !isEditing}
                >
                  <Text style={[
                    styles.dateInputText,
                    !issueDate && styles.dateInputPlaceholder
                  ]}>
                    {issueDate || 'Vælg dato...'}
                  </Text>
                  <Calendar size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {showIssueDatePicker && (
                  Platform.OS === 'ios' ? (
                    <View style={styles.datePickerContainer}>
                      <View style={styles.datePickerHeader}>
                        <TouchableOpacity onPress={() => setShowIssueDatePicker(false)}>
                          <Text style={styles.datePickerDone}>Færdig</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={parseDate(issueDate) || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            setIssueDate(formatDate(selectedDate));
                          }
                        }}
                        locale="da-DK"
                      />
                    </View>
                  ) : (
                    <DateTimePicker
                      value={parseDate(issueDate) || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowIssueDatePicker(false);
                        if (event.type === 'set' && selectedDate) {
                          setIssueDate(formatDate(selectedDate));
                        }
                      }}
                    />
                  )
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Udløbsdato *</Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    (mode === 'view' && !isEditing) && styles.inputReadOnly
                  ]}
                  onPress={() => (mode !== 'view' || isEditing) && setShowExpiryDatePicker(true)}
                  disabled={mode === 'view' && !isEditing}
                >
                  <Text style={[
                    styles.dateInputText,
                    !expiryDate && styles.dateInputPlaceholder
                  ]}>
                    {expiryDate || 'Vælg dato...'}
                  </Text>
                  <Calendar size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {showExpiryDatePicker && (
                  Platform.OS === 'ios' ? (
                    <View style={styles.datePickerContainer}>
                      <View style={styles.datePickerHeader}>
                        <TouchableOpacity onPress={() => setShowExpiryDatePicker(false)}>
                          <Text style={styles.datePickerDone}>Færdig</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={parseDate(expiryDate) || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            setExpiryDate(formatDate(selectedDate));
                          }
                        }}
                        locale="da-DK"
                      />
                    </View>
                  ) : (
                    <DateTimePicker
                      value={parseDate(expiryDate) || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowExpiryDatePicker(false);
                        if (event.type === 'set' && selectedDate) {
                          setExpiryDate(formatDate(selectedDate));
                        }
                      }}
                    />
                  )
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Yderligere Information</Text>
                <TextInput
                  style={[styles.input, { minHeight: 80 }, (mode === 'view' && !isEditing) && styles.inputReadOnly]}
                  value={additionalInfo}
                  onChangeText={setAdditionalInfo}
                  placeholder="F.eks. rejsetype, VIN, chipnummer, eller andre relevante detaljer..."
                  multiline
                  textAlignVertical="top"
                  editable={mode !== 'view' || isEditing}
                />
              </View>
            </View>
          )}

          {/* Save Button - Always visible at bottom */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (mode && mode !== 'view' && !isFormValid()) && styles.saveButtonDisabled,
                (mode === 'view' && isEditing && !isFormValid()) && styles.saveButtonDisabled,
                saving && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={(mode && mode !== 'view' && !isFormValid()) || (mode === 'view' && isEditing && !isFormValid()) || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Save size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {mode && mode !== 'view' ? 'Gem Alt' : (mode === 'view' && isEditing) ? 'Gem Ændringer' : 'Gem Ændringer'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.black,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: colors.secondary,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
  },
  changeMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  changeMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.black,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  smallTypeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  extractButton: {
    backgroundColor: colors.primary,
  },
  manualButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.black,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.black,
    backgroundColor: colors.white,
  },
  inputReadOnly: {
    backgroundColor: colors.secondary,
    color: colors.textSecondary,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.white,
  },
  dateInputText: {
    fontSize: 16,
    color: colors.black,
  },
  dateInputPlaceholder: {
    color: colors.textSecondary,
  },
  datePickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.secondary,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveGeneralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  saveGeneralButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pickerContainer: {
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        paddingVertical: 8,
      },
      android: {
        paddingVertical: 0,
      },
    }),
  },
  picker: {
    width: '100%',
    ...Platform.select({
      ios: {
        height: 44,
      },
      android: {
        height: 50,
      },
      web: {
        height: 50,
        padding: 12,
      },
    }),
  },
  pickerItem: {
    fontSize: 16,
    height: 44,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    lineHeight: 16,
  },
});

export default CertificateDetailModal;
