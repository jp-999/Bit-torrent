// Import necessary modules and command handlers
const process = require('process');
const handleDecode = require('./commands/decode'); // Handler for decoding bencoded data
const handleInfo = require('./commands/info'); // Handler for extracting torrent info
const handlePeers = require('./commands/peers'); // Handler for peer-related operations
const handleHandshake = require('./commands/handshake'); // Handler for handshake operations
const handleDownload = require('./commands/download'); // Handler for downloading operations
const handleMagnetParse = require('./commands/magnet-parse'); // Handler for parsing magnet links
const MagnetHandshake = require('./commands/magnet-handshake'); // Class for handling magnet handshakes
const MagnetInfo = require('./commands/magnet-info'); // Class for handling magnet info retrieval
const MagnetDownload = require('./commands/magnet-download'); // Class for handling magnet downloads

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
const [command] = parameters; // Get the command from the parameters

// Handle specific magnet commands with their respective classes
if (command === 'magnet_handshake') {
  const magnetHandshake = new MagnetHandshake(); // Create a new instance of MagnetHandshake
  magnetHandshake.handleCommand(parameters); // Execute the handshake command
} else if (command === 'magnet_info') {
  const magnetInfo = new MagnetInfo(); // Create a new instance of MagnetInfo
  magnetInfo.handleCommand(parameters); // Execute the info command
} else if (command === 'magnet_download' || command === 'magnet_download_piece') {
  const magnetDownload = new MagnetDownload(); // Create a new instance of MagnetDownload
  magnetDownload.handleCommand(parameters); // Execute the download command
} else {
  // Use the handlers object to find and execute the appropriate command handler
  const handler = handlers[command];

  if (!handler) {
    throw new Error(`Unknown command ${command}`); // Throw an error if the command is not recognized
  }

  try {
    handler(parameters); // Execute the command handler with the provided parameters
  } catch (err) {
    console.error('Fatal error', err); // Log any errors that occur during execution
  }
}