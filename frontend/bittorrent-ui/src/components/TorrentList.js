import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  alpha,
  TablePagination,
  Fade,
  Zoom,
  Collapse,
  Stack,
  Avatar
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InfoIcon from '@mui/icons-material/Info';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import { useTorrents } from '../contexts/TorrentsContext';

function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytes) {
  if (bytes === 0) return '0 B/s';
  return formatSize(bytes) + '/s';
}

function formatProgress(downloaded, total) {
  if (!total) return 0;
  return Math.round((downloaded / total) * 100);
}

// Status chip colors and designs
const statusConfig = {
  downloading: {
    color: 'primary',
    icon: <CloudDownloadIcon fontSize="small" sx={{ mr: 0.5 }} />
  },
  paused: {
    color: 'warning',
    icon: <PauseIcon fontSize="small" sx={{ mr: 0.5 }} />
  },
  completed: {
    color: 'success',
    icon: <FolderOpenIcon fontSize="small" sx={{ mr: 0.5 }} />
  },
  seeding: {
    color: 'info',
    icon: <PlayArrowIcon fontSize="small" sx={{ mr: 0.5 }} />
  },
  error: {
    color: 'error',
    icon: <InfoIcon fontSize="small" sx={{ mr: 0.5 }} />
  }
};

// Get torrent icon based on name
const getTorrentIcon = (name) => {
  const lowercase = name.toLowerCase();
  
  if (lowercase.includes('movie') || lowercase.includes('mp4') || lowercase.includes('mkv') || lowercase.includes('avi')) {
    return '🎬';
  } else if (lowercase.includes('music') || lowercase.includes('mp3') || lowercase.includes('flac') || lowercase.includes('audio')) {
    return '🎵';
  } else if (lowercase.includes('book') || lowercase.includes('pdf') || lowercase.includes('epub')) {
    return '📚';
  } else if (lowercase.includes('image') || lowercase.includes('jpg') || lowercase.includes('png')) {
    return '🖼️';
  } else if (lowercase.includes('zip') || lowercase.includes('rar') || lowercase.includes('7z')) {
    return '📦';
  } else if (lowercase.includes('iso') || lowercase.includes('setup')) {
    return '💿';
  }
  
  return '📄';
};

