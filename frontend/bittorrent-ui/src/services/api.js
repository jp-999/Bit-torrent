import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const api = {
  // Get list of torrents
  getTorrents: async () => {
    try {
      const response = await axios.get(`${API_URL}/torrents`);
      return response.data;
    } catch (error) {
      console.error('Error fetching torrents:', error);
      throw error;
    }
  },

  // Add a new torrent by file upload
  addTorrentFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append('torrentFile', file);
      const response = await axios.post(`${API_URL}/torrents/add`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error adding torrent file:', error);
      throw error;
    }
  },

  // Add a new torrent by magnet link
  addTorrentMagnet: async (magnetLink) => {
    try {
      const response = await axios.post(`${API_URL}/torrents/magnet`, { magnetLink });
      return response.data;
    } catch (error) {
      console.error('Error adding magnet link:', error);
      throw error;
    }
  },

  // Get torrent info
  getTorrentInfo: async (torrentId) => {
    try {
      const response = await axios.get(`${API_URL}/torrents/${torrentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching torrent info:', error);
      throw error;
    }
  },

  // Start downloading a torrent
  startDownload: async (torrentId) => {
    try {
      const response = await axios.post(`${API_URL}/torrents/${torrentId}/start`);
      return response.data;
    } catch (error) {
      console.error('Error starting download:', error);
      throw error;
    }
  },

  // Pause a torrent download
  pauseDownload: async (torrentId) => {
    try {
      const response = await axios.post(`${API_URL}/torrents/${torrentId}/pause`);
      return response.data;
    } catch (error) {
      console.error('Error pausing download:', error);
      throw error;
    }
  },

  // Get download progress
  getDownloadProgress: async (torrentId) => {
    try {
      const response = await axios.get(`${API_URL}/torrents/${torrentId}/progress`);
      return response.data;
    } catch (error) {
      console.error('Error fetching download progress:', error);
      throw error;
    }
  },

  // Delete a torrent
  deleteTorrent: async (torrentId, deleteFiles = false) => {
    try {
      const response = await axios.delete(`${API_URL}/torrents/${torrentId}`, {
        params: { deleteFiles }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting torrent:', error);
      throw error;
    }
  },
  
  // Get torrent files
  getTorrentFiles: async (torrentId) => {
    try {
      const response = await axios.get(`${API_URL}/torrents/${torrentId}/files`);
      return response.data;
    } catch (error) {
      console.error('Error fetching torrent files:', error);
      throw error;
    }
  }
};

export default api; 