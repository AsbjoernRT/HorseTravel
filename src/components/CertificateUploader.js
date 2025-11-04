import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Pressable, Modal, TextInput } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Upload, Camera, FileText, Image as ImageIcon, Trash2, Download, File, X } from 'lucide-react-native';
import { uploadCertificate, getCertificates, deleteCertificate, updateCertificateMetadata } from '../services/documents/certificateService';
import { colors } from '../styles/theme';
import Toast from 'react-native-toast-message';
import { confirmAlert } from '../utils/platformAlerts';

/**
 * Certificate uploader component for organizations and vehicles
 * Supports PDF upload, image upload, and camera capture
 */
const CertificateUploader = ({ entityType, entityId, canManage = true }) => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadCertificates();
  }, [entityType, entityId]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const data = await getCertificates(entityType, entityId);
      setCertificates(data);
    } catch (error) {
      console.error('Error loading certificates:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Kunne ikke indlæse certifikater',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Tilladelse nødvendig',
        'Vi har brug for adgang til dit kamera for at tage billeder'
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Tilladelse nødvendig',
        'Vi har brug for adgang til dit fotobibliotek'
      );
      return false;
    }
    return true;
  };

  const handlePickDocument = async () => {
    try {
      setShowUploadMenu(false);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      await uploadFile(file);
    } catch (error) {
      console.error('Error picking document:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Kunne ikke vælge dokument',
      });
    }
  };

  const handlePickImage = async () => {
    try {
      console.log('handlePickImage: Starting...');
      setShowUploadMenu(false);

      console.log('handlePickImage: Requesting permission...');
      const hasPermission = await requestMediaLibraryPermission();
      console.log('handlePickImage: Permission result:', hasPermission);
      if (!hasPermission) {
        return;
      }

      console.log('handlePickImage: Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      console.log('handlePickImage: Result:', result);

      if (result.canceled) {
        console.log('handlePickImage: User canceled');
        return;
      }

      const file = {
        uri: result.assets[0].uri,
        name: result.assets[0].fileName || `image_${Date.now()}.jpg`,
        type: result.assets[0].mimeType || 'image/jpeg',
        size: result.assets[0].fileSize,
      };

      console.log('handlePickImage: Uploading file:', file);
      await uploadFile(file);
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Kunne ikke vælge billede',
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      setShowUploadMenu(false);

      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const file = {
        uri: result.assets[0].uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: result.assets[0].fileSize,
      };

      await uploadFile(file);
    } catch (error) {
      console.error('Error taking photo:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Kunne ikke tage billede',
      });
    }
  };

  const uploadFile = async (file) => {
    try {
      setUploading(true);

      const certificate = await uploadCertificate(
        file,
        entityType,
        entityId,
        {
          certificateType: file.type?.includes('pdf') ? 'PDF' : 'Billede',
        }
      );

      setCertificates(prev => [certificate, ...prev]);

      Toast.show({
        type: 'success',
        text1: 'Upload lykkedes',
        text2: `${file.name} blev uploaded`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload fejlede',
        text2: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (certificate) => {
    const confirmed = await confirmAlert(
      'Slet certifikat',
      `Er du sikker på at du vil slette ${certificate.fileName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCertificate(certificate.id);
      setCertificates(prev => prev.filter(c => c.id !== certificate.id));
      Toast.show({
        type: 'success',
        text1: 'Slettet',
        text2: 'Certifikat blev slettet',
      });
    } catch (error) {
      console.error('Error deleting certificate:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Kunne ikke slette certifikat',
      });
    }
  };

  const handleEdit = (certificate) => {
    setEditingCertificate(certificate);
    setEditName(certificate.displayName || certificate.fileName);
    setEditType(certificate.certificateType || '');
    setEditNotes(certificate.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateCertificateMetadata(editingCertificate.id, {
        displayName: editName,
        certificateType: editType,
        notes: editNotes,
      });

      setCertificates(prev =>
        prev.map(c =>
          c.id === editingCertificate.id
            ? { ...c, displayName: editName, certificateType: editType, notes: editNotes }
            : c
        )
      );

      setShowEditModal(false);
      Toast.show({
        type: 'success',
        text1: 'Opdateret',
        text2: 'Certifikat blev opdateret',
      });
    } catch (error) {
      console.error('Error updating certificate:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Kunne ikke opdatere certifikat',
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) {
      return FileText;
    }
    if (mimeType?.includes('image')) {
      return ImageIcon;
    }
    return File;
  };

  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ marginTop: 24 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
          Certifikater
        </Text>
        {canManage && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              gap: 6,
            }}
            onPress={() => setShowUploadMenu(true)}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Upload size={16} color={colors.white} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.white }}>
                  Upload
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Certificate List */}
      {certificates.length === 0 ? (
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 12,
          padding: 32,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <FileText size={48} color={colors.textSecondary} strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
            Ingen certifikater endnu
          </Text>
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {certificates.map((cert) => {
            const FileIcon = getFileIcon(cert.mimeType);
            return (
              <View
                key={cert.id}
                style={{
                  backgroundColor: colors.white,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3.84,
                  elevation: 3,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <FileIcon size={24} color={colors.white} strokeWidth={2} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.black }}>
                      {cert.displayName || cert.fileName}
                    </Text>
                    {cert.certificateType && (
                      <Text style={{ fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '500' }}>
                        {cert.certificateType}
                      </Text>
                    )}
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {formatFileSize(cert.fileSize)} • {formatDate(cert.uploadedAt)}
                    </Text>
                    {cert.notes && (
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                        {cert.notes}
                      </Text>
                    )}
                  </View>

                  {canManage && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        style={{
                          backgroundColor: colors.primary,
                          padding: 8,
                          borderRadius: 8,
                        }}
                        onPress={() => handleEdit(cert)}
                      >
                        <FileText size={16} color={colors.white} />
                      </Pressable>
                      <Pressable
                        style={{
                          backgroundColor: '#ffebee',
                          padding: 8,
                          borderRadius: 8,
                        }}
                        onPress={() => handleDelete(cert)}
                      >
                        <Trash2 size={16} color="#d32f2f" />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Upload Menu Modal */}
      <Modal
        visible={showUploadMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUploadMenu(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => setShowUploadMenu(false)}
        >
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 20,
            width: '80%',
            maxWidth: 400,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: colors.primary,
              marginBottom: 16,
              textAlign: 'center',
            }}>
              Vælg upload metode
            </Text>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                gap: 12,
              }}
              onPress={handleTakePhoto}
            >
              <Camera size={24} color={colors.white} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white }}>
                Tag billede
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                gap: 12,
              }}
              onPress={handlePickImage}
            >
              <ImageIcon size={24} color={colors.white} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white }}>
                Vælg billede
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                gap: 12,
              }}
              onPress={handlePickDocument}
            >
              <FileText size={24} color={colors.white} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white }}>
                Vælg PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: '#f5f5f5',
                alignItems: 'center',
              }}
              onPress={() => setShowUploadMenu(false)}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#666' }}>
                Annuller
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 20,
            width: '100%',
            maxWidth: 400,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                Rediger certifikat
              </Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <X size={24} color={colors.primary} />
              </Pressable>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Navn
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="Certifikat navn"
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Type
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                }}
                placeholder="F.eks. Forsikring, Syn, etc."
                value={editType}
                onChangeText={setEditType}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
                Noter
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 16,
                  color: colors.primary,
                  minHeight: 80,
                }}
                placeholder="Tilføj noter..."
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: '#f5f5f5',
                  alignItems: 'center',
                }}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#666' }}>
                  Annuller
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                }}
                onPress={handleSaveEdit}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white }}>
                  Gem
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CertificateUploader;
