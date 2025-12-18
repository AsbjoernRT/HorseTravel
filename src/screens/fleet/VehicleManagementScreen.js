import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  ChevronDown,
  Car,
  CarFront,
  Caravan,
  FileText,
  CheckCircle,
} from 'lucide-react-native';
import { useOrganization } from '../../context/OrganizationContext';
import { theme, colors } from '../../styles/theme';
import { CertificateUploader } from '../../components';
import { useVehicleForm, useVehicleList } from './hooks';

// Vehicle types with display names
const VEHICLE_TYPES = [
  { value: 'Personbil', label: 'Personbil' },
  { value: 'Lastbil', label: 'Lastbil' },
  { value: 'Varebil', label: '2 hestes' },
  { value: 'Påhængsvogn', label: 'Påhængsvogn' },
];

const getVehicleTypeLabel = (type) => {
  const found = VEHICLE_TYPES.find(t => t.value === type);
  return found ? found.label : type || 'Vælg type';
};

const getVehicleIcon = (type) => {
  switch (type) {
    case 'Personbil':
      return CarFront;
    case 'Lastbil':
      return Truck;
    case 'Varebil':
      return Car;
    case 'Påhængsvogn':
      return Caravan;
    default:
      return Truck;
  }
};

const VehicleManagementScreen = ({ navigation, route }) => {
  const { activeMode, activeOrganization, hasPermission } = useOrganization();
  const [showCertificates, setShowCertificates] = useState(null);

  const canManage = activeMode === 'private' || hasPermission('canManageVehicles');

  // Use custom hooks
  const vehicleList = useVehicleList({ activeMode, activeOrganization });

  const vehicleForm = useVehicleForm({
    activeMode,
    activeOrganization,
    onSaveComplete: vehicleList.loadVehicles,
    onDeleteComplete: vehicleList.loadVehicles,
  });

  // Handle route params for editing
  useEffect(() => {
    if (route.params?.editVehicle) {
      vehicleForm.handleEdit(route.params.editVehicle);
      navigation.setParams({ editVehicle: undefined });
    }
  }, [route.params?.editVehicle]);

  if (vehicleList.loading) {
    return (
      <View style={[theme.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={theme.container}>
      {/* Certificates Modal */}
      <CertificatesModal
        vehicle={showCertificates}
        canManage={canManage}
        onClose={() => setShowCertificates(null)}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 8 }}>
        {/* Header */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>Køretøjer</Text>
          <Text style={{ fontSize: 14, color: colors.secondary, marginTop: 4 }}>
            {activeMode === 'private' ? 'Dine private køretøjer' : `${activeOrganization?.name} køretøjer`}
          </Text>
        </View>

        {/* Add/Edit Form */}
        {vehicleForm.showAddForm && canManage ? (
          <VehicleForm
            form={vehicleForm}
            canManage={canManage}
          />
        ) : canManage ? (
          <TouchableOpacity
            style={{
              backgroundColor: colors.secondary,
              padding: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
            }}
            onPress={() => vehicleForm.setShowAddForm(true)}
          >
            <Plus size={20} color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>Tilføj køretøj</Text>
          </TouchableOpacity>
        ) : null}

        {/* Sort Options */}
        {vehicleList.vehicles.length > 0 && (
          <SortOptions sortBy={vehicleList.sortBy} onSortChange={vehicleList.setSortBy} />
        )}

        {/* Vehicle List */}
        {vehicleList.vehicles.length === 0 ? (
          <EmptyState canManage={canManage} />
        ) : (
          <FlatList
            data={vehicleList.getSortedVehicles()}
            renderItem={({ item }) => (
              <VehicleListItem
                vehicle={item}
                canManage={canManage}
                onEdit={vehicleForm.handleEdit}
                onDelete={vehicleForm.handleDelete}
                onShowCertificates={setShowCertificates}
              />
            )}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </View>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

const CertificatesModal = ({ vehicle, canManage, onClose }) => (
  <Modal
    visible={vehicle !== null}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(214, 209, 202, 0.2)',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.white }}>
            {vehicle?.licensePlate}
          </Text>
          <Text style={{ fontSize: 14, color: colors.secondary, marginTop: 2 }}>
            {vehicle?.make} {vehicle?.model}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={{ backgroundColor: colors.secondary, padding: 8, borderRadius: 8 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>Luk</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {vehicle && (
          <CertificateUploader
            entityType="vehicle"
            entityId={vehicle.id}
            entityData={vehicle}
            canManage={canManage}
          />
        )}
      </ScrollView>
    </View>
  </Modal>
);

const VehicleForm = ({ form, canManage }) => (
  <View style={{
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 12 }}>
      {form.newlyCreatedVehicle ? 'Upload certifikater (valgfrit)' : form.editingVehicle ? 'Rediger køretøj' : 'Tilføj køretøj'}
    </Text>

    {form.newlyCreatedVehicle ? (
      <NewVehicleSuccess form={form} canManage={canManage} />
    ) : (
      <VehicleFormFields form={form} canManage={canManage} />
    )}
  </View>
);

const NewVehicleSuccess = ({ form, canManage }) => (
  <>
    <View style={{
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.white, textAlign: 'center' }}>
        ✓ Køretøj oprettet: {form.newlyCreatedVehicle.licensePlate}
      </Text>
      <Text style={{ fontSize: 14, color: colors.white, textAlign: 'center', marginTop: 4 }}>
        {form.newlyCreatedVehicle.make} {form.newlyCreatedVehicle.model}
      </Text>
    </View>

    <CertificateUploader
      entityType="vehicle"
      entityId={form.newlyCreatedVehicle.id}
      entityData={form.newlyCreatedVehicle}
      canManage={canManage}
    />

    <TouchableOpacity
      style={{
        padding: 16,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        marginTop: 16,
      }}
      onPress={form.resetForm}
    >
      <Text style={{ color: colors.white, fontSize: 16, fontWeight: 'bold' }}>Færdig</Text>
    </TouchableOpacity>
  </>
);

const VehicleFormFields = ({ form, canManage }) => (
  <>
    {/* License Plate */}
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
        Registreringsnummer *
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: colors.white,
            padding: 12,
            borderRadius: 8,
            fontSize: 16,
            color: colors.primary,
          }}
          placeholder="XX 12345"
          value={form.licensePlate}
          onChangeText={form.setLicensePlate}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            minWidth: 100,
          }}
          onPress={form.handleFetchVehicleData}
          disabled={form.fetchingVehicleData || !form.licensePlate.trim()}
        >
          {form.fetchingVehicleData ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Search size={16} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600' }}>Hent data</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>

    {/* Make */}
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>Mærke *</Text>
      <TextInput
        style={{
          backgroundColor: colors.white,
          padding: 12,
          borderRadius: 8,
          fontSize: 16,
          color: colors.primary,
        }}
        placeholder="F.eks. Mercedes"
        value={form.make}
        onChangeText={form.setMake}
      />
    </View>

    {/* Model */}
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>Model *</Text>
      <TextInput
        style={{
          backgroundColor: colors.white,
          padding: 12,
          borderRadius: 8,
          fontSize: 16,
          color: colors.primary,
        }}
        placeholder="F.eks. Sprinter"
        value={form.model}
        onChangeText={form.setModel}
      />
    </View>

    {/* Vehicle Type */}
    <VehicleTypeDropdown form={form} />

    {/* Capacity */}
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>
        Kapacitet (antal heste)
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.white,
          padding: 12,
          borderRadius: 8,
          fontSize: 16,
          color: colors.primary,
        }}
        placeholder="F.eks. 2"
        value={form.capacity}
        onChangeText={form.setCapacity}
        keyboardType="number-pad"
      />
    </View>

    {/* Certificate Upload - Only when editing */}
    {form.editingVehicle && (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>Certifikater</Text>
        <CertificateUploader
          entityType="vehicle"
          entityId={form.editingVehicle.id}
          entityData={form.editingVehicle}
          canManage={canManage}
        />
      </View>
    )}

    {/* Action Buttons */}
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <TouchableOpacity
        style={{
          flex: 1,
          padding: 16,
          borderRadius: 12,
          backgroundColor: '#666',
          alignItems: 'center',
        }}
        onPress={form.resetForm}
      >
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: '600' }}>Annuller</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          flex: 1,
          padding: 16,
          borderRadius: 12,
          backgroundColor: colors.primary,
          alignItems: 'center',
        }}
        onPress={form.handleSave}
      >
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: 'bold' }}>
          {form.editingVehicle ? 'Opdater' : 'Opret'}
        </Text>
      </TouchableOpacity>
    </View>
  </>
);

