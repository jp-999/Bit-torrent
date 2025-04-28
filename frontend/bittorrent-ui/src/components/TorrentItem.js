import React from 'react';
import { 
  ListItem, 
  ListItemText, 
  Typography, 
  LinearProgress, 
  IconButton, 
  Box,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Pause as PauseIcon, 
  PlayArrow as PlayArrowIcon 
} from '@mui/icons-material';
import { useTorrents } from '../contexts/TorrentsContext';

// Helper function to format bytes to human readable format
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const TorrentItem = ({ torrent }) => {
  const { removeTorrent, pauseTorrent, resumeTorrent } = useTorrents();

  // Calculate progress
  const downloadedBytes = torrent.downloadedBytes || 0;
  const totalBytes = torrent.totalBytes || 1; // Avoid division by zero
  const progress = Math.min(Math.round((downloadedBytes / totalBytes) * 100), 100);
  
  // Determine status display
  const getStatusChip = () => {
    const { status } = torrent;
    
    if (status === 'downloading') {
      return <Chip label="Downloading" color="primary" size="small" />;
    } else if (status === 'paused') {
      return <Chip label="Paused" color="warning" size="small" />;
    } else if (status === 'completed') {
      return <Chip label="Completed" color="success" size="small" />;
    } else if (status === 'error') {
      return <Chip label="Error" color="error" size="small" />;
    } else if (status === 'connecting') {
      return <Chip label="Connecting" color="info" size="small" />;
    } else {
      return <Chip label={status || 'Unknown'} size="small" />;
    }
  };

  return (
    <Card sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <Typography variant="h6" component="div" noWrap title={torrent.name}>
              {torrent.name}
            </Typography>
            
            <Box sx={{ mt: 2, mb: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ height: 8, borderRadius: 5 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progress}%
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              {getStatusChip()}
              {torrent.peers && (
                <Typography variant="body2" color="text.secondary">
                  Peers: {torrent.peers}
                </Typography>
              )}
              {torrent.uploadSpeed && (
                <Typography variant="body2" color="text.secondary">
                  ↑ {formatBytes(torrent.uploadSpeed)}/s
                </Typography>
              )}
              {torrent.downloadSpeed && (
                <Typography variant="body2" color="text.secondary">
                  ↓ {formatBytes(torrent.downloadSpeed)}/s
                </Typography>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Box>
              {torrent.status === 'downloading' ? (
                <IconButton 
                  color="warning" 
                  onClick={() => pauseTorrent(torrent.id)}
                  title="Pause"
                >
                  <PauseIcon />
                </IconButton>
              ) : (
                <IconButton 
                  color="primary" 
                  onClick={() => resumeTorrent(torrent.id)}
                  disabled={torrent.status === 'completed'}
                  title="Resume"
                >
                  <PlayArrowIcon />
                </IconButton>
              )}
              
              <IconButton 
                color="error" 
                onClick={() => removeTorrent(torrent.id)}
                title="Remove"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default TorrentItem; 