import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Typography, 
  Box, 
  Button, 
  Paper,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Fab,
  useTheme,
  alpha,
  Zoom,
  Fade,
  Tooltip,
  Badge,
  Collapse,
  Card,
  CardContent,
  Stack
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Menu as MenuIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  BarChart as StatsIcon,
  Folder as FolderIcon,
  Speed as SpeedIcon,
  CloudDownload as CloudDownloadIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkCheckIcon,
  FormatListBulleted as ListIcon,
  Close as CloseIcon
} from '@mui/icons-material';

import TorrentList from './TorrentList';
import AddTorrentForm from './AddTorrentForm';
import { useTorrents } from '../contexts/TorrentsContext';

const Dashboard = () => {
  const theme = useTheme();
  const { torrents, loading, error, refreshTorrents } = useTorrents();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [stats, setStats] = useState({
    downloadSpeed: 0,
    uploadSpeed: 0,
    activeTorrents: 0,
    completedTorrents: 0
  });
  
  // Calculate stats from torrents
  useEffect(() => {
    if (torrents && torrents.length > 0) {
      const downloadSpeed = torrents.reduce((sum, torrent) => sum + (torrent.downloadSpeed || 0), 0);
      const uploadSpeed = torrents.reduce((sum, torrent) => sum + (torrent.uploadSpeed || 0), 0);
      const activeTorrents = torrents.filter(t => t.status === 'downloading').length;
      const completedTorrents = torrents.filter(t => t.status === 'completed').length;
      
      setStats({
        downloadSpeed,
        uploadSpeed,
        activeTorrents,
        completedTorrents
      });
    }
  }, [torrents]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshTorrents();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
  };
  
  // Helper functions
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i] + '/s';
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        elevation={0} 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: `linear-gradient(45deg, ${theme.palette.primary.dark} 10%, ${theme.palette.primary.main} 90%)`,
          boxShadow: `0px 2px 10px ${alpha(theme.palette.common.black, 0.3)}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer}
            sx={{ 
              mr: 2,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'rotate(90deg)'
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h5" 
            noWrap 
            component="div" 
            fontWeight="bold" 
            sx={{ 
              flexGrow: 1,
              background: 'linear-gradient(45deg, #fff, #e0e0e0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            BitStream
          </Typography>
          <Tooltip title="Refresh Torrents">
            <IconButton 
              onClick={handleRefresh} 
              color="inherit"
              disabled={loading || isRefreshing}
              sx={{
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'rotate(180deg)'
                }
              }}
            >
              {isRefreshing ? 
                <CircularProgress size={24} color="inherit" /> : 
                <RefreshIcon />
              }
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          width: 260,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 260,
            boxSizing: 'border-box',
            background: theme.palette.background.paper,
            borderRight: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
            boxShadow: `4px 0 15px ${alpha(theme.palette.common.black, 0.2)}`
          },
        }}
      >
        <Toolbar 
          sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.05)}`
          }}
        >
          <IconButton onClick={toggleDrawer} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Toolbar>
        
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight="bold" color="primary.light">
            BitStream Client
          </Typography>
          <Typography variant="caption" color="text.secondary">
            v1.0.0
          </Typography>
        </Box>
        
        <Divider sx={{ my: 1, borderColor: alpha(theme.palette.common.white, 0.05) }} />
        
        <Box sx={{ overflow: 'auto', p: 1 }}>
          <List>
            <ListItem 
              button 
              selected
              sx={{
                borderRadius: 2,
                mb: 1,
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.25),
                  }
                }
              }}
            >
              <ListItemIcon><DashboardIcon color="primary" /></ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            <ListItem 
              button
              sx={{
                borderRadius: 2,
                mb: 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.05),
                }
              }}
            >
              <ListItemIcon><FolderIcon /></ListItemIcon>
              <ListItemText primary="Files" />
            </ListItem>
            <ListItem 
              button
              sx={{
                borderRadius: 2,
                mb: 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.05),
                }
              }}
            >
              <ListItemIcon><StatsIcon /></ListItemIcon>
              <ListItemText primary="Stats" />
            </ListItem>
            <ListItem 
              button
              sx={{
                borderRadius: 2,
                mb: 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.05),
                }
              }}
            >
              <ListItemIcon><SpeedIcon /></ListItemIcon>
              <ListItemText primary="Bandwidth" />
            </ListItem>
          </List>
          <Divider sx={{ my: 2, borderColor: alpha(theme.palette.common.white, 0.05) }} />
          <List>
            <ListItem 
              button
              sx={{
                borderRadius: 2,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.05),
                }
              }}
            >
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          pt: { xs: 8, sm: 9 }, 
          pb: 6,
          bgcolor: 'background.default',
          minHeight: '100vh'
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ mb: 4, mt: 2 }}>
            <Fade in={true} timeout={800}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs>
                  <Typography 
                    component="h1" 
                    variant="h4" 
                    sx={{
                      fontWeight: "bold",
                      background: 'linear-gradient(45deg, #62a5ff, #3a7cff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Your Torrents
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Manage and monitor your downloads
                  </Typography>
                </Grid>
                <Grid item>
                  <Zoom in={true} timeout={400} style={{ transitionDelay: '200ms' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={toggleAddForm}
                      startIcon={<AddIcon />}
                      sx={{ 
                        px: 3, 
                        py: 1
                      }}
                    >
                      {showAddForm ? 'Hide Form' : 'Add Torrent'} 
                    </Button>
                  </Zoom>
                </Grid>
              </Grid>
            </Fade>
          </Box>

          {/* Stats Cards */}
          <Fade in={true} timeout={800} style={{ transitionDelay: '400ms' }}>
            <Box sx={{ mb: 4 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card 
                    sx={{ 
                      borderRadius: 3, 
                      boxShadow: `0 8px 20px ${alpha(theme.palette.common.black, 0.15)}`,
                      height: '100%',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.7)} 100%)`,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Badge 
                          color="primary" 
                          variant="dot" 
                          invisible={stats.activeTorrents === 0}
                          sx={{ 
                            '& .MuiBadge-dot': { 
                              backgroundColor: '#4caf50',
                              animation: 'pulse 1.5s infinite'
                            },
                            '@keyframes pulse': {
                              '0%': { opacity: 0.6 },
                              '50%': { opacity: 1 },
                              '100%': { opacity: 0.6 }
                            }
                          }}
                        >
                          <CloudDownloadIcon sx={{ fontSize: 28, color: 'white', opacity: 0.9 }} />
                        </Badge>
                        <Typography variant="h6" sx={{ ml: 1, color: 'white' }}>Downloads</Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {stats.activeTorrents}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Active Downloads
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card 
                    sx={{ 
                      borderRadius: 3, 
                      boxShadow: `0 8px 20px ${alpha(theme.palette.common.black, 0.15)}`,
                      height: '100%',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.success.dark, 0.9)} 0%, ${alpha(theme.palette.success.main, 0.7)} 100%)`,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <StorageIcon sx={{ fontSize: 28, color: 'white', opacity: 0.9 }} />
                        <Typography variant="h6" sx={{ ml: 1, color: 'white' }}>Completed</Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {stats.completedTorrents}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Finished Torrents
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card 
                    sx={{ 
                      borderRadius: 3, 
                      boxShadow: `0 8px 20px ${alpha(theme.palette.common.black, 0.15)}`,
                      height: '100%',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.info.dark, 0.9)} 0%, ${alpha(theme.palette.info.main, 0.7)} 100%)`,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <SpeedIcon sx={{ fontSize: 28, color: 'white', opacity: 0.9 }} />
                        <Typography variant="h6" sx={{ ml: 1, color: 'white' }}>Download</Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {formatBytes(stats.downloadSpeed)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Current Speed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card 
                    sx={{ 
                      borderRadius: 3, 
                      boxShadow: `0 8px 20px ${alpha(theme.palette.common.black, 0.15)}`,
                      height: '100%',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.warning.dark, 0.9)} 0%, ${alpha(theme.palette.warning.main, 0.7)} 100%)`,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <NetworkCheckIcon sx={{ fontSize: 28, color: 'white', opacity: 0.9 }} />
                        <Typography variant="h6" sx={{ ml: 1, color: 'white' }}>Upload</Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                        {formatBytes(stats.uploadSpeed)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Current Speed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Fade>

          {/* Error Message */}
          {error && (
            <Fade in={!!error}>
              <Paper sx={{ 
                p: 2, 
                mb: 3, 
                bgcolor: alpha(theme.palette.error.main, 0.1),
                border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                color: theme.palette.error.main,
                borderRadius: 2
              }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <Typography>{error}</Typography>
                </Stack>
              </Paper>
            </Fade>
          )}

          {/* Add Torrent Form */}
          <Collapse in={showAddForm}>
            <Box sx={{ mb: 3 }}>
              <AddTorrentForm />
            </Box>
          </Collapse>

          {/* Torrent List Header */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 2,
              px: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ListIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight="medium">Torrents</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {torrents.length} {torrents.length === 1 ? 'item' : 'items'}
              </Typography>
            </Box>
          </Box>

          {/* Torrent List */}
          <Fade in={true} timeout={500}>
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ 
                overflow: 'hidden',
                borderColor: alpha(theme.palette.common.white, 0.1),
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
                boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.1)}`
              }}
            >
              <TorrentList />
            </Paper>
          </Fade>
        </Container>
      </Box>

      {/* Floating Action Button (on mobile) */}
      {!showAddForm && (
        <Zoom in={true}>
          <Fab 
            color="secondary" 
            aria-label="add" 
            onClick={toggleAddForm}
            sx={{ 
              position: 'fixed', 
              bottom: 24, 
              right: 24,
              display: { sm: 'none' },
              boxShadow: `0 8px 24px ${alpha(theme.palette.secondary.main, 0.4)}`
            }}
          >
            <AddIcon />
          </Fab>
        </Zoom>
      )}
    </Box>
  );
};

export default Dashboard; 