const VehicleTypeDropdown = ({ form }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 4 }}>Køretøjstype</Text>
    <TouchableOpacity
      style={{
        backgroundColor: colors.white,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
      onPress={() => form.setShowTypeDropdown(true)}
    >
      <Text style={{
        fontSize: 16,
        color: form.vehicleType ? colors.primary : colors.placeholder,
      }}>
        {getVehicleTypeLabel(form.vehicleType)}
      </Text>
      <ChevronDown size={20} color={colors.textSecondary} />
    </TouchableOpacity>

    <Modal
      visible={form.showTypeDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => form.setShowTypeDropdown(false)}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={1}
        onPress={() => form.setShowTypeDropdown(false)}
      >
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 12,
          padding: 8,
          width: '80%',
          maxWidth: 400,
        }}>
          {VEHICLE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={{
                padding: 16,
                borderRadius: 8,
                backgroundColor: form.vehicleType === type.value ? colors.secondary : 'transparent',
              }}
              onPress={() => {
                form.setVehicleType(type.value);
                form.setShowTypeDropdown(false);
              }}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: form.vehicleType === type.value ? '600' : '400',
                color: colors.primary,
              }}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  </View>
);

const SortOptions = ({ sortBy, onSortChange }) => (
  <View style={{ marginBottom: 16 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <ArrowUpDown size={16} color={colors.textSecondary} />
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Sortér efter:</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { key: 'recent', label: 'Nyeste' },
          { key: 'name', label: 'Navn' },
          { key: 'plate', label: 'Nummerplade' },
          { key: 'type', label: 'Type' },
          { key: 'weight', label: 'Vægt' },
        ].map((option) => (
          <TouchableOpacity
            key={option.key}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: sortBy === option.key ? colors.primary : colors.secondary,
              borderWidth: 1,
              borderColor: sortBy === option.key ? colors.primary : colors.border,
            }}
            onPress={() => onSortChange(option.key)}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: sortBy === option.key ? colors.white : colors.textSecondary,
            }}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </View>
);

