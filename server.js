const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const app = express();
const port = 3001;

// Configure middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Configure download directory
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// In-memory database for torrents
const torrents = new Map();

// Helper function to start downloading a torrent
const startTorrentDownload = (torrent) => {
  if (torrent.status === 'downloading' || torrent.status === 'completed') {
    console.log(`Torrent ${torrent.id} already ${torrent.status}, not starting download`);
    return;
  }
  
  // Update status
  torrent.status = 'downloading';
  torrent.downloadSpeed = 1024 * 10; // Fake 10 KB/s download speed
  torrent.uploadSpeed = 1024 * 2;   // Fake 2 KB/s upload speed
  torrent.peers = 5;                // Fake 5 peers
  
  console.log(`Starting download for torrent: ${torrent.id}, name: ${torrent.name}`);
  console.log(`Download path: ${torrent.downloadPath}`);
  console.log(`File path: ${torrent.filePath}`);
  
  try {
    // Create the downloads directory if it doesn't exist
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
      console.log(`Created downloads directory: ${downloadsDir}`);
    }

    // In a real app, you would actually download the torrent here
    // For demo purposes, we'll just simulate the download
    
    // Simulate download progress
    torrent.downloaded = 0;
    const totalSize = torrent.size || 1024 * 1024 * 100; // Use file size or default to 100MB
    const updateInterval = 1000; // 1 second
    const increment = totalSize / 20; // Complete in ~20 updates
    
    console.log(`Simulating download of ${totalSize} bytes for torrent ${torrent.id}`);
    
    const progressInterval = setInterval(() => {
      // Check if torrent still exists and is downloading
      const currentTorrent = torrents.get(torrent.id);
      if (!currentTorrent || currentTorrent.status !== 'downloading') {
        console.log(`Stopping progress updates for torrent ${torrent.id} - Status: ${currentTorrent?.status || 'deleted'}`);
        clearInterval(progressInterval);
        return;
      }
      
      // Update progress
      currentTorrent.downloaded = Math.min(currentTorrent.downloaded + increment, totalSize);
      currentTorrent.progress = Math.round((currentTorrent.downloaded / totalSize) * 100);
      
      // Simulate random speed fluctuations for realism
      currentTorrent.downloadSpeed = Math.floor(1024 * 10 * (0.5 + Math.random()));
      currentTorrent.uploadSpeed = Math.floor(1024 * 2 * (0.5 + Math.random()));
      currentTorrent.peers = Math.floor(3 + Math.random() * 5);
      
      console.log(`Torrent ${currentTorrent.id} progress: ${currentTorrent.progress}%`);
      
      // Complete the download after reaching 100%
      if (currentTorrent.progress >= 100) {
        console.log(`Download completed for torrent ${currentTorrent.id}`);
        currentTorrent.status = 'completed';
        currentTorrent.progress = 100;
        clearInterval(progressInterval);
        
        // Create an empty file to simulate the download
        try {
          fs.writeFileSync(currentTorrent.downloadPath, 'Simulated download content');
          console.log(`Created simulated download file at ${currentTorrent.downloadPath}`);
        } catch (err) {
          console.error(`Error creating simulated download file: ${err.message}`);
        }
      }
    }, updateInterval);
    
    console.log(`Started progress monitoring for torrent ${torrent.id}`);
  } catch (err) {
    console.error(`Error starting download for torrent ${torrent.id}: ${err.message}`);
    torrent.status = 'error';
    torrent.error = err.message;
  }
};

// API routes
app.get('/api/torrents', (req, res) => {
  const torrentList = Array.from(torrents.values());
  res.json(torrentList);
});

