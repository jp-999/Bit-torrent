import React, { useState } from 'react';
import {
  Button,
  TextField,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
  Fade
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Link as LinkIcon,
  Clear as ClearIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useTorrents } from '../contexts/TorrentsContext';

const AddTorrentForm = () => {
  const theme = useTheme();
  const { addTorrentByMagnet, addTorrentByFile, loading } = useTorrents();
  const [tabValue, setTabValue] = useState(0);
  const [magnet, setMagnet] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    resetForm();
  };
  
  const resetForm = () => {
    setMagnet('');
    setFile(null);
    setError('');
    setSuccess('');
  };
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      return;
    }
    
    if (!selectedFile.name.endsWith('.torrent')) {
      setError('Please select a valid .torrent file');
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    setError('');
  };
  
  const handleMagnetChange = (e) => {
    setMagnet(e.target.value);
  };
  
  const handleClearMagnet = () => {
    setMagnet('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      if (tabValue === 0) { // Magnet link
        if (!magnet.trim()) {
          setError('Please enter a magnet link');
          return;
        }
        
        if (!magnet.startsWith('magnet:')) {
          setError('Please enter a valid magnet link');
          return;
        }
        
        await addTorrentByMagnet(magnet);
        setSuccess('Torrent added successfully!');
        setMagnet('');
      } else { // Torrent file
        if (!file) {
          setError('Please select a torrent file');
          return;
        }
        
        await addTorrentByFile(file);
        setSuccess('Torrent added successfully!');
        setFile(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to add torrent');
    }
  };
  
  return (
    <Paper 
      elevation={0} 
      variant="outlined"
      sx={{ 
        borderColor: alpha(theme.palette.common.white, 0.1),
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      <Box sx={{ 
        p: 3, 
        background: `linear-gradient(45deg, ${alpha(theme.palette.primary.dark, 0.6)} 0%, ${alpha(theme.palette.primary.main, 0.4)} 100%)`,
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`
      }}>
        <Typography variant="h6" component="h2" fontWeight="medium" color="primary.contrastText">
          Add New Torrent
        </Typography>
        <Typography variant="body2" color={alpha(theme.palette.common.white, 0.7)}>
          Add a torrent using a magnet link or by uploading a .torrent file
        </Typography>
      </Box>
      
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        variant="fullWidth"
        sx={{ 
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0'
          }
        }}
      >
        <Tab 
          icon={<LinkIcon />} 
          label="Magnet Link" 
          sx={{ 
            py: 2,
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            }
          }}
        />
        <Tab 
          icon={<UploadIcon />} 
          label="Torrent File" 
          sx={{ 
            py: 2,
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            }
          }}
        />
      </Tabs>
      
      <Box sx={{ p: 3 }}>
        {error && (
          <Fade in={!!error}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                '& .MuiAlert-icon': {
                  color: theme.palette.error.main
                }
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}
        
        {success && (
          <Fade in={!!success}>
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                '& .MuiAlert-icon': {
                  color: theme.palette.success.main
                }
              }}
              icon={<CheckIcon />}
            >
              {success}
            </Alert>
          </Fade>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          {tabValue === 0 ? (
            <TextField
              fullWidth
              label="Magnet Link"
              variant="outlined"
              value={magnet}
              onChange={handleMagnetChange}
              placeholder="magnet:?xt=urn:btih:..."
              margin="normal"
              InputProps={{
                endAdornment: magnet && (
                  <InputAdornment position="end">
                    <IconButton onClick={handleClearMagnet} edge="end" size="small">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: alpha(theme.palette.common.white, 0.2),
                  },
                  '&:hover fieldset': {
                    borderColor: alpha(theme.palette.common.white, 0.3),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />
          ) : (
            <Box sx={{ mb: 2, mt: 2 }}>
              <input
                accept=".torrent"
                style={{ display: 'none' }}
                id="raised-button-file"
                type="file"
                onChange={handleFileChange}
              />
              <Box 
                sx={{ 
                  border: `2px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderColor: alpha(theme.palette.primary.main, 0.6),
                  }
                }}
              >
                <label htmlFor="raised-button-file">
                  <Box sx={{ cursor: 'pointer' }}>
                    <UploadIcon sx={{ fontSize: 48, color: alpha(theme.palette.primary.main, 0.7), mb: 1 }} />
                    <Typography variant="body1" color="primary" gutterBottom>
                      {file ? file.name : 'Select or drag a torrent file'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Only .torrent files are accepted
                    </Typography>
                  </Box>
                </label>
              </Box>
            </Box>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ 
                px: 3,
                py: 1,
                fontWeight: 500,
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`
              }}
            >
              {loading ? 'Adding...' : 'Add Torrent'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default AddTorrentForm; 