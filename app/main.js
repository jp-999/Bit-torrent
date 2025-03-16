// Import necessary modules and command handlers
const process = require('process');
const handleDecode = require('./commands/decode');
const handleInfo = require('./commands/info');
const handlePeers = require('./commands/peers');
const handleHandshake = require('./commands/handshake');
const handleDownload = require('./commands/download');
const handleMagnetParse = require('./commands/magnet-parse');
const MagnetHandshake = require('./commands/magnet-handshake');
const MagnetInfo = require('./commands/magnet-info');
const MagnetDownload = require('./commands/magnet-download');

// Define command handlers for different operations
const handlers = {
  decode: handleDecode, // Handle decoding of bencoded data
  info: handleInfo, // Handle extraction of torrent info
  peers: handlePeers, // Handle peer-related operations
  handshake: handleHandshake, // Handle handshake operations
  download_piece: handleDownload, // Handle downloading a specific piece
  download: handleDownload, // Handle downloading operations
  magnet_parse: handleMagnetParse, // Handle parsing of magnet links
};

// Extract command and parameters from command line arguments
const parameters = process.argv.slice(2);
const [command] = parameters;

// Handle specific magnet commands with their respective classes
if (command === 'magnet_handshake') {
  const magnetHandshake = new MagnetHandshake();
  magnetHandshake.handleCommand(parameters);
} else if (command === 'magnet_info') {
  const magnetInfo = new MagnetInfo();
  magnetInfo.handleCommand(parameters);
} else if (command === 'magnet_download' || command === 'magnet_download_piece') {
  const magnetDownload = new MagnetDownload();
  magnetDownload.handleCommand(parameters);
} else {
  // Use the handlers object to find and execute the appropriate command handler
  const handler = handlers[command];

  if (!handler) {
    throw new Error(`Unknown command ${command}`);
  }

  try {
    handler(parameters); // Execute the command handler with the provided parameters
  } catch (err) {
    console.error('Fatal error', err); // Log any errors that occur during execution
  }
}