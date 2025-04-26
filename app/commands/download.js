// Import necessary functions and constants from utilities
const {
  fetchPeers,
  createHandshakeRequest,
  decodeTorrent,
  createPeerMessage,
  MessageId,
  parsePeerMessage,
  parseBlockPayload,
  createBlockRequest,
  calculatePieceLength,
  BLOCK_REQUEST_SIZE,
} = require('../utils/torrent');
const { readFile } = require('fs/promises');
const { connect, disconnect } = require('../utils/network');
const { writeFileSync } = require('fs');
const { sha1Hash } = require('../utils/encoder');
const { isHandshakeResponse } = require('../utils/handshake');

// Define maximum outgoing buffer size for block requests
const MAXIMUM_OUTGOING_BUFFER_SIZE = BLOCK_REQUEST_SIZE * 5;

// Define connection status states for peer communication
const PeerConnectionStatus = Object.freeze({
  PENDING: 'pending',
  HANDSHAKE_RECEIVED: 'handshake received',
  UNCHOKE_RECEIVED: 'unchoke received',
});

// Initialize state for peer connection
const state = {
  blocks: new Map(), // Store downloaded blocks
  connectionStatus: PeerConnectionStatus.PENDING, // Current connection status
  incomingBuffer: Buffer.alloc(0), // Buffer for incoming data
  outgoingBuffer: Buffer.alloc(0), // Buffer for outgoing data
};

// Function to reset the state
function resetState() {
  state.blocks = new Map();
  state.connectionStatus = PeerConnectionStatus.PENDING;
  state.incomingBuffer = Buffer.alloc(0);
  state.outgoingBuffer = Buffer.alloc(0);
}

// Event handler for incoming data from the peer
function dataEventHandler(chunk) {
  console.log(`Response received: ${chunk.length} bytes`);
  state.incomingBuffer = Buffer.concat([state.incomingBuffer, chunk]);

  // If we're still pending a handshake, check if this is a handshake response
  if (state.connectionStatus === PeerConnectionStatus.PENDING) {
    if (isHandshakeResponse(state.incomingBuffer)) {
      console.log('Valid handshake detected, processing');
      state.connectionStatus = PeerConnectionStatus.HANDSHAKE_RECEIVED;
      state.incomingBuffer = state.incomingBuffer.subarray(68); // Skip the handshake
    } else if (state.incomingBuffer.length >= 68) {
      console.log('Data received but not a valid handshake, checking for messages');
      // Not a handshake but we received enough data, maybe we missed the handshake
      // Let's assume we're past the handshake and try to process as messages
      state.connectionStatus = PeerConnectionStatus.HANDSHAKE_RECEIVED;
    } else {
      // Not enough data yet, keep waiting
      return;
    }
  }

  // Process any complete messages in the buffer
  while (state.incomingBuffer.length >= 4) {
    // Read the message length
    const messageLength = state.incomingBuffer.readUInt32BE(0);
    
    // Check for keepalive message (length = 0)
    if (messageLength === 0) {
      console.log('Received keepalive message');
      state.incomingBuffer = state.incomingBuffer.subarray(4);
      continue;
    }
    
    // Check if we have a complete message
    if (state.incomingBuffer.length < messageLength + 4) {
      console.log(`Incomplete message: have ${state.incomingBuffer.length} bytes, need ${messageLength + 4}`);
      break; // Wait for more data
    }

    // Extract complete message
    const message = state.incomingBuffer.subarray(4, 4 + messageLength);
    
    // Process the message
    try {
      processPeerMessage(message);
    } catch (error) {
      console.error(`Error processing peer message: ${error.message}`);
    }

    // Remove processed message from the buffer
    state.incomingBuffer = state.incomingBuffer.subarray(4 + messageLength);
  }
}

// Function to process messages received from the peer
function processPeerMessage(message) {
  const { messageId, payload: blockPayload } = parsePeerMessage(message);

  if (messageId === MessageId.PIECE) {
    const { pieceIndex, blockOffset, block } = parseBlockPayload(blockPayload);

    console.log(
      `Successfully fetched block. Piece index: ${pieceIndex}, Block offset: ${blockOffset}, Block size: ${block.length}`,
    );

    state.blocks.set(`${pieceIndex}-${blockOffset}`, block); // Store the block
    return;
  }

  if (messageId === MessageId.UNCHOKE) {
    state.connectionStatus = PeerConnectionStatus.UNCHOKE_RECEIVED; // Update connection status
    return;
  }
  console.warn(`Unknown message ID from peer: ${messageId}`); // Log unknown message IDs
}

// Function to wait for a specific connection status
async function waitForConnectionStatus(expectedConnectionStatus, timeout = 30000) {
  return new Promise((resolve, reject) => {
    let timeoutId;
    const intervalId = setInterval(() => {
      if (state.connectionStatus === expectedConnectionStatus) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        resolve();
      }
    }, 100); // Reduced polling frequency

    timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error(`Timeout while waiting for connection status of ${expectedConnectionStatus}`));
    }, timeout);
  });
}

