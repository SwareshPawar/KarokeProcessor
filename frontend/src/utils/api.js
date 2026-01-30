// API URL utility
export const getApiUrl = (endpoint = '') => {
  const baseUrl = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
  
  return endpoint ? `${baseUrl}/api/${endpoint}` : `${baseUrl}/api`;
};

export const getStreamUrl = (filename) => {
  const baseUrl = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    
  return `${baseUrl}/api/audio/stream/${filename}`;
};