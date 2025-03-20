// Import necessary functions for handling magnet links, networking, and handshakes
const {
  parseMagnetLink,
  fetchMagnetPeers,
  createMagnetHandshakeRequest,
  createExtensionHandshakeRequest,
} = require('../utils/magnet');
const { connect, disconnect } = require('../utils/network');
const HandshakeMixin = require('../mixins/handshake-mixin');

// Class to handle magnet link handshakes
class MagnetHandshake {
  constructor() {
    // Initialize state variables
    this.incomingBuffer = Buffer.alloc(0); // Buffer for incoming data
    this.handshakeReceived = false; // Flag to track if handshake has been received
  }

  // Main function to handle the handshake command
  async handleCommand(parameters) {
    // Extract magnet link from command parameters
    const [, magnetLink] = parameters;
    
    // Parse the magnet link to get the info hash and tracker URL
    const { infoHash, trackerUrl } = parseMagnetLink(magnetLink);
    
    // Fetch peers from the tracker using the info hash
    const peers = await fetchMagnetPeers(infoHash, trackerUrl);
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

      // Clean up the socket connection
      socket.destroySoon();
    } catch (err) {
      console.error('Handshake failed', err); // Log any errors that occur during the handshake
    } finally {
      disconnect(socket); // Ensure the socket is disconnected
    }
  }
}

// Mix in handshake functionality to the MagnetHandshake class
Object.assign(MagnetHandshake.prototype, HandshakeMixin);

// Export the MagnetHandshake class as the module's default export
module.exports = MagnetHandshake;