// Function to wait for all blocks to be received
async function waitForAllBlocks(totalBlockCount, timeout = 60000) {
  return new Promise((resolve, reject) => {
    let timeoutId, intervalId;
    
    console.log(`Waiting for ${totalBlockCount} blocks`);
    
    timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      const receivedCount = state.blocks.size;
      reject(new Error(`Blocks not received within the timeout period. Got ${receivedCount}/${totalBlockCount}`));
    }, timeout);

    intervalId = setInterval(() => {
      const receivedCount = state.blocks.size;
      if (receivedCount > 0 && receivedCount % 5 === 0) {
        console.log(`Received ${receivedCount}/${totalBlockCount} blocks`);
      }
      
      if (receivedCount === totalBlockCount) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        resolve();
      }
    }, 500); // Reduced polling frequency
  });
}

// Function to perform the handshake with the peer
async function performHandshake(socket, torrent) {
  const handshakeRequest = createHandshakeRequest(torrent.info);
  console.log('Sending handshake message');
  socket.write(handshakeRequest);
  await waitForConnectionStatus(PeerConnectionStatus.HANDSHAKE_RECEIVED);
  console.log('Handshake successful');
}

// Function to send an interested message to the peer
async function sendInterestedMessage(socket) {
  console.log('Sending interested message');
  const peerMessage = createPeerMessage(MessageId.INTERESTED);
  socket.write(peerMessage);
  await waitForConnectionStatus(PeerConnectionStatus.UNCHOKE_RECEIVED);
  console.log('Unchoke received');
}

// Function to convert the blocks map to a Buffer
function convertMapToBuffer() {
  const sortedBlocks = Array.from(state.blocks.entries())
    .sort(([a], [b]) => {
      const [pieceIndexA, blockOffsetA] = a.split('-').map(Number);
      const [pieceIndexB, blockOffsetB] = b.split('-').map(Number);
      return pieceIndexA - pieceIndexB || blockOffsetA - blockOffsetB;
    })
    .map(([, block]) => block);

  return Buffer.concat(sortedBlocks); // Concatenate all blocks into a single Buffer
}

// Function to validate the hash of a piece
function validatePieceHash(pieceBuffer, expectedPieceHash) {
  const actualPieceHash = sha1Hash(pieceBuffer, 'hex');
  const expectedPieceHashInHex = Buffer.from(expectedPieceHash).toString('hex');

  if (expectedPieceHashInHex === actualPieceHash) {
    console.log('Piece hash is valid');
    return;
  }

  throw new Error(
    `Invalid piece hash. Size: ${pieceBuffer.length}, Expected: ${expectedPieceHashInHex}, Actual: ${actualPieceHash}`,
  );
}

// Function to flush the outgoing buffer to the socket
function flushOutgoingBuffer(socket) {
  if (state.outgoingBuffer.length === 0) return;
  
  console.log(`Flushing outgoing buffer of ${state.outgoingBuffer.length} bytes`);
  console.log(`Sending ${Math.floor(state.outgoingBuffer.length / BLOCK_REQUEST_SIZE)} request messages to peer`);
  
  // Write in chunks to avoid overwhelming the socket
  const CHUNK_SIZE = 16 * 1024; // 16KB chunks
  let offset = 0;
  
  while (offset < state.outgoingBuffer.length) {
    const chunk = state.outgoingBuffer.subarray(offset, offset + CHUNK_SIZE);
    socket.write(chunk);
    offset += chunk.length;
    
    // Small delay to allow socket to process data
    if (offset < state.outgoingBuffer.length) {
      // For synchronous processing, we can't await here, but in real async we would
      // setTimeout(() => {}, 10);
    }
  }
  
  state.outgoingBuffer = Buffer.alloc(0);
}

// Function to download a specific piece from the peer
async function downloadPiece(socket, pieceIndex, torrent) {
  let blockOffset = 0;
  let totalBlockCount = 0;

  const calculatedPieceLength = calculatePieceLength(pieceIndex, torrent.info);
  console.log(`Downloading piece ${pieceIndex} with length ${calculatedPieceLength}`);

  state.outgoingBuffer = Buffer.alloc(0);
  const requestBatchSize = 5; // Number of requests to batch before sending
  let requestCount = 0;

  while (blockOffset < calculatedPieceLength) {
    const { blockSize, peerMessage } = createBlockRequest(torrent, pieceIndex, calculatedPieceLength, blockOffset);
    console.log(
      `Adding block request to outgoing buffer. Piece index ${pieceIndex}, Block offset: ${blockOffset}, Block size: ${blockSize}`,
    );

    state.outgoingBuffer = Buffer.concat([state.outgoingBuffer, peerMessage]);
    blockOffset += blockSize;
    totalBlockCount++;
    requestCount++;

    // Send requests in batches to avoid overwhelming the socket
    if (requestCount >= requestBatchSize) {
      flushOutgoingBuffer(socket);
      requestCount = 0;
      
      // Give some time for the peer to respond before sending more requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Flush any remaining requests
  if (state.outgoingBuffer.length > 0) {
    flushOutgoingBuffer(socket);
  }

  console.log(`Total blocks to download: ${totalBlockCount}`);
  await waitForAllBlocks(totalBlockCount);

  console.log(`Received all ${totalBlockCount} blocks for piece ${pieceIndex}`);
  const pieceBuffer = convertMapToBuffer();
  const expectedPieceHash = torrent.info.splitPieces[pieceIndex];
  validatePieceHash(pieceBuffer, expectedPieceHash);

  return pieceBuffer;
}

// Function to initialize peer communication
async function initialisePeerCommunication(peer, torrent) {
  let socket;
  let maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      resetState(); // Reset state before each connection attempt
      console.log(`Connecting to peer ${peer.host}:${peer.port} (Attempt ${retryCount + 1}/${maxRetries})`);
      socket = await connect(peer.host, peer.port, dataEventHandler, 30000); // Longer timeout
      await performHandshake(socket, torrent);
      await sendInterestedMessage(socket);
      return socket; // Return the socket if connection successful
    } catch (error) {
      retryCount++;
      console.error(`Connection attempt ${retryCount} failed: ${error.message}`);
      if (socket) disconnect(socket);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
      } else {
        throw new Error(`Failed to connect to peer after ${maxRetries} attempts`);
      }
    }
  }
}

