import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable, Linking } from 'react-native';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Truck,
  Heart,
  FileText,
  Phone,
  Mail,
  Play,
  X,
  Caravan,
  Pause,
  CheckCircle,
  Globe,
  ExternalLink,
} from 'lucide-react-native';
import { theme, colors } from '../../styles/theme';
import { useOrganization } from '../../context/OrganizationContext';
import { useTransport } from '../../context/TransportContext';
import { formatDateTime } from '../../utils/timeUtils';
import { ComplianceChecklist } from '../../components';
import { useTransportDetails } from './hooks';

// Status utilities
const getStatusColor = (status) => {
  switch (status) {
    case 'planned': return '#ffa500';
    case 'active': return '#4CAF50';
    case 'completed': return '#666';
    case 'cancelled': return '#d32f2f';
    default: return '#999';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'planned': return 'Planlagt';
    case 'active': return 'Aktiv';
    case 'completed': return 'Afsluttet';
    case 'cancelled': return 'Annulleret';
    default: return status;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'Ikke angivet';
  const date = new Date(dateString);
  return date.toLocaleDateString('da-DK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (timeString) => timeString || 'Ikke angivet';

const TransportDetailsScreen = ({ navigation, route }) => {
  const { transportId } = route.params;
  const { hasPermission, activeMode } = useOrganization();
  const { startTransport, stopTransport } = useTransport();

  const canManage = activeMode === 'private' || hasPermission('canManageTours');

  const details = useTransportDetails({
    transportId,
    activeMode,
    onNavigateBack: () => navigation.goBack(),
    startTransportContext: startTransport,
    stopTransportContext: stopTransport,
  });

  if (details.loading) {
    return (
      <View style={[theme.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (!details.transport) {
    return (
      <View style={[theme.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: colors.secondary }}>Transport ikke fundet</Text>
      </View>
    );
  }

  const { transport, elapsedTime, estimatedArrival } = details;

  return (
    <ScrollView style={theme.container}>
      <View style={{ padding: 16 }}>
        {/* Header with Status */}
        <HeaderSection transport={transport} elapsedTime={elapsedTime} />

        {/* Route Information */}
        <RouteCard transport={transport} />

        {/* Date & Time Information */}
        <TimeCard transport={transport} estimatedArrival={estimatedArrival} />

        {/* Vehicle Information */}
        <VehicleCard transport={transport} />

        {/* Horses Information */}
        <HorsesCard transport={transport} />

        {/* Contact Information */}
        <ContactCard transport={transport} />

        {/* TRACES Certificate */}
        {transport.tracesNumber && <TRACESCard transport={transport} />}

        {/* Related Documents */}
        <DocumentsCard transport={transport} />

        {/* Compliance Status */}
        {transport.complianceRequirements && (
          <View style={{ marginBottom: 16 }}>
            <ComplianceChecklist
              requirements={transport.complianceRequirements}
              confirmedDocuments={transport.confirmedDocuments || []}
              editable={false}
            />
          </View>
        )}

        {/* Notes */}
        <NotesCard transport={transport} />

        {/* Action Buttons */}
        {canManage && (
          <ActionButtons
            transport={transport}
            onStart={() => details.setShowStartModal(true)}
            onStop={() => details.setShowStopModal(true)}
            onEdit={() => navigation.navigate('StartTransport', { editTransport: transport })}
          />
        )}
      </View>

      {/* Start Transport Modal */}
      <StartTransportModal
        visible={details.showStartModal}
        onClose={() => details.setShowStartModal(false)}
        onStartNow={() => details.handleStartTransport(false)}
        onStartFromScheduled={() => details.handleStartTransport(true)}
        isScheduledInPast={details.isScheduledInPast()}
        loading={details.startingTransport}
        transport={transport}
      />

      {/* Stop Transport Modal */}
      <StopTransportModal
        visible={details.showStopModal}
        onClose={() => details.setShowStopModal(false)}
        onComplete={() => details.handleStopTransport('completed')}
        onRevert={() => details.handleStopTransport('planned')}
        loading={details.stoppingTransport}
      />
    </ScrollView>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

const HeaderSection = ({ transport, elapsedTime }) => (
  <View style={{ marginBottom: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <View style={{
        backgroundColor: getStatusColor(transport.status),
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
      }}>
        <Text style={{ color: colors.white, fontSize: 14, fontWeight: 'bold' }}>
          {getStatusText(transport.status)}
        </Text>
      </View>
      <Text style={{ fontSize: 16, color: '#666' }}>
        Transport #{transport.id.substring(0, 8)}
      </Text>
    </View>

    {transport.status === 'active' && elapsedTime && (
      <View style={{
        backgroundColor: '#e8f5e9',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
        marginTop: 12,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="#4CAF50" strokeWidth={2.5} />
          <Text style={{ fontSize: 14, color: '#2e7d32', fontWeight: '600' }}>
            Transport i gang: {elapsedTime}
          </Text>
        </View>
        {transport.actualStartTime && (
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4, marginLeft: 26 }}>
            Startet: {formatDateTime(transport.actualStartTime)}
          </Text>
        )}
      </View>
    )}
  </View>
);

const RouteCard = ({ transport }) => (
  <View style={{ backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>Rute</Text>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <MapPin size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>Fra</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>{transport.fromLocation}</Text>
      </View>
    </View>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <MapPin size={20} color="#666" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>Til</Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{transport.toLocation}</Text>
      </View>
    </View>

    {(transport.distance || transport.durationText || transport.routeInfo) && (
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
        {(transport.distance || transport.routeInfo?.distanceText) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MapPin size={16} color="#666" />
            <Text style={{ fontSize: 14, color: '#666' }}>
              Afstand: {transport.distance || transport.routeInfo?.distanceText || 'Ukendt'}
            </Text>
          </View>
        )}
        {(transport.durationText || transport.routeInfo?.durationText) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="#666" />
            <Text style={{ fontSize: 14, color: '#666' }}>
              Estimeret køretid: {transport.durationText || transport.routeInfo?.durationText}
            </Text>
          </View>
        )}
      </View>
    )}
  </View>
);

const TimeCard = ({ transport, estimatedArrival }) => (
  <View style={{ backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>Tidspunkt</Text>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <Calendar size={20} color={colors.primary} />
      <View>
        <Text style={{ fontSize: 12, color: '#666' }}>Afgang</Text>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{formatDate(transport.departureDate)}</Text>
      </View>
    </View>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Clock size={20} color={colors.primary} />
      <View>
        <Text style={{ fontSize: 12, color: '#666' }}>Tidspunkt</Text>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{formatTime(transport.departureTime)}</Text>
      </View>
    </View>

    {transport.status === 'active' && estimatedArrival && (
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Clock size={20} color={estimatedArrival.startsWith('Forsinket') ? '#d32f2f' : '#4CAF50'} />
          <View>
            <Text style={{ fontSize: 12, color: '#666' }}>Forventet ankomst</Text>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: estimatedArrival.startsWith('Forsinket') ? '#d32f2f' : '#333',
            }}>
              {estimatedArrival}
            </Text>
          </View>
        </View>
      </View>
    )}

    {transport.arrivalDate && (
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Calendar size={20} color="#666" />
          <View>
            <Text style={{ fontSize: 12, color: '#666' }}>Ankomst</Text>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>
              {formatDate(transport.arrivalDate)} {transport.arrivalTime && `kl. ${transport.arrivalTime}`}
            </Text>
          </View>
        </View>
      </View>
    )}
  </View>
);

const VehicleCard = ({ transport }) => (
  <View style={{ backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>Køretøj</Text>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: transport.trailerId ? 12 : 0 }}>
      <Truck size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{transport.vehicleName || 'Ikke angivet'}</Text>
        {transport.vehicleCapacity && (
          <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
            Kapacitet: {transport.vehicleCapacity} heste
          </Text>
        )}
      </View>
    </View>

    {transport.trailerId && (
      <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Caravan size={20} color={colors.primary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Trailer</Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>{transport.trailerName}</Text>
          </View>
        </View>
      </View>
    )}
  </View>
);

const HorsesCard = ({ transport }) => (
  <View style={{ backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>Heste</Text>

    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <Users size={20} color={colors.primary} />
      <Text style={{ fontSize: 16, fontWeight: '600' }}>
        {transport.horseCount || 0} {transport.horseCount === 1 ? 'hest' : 'heste'}
      </Text>
    </View>

    {transport.horses && transport.horses.length > 0 ? (
      <View style={{ marginTop: 8 }}>
        {transport.horses.map((horse, index) => (
          <View key={horse.id || index} style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            backgroundColor: index % 2 === 0 ? '#f9f9f9' : colors.white,
            borderRadius: 8,
            marginBottom: 8,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Heart size={18} color={colors.secondary} fill={colors.secondary} />
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>{horse.name}</Text>
            </View>

            {horse.breed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 26, marginTop: 4 }}>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>Oprindelse: </Text>
                <Text style={{ fontSize: 13, color: '#666' }}>{horse.breed}</Text>
              </View>
            )}

            {horse.age && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 26, marginTop: 2 }}>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>Født: </Text>
                <Text style={{ fontSize: 13, color: '#666' }}>{horse.age}</Text>
              </View>
            )}

            {horse.chipNumber && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 26, marginTop: 2 }}>
                <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>Pasnummer: </Text>
                <Text style={{ fontSize: 13, color: '#666' }}>{horse.chipNumber}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    ) : (
      <View style={{ padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8, alignItems: 'center', marginTop: 8 }}>
        <Text style={{ fontSize: 14, color: '#999' }}>Ingen heste detaljer tilgængelige</Text>
      </View>
    )}
  </View>
);

const ContactCard = ({ transport }) => {
  if (!transport.contactPerson && !transport.contactPhone && !transport.contactEmail) return null;

  return (
    <View style={{ backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>Kontakt</Text>

      {transport.contactPerson && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Users size={20} color={colors.primary} />
          <Text style={{ fontSize: 16 }}>{transport.contactPerson}</Text>
        </View>
      )}

      {transport.contactPhone && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Phone size={20} color={colors.primary} />
          <Text style={{ fontSize: 16 }}>{transport.contactPhone}</Text>
        </View>
      )}

      {transport.contactEmail && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Mail size={20} color={colors.primary} />
          <Text style={{ fontSize: 16 }}>{transport.contactEmail}</Text>
        </View>
      )}
    </View>
  );
};

const NotesCard = ({ transport }) => {
  if (!transport.notes) return null;

  return (
    <View style={{ backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>Noter</Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <FileText size={20} color={colors.primary} style={{ marginTop: 2 }} />
        <Text style={{ fontSize: 16, lineHeight: 24, flex: 1 }}>{transport.notes}</Text>
      </View>
    </View>
  );
};

const DocumentsCard = ({ transport }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [transport]);

  const loadDocuments = async () => {
    try {
      const { getCertificates } = require('../../services/documents/certificateService');
      const allDocs = [];

      // Load organization documents
      if (transport.organizationId) {
        const orgDocs = await getCertificates('organization', transport.organizationId);
        orgDocs.forEach(doc => allDocs.push({ ...doc, source: 'Virksomhed' }));
      }

      // Load vehicle documents
      if (transport.vehicleId) {
        const vehicleDocs = await getCertificates('vehicle', transport.vehicleId);
        vehicleDocs.forEach(doc => allDocs.push({ ...doc, source: 'Køretøj' }));
      }

      // Load horse documents
      if (transport.horseIds?.length > 0) {
        for (const horseId of transport.horseIds) {
          const horseDocs = await getCertificates('horse', horseId);
          const horseName = transport.horseNames?.[transport.horseIds.indexOf(horseId)] || 'Hest';
          horseDocs.forEach(doc => allDocs.push({ ...doc, source: horseName }));
        }
      }

      setDocuments(allDocs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDocument = async (doc) => {
    const url = doc.downloadURL || doc.downloadUrl;
    if (url) {
      await Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FileText size={20} color={colors.primary} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>Dokumenter</Text>
        </View>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <View style={{ backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 16 }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <FileText size={20} color={colors.primary} />
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>Dokumenter</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>{documents.length} tilgængelige</Text>
          </View>
        </View>
        <Text style={{ fontSize: 20, color: colors.primary }}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 16 }}>
          {documents.map((doc, index) => (
            <TouchableOpacity
              key={doc.id || index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor: '#f9f9f9',
                borderRadius: 8,
                marginBottom: index < documents.length - 1 ? 8 : 0,
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
                <FileText size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
                  {doc.displayName || doc.fileName || 'Dokument'}
                </Text>
                <Text style={{ fontSize: 12, color: '#666' }}>
                  {doc.documentType || doc.source}
                </Text>
              </View>
              <ExternalLink size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const TRACESCard = ({ transport }) => {
  const formatTRACESDate = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={{
      backgroundColor: '#e8f5e9',
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#4CAF50',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#4CAF50',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Globe size={22} color="#fff" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1b5e20' }}>
            EU TRACES Certifikat
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <CheckCircle size={14} color="#4CAF50" strokeWidth={2.5} />
            <Text style={{ fontSize: 12, color: '#2e7d32', fontWeight: '600' }}>
              Registreret
            </Text>
          </View>
        </View>
      </View>

      <View style={{
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#c8e6c9',
      }}>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Reference nummer:</Text>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1b5e20', fontFamily: 'monospace' }}>
          {transport.tracesNumber}
        </Text>
        {transport.tracesRegisteredAt && (
          <Text style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
            Oprettet: {formatTRACESDate(transport.tracesRegisteredAt)}
          </Text>
        )}
      </View>
    </View>
  );
};

const ActionButtons = ({ transport, onStart, onStop, onEdit }) => (
  <View style={{ marginTop: 8, marginBottom: 32, gap: 12 }}>
    {transport.status === 'planned' && (
      <TouchableOpacity
        style={{
          backgroundColor: colors.primary,
          padding: 16,
          borderRadius: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}
        onPress={onStart}
      >
        <Play size={20} color={colors.white} strokeWidth={2.5} fill={colors.white} />
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white }}>Start Transport</Text>
      </TouchableOpacity>
    )}

    {transport.status === 'active' && (
      <TouchableOpacity
        style={{
          backgroundColor: '#d32f2f',
          padding: 16,
          borderRadius: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}
        onPress={onStop}
      >
        <Pause size={20} color={colors.white} strokeWidth={2.5} />
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white }}>Stop Transport</Text>
      </TouchableOpacity>
    )}

    {transport.status === 'planned' && (
      <TouchableOpacity
        style={{
          backgroundColor: colors.secondary,
          padding: 16,
          borderRadius: 12,
          alignItems: 'center',
        }}
        onPress={onEdit}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>Rediger Transport</Text>
      </TouchableOpacity>
    )}
  </View>
);

const StartTransportModal = ({ visible, onClose, onStartNow, onStartFromScheduled, isScheduledInPast, loading, transport }) => (
  <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 24, width: '85%', maxWidth: 400 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>Start Transport</Text>
          <Pressable onPress={onClose}>
            <X size={24} color={colors.primary} />
          </Pressable>
        </View>

        <Text style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>Hvornår vil du starte transporten?</Text>

        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 12,
          }}
          onPress={onStartNow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white, marginBottom: 4 }}>Start Nu</Text>
              <Text style={{ fontSize: 12, color: colors.white, opacity: 0.9 }}>Afgang tidspunkt opdateres til nu</Text>
            </>
          )}
        </TouchableOpacity>

        {isScheduledInPast && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 12,
            }}
            onPress={onStartFromScheduled}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 4 }}>
                  Start fra Planlagt Tidspunkt
                </Text>
                <Text style={{ fontSize: 12, color: colors.primary, opacity: 0.8 }}>
                  Beholder afgang: {formatDate(transport?.departureDate)} kl. {formatTime(transport?.departureTime)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={onClose} disabled={loading}>
          <Text style={{ fontSize: 14, color: '#666' }}>Annuller</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const StopTransportModal = ({ visible, onClose, onComplete, onRevert, loading }) => (
  <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 24, width: '85%', maxWidth: 400 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>Stop Transport</Text>
          <Pressable onPress={onClose}>
            <X size={24} color={colors.primary} />
          </Pressable>
        </View>

        <Text style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>Hvordan vil du afslutte transporten?</Text>

        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
          onPress={onComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <CheckCircle size={20} color={colors.white} strokeWidth={2.5} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white }}>Afslut Transport</Text>
                <Text style={{ fontSize: 12, color: colors.white, opacity: 0.9, marginTop: 2 }}>
                  Marker som gennemført
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#ffa500',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
          onPress={onRevert}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <X size={20} color={colors.white} strokeWidth={2.5} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.white }}>Fortryd Start</Text>
                <Text style={{ fontSize: 12, color: colors.white, opacity: 0.9, marginTop: 2 }}>
                  Tilbage til planlagt
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={onClose} disabled={loading}>
          <Text style={{ fontSize: 14, color: '#666' }}>Annuller</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default TransportDetailsScreen;
