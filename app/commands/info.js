// Import required modules for file reading and torrent processing
const { readFile } = require('fs/promises');
const { calculateInfoHash, decodeTorrent } = require('../utils/torrent');

// Function to handle the info command
async function handleCommand(parameters) {
  // Extract the input file path from command parameters
  const [, inputFile] = parameters;
  
  // Read the torrent file into a buffer
  const buffer = await readFile(inputFile);
  
  // Decode the torrent file contents
  const torrent = decodeTorrent(buffer);
  
  // Print torrent information:
  // - Tracker URL (announce URL)
  console.log(`Tracker URL: ${torrent.announce.toString()}`);
  // - File length in bytes
  console.log(`Length: ${torrent.info.length}`);
  // - SHA-1 hash of the info dictionary
  console.log(`Info Hash: ${calculateInfoHash(torrent.info)}`);
  // - Length of each piece
  console.log(`Piece Length: ${torrent.info['piece length']}`);
  // - List of SHA-1 hashes for each piece
  console.log('Piece Hashes:');
  torrent.info.splitPieces.forEach((piece) => console.log(piece.toString('hex')));
}

// Export the handleCommand function as the module's default export
module.exports = handleCommand;
