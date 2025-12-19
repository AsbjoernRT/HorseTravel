import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { X, Plus, Minus, Maximize2 } from 'lucide-react-native';
import { colors } from '../../styles/theme';
import { loadGoogleMapsAPI } from '../../utils/googleMapsLoader';
import { decodePolyline } from '../../utils/polylineDecoder';

// On-demand modal that previews the planned Google Maps route and highlights border crossings.
const RouteMapModal = ({ visible, onClose, routeInfo, fromLocation, toLocation }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const nativeMapRef = useRef(null);
  const [currentRegion, setCurrentRegion] = useState(null);

  // Decode polyline for native maps
  const routeCoordinates = routeInfo?.polyline ? decodePolyline(routeInfo.polyline) : [];

  const handleZoomIn = () => {
    if (nativeMapRef.current && currentRegion) {
      const newRegion = {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta / 2,
        longitudeDelta: currentRegion.longitudeDelta / 2,
      };
      nativeMapRef.current.animateToRegion(newRegion, 300);
    }
  };

  const handleZoomOut = () => {
    if (nativeMapRef.current && currentRegion) {
      const newRegion = {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta * 2,
        longitudeDelta: currentRegion.longitudeDelta * 2,
      };
      nativeMapRef.current.animateToRegion(newRegion, 300);
    }
  };

  const handleFitToRoute = () => {
    if (nativeMapRef.current && routeCoordinates.length > 0) {
      nativeMapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  useEffect(() => {
    if (!visible || !routeInfo || Platform.OS !== 'web') return;

    // Initialize Google Maps on web
    const initMap = () => {
      console.log('initMap called');
      console.log('window.google:', !!window.google);
      console.log('window.google.maps:', !!window.google?.maps);
      console.log('geometry.encoding:', !!window.google?.maps?.geometry?.encoding);
      console.log('mapContainerRef.current:', mapContainerRef.current);

      if (!window.google || !window.google.maps || !window.google.maps.geometry || !window.google.maps.geometry.encoding || !mapContainerRef.current) {
        console.log('initMap early return - not ready');
        return;
      }

      console.log('Creating map with polyline:', routeInfo.polyline);

      // Decode polyline
      const decodedPath = window.google.maps.geometry.encoding.decodePath(routeInfo.polyline);
      console.log('Decoded path points:', decodedPath.length);

      // Create map
      const map = new window.google.maps.Map(mapContainerRef.current, {
        zoom: 7,
        mapTypeId: 'roadmap',
      });

      mapRef.current = map;

      // Draw route polyline
      const routePath = new window.google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: colors.primary,
        strokeOpacity: 1.0,
        strokeWeight: 4,
      });

      routePath.setMap(map);

      // Add start marker
      new window.google.maps.Marker({
        position: decodedPath[0],
        map: map,
        title: 'Start',
        label: 'A',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        },
      });

      // Add end marker
      new window.google.maps.Marker({
        position: decodedPath[decodedPath.length - 1],
        map: map,
        title: 'Destination',
        label: 'B',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        },
      });

      // Fit bounds to show entire route
      const bounds = new window.google.maps.LatLngBounds();
      decodedPath.forEach(point => bounds.extend(point));
      map.fitBounds(bounds);
    };

    // Load Google Maps API using centralized loader
    loadGoogleMapsAPI(['places', 'geometry']).then(initMap).catch(error => {
      console.error('Failed to load Google Maps API:', error);
    });
  }, [visible, routeInfo]);

  if (!routeInfo) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        {/* Header */}
        <View style={{
          backgroundColor: colors.white,
          paddingTop: Platform.OS === 'ios' ? 50 : 20,
          paddingBottom: 15,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
              Rute Oversigt
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
              {routeInfo.distance.text} • {routeInfo.duration.text}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.secondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <X size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Map */}
        {Platform.OS === 'web' ? (
          <div
            ref={mapContainerRef}
            style={{ flex: 1, width: '100%', height: '100%' }}
          />
        ) : (
          <View style={{ flex: 1, position: 'relative' }}>
            <MapView
              ref={nativeMapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={{ flex: 1 }}
              initialRegion={
                routeCoordinates.length > 0
                  ? {
                      latitude: routeCoordinates[0].latitude,
                      longitude: routeCoordinates[0].longitude,
                      latitudeDelta: 0.5,
                      longitudeDelta: 0.5,
                    }
                  : undefined
              }
              onRegionChangeComplete={(region) => setCurrentRegion(region)}
              onLayout={() => {
                // Fit map to show entire route after layout
                if (nativeMapRef.current && routeCoordinates.length > 0) {
                  nativeMapRef.current.fitToCoordinates(routeCoordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                  });
                }
              }}
            >
            {/* Route Polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={colors.primary}
                strokeWidth={4}
              />
            )}

            {/* Start Marker */}
            {routeCoordinates.length > 0 && (
              <Marker
                coordinate={routeCoordinates[0]}
                title="Start"
                description={fromLocation}
                pinColor="green"
              />
            )}

            {/* End Marker */}
            {routeCoordinates.length > 0 && (
              <Marker
                coordinate={routeCoordinates[routeCoordinates.length - 1]}
                title="Destination"
                description={toLocation}
                pinColor="red"
              />
            )}
          </MapView>

          {/* Zoom Controls - Only for native */}
          {Platform.OS !== 'web' && (
            <View
              style={{
                position: 'absolute',
                right: 16,
                bottom: 16,
                gap: 8,
              }}
            >
              {/* Fit to Route */}
              <TouchableOpacity
                onPress={handleFitToRoute}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.white,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <Maximize2 size={20} color={colors.primary} strokeWidth={2} />
              </TouchableOpacity>

              {/* Zoom In */}
              <TouchableOpacity
                onPress={handleZoomIn}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.white,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <Plus size={24} color={colors.primary} strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Zoom Out */}
              <TouchableOpacity
                onPress={handleZoomOut}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.white,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <Minus size={24} color={colors.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        )}

        {/* Info Footer */}
        <View style={{
          backgroundColor: colors.white,
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        }}>
          {routeInfo.borderCrossing && (
            <View style={{
              backgroundColor: '#fff3cd',
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#ffc107',
            }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#856404', marginBottom: 4 }}>
                ⚠️ Grænseoverskridelse
              </Text>
              <Text style={{ fontSize: 11, color: '#856404' }}>
                Lande: {routeInfo.countries.join(', ')}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#666' }}>Afstand</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>
                {routeInfo.distance.text}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#e0e0e0' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#666' }}>Estimeret tid</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>
                {routeInfo.duration.text}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default RouteMapModal;
