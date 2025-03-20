// Import necessary modules for file reading and decoding bencoded data
const { readFile } = require('fs/promises');
const { decodeBencode } = require('../utils/decoder');
const { fetchPeers } = require('../utils/torrent');

// Function to handle the peers command
async function handleCommand(parameters) {
  // Extract the input file path from command parameters
  const [, inputFile] = parameters;
  
  // Read the torrent file into a buffer
  const buffer = await readFile(inputFile);
  
  // Decode the bencoded content of the torrent file
  const torrent = decodeBencode(buffer);
  
  // Fetch peers from the torrent data
  const peers = await fetchPeers(torrent);

  // Print each peer's host and port
  peers.forEach(({ host, port }) => {
    console.log(`${host}:${port}`);
  });
}

// Export the handleCommand function as the module's default export
module.exports = handleCommand;
