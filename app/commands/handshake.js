// Import necessary functions for file reading, bencode decoding, handshake creation, and network operations
const { readFile } = require('fs/promises');
const { decodeBencode } = require('../utils/decoder');
const { createHandshakeRequest } = require('../utils/torrent');
const { disconnect, connect } = require('../utils/network');

// Function to send a handshake to a peer and handle the response
async function sendHandshake(info, { host, port }) {
  return new Promise(async (resolve, reject) => {
    try {
      // Establish a connection to the peer and set up a callback for incoming data
      const socket = await connect(host, port, (data) => {
        console.log('Handshake successful');
        resolve({ socket, data });
      });
      console.log(`Sending handshake to ${host}:${port}`);
      // Create and send the handshake request
      const buffer = createHandshakeRequest(info);
      socket.write(buffer);
    } catch (err) {
      console.error('Handshake error', err);
      reject(err);
    }
  });
}

// Function to handle the handshake command
async function handleCommand(parameters) {
  // Extract input file and peer information from command parameters
  const [, inputFile, peer] = parameters;
  const [host, portAsString] = peer.split(':');
  const port = parseInt(portAsString, 10);

  // Read and decode the torrent file
  const buffer = await readFile(inputFile);
  const { info } = decodeBencode(buffer);

  let socket, data;
  try {
    // Send the handshake and wait for a response
    ({ socket, data } = await sendHandshake(info, { host, port }));
    // Extract and log the peer ID from the handshake response
    const peerId = data.subarray(48, 68).toString('hex');
    console.log(`Peer ID: ${peerId}`);
  } finally {
    // Ensure the socket is disconnected after the handshake
    disconnect(socket);
  }
}

// Export the handleCommand function as the module's default export
module.exports = handleCommand;
