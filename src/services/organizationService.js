import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  setDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Service helpers that encapsulate every organization-related Firestore workflow.
export const createOrganization = async (name, description = '') => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind for at oprette en organisation');

    // Generate a unique 6-character organization ID
    const organizationCode = generateOrganizationCode();

    const orgData = {
      name,
      description,
      organizationCode, // Unique code for joining
      logoURL: null,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: {
        allowMembersToCreateVehicles: true,
        allowMembersToCreateHorses: true,
        allowMembersToCreateTours: true,
      }
    };

    const orgRef = await addDoc(collection(db, 'organizations'), orgData);

    // Add creator as owner in members subcollection
    await setDoc(doc(db, 'organizations', orgRef.id, 'members', user.uid), {
      userId: user.uid,
      email: user.email,
      displayName: user.displayName || 'Unknown',
      role: 'owner',
      permissions: {
        canManageMembers: true,
        canManageVehicles: true,
        canManageHorses: true,
        canManageTours: true,
      },
      status: 'active',
      joinedAt: serverTimestamp(),
      invitedBy: user.uid,
    });

    // Update user's active organization and add to organizationIds array
    await updateDoc(doc(db, 'users', user.uid), {
      activeMode: 'organization',
      activeOrganizationId: orgRef.id,
      organizationIds: arrayUnion(orgRef.id), // Add org ID to array
      updatedAt: serverTimestamp(),
    });

    return {
      id: orgRef.id,
      name,
      description,
      organizationCode,
      ownerId: user.uid,
    };
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
};

// Get organization by ID
export const getOrganization = async (organizationId) => {
  try {
    const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
    if (!orgDoc.exists()) {
      throw new Error('Organisation ikke fundet');
    }
    return { id: orgDoc.id, ...orgDoc.data() };
  } catch (error) {
    console.error('Error getting organization:', error);
    throw error;
  }
};

// Get all organizations for current user
export const getUserOrganizations = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Get user's organizationIds array
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data();
    const organizationIds = userData.organizationIds || [];

    if (organizationIds.length === 0) {
      return [];
    }

    const organizations = [];

    // Firestore 'in' queries support max 10 items, so we need to batch
    const batchSize = 10;
    for (let i = 0; i < organizationIds.length; i += batchSize) {
      const batch = organizationIds.slice(i, i + batchSize);

      // Query organizations by ID
      const orgsQuery = query(
        collection(db, 'organizations'),
        where('__name__', 'in', batch)
      );
      const orgsSnapshot = await getDocs(orgsQuery);

      // Get member info for each organization
      for (const orgDoc of orgsSnapshot.docs) {
        const memberDoc = await getDoc(doc(db, 'organizations', orgDoc.id, 'members', user.uid));
        organizations.push({
          id: orgDoc.id,
          ...orgDoc.data(),
          memberInfo: memberDoc.exists() ? memberDoc.data() : null,
        });
      }
    }

    return organizations;
  } catch (error) {
    console.error('Error getting user organizations:', error);
    throw error;
  }
};

// Pulls every member document for the given organization.
export const getOrganizationMembers = async (organizationId) => {
  try {
    const membersSnapshot = await getDocs(
      collection(db, 'organizations', organizationId, 'members')
    );

    return membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting organization members:', error);
    throw error;
  }
};

// Creates a pending invitation that can later be accepted by the invited account.
export const inviteToOrganization = async (organizationId, email, role = 'member') => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Check if user has permission to invite
    const memberDoc = await getDoc(doc(db, 'organizations', organizationId, 'members', user.uid));
    if (!memberDoc.exists() || !memberDoc.data().permissions.canManageMembers) {
      throw new Error('Du har ikke tilladelse til at invitere medlemmer');
    }

    // Get organization info
    const org = await getOrganization(organizationId);

    // Create invitation
    const invitationData = {
      organizationId,
      organizationName: org.name,
      invitedEmail: email,
      invitedBy: user.uid,
      invitedByName: user.displayName || 'Unknown',
      role,
      status: 'pending',
      token: generateInvitationToken(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: serverTimestamp(),
      acceptedAt: null,
    };

    const invitationRef = await addDoc(collection(db, 'invitations'), invitationData);

    // TODO: Send email invitation (requires Cloud Function or email service)

    return { id: invitationRef.id, ...invitationData };
  } catch (error) {
    console.error('Error inviting to organization:', error);
    throw error;
  }
};

