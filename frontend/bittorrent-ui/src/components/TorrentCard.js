import React from 'react';
import { Card, Badge, ProgressBar, Button } from 'react-bootstrap';
import { formatFileSize, formatSpeed, formatProgress, formatTime } from '../utils/formatters';
import { useTorrentsContext } from '../contexts/TorrentsContext';

const TorrentCard = ({ torrent }) => {
  const { pauseTorrent, resumeTorrent, removeTorrent } = useTorrentsContext();
  
  // Calculate progress percentage
  const progress = torrent.downloadedBytes / torrent.totalBytes * 100 || 0;
  
  // Determine status color
  const getStatusBadge = () => {
    if (torrent.status === 'downloading') {
      return <Badge bg="primary">Downloading</Badge>;
    } else if (torrent.status === 'paused') {
      return <Badge bg="warning">Paused</Badge>;
    } else if (torrent.status === 'completed') {
      return <Badge bg="success">Completed</Badge>;
    } else if (torrent.status === 'error') {
      return <Badge bg="danger">Error</Badge>;
    } else {
      return <Badge bg="secondary">{torrent.status}</Badge>;
    }
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title className="text-truncate" style={{ maxWidth: '70%' }} title={torrent.name}>
            {torrent.name}
          </Card.Title>
          {getStatusBadge()}
        </div>
        
        <ProgressBar 
          now={progress} 
          variant={progress === 100 ? "success" : "primary"} 
          className="mb-3"
          label={`${formatProgress(torrent.downloadedBytes, torrent.totalBytes)}`}
        />
        
        <div className="d-flex justify-content-between small text-muted mb-3">
          <div>Size: {formatFileSize(torrent.totalBytes)}</div>
          <div>
            Down: {formatSpeed(torrent.downloadSpeed)} | 
            Up: {formatSpeed(torrent.uploadSpeed)}
          </div>
        </div>
        
        <div className="d-flex justify-content-between align-items-center small text-muted mb-3">
          <div>Peers: {torrent.peers || 0}</div>
          <div>ETA: {formatTime(torrent.eta)}</div>
        </div>
        
        <div className="d-flex gap-2 justify-content-end">
          {torrent.status === 'downloading' ? (
            <Button 
              variant="outline-warning" 
              size="sm" 
              onClick={() => pauseTorrent(torrent.id)}
            >
              Pause
            </Button>
          ) : (
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => resumeTorrent(torrent.id)}
              disabled={torrent.status === 'completed'}
            >
              Resume
            </Button>
          )}
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={() => removeTorrent(torrent.id)}
          >
            Remove
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default TorrentCard; 