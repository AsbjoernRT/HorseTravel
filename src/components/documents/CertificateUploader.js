import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Pressable, Modal } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Upload, Camera, FileText, Image as ImageIcon, Trash2, Download, File, RefreshCw } from 'lucide-react-native';
import { uploadCertificate, getCertificates, deleteCertificate, updateCertificateMetadata } from '../../services/documents/certificateService';
import { extractCertificateData, validateCertificateData } from '../../services/documents/certificateParserService';
import { syncCertificateToOrganization, syncCertificateToVehicle, validateAuthorization } from '../../services/documents/certificateSyncService';
import { colors } from '../../styles/theme';
import Toast from 'react-native-toast-message';
import { confirmAlert } from '../../utils/platformAlerts';
import CertificateDetailModal from './CertificateDetailModal';

/**
 * Certificate uploader component for organizations and vehicles
 * Supports PDF upload, image upload, and camera capture
 * @param {boolean} enableAIExtraction - Enable AI-powered data extraction from images
 * @param {Object} entityData - Optional entity data (organization or vehicle) to pre-populate form
 */
const CertificateUploader = ({ entityType, entityId, canManage = true, enableAIExtraction = false, entityData = null }) => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Temporary kill-switch so uploads work while AI OCR is offline
  const aiExtractionEnabled = enableAIExtraction && false;
  const shouldLogOcrPreview = enableAIExtraction;

  useEffect(() => {
    loadCertificates();

    // Set up real-time listener for certificate updates
    const unsubscribe = setupCertificateListener();

    // Process any pending certificates
    processPendingCertificates();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [entityType, entityId]);

  // Process certificates that are pending or need retry
  const processPendingCertificates = async () => {
    if (!aiExtractionEnabled) {
      console.log('[CertUploader] AI extraction disabled. Skipping pending processing.');
      return;
    }
    try {
      const allCerts = await getCertificates(entityType, entityId);

      const pendingCerts = allCerts.filter(cert => {
        // Process if status is pending or retrying and nextRetryAt has passed
        if (cert.processingStatus === 'pending') {
          return true;
        }

        if (cert.processingStatus === 'retrying' && cert.nextRetryAt) {
          const nextRetry = new Date(cert.nextRetryAt);
          return nextRetry <= new Date();
        }

        return false;
      });

      console.log(`[CertUploader] Found ${pendingCerts.length} pending certificates to process`);

      // Process each pending certificate
      for (const cert of pendingCerts) {
        console.log(`[CertUploader] Resuming processing for certificate: ${cert.id}`);

        // Get the download URL to process the image
        const downloadUrl = cert.downloadUrl || cert.downloadURL;
        if (downloadUrl) {
          const retryCount = cert.retryCount || 0;
          extractCertificateInBackground(downloadUrl, cert.id, retryCount);
        }
      }
    } catch (error) {
      console.error('[CertUploader] Error processing pending certificates:', error);
    }
  };

  const setupCertificateListener = () => {
    try {
      const { getFirestore, collection, query, where, onSnapshot } = require('firebase/firestore');
      const db = getFirestore();

      const q = query(
        collection(db, 'certificates'),
        where('entityType', '==', entityType),
        where('entityId', '==', entityId)
      );

      return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const updatedCert = { id: change.doc.id, ...change.doc.data() };

            // Update certificates list
            setCertificates(prev =>
              prev.map(cert => cert.id === updatedCert.id ? updatedCert : cert)
            );

            // Show notification if AI extraction just completed
            if (updatedCert.hasExtractedData && updatedCert.extractedAt) {
              const extractedTime = new Date(updatedCert.extractedAt);
              const now = new Date();
              const timeDiff = (now - extractedTime) / 1000; // seconds

              // Only show notification if extraction happened in last 5 seconds
              if (timeDiff < 5) {
                console.log('[CertUploader] Certificate updated with AI data:', updatedCert.id);
              }
            }
          }
        });
      }, (error) => {
        console.error('[CertUploader] Listener error:', error);
      });
    } catch (error) {
      console.error('[CertUploader] Failed to setup listener:', error);
      return null;
    }
  };

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


  const handlePickDocument = () => {
    setPendingAction('document');
    setShowUploadMenu(false);
  };

  const executePickDocument = async () => {
    try {
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

  const onUploadMenuHide = () => {
    if (pendingAction === 'image') {
      executePickImage();
    } else if (pendingAction === 'camera') {
      executeTakePhoto();
    } else if (pendingAction === 'document') {
      executePickDocument();
    }
    setPendingAction(null);
  };

  const handlePickImage = () => {
    setPendingAction('image');
    setShowUploadMenu(false);
  };

  const executePickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert(
          'Tilladelse nødvendig',
          'Vi har brug for adgang til dit fotobibliotek'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7, // Reduced for faster upload
        base64: false,
      });

      if (result.canceled) {
        return;
      }

      const file = {
        uri: result.assets[0].uri,
        name: result.assets[0].fileName || `image_${Date.now()}.jpg`,
        type: result.assets[0].mimeType || 'image/jpeg',
        size: result.assets[0].fileSize,
      };

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

  const handleTakePhoto = () => {
    setPendingAction('camera');
    setShowUploadMenu(false);
  };

  const executeTakePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Tilladelse nødvendig',
          'Vi har brug for adgang til dit kamera for at tage billeder'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7, // Reduced for faster upload
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

      // Upload certificate immediately without OCR
      const certificate = await uploadCertificate(
        file,
        entityType,
        entityId,
        {
          certificateType: file.type?.includes('pdf') ? 'PDF' : 'Billede',
          // Data will be extracted on-demand by user
          hasExtractedData: false,
          processingStatus: 'none',
        }
      );

      setCertificates(prev => [certificate, ...prev]);

      // Show success immediately
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

  const previewOcrLocally = async (uri, label) => {
    if (!uri) {
      return;
    }

    try {
      console.log(`[CertUploader][OCR] Starting ML Kit OCR for ${label || uri}`);
      const ocrResult = await runLocalCertificateOcr(uri);

      if (ocrResult?.text) {
        const snippet = ocrResult.text.length > 500
          ? `${ocrResult.text.slice(0, 500)}...`
          : ocrResult.text;
        console.log('[CertUploader][OCR] Recognized text preview:\n', snippet);
      } else {
        console.log('[CertUploader][OCR] No text detected in image');
      }
    } catch (error) {
      console.error('[CertUploader][OCR] Failed to run ML Kit:', error);
    }
  };

  // Background AI extraction with retry logic
  const extractCertificateInBackground = async (imageUri, certificateId, retryCount = 0) => {
    if (!aiExtractionEnabled) {
      console.log('[CertUploader] AI extraction disabled. Skipping background extraction.');
      return;
    }
    try {
      console.log(`[CertUploader] Starting AI extraction (attempt ${retryCount + 1})...`);
      console.log(`[CertUploader] Entity type: ${entityType}`);

      // Update status to processing
      await updateCertificateMetadata(certificateId, {
        processingStatus: 'processing',
        lastAttemptAt: new Date().toISOString(),
      });

      // Pass entity type to determine which extraction function to use
      const extractedData = await extractCertificateData(imageUri, entityType);

      console.log('[CertUploader] AI extraction completed:', extractedData);

      // Update certificate with extracted data and mark as completed
      await updateCertificateMetadata(certificateId, {
        extractedData: extractedData,
        hasExtractedData: true,
        extractedAt: new Date().toISOString(),
        processingStatus: 'completed',
        retryCount: retryCount,
      });

      // Sync to entity (organization or vehicle)
      if (extractedData) {
        if (entityType === 'organization') {
          console.log('[CertUploader] Syncing extracted data to organization...');
          await syncCertificateToOrganization(entityId, extractedData);

          // Validate the authorization
          const validation = validateAuthorization(extractedData);
          if (!validation.isValid) {
            Toast.show({
              type: 'warning',
              text1: 'AI Analyse færdig',
              text2: validation.errors[0] || 'Certificat kan være ugyldigt',
              visibilityTime: 5000,
            });
          } else if (validation.daysUntilExpiry !== null && validation.daysUntilExpiry < 30) {
            Toast.show({
              type: 'warning',
              text1: 'AI Analyse færdig',
              text2: `Certificat udløber om ${validation.daysUntilExpiry} dage`,
              visibilityTime: 5000,
            });
          } else {
            Toast.show({
              type: 'success',
              text1: 'AI Analyse færdig',
              text2: 'Certificat data udtrukket succesfuldt',
              visibilityTime: 3000,
            });
          }
        } else if (entityType === 'vehicle') {
          console.log('[CertUploader] Syncing extracted data to vehicle...');
          await syncCertificateToVehicle(entityId, extractedData);

          // Check expiry for vehicle certificates
          const expiryDate = extractedData.certificate?.expiry_date;
          if (expiryDate) {
            const expiry = new Date(expiryDate);
            const now = new Date();
            const daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 0) {
              Toast.show({
                type: 'error',
                text1: 'AI Analyse færdig',
                text2: 'Certificat er udløbet',
                visibilityTime: 5000,
              });
            } else if (daysUntilExpiry < 30) {
              Toast.show({
                type: 'warning',
                text1: 'AI Analyse færdig',
                text2: `Certificat udløber om ${daysUntilExpiry} dage`,
                visibilityTime: 5000,
              });
            } else {
              Toast.show({
                type: 'success',
                text1: 'AI Analyse færdig',
                text2: 'Køretøjscertifikat data udtrukket',
                visibilityTime: 3000,
              });
            }
          } else {
            Toast.show({
              type: 'success',
              text1: 'AI Analyse færdig',
              text2: 'Køretøjscertifikat data udtrukket',
              visibilityTime: 3000,
            });
          }
        } else {
          Toast.show({
            type: 'success',
            text1: 'AI Analyse færdig',
            text2: 'Certificat data udtrukket succesfuldt',
            visibilityTime: 3000,
          });
        }
      }

      // Reload certificates to show updated data
      loadCertificates();
    } catch (aiError) {
      console.error(`[CertUploader] AI extraction failed (attempt ${retryCount + 1}):`, aiError);

      // Get certificate to check retry count
      const certificates = await getCertificates(entityType, entityId);
      const cert = certificates.find(c => c.id === certificateId);

      if (!cert) {
        console.error('[CertUploader] Certificate not found for retry');
        return;
      }

      const maxRetries = cert.maxRetries || 3;
      const newRetryCount = retryCount + 1;

      if (newRetryCount < maxRetries) {
        // Calculate exponential backoff: 2^retryCount * 30 seconds
        const delaySeconds = Math.pow(2, newRetryCount) * 30;

        console.log(`[CertUploader] Scheduling retry ${newRetryCount + 1}/${maxRetries} in ${delaySeconds}s`);

        // Update status to retrying
        await updateCertificateMetadata(certificateId, {
          processingStatus: 'retrying',
          retryCount: newRetryCount,
          nextRetryAt: new Date(Date.now() + delaySeconds * 1000).toISOString(),
          lastError: aiError.message,
        });

        Toast.show({
          type: 'info',
          text1: 'AI Analyse fejlede',
          text2: `Prøver igen om ${delaySeconds} sekunder (${newRetryCount}/${maxRetries})`,
          visibilityTime: 4000,
        });

        // Schedule retry
        setTimeout(() => {
          extractCertificateInBackground(imageUri, certificateId, newRetryCount);
        }, delaySeconds * 1000);
      } else {
        // Max retries reached
        console.error('[CertUploader] Max retries reached for certificate:', certificateId);

        await updateCertificateMetadata(certificateId, {
          processingStatus: 'failed',
          retryCount: newRetryCount,
          lastError: aiError.message,
          failedAt: new Date().toISOString(),
        });

        Toast.show({
          type: 'error',
          text1: 'AI Analyse fejlede permanent',
          text2: 'Indtast venligst data manuelt',
          visibilityTime: 5000,
        });

        loadCertificates();
      }
    }
  };

  const handleRetry = async (certificate) => {
    try {
      // Reset retry count and status
      await updateCertificateMetadata(certificate.id, {
        processingStatus: 'pending',
        retryCount: 0,
        lastError: null,
        nextRetryAt: null,
      });

      Toast.show({
        type: 'info',
        text1: 'Genbehandler',
        text2: 'AI analyse starter igen...',
      });

      // Start extraction immediately
      const downloadUrl = certificate.downloadUrl || certificate.downloadURL;
      if (downloadUrl) {
        extractCertificateInBackground(downloadUrl, certificate.id, 0);
      }
    } catch (error) {
      console.error('Error retrying certificate:', error);
      Toast.show({
        type: 'error',
        text1: 'Fejl',
        text2: 'Kunne ikke genstarte AI analyse',
      });
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
            const status = cert.processingStatus || 'none';
            const isProcessing = ['pending', 'processing'].includes(status);
            const isRetrying = status === 'retrying';
            const isFailed = status === 'failed';
            const isCompleted = status === 'completed' && cert.hasExtractedData;

            // Determine border color based on status
            let borderColor = colors.border;
            let iconBgColor = colors.primary;
            if (isProcessing) {
              borderColor = '#2196f3';
              iconBgColor = '#2196f3';
            } else if (isRetrying) {
              borderColor = '#ff9800';
              iconBgColor = '#ff9800';
            } else if (isFailed) {
              borderColor = '#f44336';
              iconBgColor = '#f44336';
            } else if (isCompleted) {
              borderColor = '#4caf50';
            }

            return (
              <TouchableOpacity
                key={cert.id}
                style={{
                  backgroundColor: colors.white,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: borderColor,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3.84,
                  elevation: 3,
                }}
                onPress={() => {
                  setSelectedCertificate(cert);
                  setShowDetailModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: iconBgColor,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    {(isProcessing || isRetrying) ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <FileIcon size={24} color={colors.white} strokeWidth={2} />
                    )}
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
                    {isProcessing && (
                      <Text style={{ fontSize: 12, color: '#2196f3', marginTop: 2, fontWeight: '500' }}>
                      Transporta analyserer...
                      </Text>
                    )}
                    {isRetrying && (
                      <Text style={{ fontSize: 12, color: '#ff9800', marginTop: 2, fontWeight: '500' }}>
                        Prøver igen ({cert.retryCount}/{cert.maxRetries || 3})
                      </Text>
                    )}
                    {isFailed && (
                      <Text style={{ fontSize: 12, color: '#f44336', marginTop: 2, fontWeight: '500' }}>
                        Transporta fejlede - indtast manuelt eller prøv igen
                      </Text>
                    )}
                    {isCompleted && (
                      <Text style={{ fontSize: 12, color: '#4caf50', marginTop: 2, fontWeight: '500' }}>
                        ✓ AI data udtrukket
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
                      {isFailed && (cert.downloadUrl || cert.downloadURL) && (
                        <Pressable
                          style={{
                            backgroundColor: '#ff9800',
                            padding: 8,
                            borderRadius: 8,
                          }}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRetry(cert);
                          }}
                        >
                          <RefreshCw size={16} color={colors.white} />
                        </Pressable>
                      )}
                      <Pressable
                        style={{
                          backgroundColor: '#ffebee',
                          padding: 8,
                          borderRadius: 8,
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(cert);
                        }}
                      >
                        <Trash2 size={16} color="#d32f2f" />
                      </Pressable>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
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
        onDismiss={onUploadMenuHide}
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

      {/* Certificate Detail Modal */}
      <CertificateDetailModal
        visible={showDetailModal}
        certificate={selectedCertificate}
        entityType={entityType}
        entityData={entityData}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCertificate(null);
        }}
        onUpdate={async () => {
          await loadCertificates();
          // Close modal since data was updated
          setShowDetailModal(false);
          setSelectedCertificate(null);
        }}
      />
    </View>
  );
};

export default CertificateUploader;
