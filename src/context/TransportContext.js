import React, { createContext, useContext, useState } from 'react';

const TransportContext = createContext();

export const useTransport = () => {
  const context = useContext(TransportContext);
  if (!context) {
    throw new Error('useTransport must be used within a TransportProvider');
  }
  return context;
};

export const TransportProvider = ({ children }) => {
  const [activeTransport, setActiveTransport] = useState(null);
  const [completedTransports, setCompletedTransports] = useState([]);

  const startTransport = (transportData) => {
    const transport = {
      id: Date.now().toString(),
      ...transportData,
      startTime: new Date().toISOString(),
      status: 'active',
      distance: 0,
      duration: 0,
    };
    setActiveTransport(transport);
    return transport;
  };

  const stopTransport = () => {
    if (activeTransport) {
      const completedTransport = {
        ...activeTransport,
        endTime: new Date().toISOString(),
        status: 'completed',
      };
      setCompletedTransports(prev => [...prev, completedTransport]);
      setActiveTransport(null);
      return completedTransport;
    }
  };

  const updateTransport = (updates) => {
    if (activeTransport) {
      setActiveTransport(prev => ({ ...prev, ...updates }));
    }
  };

  return (
    <TransportContext.Provider value={{
      activeTransport,
      completedTransports,
      startTransport,
      stopTransport,
      updateTransport,
    }}>
      {children}
    </TransportContext.Provider>
  );
};
