import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, Alert, ActivityIndicator } from 'react-native';
import { CheckSquare, Square, AlertTriangle, Info, AlertCircle, FileCheck, Upload, Camera, Image as ImageIcon, File, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { colors } from '../../styles/theme';

/**
 * ComplianceChecklist Component
 *
 * Displays a checklist of required documents and warnings for horse transport compliance
 * Supports marking documents as confirmed and displays country-specific requirements
 * Now with direct upload capability for each requirement
 */
const ComplianceChecklist = ({
  requirements,
  confirmedDocuments = [],
  autoConfirmedDocuments = [],
  onToggleDocument,
  onDocumentUploaded,
  editable = true,
  organizationId,
  vehicleId,
  horseIds = [],
}) => {
  const [expandedCategories, setExpandedCategories] = useState({
    base: true,
    distance: true,
    border: true,
    country: true,
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!requirements) {
    return null;
  }

  // Upload handlers
  const handleUploadPress = (doc) => {
    setSelectedDoc(doc);
    setShowUploadModal(true);
  };

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      await uploadFile(result.assets[0]);
    } catch (error) {
      console.error('Error picking document:', error);
      Toast.show({ type: 'error', text1: 'Fejl', text2: 'Kunne ikke vælge dokument' });
    }
  };

  const handleUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Tilladelse kræves', 'Vi har brug for adgang til dit billedbibliotek');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;
      await uploadFile({
        uri: result.assets[0].uri,
        name: `${selectedDoc?.name || 'dokument'}_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        size: result.assets[0].fileSize || 0,
      });
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({ type: 'error', text1: 'Fejl', text2: 'Kunne ikke vælge billede' });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Tilladelse kræves', 'Vi har brug for adgang til dit kamera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });

      if (result.canceled || !result.assets?.[0]) return;
      await uploadFile({
        uri: result.assets[0].uri,
        name: `${selectedDoc?.name || 'dokument'}_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        size: result.assets[0].fileSize || 0,
      });
    } catch (error) {
      console.error('Error taking photo:', error);
      Toast.show({ type: 'error', text1: 'Fejl', text2: 'Kunne ikke tage billede' });
    }
  };

  const uploadFile = async (file) => {
    if (!selectedDoc) return;

    setUploading(true);
    setShowUploadModal(false);

    try {
      const { uploadCertificate } = require('../../services/documents/certificateService');

      // Determine where to save based on document type
      let entityType = 'organization';
      let entityId = organizationId;

      // Horse-specific documents go to horses
      if (selectedDoc.id === 'horse_passport' && horseIds.length > 0) {
        entityType = 'horse';
        entityId = horseIds[0]; // Upload to first horse
      }
      // Vehicle-specific documents go to vehicle
      else if (['registration', 'approval_certificate'].includes(selectedDoc.id) && vehicleId) {
        entityType = 'vehicle';
        entityId = vehicleId;
      }
      // Default to organization if available
      else if (!organizationId && vehicleId) {
        entityType = 'vehicle';
        entityId = vehicleId;
      }

      if (!entityId) {
        Toast.show({ type: 'error', text1: 'Fejl', text2: 'Ingen enhed at uploade til' });
        return;
      }

      await uploadCertificate(
        { uri: file.uri, name: file.name, mimeType: file.mimeType, size: file.size },
        entityType,
        entityId,
        { displayName: selectedDoc.name, documentType: selectedDoc.name, notes: `Uploadet som ${selectedDoc.name}` }
      );

      Toast.show({
        type: 'success',
        text1: 'Dokument uploadet',
        text2: `${selectedDoc.name} gemt`,
      });

      // Auto-confirm this document
      if (onToggleDocument && !confirmedDocuments.includes(selectedDoc.id)) {
        onToggleDocument(selectedDoc.id);
      }

      // Notify parent to refresh
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Toast.show({ type: 'error', text1: 'Fejl', text2: 'Kunne ikke uploade dokument' });
    } finally {
      setUploading(false);
      setSelectedDoc(null);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Group documents by category
  const documentsByCategory = {
    base: requirements.documents.filter(doc => doc.category === 'base'),
    distance: requirements.documents.filter(doc => doc.category === 'distance'),
    border: requirements.documents.filter(doc => doc.category === 'border'),
  };

  // Get country-specific documents
  const countryDocuments = [];
  Object.entries(requirements.countrySpecific || {}).forEach(([country, data]) => {
    if (data.documents) {
      countryDocuments.push(...data.documents.map(doc => ({ ...doc, country })));
    }
  });

  // Get all warnings
  const allWarnings = [...requirements.warnings];
  Object.values(requirements.countrySpecific || {}).forEach(countryReq => {
    if (countryReq.warnings) {
      allWarnings.push(...countryReq.warnings);
    }
  });

  const renderDocument = (doc) => {
    const isConfirmed = confirmedDocuments.includes(doc.id);
    const isAutoConfirmed = autoConfirmedDocuments.includes(doc.id);
    const IconComponent = isConfirmed ? CheckSquare : Square;

    return (
      <View
        key={doc.id}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          padding: 12,
          backgroundColor: isConfirmed ? '#e8f5e9' : colors.white,
          borderRadius: 8,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: isConfirmed ? '#4CAF50' : '#e0e0e0',
        }}
      >
        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => editable && onToggleDocument && onToggleDocument(doc.id)}
          disabled={!editable}
          style={{ marginRight: 12, marginTop: 2 }}
        >
          <IconComponent
            size={24}
            color={isConfirmed ? '#4CAF50' : '#666'}
            strokeWidth={2}
          />
        </TouchableOpacity>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{
              fontSize: 15,
              fontWeight: '600',
              color: isConfirmed ? '#2e7d32' : colors.primary,
            }}>
              {doc.name}
              {doc.required && (
                <Text style={{ color: '#d32f2f', fontSize: 14 }}> *</Text>
              )}
            </Text>
            {isAutoConfirmed && (
              <View style={{
                backgroundColor: '#e3f2fd',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}>
                <FileCheck size={12} color="#1976d2" strokeWidth={2.5} />
                <Text style={{ fontSize: 10, color: '#1976d2', fontWeight: '600' }}>
                  CERTIFIKAT
                </Text>
              </View>
            )}
          </View>
          <Text style={{
            fontSize: 13,
            color: isConfirmed ? '#558b2f' : '#666',
            lineHeight: 18,
            marginTop: 4,
          }}>
            {doc.description}
          </Text>
          {isAutoConfirmed && (
            <Text style={{
              fontSize: 11,
              color: '#1976d2',
              marginTop: 4,
              fontStyle: 'italic',
            }}>
              ✓ Auto-bekræftet fra uploadet certifikat
            </Text>
          )}
        </View>

        {/* Upload button */}
        {editable && !isAutoConfirmed && (
          <TouchableOpacity
            onPress={() => handleUploadPress(doc)}
            style={{
              backgroundColor: colors.secondary,
              padding: 8,
              borderRadius: 6,
              marginLeft: 8,
            }}
          >
            <Upload size={18} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCategory = (title, category, documents) => {
    if (documents.length === 0) return null;

    const isExpanded = expandedCategories[category];
    const confirmedCount = documents.filter(doc => confirmedDocuments.includes(doc.id)).length;

    return (
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: colors.secondary,
            borderRadius: 8,
            marginBottom: 8,
          }}
          onPress={() => toggleCategory(category)}
        >
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14, color: '#666' }}>
              {confirmedCount}/{documents.length}
            </Text>
            <Text style={{ fontSize: 18, color: colors.primary }}>
              {isExpanded ? '−' : '+'}
            </Text>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View>
            {documents.map(doc => renderDocument(doc))}
          </View>
        )}
      </View>
    );
  };

  const renderWarning = (warning, index) => {
    let IconComponent = Info;
    let bgColor = '#e3f2fd';
    let iconColor = '#1976d2';
    let textColor = '#1565c0';

    if (warning.type === 'warning') {
      IconComponent = AlertTriangle;
      bgColor = '#fff3cd';
      iconColor = '#f57c00';
      textColor = '#e65100';
    } else if (warning.type === 'critical') {
      IconComponent = AlertCircle;
      bgColor = '#ffebee';
      iconColor = '#d32f2f';
      textColor = '#c62828';
    }

    return (
      <View
        key={`warning-${index}`}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: bgColor,
          padding: 12,
          borderRadius: 8,
          marginBottom: 8,
          borderLeftWidth: 4,
          borderLeftColor: iconColor,
        }}
      >
        <IconComponent
          size={20}
          color={iconColor}
          strokeWidth={2}
          style={{ marginRight: 10, marginTop: 2 }}
        />
        <Text style={{
          flex: 1,
          fontSize: 13,
          color: textColor,
          lineHeight: 18,
        }}>
          {warning.message}
        </Text>
      </View>
    );
  };

  // Calculate compliance stats
  const allDocuments = [
    ...documentsByCategory.base,
    ...documentsByCategory.distance,
    ...documentsByCategory.border,
    ...countryDocuments,
  ];
  const totalRequired = allDocuments.filter(doc => doc.required).length;
  const totalConfirmed = allDocuments.filter(doc => confirmedDocuments.includes(doc.id)).length;
  const isFullyCompliant = totalConfirmed >= totalRequired;

  return (
    <View style={{
      backgroundColor: colors.white,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isFullyCompliant ? '#4CAF50' : '#ffc107',
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
      }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
          Påkrævet Dokumentation
        </Text>
        <View style={{
          backgroundColor: isFullyCompliant ? '#4CAF50' : '#ffc107',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
        }}>
          <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>
            {totalConfirmed}/{totalRequired}
          </Text>
        </View>
      </View>

      {/* Warnings */}
      {allWarnings.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          {allWarnings.map((warning, index) => renderWarning(warning, index))}
        </View>
      )}

      {/* Document Categories */}
      <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
        {renderCategory('Basisdokumenter', 'base', documentsByCategory.base)}
        {renderCategory('Afstandskrav', 'distance', documentsByCategory.distance)}
        {renderCategory('Grænseoverskridelse', 'border', documentsByCategory.border)}
        {countryDocuments.length > 0 && renderCategory('Landespecifikke Krav', 'country', countryDocuments)}
      </ScrollView>

      {/* Footer info */}
      {editable && (
        <View style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        }}>
          <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
            Tryk på hvert dokument for at markere det som bekræftet
          </Text>
        </View>
      )}

      {/* Non-compliant warning */}
      {!isFullyCompliant && totalConfirmed < totalRequired && (
        <View style={{
          backgroundColor: '#fff3cd',
          padding: 12,
          borderRadius: 8,
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={18} color="#f57c00" strokeWidth={2} />
          <Text style={{ flex: 1, fontSize: 13, color: '#e65100', fontWeight: '600' }}>
            {totalRequired - totalConfirmed} dokument(er) mangler bekræftelse
          </Text>
        </View>
      )}

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowUploadModal(false)}
        >
          <View style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                Upload {selectedDoc?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: '#f5f5f5',
                borderRadius: 12,
                marginBottom: 12,
                gap: 12,
              }}
              onPress={handleUploadDocument}
            >
              <File size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>PDF Dokument</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>Vælg en PDF fil</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: '#f5f5f5',
                borderRadius: 12,
                marginBottom: 12,
                gap: 12,
              }}
              onPress={handleUploadImage}
            >
              <ImageIcon size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>Billede fra galleri</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>Vælg et billede</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: '#f5f5f5',
                borderRadius: 12,
                gap: 12,
              }}
              onPress={handleTakePhoto}
            >
              <Camera size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>Tag billede</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>Brug kameraet</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Uploading overlay */}
      {uploading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.9)',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 12,
        }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.primary, fontWeight: '600' }}>
            Uploader {selectedDoc?.name}...
          </Text>
        </View>
      )}
    </View>
  );
};

export default ComplianceChecklist;
