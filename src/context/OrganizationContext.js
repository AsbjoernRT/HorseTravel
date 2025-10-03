import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserOrganizations, switchUserMode } from '../services/organizationService';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext();

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [activeMode, setActiveMode] = useState('private'); // 'private' or 'organization'
  const [activeOrganization, setActiveOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user's organizations
  useEffect(() => {
    const loadOrganizations = async () => {
      if (!user) {
        setOrganizations([]);
        setActiveMode('private');
        setActiveOrganization(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const orgs = await getUserOrganizations();
        setOrganizations(orgs);

        // Set active mode from user profile (default to 'private' if not set)
        const mode = userProfile?.activeMode || 'private';
        setActiveMode(mode);

        // Set active organization
        if (mode === 'organization' && userProfile?.activeOrganizationId) {
          const activeOrg = orgs.find(org => org.id === userProfile.activeOrganizationId);
          setActiveOrganization(activeOrg || null);
        } else {
          setActiveOrganization(null);
        }
      } catch (error) {
        console.error('Error loading organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, [user, userProfile]);

  // Switch between private and organization mode
  const switchMode = async (mode, organizationId = null) => {
    try {
      await switchUserMode(mode, organizationId);
      setActiveMode(mode);

      if (mode === 'organization' && organizationId) {
        const org = organizations.find(o => o.id === organizationId);
        setActiveOrganization(org || null);
      } else {
        setActiveOrganization(null);
      }

      return true;
    } catch (error) {
      console.error('Error switching mode:', error);
      throw error;
    }
  };

  // Get current context (mode + organizationId)
  const getCurrentContext = () => {
    return {
      mode: activeMode,
      organizationId: activeOrganization?.id || null,
    };
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (activeMode === 'private') {
      return true; // User has all permissions for their own data
    }

    if (!activeOrganization) {
      return false;
    }

    const memberInfo = activeOrganization.memberInfo;
    if (!memberInfo) {
      return false;
    }

    // Owner and admin have all permissions
    if (memberInfo.role === 'owner' || memberInfo.role === 'admin') {
      return true;
    }

    // Check specific permission
    return memberInfo.permissions?.[permission] || false;
  };

  // Reload organizations
  const reloadOrganizations = async () => {
    try {
      const orgs = await getUserOrganizations();
      setOrganizations(orgs);

      // Update active organization if needed
      if (activeOrganization) {
        const updatedOrg = orgs.find(o => o.id === activeOrganization.id);
        setActiveOrganization(updatedOrg || null);
      }
    } catch (error) {
      console.error('Error reloading organizations:', error);
      throw error;
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeMode,
        activeOrganization,
        loading,
        switchMode,
        getCurrentContext,
        hasPermission,
        reloadOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
