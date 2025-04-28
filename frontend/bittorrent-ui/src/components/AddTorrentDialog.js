import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Box,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { useTorrents } from '../contexts/TorrentsContext';

// TabPanel component for the tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function AddTorrentDialog({ open, onClose }) {
  const [tabValue, setTabValue] = useState(0);
  const [magnetLink, setMagnetLink] = useState('');
  const [torrentFile, setTorrentFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { addTorrent } = useTorrents();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Reset state when switching tabs
    setError('');
    setSuccess(false);
  };

  const handleMagnetLinkChange = (event) => {
    setMagnetLink(event.target.value);
    setError('');
  };

  const handleFileChange = (event) => {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      setTorrentFile(file);
      setFileName(file.name);
      setError('');
    }
  };

  const handleAddTorrent = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (tabValue === 0) {
        // Magnet link tab
        if (!magnetLink.trim()) {
          setError('Please enter a magnet link');
          setLoading(false);
          return;
        }
        
        const result = await addTorrent({ magnetLink });
        
        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
            setMagnetLink('');
          }, 1500);
        } else {
          setError(result.error || 'Failed to add torrent');
        }
      } else {
        // Torrent file tab
        if (!torrentFile) {
          setError('Please select a torrent file');
          setLoading(false);
          return;
        }
        
        // Create form data to send file
        const formData = new FormData();
        formData.append('torrentFile', torrentFile);
        
        const result = await addTorrent(formData);
        
        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
            setTorrentFile(null);
            setFileName('');
          }, 1500);
        } else {
          setError(result.error || 'Failed to add torrent');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Error adding torrent:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Reset state
      setMagnetLink('');
      setTorrentFile(null);
      setFileName('');
      setError('');
      setSuccess(false);
      setTabValue(0);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Torrent</DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="torrent add methods">
          <Tab label="Magnet Link" {...a11yProps(0)} />
          <Tab label="Torrent File" {...a11yProps(1)} />
        </Tabs>
      </Box>
      
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Torrent added successfully!</Alert>}
        
        <TabPanel value={tabValue} index={0}>
          <DialogContentText>
            Enter a magnet link to add a new torrent:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="magnetLink"
            label="Magnet Link"
            type="text"
            fullWidth
            variant="outlined"
            value={magnetLink}
            onChange={handleMagnetLinkChange}
            disabled={loading}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <DialogContentText>
            Upload a torrent file from your computer:
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <input
              accept=".torrent"
              style={{ display: 'none' }}
              id="torrent-file-upload"
              type="file"
              onChange={handleFileChange}
              disabled={loading}
            />
            <label htmlFor="torrent-file-upload">
              <Button 
                variant="contained" 
                component="span"
                disabled={loading}
              >
                Choose File
              </Button>
            </label>
            {fileName && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {fileName}
              </Typography>
            )}
          </Box>
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleAddTorrent} 
          color="primary" 
          disabled={loading || (tabValue === 0 && !magnetLink) || (tabValue === 1 && !torrentFile)}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Adding...' : 'Add Torrent'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 