app.post('/api/torrents/add', upload.single('torrentFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No torrent file uploaded' });
    }
    
    console.log(`File uploaded: ${req.file.path}`);
    const torrentId = uuidv4();
    const torrentFile = req.file.path;
    
    console.log(`Executing: node app/main.js info "${torrentFile}"`);
    // Modify exec to use a more robust approach
    exec(`node app/main.js info "${torrentFile}"`, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error getting torrent info: ${err.message}`);
        console.error(`Command stdout: ${stdout}`);
        console.error(`Command stderr: ${stderr}`);
        
        // Try to still create a basic torrent with available info
        const torrent = {
          id: torrentId,
          name: path.basename(req.file.originalname),
          infoHash: 'unknown',
          size: 0,
          filePath: torrentFile,
          downloadPath: path.join(downloadsDir, path.basename(req.file.originalname)),
          status: 'added',
          progress: 0,
          createdAt: new Date().toISOString(),
          error: err.message
        };
        
        torrents.set(torrentId, torrent);
        
        // Automatically start the download
        startTorrentDownload(torrent);
        
        return res.status(201).json(torrent);
      }
      
      console.log(`Successfully parsed torrent file. Output: ${stdout}`);
      
      // Parse torrent info from stdout
      const infoLines = stdout.split('\n');
      const trackerUrl = infoLines.find(line => line.startsWith('Tracker URL:'))?.split(': ')[1] || '';
      const length = parseInt(infoLines.find(line => line.startsWith('Length:'))?.split(': ')[1] || '0');
      const infoHash = infoLines.find(line => line.startsWith('Info Hash:'))?.split(': ')[1] || '';
      const pieceLength = parseInt(infoLines.find(line => line.startsWith('Piece Length:'))?.split(': ')[1] || '0');
      
      // Create torrent object
      const torrent = {
        id: torrentId,
        name: path.basename(req.file.originalname),
        infoHash,
        trackerUrl,
        size: length,
        pieceLength,
        filePath: torrentFile,
        downloadPath: path.join(downloadsDir, path.basename(req.file.originalname)),
        status: 'added',
        progress: 0,
        createdAt: new Date().toISOString()
      };
      
      torrents.set(torrentId, torrent);
      
      // Automatically start the download
      startTorrentDownload(torrent);
      
      res.status(201).json(torrent);
    });
  } catch (error) {
    console.error('Error adding torrent:', error);
    res.status(500).json({ error: `Failed to add torrent: ${error.message}` });
  }
});

app.post('/api/torrents/magnet', (req, res) => {
  try {
    const { magnetLink } = req.body;
    if (!magnetLink) {
      return res.status(400).json({ error: 'Magnet link is required' });
    }
    
    const torrentId = uuidv4();
    
    // Parse magnet link
    exec(`node app/main.js magnet_parse "${magnetLink}"`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error parsing magnet link: ${err}`);
        return res.status(500).json({ error: 'Failed to parse magnet link' });
      }
      
      // Parse magnet info from stdout
      const infoLines = stdout.split('\n');
      const trackerUrl = infoLines.find(line => line.startsWith('Tracker URL:'))?.split(': ')[1] || '';
      const infoHash = infoLines.find(line => line.startsWith('Info Hash:'))?.split(': ')[1] || '';
      
      // Use the hash as the filename
      const fileName = `${infoHash}.torrent`;
      const downloadPath = path.join(downloadsDir, fileName);
      
      // Create torrent object
      const torrent = {
        id: torrentId,
        name: fileName,
        infoHash,
        trackerUrl,
        size: 0, // Unknown until download starts
        magnetLink,
        downloadPath,
        status: 'added',
        progress: 0,
        createdAt: new Date().toISOString()
      };
      
      torrents.set(torrentId, torrent);
      
      // Automatically start the download
      startTorrentDownload(torrent);
      
      res.status(201).json(torrent);
    });
  } catch (error) {
    console.error('Error adding magnet link:', error);
    res.status(500).json({ error: 'Failed to add magnet link' });
  }
});

app.get('/api/torrents/:id', (req, res) => {
  const { id } = req.params;
  const torrent = torrents.get(id);
  
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  res.json(torrent);
});

app.post('/api/torrents/:id/start', (req, res) => {
  const { id } = req.params;
  const torrent = torrents.get(id);
  
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  startTorrentDownload(torrent);
  res.json(torrent);
});

app.post('/api/torrents/:id/pause', (req, res) => {
  const { id } = req.params;
  const torrent = torrents.get(id);
  
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  // Update status
  if (torrent.status === 'downloading') {
    torrent.status = 'paused';
    torrents.set(id, torrent);
  }
  
  // Note: In a real implementation, you'd also need to kill the download process
  
  res.json(torrent);
});

app.get('/api/torrents/:id/progress', (req, res) => {
  const { id } = req.params;
  const torrent = torrents.get(id);
  
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  res.json({
    id: torrent.id,
    progress: torrent.progress,
    status: torrent.status
  });
});

app.delete('/api/torrents/:id', (req, res) => {
  const { id } = req.params;
  const { deleteFiles } = req.query;
  const torrent = torrents.get(id);
  
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  // Remove from in-memory database
  torrents.delete(id);
  
  // Delete files if requested
  if (deleteFiles === 'true' && torrent.downloadPath) {
    try {
      if (fs.existsSync(torrent.downloadPath)) {
        fs.unlinkSync(torrent.downloadPath);
      }
      
      // Also delete torrent file if it exists
      if (torrent.filePath && fs.existsSync(torrent.filePath)) {
        fs.unlinkSync(torrent.filePath);
      }
    } catch (error) {
      console.error(`Error deleting files for torrent ${id}:`, error);
    }
  }
  
  res.status(204).end();
});

app.get('/api/torrents/:id/files', (req, res) => {
  const { id } = req.params;
  const torrent = torrents.get(id);
  
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' });
  }
  
  // If download hasn't completed, return empty array
  if (torrent.status !== 'completed') {
    return res.json([]);
  }
  
  // Check if the download path exists
  if (!fs.existsSync(torrent.downloadPath)) {
    return res.json([]);
  }
  
  // Get file info
  const stats = fs.statSync(torrent.downloadPath);
  const file = {
    name: path.basename(torrent.downloadPath),
    path: torrent.downloadPath,
    size: stats.size,
    createdAt: stats.birthtime.toISOString(),
    modifiedAt: stats.mtime.toISOString()
  };
  
  res.json([file]);
});

// Start the server
app.listen(port, () => {
  console.log(`BitTorrent API server running at http://localhost:${port}`);
}); 