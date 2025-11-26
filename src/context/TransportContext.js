import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { getTransportsByStatus, updateTransport as updateTransportInDB } from '../services/transportService';

// Lightweight state container that mirrors the currently active transport flow on the device.

// Auto-stop threshold: transport will be auto-stopped if actual time exceeds proposed time by this percentage
const AUTO_STOP_THRESHOLD_PERCENT = 50; // 50% over the proposed time

const TransportContext = createContext();

export const useTransport = () => {
  const context = useContext(TransportContext);
  if (!context) {
    throw new Error('useTransport must be used within a TransportProvider');
  }
  return context;
};

export const TransportProvider = ({ children, user, activeMode, activeOrganization }) => {
  const [activeTransport, setActiveTransport] = useState(null);
  const [completedTransports, setCompletedTransports] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Generate more unique IDs using timestamp + random
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  // Check if transport should be auto-stopped based on proposed time
  const shouldAutoStopTransport = useCallback((transport) => {
    if (!transport || transport.status !== 'active') {
      return false;
    }

    // Get proposed time from routeInfo.duration (in seconds) or proposedTime (in minutes)
    const proposedTimeMinutes = transport.proposedTime ||
      (transport.routeInfo?.duration ? transport.routeInfo.duration / 60 : null);

    if (!proposedTimeMinutes) {
      return false; // No proposed time available
    }

    const startTime = transport.actualStartTime ? new Date(transport.actualStartTime) : null;
    if (!startTime || isNaN(startTime.getTime())) return false;

    const now = new Date();
    const actualDurationMinutes = (now - startTime) / (1000 * 60);

    // Calculate the threshold (proposed time + percentage)
    const threshold = proposedTimeMinutes * (1 + AUTO_STOP_THRESHOLD_PERCENT / 100);

    return actualDurationMinutes > threshold;
  }, []);

  // Auto-stop transport if it exceeds the threshold
  const autoStopTransport = useCallback(async (transport) => {
    try {
      console.log(`Auto-stopping transport ${transport.id} - exceeded proposed time by ${AUTO_STOP_THRESHOLD_PERCENT}%`);

      // Calculate the end time based on proposed time + threshold
      const startTime = new Date(transport.actualStartTime);
      if (isNaN(startTime.getTime())) {
        console.error('Invalid actualStartTime for auto-stop');
        return null;
      }

      // Get proposed time from routeInfo.duration (in seconds) or proposedTime (in minutes)
      const proposedTimeMinutes = transport.proposedTime ||
        (transport.routeInfo?.duration ? transport.routeInfo.duration / 60 : null);

      if (!proposedTimeMinutes) {
        console.error('No proposed time available for auto-stop');
        return null;
      }

      const calculatedEndTime = new Date(startTime.getTime() + proposedTimeMinutes * 60 * 1000);

      const completedTransport = {
        ...transport,
        actualEndTime: calculatedEndTime.toISOString(),
        status: 'completed',
        autoStopped: true, // Flag to indicate it was auto-stopped
      };

      // Update in database
      await updateTransportInDB(transport.id, {
        actualEndTime: completedTransport.actualEndTime,
        status: 'completed',
        autoStopped: true,
      });

      // Update local state
      setCompletedTransports(prev => {
        const updated = [...prev, completedTransport];
        return updated.slice(-50);
      });
      setActiveTransport(null);

      return completedTransport;
    } catch (error) {
      console.error('Error auto-stopping transport:', error);
      return null;
    }
  }, []);

  // Load active transport from database on mount and when mode/org changes
  useEffect(() => {
    const loadActiveTransport = async () => {
      try {
        // Don't load if user not authenticated or mode info not ready
        if (!user || !activeMode) {
          setIsInitialized(true);
          return;
        }

        const activeTransports = await getTransportsByStatus('active', activeMode, activeOrganization?.id);

        // Only consider transports owned by the current user
        const ownActiveTransports = activeTransports.filter(t => t.ownerId === user.uid);

        if (ownActiveTransports && ownActiveTransports.length > 0) {
          // If multiple active transports exist, take the newest one
          const sortedTransports = ownActiveTransports.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
          });

          const mostRecentActive = sortedTransports[0];

          // Check if transport should be auto-stopped
          if (shouldAutoStopTransport(mostRecentActive)) {
            await autoStopTransport(mostRecentActive);
          } else {
            setActiveTransport(mostRecentActive);
          }

          // Warn if multiple active transports found
          if (ownActiveTransports.length > 1) {
            console.warn(`Found ${ownActiveTransports.length} active transports owned by you. Using the most recent one.`);
          }
        } else {
          // No active transport in database for this user
          setActiveTransport(null);
        }
      } catch (error) {
        // Silently fail if user not logged in or index is building
        // These are expected during initial app load
        const isExpectedError =
          error.message === 'Du skal være logget ind' ||
          error.message?.includes('index is currently building');

        if (!isExpectedError) {
          console.error('Error loading active transport:', error);
        }
        setActiveTransport(null);
      } finally {
        setIsInitialized(true);
      }
    };

    loadActiveTransport();
  }, [user, activeMode, activeOrganization?.id, shouldAutoStopTransport, autoStopTransport]);

  const startTransport = useCallback((transportData) => {
    // Validate: warn if there's already an active transport
    if (activeTransport) {
      console.warn('Starting new transport while one is already active. Previous transport will be replaced.');
    }

    const transport = {
      ...transportData,
      // Use provided ID if it exists (from database), otherwise generate new one
      id: transportData.id || generateId(),
      startTime: transportData.startTime || new Date().toISOString(),
      status: transportData.status || 'active',
      distance: transportData.distance || 0,
      duration: transportData.duration || 0,
    };
    setActiveTransport(transport);
    return transport;
  }, [activeTransport, generateId]);

  const stopTransport = useCallback(() => {
    if (!activeTransport) {
      console.warn('stopTransport called but no active transport exists');
      return null;
    }

    const completedTransport = {
      ...activeTransport,
      endTime: new Date().toISOString(),
      status: 'completed',
    };

    // Add to completed list (with max limit to prevent memory issues)
    setCompletedTransports(prev => {
      const updated = [...prev, completedTransport];
      // Keep only last 50 completed transports in memory
      return updated.slice(-50);
    });

    setActiveTransport(null);
    return completedTransport;
  }, [activeTransport]);

  const updateTransport = useCallback((updates) => {
    if (!activeTransport) {
      console.warn('updateTransport called but no active transport exists');
      return false;
    }

    setActiveTransport(prev => ({ ...prev, ...updates }));
    return true;
  }, [activeTransport]);

  const clearActiveTransport = useCallback(() => {
    setActiveTransport(null);
  }, []);

  const clearCompletedTransports = useCallback(() => {
    setCompletedTransports([]);
  }, []);

  // Manually refresh active transport from database
  const refreshActiveTransport = useCallback(async () => {
    try {
      if (!user || !activeMode) return;

      const activeTransports = await getTransportsByStatus('active', activeMode, activeOrganization?.id);

      // Only consider transports owned by the current user
      const ownActiveTransports = activeTransports.filter(t => t.ownerId === user.uid);

      if (ownActiveTransports && ownActiveTransports.length > 0) {
        const sortedTransports = ownActiveTransports.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });

        const mostRecentActive = sortedTransports[0];

        // Check if transport should be auto-stopped
        if (shouldAutoStopTransport(mostRecentActive)) {
          await autoStopTransport(mostRecentActive);
        } else {
          setActiveTransport(mostRecentActive);
        }

        if (ownActiveTransports.length > 1) {
          console.warn(`Found ${ownActiveTransports.length} active transports owned by you. Using the most recent one.`);
        }
      } else {
        setActiveTransport(null);
      }
    } catch (error) {
      // Silently fail if user not logged in or index is building
      const isExpectedError =
        error.message === 'Du skal være logget ind' ||
        error.message?.includes('index is currently building');

      if (!isExpectedError) {
        console.error('Error refreshing active transport:', error);
      }
    }
  }, [user, activeMode, activeOrganization?.id, shouldAutoStopTransport, autoStopTransport]);

  // Computed value for easy checking
  const isTransportActive = useMemo(() => activeTransport !== null, [activeTransport]);

  const value = useMemo(() => ({
    activeTransport,
    completedTransports,
    isTransportActive,
    isInitialized,
    startTransport,
    stopTransport,
    updateTransport,
    clearActiveTransport,
    clearCompletedTransports,
    refreshActiveTransport,
  }), [
    activeTransport,
    completedTransports,
    isTransportActive,
    isInitialized,
    startTransport,
    stopTransport,
    updateTransport,
    clearActiveTransport,
    clearCompletedTransports,
    refreshActiveTransport,
  ]);

  return (
    <TransportContext.Provider value={value}>
      {children}
    </TransportContext.Provider>
  );
};