const VehicleListItem = ({ vehicle, canManage, onEdit, onDelete, onShowCertificates }) => {
  const VehicleIcon = getVehicleIcon(vehicle.vehicleType);

  return (
    <View style={{
      backgroundColor: colors.white,
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
    }}>
      {/* Certificate Badge */}
      {vehicle.certificateCount > 0 && (
        <View style={{
          position: 'absolute',
          top: 12,
          right: 12,
          backgroundColor: '#4caf50',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}>
          <CheckCircle size={12} color="white" strokeWidth={2.5} />
          <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>Dokumenter</Text>
        </View>
      )}

      {/* Icon */}
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        <VehicleIcon size={24} color={colors.primary} strokeWidth={2} />
      </View>

      {/* Vehicle Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
            {vehicle.licensePlate}
          </Text>
          {vehicle.inTransport && (
            <View style={{
              backgroundColor: '#ff9800',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}>
              <Text style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>I TRANSPORT</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          {vehicle.make} {vehicle.model}
          {vehicle.variant ? ` ${vehicle.variant}` : ''}
        </Text>
        {vehicle.vehicleType && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            {getVehicleTypeLabel(vehicle.vehicleType)}
            {vehicle.firstRegistration ? ` • ${vehicle.firstRegistration.substring(0, 4)}` : ''}
          </Text>
        )}
        {vehicle.totalWeight && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Totalvægt: {vehicle.totalWeight} kg
          </Text>
        )}
        {vehicle.capacity && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Kapacitet: {vehicle.capacity} heste
          </Text>
        )}
        {vehicle.motInfo?.date && (
          <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
            Seneste Syn: {vehicle.motInfo.date}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          style={{ backgroundColor: colors.secondary, padding: 8, borderRadius: 8 }}
          onPress={() => onShowCertificates(vehicle)}
        >
          <FileText size={18} color={colors.primary} />
        </Pressable>
        {canManage && (
          <>
            <Pressable
              style={{ backgroundColor: colors.secondary, padding: 8, borderRadius: 8 }}
              onPress={() => onEdit(vehicle)}
            >
              <Edit2 size={18} color={colors.primary} />
            </Pressable>
            <Pressable
              style={{ backgroundColor: '#ffebee', padding: 8, borderRadius: 8 }}
              onPress={() => onDelete(vehicle)}
            >
              <Trash2 size={18} color="#d32f2f" />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
};

const EmptyState = ({ canManage }) => (
  <View style={{ alignItems: 'center', marginTop: 40 }}>
    <Truck size={64} color={colors.secondary} strokeWidth={1.5} />
    <Text style={{ fontSize: 16, color: colors.secondary, marginTop: 16, textAlign: 'center' }}>
      {canManage
        ? 'Ingen køretøjer endnu.\nTilføj dit første køretøj ovenfor.'
        : 'Ingen køretøjer tilgængelige.'}
    </Text>
  </View>
);

export default VehicleManagementScreen;
