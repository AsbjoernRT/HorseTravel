// Global Google Maps API loader to prevent loading multiple times

let isLoading = false;
let isLoaded = false;
const callbacks = [];

export const loadGoogleMapsAPI = (libraries = ['places', 'geometry']) => {
  return new Promise((resolve, reject) => {
    // Check if all requested libraries are already loaded
    if (window.google && window.google.maps) {
      const allLibrariesReady = libraries.every(lib => {
        if (lib === 'places') return window.google?.maps?.places;
        if (lib === 'geometry') return window.google?.maps?.geometry?.encoding;
        return true;
      });

      if (allLibrariesReady) {
        isLoaded = true;
        resolve(window.google.maps);
        return;
      }
    }

    // If currently loading, add to callbacks
    if (isLoading) {
      callbacks.push(resolve);
      return;
    }

    // Start loading
    isLoading = true;

    const script = document.createElement('script');
    const apiKey = process.env.WEB_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
    const librariesParam = libraries.join(',');

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${librariesParam}&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Poll for libraries to be ready
      const checkLibraries = () => {
        const allLibrariesReady = libraries.every(lib => {
          if (lib === 'places') return window.google?.maps?.places;
          if (lib === 'geometry') return window.google?.maps?.geometry?.encoding;
          return true;
        });

        if (allLibrariesReady) {
          isLoaded = true;
          isLoading = false;
          resolve(window.google.maps);

          // Resolve all waiting callbacks
          callbacks.forEach(cb => cb(window.google.maps));
          callbacks.length = 0;
        } else {
          setTimeout(checkLibraries, 50);
        }
      };

      checkLibraries();
    };

    script.onerror = () => {
      isLoading = false;
      const error = new Error('Failed to load Google Maps API');
      reject(error);
      callbacks.forEach(cb => cb(null));
      callbacks.length = 0;
    };

    document.head.appendChild(script);
  });
};

export const isGoogleMapsLoaded = () => {
  return isLoaded && window.google && window.google.maps;
};