export default function TorrentList() {
  const theme = useTheme();
  const { torrents, loading, error, removeTorrent, pauseTorrent, resumeTorrent } = useTorrents();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTorrent, setSelectedTorrent] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleMenuOpen = (event, torrent) => {
    setAnchorEl(event.currentTarget);
    setSelectedTorrent(torrent);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTorrent(null);
  };
  
  const handleShowDeleteConfirm = (torrent) => {
    setConfirmDelete(torrent);
    handleMenuClose();
  };
  
  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };
  
  const handleRemove = async (torrent) => {
    if (!torrent) return;
    
    setActionLoading(true);
    try {
      await removeTorrent(torrent.id);
      setActionError('');
    } catch (err) {
      setActionError('Failed to remove torrent');
      console.error('Error removing torrent:', err);
    } finally {
      setActionLoading(false);
      setConfirmDelete(null);
      handleMenuClose();
    }
  };
  
  const handlePause = async () => {
    if (!selectedTorrent) return;
    
    setActionLoading(true);
    try {
      await pauseTorrent(selectedTorrent.id);
      setActionError('');
    } catch (err) {
      setActionError('Failed to pause torrent');
      console.error('Error pausing torrent:', err);
    } finally {
      setActionLoading(false);
      handleMenuClose();
    }
  };
  
  const handleResume = async () => {
    if (!selectedTorrent) return;
    
    setActionLoading(true);
    try {
      await resumeTorrent(selectedTorrent.id);
      setActionError('');
    } catch (err) {
      setActionError('Failed to resume torrent');
      console.error('Error resuming torrent:', err);
    } finally {
      setActionLoading(false);
      handleMenuClose();
    }
  };
  
  const getProgressColor = (progress) => {
    if (progress >= 100) return theme.palette.success.main;
    if (progress > 80) return theme.palette.success.light;
    if (progress > 50) return theme.palette.primary.main;
    if (progress > 30) return theme.palette.primary.light;
    if (progress > 10) return theme.palette.info.main;
    return theme.palette.info.light;
  };

  if (loading && torrents.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="300px"
      >
        <CircularProgress 
          size={60} 
          thickness={4} 
          sx={{ 
            color: theme.palette.primary.light,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round'
            }
          }} 
        />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Loading torrents...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          mb: 2,
          bgcolor: alpha(theme.palette.error.main, 0.1),
          color: theme.palette.error.main,
          borderRadius: 2
        }}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
      >
        {error}
      </Alert>
    );
  }

  if (torrents.length === 0) {
    return (
      <Fade in={true} timeout={800}>
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          minHeight="300px"
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            borderRadius: 3,
            p: 4,
            textAlign: 'center'
          }}
        >
          <Zoom in={true} timeout={500} style={{ transitionDelay: '300ms' }}>
            <CloudDownloadIcon sx={{ fontSize: 70, color: alpha(theme.palette.primary.main, 0.3), mb: 2 }} />
          </Zoom>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No torrents yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mx: 'auto', mb: 3 }}>
            Add a torrent using the "Add Torrent" button to get started. You can upload torrent files or use magnet links.
          </Typography>
        </Box>
      </Fade>
    );
  }

  // Apply pagination
  const emptyRows = rowsPerPage - Math.min(rowsPerPage, torrents.length - page * rowsPerPage);
  const visibleTorrents = torrents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ width: '100%' }}>
      {actionError && (
        <Fade in={!!actionError}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: theme.palette.error.main
            }} 
            onClose={() => setActionError('')}
          >
            {actionError}
          </Alert>
        </Fade>
      )}
      
      {/* Delete confirmation */}
      <Collapse in={!!confirmDelete}>
        <Box sx={{ mb: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              bgcolor: alpha(theme.palette.error.main, 0.05),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              borderRadius: 2
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ color: 'error.main', display: 'flex' }}>
                <DeleteForeverIcon />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Delete "{confirmDelete?.name}"?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This action cannot be undone.
                </Typography>
              </Box>
              <Box>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Cancel">
                    <IconButton size="small" onClick={handleCancelDelete}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleRemove(confirmDelete)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Collapse>
      
      <TableContainer component={Box}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                  fontWeight: 'bold',
                  color: theme.palette.text.secondary,
                  py: 1.5
                }}
              >
                Name
              </TableCell>
              <TableCell 
                align="right" 
                sx={{ 
                  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                  fontWeight: 'bold',
                  color: theme.palette.text.secondary,
                  py: 1.5
                }}
              >
                Size
              </TableCell>
              <TableCell 
                sx={{ 
                  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                  fontWeight: 'bold',
                  color: theme.palette.text.secondary,
                  py: 1.5
                }}
              >
                Progress
              </TableCell>
              <TableCell 
                align="center"
                sx={{ 
                  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                  fontWeight: 'bold',
                  color: theme.palette.text.secondary,
                  py: 1.5
                }}
              >
                Status
              </TableCell>
              <TableCell 
                align="right"
                sx={{ 
                  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                  fontWeight: 'bold',
                  color: theme.palette.text.secondary,
                  py: 1.5,
                  width: 100
                }}
              >
                Speed
              </TableCell>
              <TableCell 
                align="right"
                sx={{ 
                  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                  fontWeight: 'bold',
                  color: theme.palette.text.secondary,
                  py: 1.5,
                  width: 70
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleTorrents.map((torrent, i) => {
              const progress = formatProgress(torrent.downloaded || 0, torrent.size || 0);
              const config = statusConfig[torrent.status?.toLowerCase()] || statusConfig.error;
              
              return (
                <Fade in={true} timeout={400} style={{ transitionDelay: `${i * 50}ms` }}>
                  <TableRow 
                    key={torrent.id}
                    hover
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <TableCell 
                      component="th" 
                      scope="row"
                      sx={{ 
                        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`,
                        py: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ 
                            width: 34, 
                            height: 34, 
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            fontSize: '16px',
                            mr: 2,
                            fontWeight: 'bold'
                          }}
                        >
                          {getTorrentIcon(torrent.name)}
                        </Avatar>
                        <Box>
                          <Tooltip title={torrent.name} enterDelay={500}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 320, fontWeight: 500 }}>
                              {torrent.name}
                            </Typography>
                          </Tooltip>
                          {torrent.infoHash && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <LinkIcon sx={{ fontSize: 12, mr: 0.5 }} />
                              {torrent.infoHash.substring(0, 12)}...
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {formatSize(torrent.size || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={progress} 
                            sx={{ 
                              height: 6, 
                              borderRadius: 5,
                              backgroundColor: alpha(theme.palette.primary.main, 0.15),
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getProgressColor(progress),
                                borderRadius: 5,
                                transition: 'transform 0.4s ease-in-out'
                              }
                            }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 35, textAlign: 'right' }}>
                          <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            {progress}%
                          </Typography>
                        </Box>
                      </Box>
                      {torrent.peers > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {torrent.peers} {torrent.peers === 1 ? 'peer' : 'peers'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell 
                      align="center"
                      sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}
                    >
                      <Chip 
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {config?.icon}
                            {torrent.status || 'Unknown'}
                          </Box>
                        }
                        color={config?.color || 'default'} 
                        size="small" 
                        sx={{ 
                          fontWeight: 500,
                          minWidth: 110
                        }}
                      />
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}
                    >
                      {torrent.downloadSpeed > 0 && (
                        <Typography variant="body2" color="primary" fontWeight={500}>
                          ↓ {formatSpeed(torrent.downloadSpeed)}
                        </Typography>
                      )}
                      {torrent.uploadSpeed > 0 && (
                        <Typography variant="body2" color="success.main">
                          ↑ {formatSpeed(torrent.uploadSpeed)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}` }}
                    >
                      <Tooltip title="Torrent Actions">
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleMenuOpen(e, torrent)}
                          disabled={actionLoading}
                          sx={{ 
                            color: theme.palette.text.secondary,
                            '&:hover': { color: theme.palette.primary.main },
                            transition: 'color 0.2s ease'
                          }}
                        >
                          <MoreHorizIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </Fade>
              );
            })}
            {emptyRows > 0 && (
              <TableRow style={{ height: 73 * emptyRows }}>
                <TableCell colSpan={6} sx={{ borderBottom: 'none' }} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {torrents.length > 10 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={torrents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            color: theme.palette.text.secondary,
            '.MuiTablePagination-select': {
              color: theme.palette.text.primary
            },
            borderTop: `1px solid ${alpha(theme.palette.common.white, 0.05)}`
          }}
        />
      )}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{ 
          '& .MuiPaper-root': { 
            bgcolor: theme.palette.background.paper,
            borderRadius: 2,
            boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.3)}`
          }
        }}
      >
        {selectedTorrent?.status?.toLowerCase() === 'paused' ? (
          <MenuItem onClick={handleResume} disabled={actionLoading}>
            <ListItemIcon>
              <PlayArrowIcon fontSize="small" sx={{ color: theme.palette.success.main }} />
            </ListItemIcon>
            <ListItemText>Resume</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={handlePause} disabled={actionLoading || selectedTorrent?.status?.toLowerCase() === 'completed'}>
            <ListItemIcon>
              <PauseIcon fontSize="small" sx={{ color: theme.palette.warning.main }} />
            </ListItemIcon>
            <ListItemText>Pause</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={() => handleShowDeleteConfirm(selectedTorrent)} disabled={actionLoading}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: theme.palette.error.main }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
        
        <MenuItem disabled={actionLoading}>
          <ListItemIcon>
            <InfoIcon fontSize="small" sx={{ color: theme.palette.info.main }} />
          </ListItemIcon>
          <ListItemText>Details</ListItemText>
        </MenuItem>
        
        {selectedTorrent?.status?.toLowerCase() === 'completed' && (
          <MenuItem disabled={actionLoading}>
            <ListItemIcon>
              <FolderOpenIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
            </ListItemIcon>
            <ListItemText>Open Folder</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
} 