// Main command handler
async function handleCommand(parameters) {
  // Parse parameters with proper flag handling
  let inputFile, outputFile, pieceIndex;
  const command = parameters[0];
  
  // Check if we're downloading a piece or the whole file
  const isDownloadCommand = command === 'download';
  
  // Parse parameters
  for (let i = 1; i < parameters.length; i++) {
    const param = parameters[i];
    
    if (param === '-o') {
      // The next parameter is the output file
      if (i + 1 < parameters.length) {
        outputFile = parameters[i + 1];
        i++; // Skip the next parameter as we've already processed it
      }
    } else if (!inputFile) {
      // The first non-flag parameter is the input file
      inputFile = param;
    } else if (!isDownloadCommand && !pieceIndex) {
      // If we're downloading a piece, the second non-flag parameter is the piece index
      pieceIndex = param;
    }
  }
  
  // Check if we have all required parameters
  if (!inputFile) {
    throw new Error('Missing torrent file parameter');
  }
  
  if (!outputFile) {
    throw new Error('Missing output file parameter (use -o flag)');
  }
  
  if (!isDownloadCommand && pieceIndex === undefined) {
    throw new Error('Missing piece index parameter for download_piece command');
  }

  try {
    console.log(`Reading torrent file: ${inputFile}`);
    const buffer = await readFile(inputFile);
    const torrent = decodeTorrent(buffer);
    
    // Fetch peers from the tracker
    console.log(`Fetching peers from tracker: ${torrent.announce.toString()}`);
    const peers = await fetchPeers(torrent);
    
    if (peers.length === 0) {
      throw new Error('No peers available');
    }
    
    // Try peers until one works
    let socket;
    let connectedPeer;
    
    for (const peer of peers) {
      try {
        console.log(`Trying peer ${peer.host}:${peer.port}`);
        socket = await initialisePeerCommunication(peer, torrent);
        connectedPeer = peer;
        console.log(`Successfully connected to peer ${peer.host}:${peer.port}`);
        break;
      } catch (error) {
        console.error(`Failed to connect to peer ${peer.host}:${peer.port}: ${error.message}`);
      }
    }
    
    if (!socket) {
      throw new Error('Failed to connect to any peer');
    }
    
    console.log(`Connected to peer ${connectedPeer.host}:${connectedPeer.port}`);
    
    try {
      if (isDownloadCommand) {
        // Download the entire file
        console.log(`Downloading file: ${torrent.info.name}`);
        
        // Initialize an empty buffer for the file
        let fileBuffer = Buffer.alloc(0);
        
        // Create a work queue of all piece indices
        const workQueue = Array.from({ length: torrent.info.splitPieces.length }, (_, i) => i);
        
        // Download each piece sequentially
        for (const pieceIndex of workQueue) {
          const pieceBuffer = await downloadPiece(socket, pieceIndex, torrent);
          fileBuffer = Buffer.concat([fileBuffer, pieceBuffer]);
          resetState(); // Reset the state for the next piece
        }
        
        // Save the file
        console.log(`Download finished. Saving to ${outputFile}. Size: ${fileBuffer.length}`);
        writeFileSync(outputFile, fileBuffer);
      } else {
        // Download a specific piece
        const parsedPieceIndex = parseInt(pieceIndex, 10);
        console.log(`Downloading piece ${parsedPieceIndex}`);
        
        const pieceBuffer = await downloadPiece(socket, parsedPieceIndex, torrent);
        
        // Save the piece to the output file
        console.log(`Piece ${parsedPieceIndex} downloaded successfully. Saving to ${outputFile}`);
        writeFileSync(outputFile, pieceBuffer);
      }
      
      console.log('Operation completed successfully');
    } finally {
      disconnect(socket);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// Export the handleCommand function as the module's default export
module.exports = handleCommand;
