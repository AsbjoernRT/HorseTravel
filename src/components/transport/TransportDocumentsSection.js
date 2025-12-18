import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  FileText,
  Upload,
  Camera,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Building2,
  Truck,
  Heart,
  Plus,
  X,
  File,
  ExternalLink,
} from 'lucide-react-native';
import { colors } from '../../styles/theme';
import { getCertificates, uploadCertificate } from '../../services/documents/certificateService';
import Toast from 'react-native-toast-message';

/**
 * Document section for transport creation
 * Shows existing documents and allows uploading new ones
 */
const TransportDocumentsSection = ({
  organizationId,
  selectedVehicle,
  selectedHorses = [],
  activeMode,
  onDocumentsChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUploadTypeModal, setShowUploadTypeModal] = useState(false);
  const [selectedEntityForUpload, setSelectedEntityForUpload] = useState(null);

  // Document state
  const [orgDocuments, setOrgDocuments] = useState([]);
  const [vehicleDocuments, setVehicleDocuments] = useState([]);
  const [horseDocuments, setHorseDocuments] = useState({});

  // Load documents when entities change
  useEffect(() => {
    loadAllDocuments();
  }, [organizationId, selectedVehicle?.id, selectedHorses.map(h => h.id).join(',')]);

  const loadAllDocuments = async () => {
    setLoading(true);
    try {
      const promises = [];

      // Load org documents
      if (activeMode === 'organization' && organizationId) {
        promises.push(
          getCertificates('organization', organizationId).then(docs => {
            setOrgDocuments(docs);
          })
        );
      }

      // Load vehicle documents
      if (selectedVehicle?.id) {
        promises.push(
          getCertificates('vehicle', selectedVehicle.id).then(docs => {
            setVehicleDocuments(docs);
          })
        );
      }

      // Load horse documents
      for (const horse of selectedHorses) {
        promises.push(
          getCertificates('horse', horse.id).then(docs => {
            setHorseDocuments(prev => ({ ...prev, [horse.id]: docs }));
          })
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalDocumentCount = () => {
    let count = orgDocuments.length + vehicleDocuments.length;
    Object.values(horseDocuments).forEach(docs => {
      count += docs.length;
    });
    return count;
  };

  const handleSelectEntityForUpload = (entityType, entityId, entityName) => {
    setSelectedEntityForUpload({ type: entityType, id: entityId, name: entityName });
    setShowUploadModal(false);
    setShowUploadTypeModal(true);
  };

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      await uploadFile(file);
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

      const file = result.assets[0];
      await uploadFile({
        uri: file.uri,
        name: `image_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        size: file.fileSize || 0,
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

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      await uploadFile({
        uri: file.uri,
        name: `photo_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        size: file.fileSize || 0,
      });
    } catch (error) {
      console.error('Error taking photo:', error);
      Toast.show({ type: 'error', text1: 'Fejl', text2: 'Kunne ikke tage billede' });
    }
  };

  const uploadFile = async (file) => {
    if (!selectedEntityForUpload) return;

    setUploading(true);
    setShowUploadTypeModal(false);

    try {
      await uploadCertificate(
        {
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
        },
        selectedEntityForUpload.type,
        selectedEntityForUpload.id,
        {
          displayName: file.name,
          notes: `Uploadet under transport oprettelse`,
        }
      );

      Toast.show({
        type: 'success',
        text1: 'Dokument uploadet',
        text2: `Gemt til ${selectedEntityForUpload.name}`,
      });

      // Reload documents
      await loadAllDocuments();

      // Notify parent
      if (onDocumentsChange) {
        onDocumentsChange();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Toast.show({ type: 'error', text1: 'Fejl', text2: 'Kunne ikke uploade dokument' });
    } finally {
      setUploading(false);
      setSelectedEntityForUpload(null);
    }
  };

  const openDocument = async (doc) => {
    const url = doc.downloadURL || doc.downloadUrl;
    if (url) {
      await Linking.openURL(url);
    }
  };

  const renderDocumentItem = (doc, entityIcon, entityName) => (
    <TouchableOpacity
      key={doc.id}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        marginBottom: 8,
        gap: 12,
      }}
      onPress={() => openDocument(doc)}
    >
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {entityIcon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
          {doc.displayName || doc.fileName || 'Dokument'}
        </Text>
        <Text style={{ fontSize: 12, color: '#666' }}>
          {doc.documentType || entityName}
        </Text>
      </View>
      <ExternalLink size={18} color="#666" />
    </TouchableOpacity>
  );

  const totalDocs = getTotalDocumentCount();

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Header */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.white,
          padding: 16,
          borderRadius: expanded ? 12 : 8,
          borderBottomLeftRadius: expanded ? 0 : 8,
          borderBottomRightRadius: expanded ? 0 : 8,
          borderWidth: 1,
          borderColor: '#e0e0e0',
          borderBottomWidth: expanded ? 0 : 1,
        }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FileText size={20} color={colors.primary} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
              Dokumenter
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              {loading ? 'Indlæser...' : `${totalDocs} dokument${totalDocs !== 1 ? 'er' : ''} tilgængelig${totalDocs !== 1 ? 'e' : ''}`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
            onPress={(e) => {
              e.stopPropagation();
              setShowUploadModal(true);
            }}
          >
            <Plus size={16} color={colors.white} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.white }}>Upload</Text>
          </TouchableOpacity>
          {expanded ? (
            <ChevronUp size={20} color={colors.primary} />
          ) : (
            <ChevronDown size={20} color={colors.primary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={{
          backgroundColor: colors.white,
          padding: 16,
          borderWidth: 1,
          borderTopWidth: 0,
          borderColor: '#e0e0e0',
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        }}>
          {loading ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <>
              {/* Organization documents */}
              {activeMode === 'organization' && orgDocuments.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 }}>
                    VIRKSOMHED
                  </Text>
                  {orgDocuments.map(doc => renderDocumentItem(
                    doc,
                    <Building2 size={18} color={colors.primary} />,
                    'Virksomhed'
                  ))}
                </View>
              )}

              {/* Vehicle documents */}
              {vehicleDocuments.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 }}>
                    KØRETØJ
                  </Text>
                  {vehicleDocuments.map(doc => renderDocumentItem(
                    doc,
                    <Truck size={18} color={colors.primary} />,
                    selectedVehicle?.licensePlate || 'Køretøj'
                  ))}
                </View>
              )}

              {/* Horse documents */}
              {selectedHorses.map(horse => {
                const horseDocs = horseDocuments[horse.id] || [];
                if (horseDocs.length === 0) return null;
                return (
                  <View key={horse.id} style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 }}>
                      {horse.name.toUpperCase()}
                    </Text>
                    {horseDocs.map(doc => renderDocumentItem(
                      doc,
                      <Heart size={18} color={colors.primary} />,
                      horse.name
                    ))}
                  </View>
                );
              })}

              {/* Empty state */}
              {totalDocs === 0 && (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <FileText size={32} color="#ccc" />
                  <Text style={{ fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' }}>
                    Ingen dokumenter fundet.{'\n'}Tryk på "Upload" for at tilføje.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* Upload Entity Selection Modal */}
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
            justifyContent: 'center',
            padding: 20,
          }}
          onPress={() => setShowUploadModal(false)}
        >
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 20,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                Hvor skal dokumentet gemmes?
              </Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Organization option */}
            {activeMode === 'organization' && organizationId && (
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
                onPress={() => handleSelectEntityForUpload('organization', organizationId, 'Virksomhed')}
              >
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Building2 size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>Virksomhed</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>Autorisation, godkendelser, etc.</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Vehicle option */}
            {selectedVehicle && (
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
                onPress={() => handleSelectEntityForUpload('vehicle', selectedVehicle.id, selectedVehicle.licensePlate)}
              >
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Truck size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                    {selectedVehicle.make} {selectedVehicle.model}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    {selectedVehicle.licensePlate} - Registreringsattest, etc.
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Horse options */}
            {selectedHorses.map(horse => (
              <TouchableOpacity
                key={horse.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 12,
                  marginBottom: 12,
                  gap: 12,
                }}
                onPress={() => handleSelectEntityForUpload('horse', horse.id, horse.name)}
              >
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Heart size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>{horse.name}</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>Hestepas, sundhedsattest, etc.</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Empty state */}
            {!selectedVehicle && selectedHorses.length === 0 && activeMode !== 'organization' && (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ fontSize: 14, color: '#999', textAlign: 'center' }}>
                  Vælg køretøj og heste først for at uploade dokumenter
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Upload Type Modal */}
      <Modal
        visible={showUploadTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUploadTypeModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowUploadTypeModal(false)}
        >
          <View style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 20, textAlign: 'center' }}>
              Vælg upload type
            </Text>

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
            Uploader dokument...
          </Text>
        </View>
      )}
    </View>
  );
};

export default TransportDocumentsSection;
