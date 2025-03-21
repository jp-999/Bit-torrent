// Import necessary functions for handling handshake responses and torrent processing
const { isHandshakeResponse, parseHandshake } = require('../utils/handshake');
const { MessageId, splitPieceHashes } = require('../utils/torrent');
const { decodeBencode } = require('../utils/decoder');

// Define the HandshakeMixin object containing methods related to peer handshakes
const HandshakeMixin = {
  // Wait for the peer metadata extension ID to be set
  async waitForPeerMetadataExtensionId() {
    return new Promise((resolve) => {
      const intervalId = setInterval(() => {
        if (this.peerMetadataExtensionId) {
          clearInterval(intervalId); // Clear the interval once the ID is received
          resolve();
        }
      }, 1000); // Check every second
    });
  },

  // Wait for a metadata response from the peer
  async waitForMetadataResponse() {
    return new Promise((resolve) => {
      const intervalId = setInterval(() => {
        if (this.torrent.info) {
          clearInterval(intervalId); // Clear the interval once the info is received
          resolve();
        }
      }, 1000); // Check every second
    });
  },

  // Wait for the handshake to be received
  async waitForHandshakeReceived() {
    return new Promise((resolve) => {
      const intervalId = setInterval(() => {
        if (this.handshakeReceived) {
          clearInterval(intervalId); // Clear the interval once the handshake is received
          resolve();
        }
      }, 1000); // Check every second
    });
  },

  // Handle incoming data from the peer
  dataEventHandler(chunk) {
    console.log(`Response received: ${chunk.length} bytes`);
    this.incomingBuffer = Buffer.concat([this.incomingBuffer, chunk]); // Append incoming data to the buffer

    while (this.incomingBuffer.length >= 4) {
      // Check for handshake response
      if (isHandshakeResponse(this.incomingBuffer)) {
        const { supportsExtension, peerId } = parseHandshake(this.incomingBuffer);
        console.log(`Peer ID: ${peerId}`);
        this.incomingBuffer = this.incomingBuffer.subarray(68); // Remove handshake data from the buffer
        this.handshakeReceived = true; // Update handshake status
        continue;
      }

      // Read the message length
      const messageLength = this.incomingBuffer.readUInt32BE(0);
      if (this.incomingBuffer.length < messageLength + 4) break; // Wait for more data

      // Extract complete message
      const message = this.incomingBuffer.subarray(4, 4 + messageLength);
      this.processPeerMessage(message); // Process the received message
      this.incomingBuffer = this.incomingBuffer.subarray(4 + messageLength); // Remove processed message from the buffer
    }
  },

  // Process messages received from the peer
  processPeerMessage(message) {
    const messageId = message.readUint8(0); // Read the message ID

    console.log('messageId', messageId);
    console.log('message', message.length);

    // Handle extended message for metadata exchange
    if (messageId === MessageId.EXTENDED) {
      const payload = message.subarray(1);
      const dictionary = payload.subarray(1);
      const decoded = decodeBencode(dictionary); // Decode the message payload

      // Check for metadata extension ID
      if (decoded.hasOwnProperty('m')) {
        this.peerMetadataExtensionId = decoded.m['ut_metadata'];
        console.log(`Peer Metadata Extension ID: ${this.peerMetadataExtensionId}`);
      } else if (decoded.hasOwnProperty('msg_type')) {
        const { msg_type, piece, total_size } = decoded;
        console.log({ msg_type, piece, total_size });

        const metadataPiece = decodeBencode(message.subarray(message.length - total_size));
        console.log(metadataPiece, JSON.stringify(metadataPiece));

        const pieces = splitPieceHashes(metadataPiece.pieces); // Split piece hashes

        // Store metadata in the torrent object
        this.torrent.info = {
          length: metadataPiece.length,
          pieceLength: metadataPiece['piece length'],
          pieces,
        };
      } else {
        console.log('decoded', decoded); // Log any other decoded messages
      }
    }
  },
};

// Export the HandshakeMixin object for use in other modules
module.exports = HandshakeMixin;
