import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

// Create context
const TorrentsContext = createContext();

// Base URL for API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const TorrentsProvider = ({ children }) => {
  const [torrents, setTorrents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all torrents
  const fetchTorrents = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/torrents`);
      setTorrents(response.data);
    } catch (err) {
      console.error('Error fetching torrents:', err);
      setError('Failed to load torrents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new torrent via magnet link
  const addTorrentByMagnet = async (magnetLink) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/torrents/magnet`, { magnetLink });
      setTorrents(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error adding torrent by magnet:', err);
      const errorMsg = err.response?.data?.message || 'Failed to add torrent';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Add a new torrent via file upload
  const addTorrentByFile = async (file) => {
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('torrentFile', file);
    
    try {
      const response = await axios.post(`${API_URL}/torrents/add`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setTorrents(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      console.error('Error adding torrent by file:', err);
      const errorMsg = err.response?.data?.error || 'Failed to upload torrent file';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Remove a torrent
  const removeTorrent = async (torrentId) => {
    try {
      await axios.delete(`${API_URL}/torrents/${torrentId}`);
      setTorrents(prev => prev.filter(torrent => torrent.id !== torrentId));
    } catch (err) {
      console.error('Error removing torrent:', err);
      const errorMsg = err.response?.data?.message || 'Failed to remove torrent';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Pause a torrent
  const pauseTorrent = async (torrentId) => {
    try {
      const response = await axios.post(`${API_URL}/torrents/${torrentId}/pause`);
      setTorrents(prev => 
        prev.map(torrent => 
          torrent.id === torrentId ? { ...torrent, status: 'paused' } : torrent
        )
      );
      return response.data;
    } catch (err) {
      console.error('Error pausing torrent:', err);
      const errorMsg = err.response?.data?.message || 'Failed to pause torrent';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Resume a torrent
  const resumeTorrent = async (torrentId) => {
    try {
      const response = await axios.post(`${API_URL}/torrents/${torrentId}/resume`);
      setTorrents(prev => 
        prev.map(torrent => 
          torrent.id === torrentId ? { ...torrent, status: 'downloading' } : torrent
        )
      );
      return response.data;
    } catch (err) {
      console.error('Error resuming torrent:', err);
      const errorMsg = err.response?.data?.message || 'Failed to resume torrent';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Get a specific torrent's details
  const getTorrentDetails = async (torrentId) => {
    try {
      const response = await axios.get(`${API_URL}/torrents/${torrentId}`);
      return response.data;
    } catch (err) {
      console.error('Error getting torrent details:', err);
      throw new Error('Failed to get torrent details');
    }
  };

  // Refresh torrents list
  const refreshTorrents = () => {
    setError('');
    fetchTorrents();
  };

  // Load torrents on mount
  useEffect(() => {
    fetchTorrents();
  }, [fetchTorrents]);

  // Set up periodic refresh (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTorrents();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchTorrents]);

  return (
    <TorrentsContext.Provider
      value={{
        torrents,
        loading,
        error,
        addTorrentByMagnet,
        addTorrentByFile,
        removeTorrent,
        pauseTorrent,
        resumeTorrent,
        getTorrentDetails,
        refreshTorrents
      }}
    >
      {children}
    </TorrentsContext.Provider>
  );
};

// Custom hook to use the torrents context
export const useTorrents = () => {
  const context = useContext(TorrentsContext);
  if (!context) {
    throw new Error('useTorrents must be used within a TorrentsProvider');
  }
  return context;
}; 