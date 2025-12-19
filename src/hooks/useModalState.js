import { useState, useCallback } from 'react';

/**
 * Custom hook for managing modal visibility state
 * Reduces boilerplate in screens with multiple modals
 *
 * @param {Object} initialModals - Initial modal states (e.g., { vehicle: false, trailer: false })
 * @returns {Object} Modal state and control functions
 *
 * @example
 * const { modals, openModal, closeModal, toggleModal } = useModalState({
 *   vehicle: false,
 *   trailer: false,
 *   horse: false,
 *   routeMap: false
 * });
 *
 * // In component:
 * <Button onPress={() => openModal('vehicle')} />
 * <Modal visible={modals.vehicle} onClose={() => closeModal('vehicle')} />
 */
export const useModalState = (initialModals = {}) => {
  const [modals, setModals] = useState(initialModals);

  const openModal = useCallback((name) => {
    setModals(prev => ({ ...prev, [name]: true }));
  }, []);

  const closeModal = useCallback((name) => {
    setModals(prev => ({ ...prev, [name]: false }));
  }, []);

  const toggleModal = useCallback((name) => {
    setModals(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(prev => {
      const closed = {};
      Object.keys(prev).forEach(key => {
        closed[key] = false;
      });
      return closed;
    });
  }, []);

  const isOpen = useCallback((name) => {
    return !!modals[name];
  }, [modals]);

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    isOpen,
  };
};
