import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

// Create the context
const TorrentContext = createContext();

// Create a provider component
export const TorrentProvider = ({ children }) => {
  const [torrents, setTorrents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch torrents on component mount
  useEffect(() => {
    fetchTorrents();
    
    // Set up polling for updates
    const intervalId = setInterval(fetchTorrents, 5000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Function to fetch torrents
  const fetchTorrents = async () => {
    try {
      const data = await api.getTorrents();
      setTorrents(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching torrents:', err);
      setError('Failed to load torrents. Please try again.');
      setLoading(false);
    }
  };

  // Function to add a torrent file
  const addTorrentFile = async (file) => {
    try {
      const newTorrent = await api.addTorrentFile(file);
      setTorrents((prevTorrents) => [...prevTorrents, newTorrent]);
      return newTorrent;
    } catch (err) {
      console.error('Error adding torrent file:', err);
      setError('Failed to add torrent file. Please try again.');
      throw err;
    }
  };

  // Function to add a magnet link
  const addTorrentMagnet = async (magnetLink) => {
    try {
      const newTorrent = await api.addTorrentMagnet(magnetLink);
      setTorrents((prevTorrents) => [...prevTorrents, newTorrent]);
      return newTorrent;
    } catch (err) {
      console.error('Error adding magnet link:', err);
      setError('Failed to add magnet link. Please try again.');
      throw err;
    }
  };

  // Function to start a torrent download
  const startDownload = async (torrentId) => {
    try {
      const updatedTorrent = await api.startDownload(torrentId);
      setTorrents((prevTorrents) =>
        prevTorrents.map((torrent) =>
          torrent.id === torrentId ? updatedTorrent : torrent
        )
      );
      return updatedTorrent;
    } catch (err) {
      console.error('Error starting download:', err);
      setError('Failed to start download. Please try again.');
      throw err;
    }
  };

  // Function to pause a torrent download
  const pauseDownload = async (torrentId) => {
    try {
      const updatedTorrent = await api.pauseDownload(torrentId);
      setTorrents((prevTorrents) =>
        prevTorrents.map((torrent) =>
          torrent.id === torrentId ? updatedTorrent : torrent
        )
      );
      return updatedTorrent;
    } catch (err) {
      console.error('Error pausing download:', err);
      setError('Failed to pause download. Please try again.');
      throw err;
    }
  };

  // Function to delete a torrent
  const deleteTorrent = async (torrentId, deleteFiles = false) => {
    try {
      await api.deleteTorrent(torrentId, deleteFiles);
      setTorrents((prevTorrents) =>
        prevTorrents.filter((torrent) => torrent.id !== torrentId)
      );
    } catch (err) {
      console.error('Error deleting torrent:', err);
      setError('Failed to delete torrent. Please try again.');
      throw err;
    }
  };

  // Function to get torrent files
  const getTorrentFiles = async (torrentId) => {
    try {
      return await api.getTorrentFiles(torrentId);
    } catch (err) {
      console.error('Error fetching torrent files:', err);
      setError('Failed to fetch torrent files. Please try again.');
      throw err;
    }
  };

  // Value provided by the context
  const value = {
    torrents,
    loading,
    error,
    fetchTorrents,
    addTorrentFile,
    addTorrentMagnet,
    startDownload,
    pauseDownload,
    deleteTorrent,
    getTorrentFiles,
  };

  return (
    <TorrentContext.Provider value={value}>
      {children}
    </TorrentContext.Provider>
  );
};

// Custom hook to use the torrent context
export const useTorrents = () => {
  const context = useContext(TorrentContext);
  if (context === undefined) {
    throw new Error('useTorrents must be used within a TorrentProvider');
  }
  return context;
};

export default TorrentContext; 