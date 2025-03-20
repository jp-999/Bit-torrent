// Import necessary functions for handling magnet links, networking, and handshakes
const {
  parseMagnetLink,
  fetchMagnetPeers,
  createMagnetHandshakeRequest,
  createExtensionHandshakeRequest,
  createMetadataRequest,
} = require('../utils/magnet');
const { connect, disconnect } = require('../utils/network');
const HandshakeMixin = require('../mixins/handshake-mixin');

// Class to handle magnet link information retrieval
class MagnetInfo {
  constructor() {
    // Initialize state variables
    this.incomingBuffer = Buffer.alloc(0); // Buffer for incoming data
    this.handshakeReceived = false; // Flag to track if handshake has been received
    this.peerMetadataExtensionId = null; // Store peer metadata extension ID
    this.torrent = {}; // Object to store torrent information
  }

  // Main function to handle the magnet info command
  async handleCommand(parameters) {
    // Extract magnet link from command parameters
    const [, magnetLink] = parameters;
    
    // Parse the magnet link to get the info hash and tracker URL
    const { infoHash, trackerUrl } = parseMagnetLink(magnetLink);
    
    // Fetch peers from the tracker using the info hash
    const peers = await fetchMagnetPeers(infoHash, trackerUrl);

    // Store the tracker URL and info hash in the torrent object
    this.torrent.announce = trackerUrl;
    this.torrent.info_hash = infoHash;

    const [peer] = peers; // Get the first peer from the list
    let socket;
    
    try {
      // Establish a connection to the peer and set up the data event handler
      socket = await connect(peer.host, peer.port, this.dataEventHandler.bind(this));

      // Create and send the handshake request to the peer
      const handshakeRequest = createMagnetHandshakeRequest(infoHash);
      socket.write(handshakeRequest);

      // Wait for the handshake to be received
      await this.waitForHandshakeReceived();

      // Create and send an extension handshake request
      const extensionHandshakeRequest = createExtensionHandshakeRequest(1);
      socket.write(extensionHandshakeRequest);

      // Wait for the peer metadata extension ID
      await this.waitForPeerMetadataExtensionId();

      // Create and send a metadata request to the peer
      const metadataRequest = createMetadataRequest(this.peerMetadataExtensionId, 0);
      socket.write(metadataRequest);

      // Wait for the metadata response
      await this.waitForMetadataResponse();

      // Print the torrent information
      console.log(`Tracker URL: ${this.torrent.announce}`);
      console.log(`Length: ${this.torrent.info.length}`);
      console.log(`Info Hash: ${this.torrent.info_hash}`);
      console.log(`Piece Length: ${this.torrent.info.pieceLength}`);
      console.log('Piece hashes:');
      this.torrent.info.pieces.forEach((piece) => console.log(piece.toString('hex')));

      // Clean up the socket connection
      socket.destroySoon();
    } catch (err) {
      console.error('Handshake failed', err); // Log any errors that occur during the handshake
    } finally {
      disconnect(socket); // Ensure the socket is disconnected
    }
  }
}

// Mix in handshake functionality to the MagnetInfo class
Object.assign(MagnetInfo.prototype, HandshakeMixin);

// Export the MagnetInfo class as the module's default export
module.exports = MagnetInfo;