// Accepts a previously issued invitation and provisions permissions for the new member.
export const acceptInvitation = async (invitationId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Get invitation
    const invitationDoc = await getDoc(doc(db, 'invitations', invitationId));
    if (!invitationDoc.exists()) {
      throw new Error('Invitation ikke fundet');
    }

    const invitation = invitationDoc.data();

    // Check if invitation is valid
    if (invitation.status !== 'pending') {
      throw new Error('Denne invitation er allerede brugt eller udløbet');
    }
    if (invitation.invitedEmail !== user.email) {
      throw new Error('Denne invitation er ikke til din email');
    }
    if (invitation.expiresAt.toDate() < new Date()) {
      throw new Error('Denne invitation er udløbet');
    }

    // Add user to organization members
    await setDoc(doc(db, 'organizations', invitation.organizationId, 'members', user.uid), {
      userId: user.uid,
      email: user.email,
      displayName: user.displayName || 'Unknown',
      role: invitation.role,
      permissions: getDefaultPermissions(invitation.role),
      status: 'active',
      joinedAt: serverTimestamp(),
      invitedBy: invitation.invitedBy,
    });

    // Update invitation status
    await updateDoc(doc(db, 'invitations', invitationId), {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
    });

    // Update user's active organization if they don't have one, and add to organizationIds
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    const updates = {
      organizationIds: arrayUnion(invitation.organizationId), // Always add to array
      updatedAt: serverTimestamp(),
    };

    // Set as active if user doesn't have an active org
    if (!userData.activeOrganizationId) {
      updates.activeMode = 'organization';
      updates.activeOrganizationId = invitation.organizationId;
    }

    await updateDoc(doc(db, 'users', user.uid), updates);

    return invitation.organizationId;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

// Persist the preferred context (private vs. organization) on the user profile document.
export const switchUserMode = async (mode, organizationId = null) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    if (mode === 'organization' && !organizationId) {
      throw new Error('Organization ID er påkrævet for organisation mode');
    }

    await updateDoc(doc(db, 'users', user.uid), {
      activeMode: mode,
      activeOrganizationId: mode === 'organization' ? organizationId : null,
      updatedAt: serverTimestamp(),
    });

    return { mode, organizationId };
  } catch (error) {
    console.error('Error switching user mode:', error);
    throw error;
  }
};

// Elevate or demote a member and optionally override the default permission set.
export const updateMemberRole = async (organizationId, memberId, role, permissions) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Check if user has permission
    const memberDoc = await getDoc(doc(db, 'organizations', organizationId, 'members', user.uid));
    if (!memberDoc.exists() || !memberDoc.data().permissions.canManageMembers) {
      throw new Error('Du har ikke tilladelse til at opdatere medlemmer');
    }

    await updateDoc(doc(db, 'organizations', organizationId, 'members', memberId), {
      role,
      permissions: permissions || getDefaultPermissions(role),
    });

    return true;
  } catch (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
};

// Removes a member document, guarding against accidentally removing the owner.
export const removeMember = async (organizationId, memberId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Check if user has permission
    const memberDoc = await getDoc(doc(db, 'organizations', organizationId, 'members', user.uid));
    if (!memberDoc.exists() || !memberDoc.data().permissions.canManageMembers) {
      throw new Error('Du har ikke tilladelse til at fjerne medlemmer');
    }

    // Can't remove owner
    const targetMemberDoc = await getDoc(doc(db, 'organizations', organizationId, 'members', memberId));
    if (targetMemberDoc.exists() && targetMemberDoc.data().role === 'owner') {
      throw new Error('Du kan ikke fjerne ejeren af organisationen');
    }

    await deleteDoc(doc(db, 'organizations', organizationId, 'members', memberId));

    return true;
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
};

// Join organization by code
export const joinOrganizationByCode = async (organizationCode) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du skal være logget ind');

    // Find organization by code
    const orgsQuery = query(
      collection(db, 'organizations'),
      where('organizationCode', '==', organizationCode.toUpperCase())
    );
    const orgsSnapshot = await getDocs(orgsQuery);

    if (orgsSnapshot.empty) {
      throw new Error('Organisations kode ikke fundet');
    }

    const orgDoc = orgsSnapshot.docs[0];
    const organizationId = orgDoc.id;

    // Check if user is already a member
    const memberDoc = await getDoc(doc(db, 'organizations', organizationId, 'members', user.uid));
    if (memberDoc.exists()) {
      throw new Error('Du er allerede medlem af denne organisation');
    }

    // Add user as member
    await setDoc(doc(db, 'organizations', organizationId, 'members', user.uid), {
      userId: user.uid,
      email: user.email,
      displayName: user.displayName || 'Unknown',
      role: 'member',
      permissions: getDefaultPermissions('member'),
      status: 'active',
      joinedAt: serverTimestamp(),
      invitedBy: user.uid, // Self-joined via code
    });

    // Update user's active organization if they don't have one, and add to organizationIds
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    const updates = {
      organizationIds: arrayUnion(organizationId), // Always add to array
      updatedAt: serverTimestamp(),
    };

    // Set as active if user doesn't have an active org
    if (!userData.activeOrganizationId) {
      updates.activeMode = 'organization';
      updates.activeOrganizationId = organizationId;
    }

    await updateDoc(doc(db, 'users', user.uid), updates);

    return { organizationId, organization: { id: orgDoc.id, ...orgDoc.data() } };
  } catch (error) {
    console.error('Error joining organization by code:', error);
    throw error;
  }
};

// Helper: Generate unique organization code
const generateOrganizationCode = () => {
  // Generate 6-character code (uppercase letters and numbers)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Helper: Generate invitation token
const generateInvitationToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper: Get default permissions based on role
const getDefaultPermissions = (role) => {
  switch (role) {
    case 'owner':
      return {
        canManageMembers: true,
        canManageVehicles: true,
        canManageHorses: true,
        canManageTours: true,
      };
    case 'admin':
      return {
        canManageMembers: true,
        canManageVehicles: true,
        canManageHorses: true,
        canManageTours: true,
      };
    case 'member':
    default:
      return {
        canManageMembers: false,
        canManageVehicles: false,
        canManageHorses: false,
        canManageTours: false,
      };
  }
};
