import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// API endpoint constants
const API_BASE_URL = 'http://localhost:8000/api';
const TORRENTS_ENDPOINT = `${API_BASE_URL}/torrents`;

// Create the context
const TorrentContext = createContext();

/**
 * Provider component for torrent data and operations
 */
export const TorrentProvider = ({ children }) => {
  const [torrents, setTorrents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(3000); // 3 seconds

  // Fetch all torrents
  const fetchTorrents = async () => {
    try {
      const response = await axios.get(TORRENTS_ENDPOINT);
      setTorrents(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching torrents:', err);
      setError('Failed to load torrents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Add a new torrent
  const addTorrent = async (magnetUri) => {
    setLoading(true);
    try {
      await axios.post(TORRENTS_ENDPOINT, { magnetUri });
      fetchTorrents();
    } catch (err) {
      console.error('Error adding torrent:', err);
      setError('Failed to add torrent. Please check the magnet link and try again.');
      setLoading(false);
    }
  };

  // Pause a torrent
  const pauseTorrent = async (torrentId) => {
    try {
      await axios.post(`${TORRENTS_ENDPOINT}/${torrentId}/pause`);
      fetchTorrents();
    } catch (err) {
      console.error('Error pausing torrent:', err);
      setError('Failed to pause torrent.');
    }
  };

  // Resume a torrent
  const resumeTorrent = async (torrentId) => {
    try {
      await axios.post(`${TORRENTS_ENDPOINT}/${torrentId}/resume`);
      fetchTorrents();
    } catch (err) {
      console.error('Error resuming torrent:', err);
      setError('Failed to resume torrent.');
    }
  };

  // Remove a torrent
  const removeTorrent = async (torrentId, removeFiles = false) => {
    try {
      await axios.delete(`${TORRENTS_ENDPOINT}/${torrentId}`, {
        data: { removeFiles }
      });
      fetchTorrents();
    } catch (err) {
      console.error('Error removing torrent:', err);
      setError('Failed to remove torrent.');
    }
  };

  // Initial fetch and polling setup
  useEffect(() => {
    fetchTorrents();

    const intervalId = setInterval(() => {
      fetchTorrents();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Change refresh interval
  const setRefreshRate = (milliseconds) => {
    setRefreshInterval(milliseconds);
  };

  const value = {
    torrents,
    loading,
    error,
    addTorrent,
    pauseTorrent,
    resumeTorrent,
    removeTorrent,
    refreshInterval,
    setRefreshRate,
    refreshNow: fetchTorrents
  };

  return (
    <TorrentContext.Provider value={value}>
      {children}
    </TorrentContext.Provider>
  );
};

/**
 * Hook to use the torrent context
 */
export const useTorrents = () => {
  const context = useContext(TorrentContext);
  if (context === undefined) {
    throw new Error('useTorrents must be used within a TorrentProvider');
  }
  return context;
};

export default TorrentContext; 