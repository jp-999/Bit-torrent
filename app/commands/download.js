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
  state.incomingBuffer = Buffer.alloc(0);
  state.outgoingBuffer = Buffer.alloc(0);
}

// Event handler for incoming data from the peer
function dataEventHandler(chunk) {
  console.log(`Response received: ${chunk.length} bytes, first 20 bytes: ${chunk.slice(0, Math.min(20, chunk.length)).toString('hex')}`);
  state.incomingBuffer = Buffer.concat([state.incomingBuffer, chunk]);

  while (state.incomingBuffer.length >= 4) {
    // Check for handshake response
    if (isHandshakeResponse(state.incomingBuffer)) {
      console.log('Valid handshake response detected');
      state.connectionStatus = PeerConnectionStatus.HANDSHAKE_RECEIVED;
      state.incomingBuffer = state.incomingBuffer.slice(68); // Keep the rest of the buffer after handshake
      console.log(`After handshake, buffer length: ${state.incomingBuffer.length}`);
      return;
    }

    // Read the message length
    const messageLength = state.incomingBuffer.readUInt32BE(0); // Read the 4-byte length prefix
    if (state.incomingBuffer.length < messageLength + 4) {
      console.log(`Incomplete message: expected ${messageLength + 4} bytes, got ${state.incomingBuffer.length}`);
      break; // Wait for more data
    }

    // Extract complete message
    const message = state.incomingBuffer.subarray(4, 4 + messageLength);
    processPeerMessage(message); // Process the received message

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
async function waitForConnectionStatus(expectedConnectionStatus, timeout = 15000) {
  console.log(`Waiting for connection status: ${expectedConnectionStatus}`);
  return new Promise((resolve, reject) => {
    let timeoutId;
    const intervalId = setInterval(() => {
      if (state.connectionStatus === expectedConnectionStatus) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        console.log(`Successfully received connection status: ${expectedConnectionStatus}`);
        resolve();
      }
    }, 100); // Check less frequently to reduce CPU usage

    timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      console.error(`Timeout while waiting for connection status of ${expectedConnectionStatus}`);
      console.error(`Current connection status: ${state.connectionStatus}`);
      console.error(`Current buffer length: ${state.incomingBuffer.length} bytes`);
      if (state.incomingBuffer.length > 0) {
        console.error(`First few bytes of buffer: ${state.incomingBuffer.slice(0, Math.min(20, state.incomingBuffer.length)).toString('hex')}`);
      }
      reject(new Error(`Timeout while waiting for connection status of ${expectedConnectionStatus}`));
    }, timeout);
  });
}

// Function to wait for all blocks to be received
async function waitForAllBlocks(totalBlockCount, timeout = 10000) {
  return new Promise((resolve, reject) => {
    let timeoutId, intervalId;
    timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error('Blocks not received within the timeout period'));
    }, timeout);

    intervalId = setInterval(() => {
      if (state.blocks.size === totalBlockCount) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        resolve();
      }
    }, 1);
  });
}

// Function to perform the handshake with the peer
async function performHandshake(socket, torrent) {
  const handshakeRequest = createHandshakeRequest(torrent.info);
  console.log('Sending handshake message');
  socket.write(handshakeRequest);
  
  try {
    await waitForConnectionStatus(PeerConnectionStatus.HANDSHAKE_RECEIVED);
    console.log('Handshake successful');
  } catch (error) {
    console.error('Handshake failed:', error.message);
    
    // Try to send the handshake again after a brief delay
    console.log('Retrying handshake...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    socket.write(handshakeRequest);
    await waitForConnectionStatus(PeerConnectionStatus.HANDSHAKE_RECEIVED);
    console.log('Handshake successful on retry');
  }
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

// Function to download a specific piece from the peer
async function downloadPiece(socket, pieceIndex, torrent) {
  let blockOffset = 0;
  let totalBlockCount = 0;

  const calculatedPieceLength = calculatePieceLength(pieceIndex, torrent.info);

  state.outgoingBuffer = Buffer.alloc(0);
  while (blockOffset < calculatedPieceLength) {
    const { blockSize, peerMessage } = createBlockRequest(torrent, pieceIndex, calculatedPieceLength, blockOffset);
    console.log(
      `\x1b[32mAdding block request to outgoing buffer. Piece index ${pieceIndex}, Block offset: ${blockOffset}, Block size: ${blockSize}\x1b[0m`,
    );

    state.outgoingBuffer = Buffer.concat([state.outgoingBuffer, peerMessage]);

    blockOffset += blockSize;
    totalBlockCount++;

    if (state.outgoingBuffer.length >= MAXIMUM_OUTGOING_BUFFER_SIZE && state.incomingBuffer.length === 0) {
      flushOutgoingBuffer(socket);
    }
  }

  // Flush any remaining messages in buffer
  if (state.outgoingBuffer.length > 0 && state.incomingBuffer.length === 0) {
    console.log('Flushing remaining outgoing buffer');
    flushOutgoingBuffer(socket);
  }

  await waitForAllBlocks(totalBlockCount);

  return convertMapToBuffer(state.blocks); // Return the concatenated buffer of blocks
}

// Function to flush the outgoing buffer to the peer
function flushOutgoingBuffer(socket) {
  console.log(`Sending ${state.outgoingBuffer.length / BLOCK_REQUEST_SIZE} request messages to peer`);
  socket.write(state.outgoingBuffer);
  state.outgoingBuffer = Buffer.alloc(0); // Reset the outgoing buffer
}

// Main function to handle the download command
async function handleCommand(parameters) {
  const [command, , outputFilePath, inputFile, pieceIndexString] = parameters;

  const pieceIndex = pieceIndexString ? Number(pieceIndexString) : null; // Parse piece index
  const buffer = await readFile(inputFile); // Read the torrent file
  const torrent = decodeTorrent(buffer); // Decode the torrent data
  const peers = await fetchPeers(torrent); // Fetch peers from the tracker

  console.log('----------------------------');
  console.log(`file length: ${torrent.info.length}`);
  console.log(`piece length: ${torrent.info.pieceLength}`);
  console.log(`number of pieces: ${torrent.info.splitPieces.length}`);
  console.log('----------------------------');
  console.log(`peers ${JSON.stringify(peers, null, 2)}`);

  let workQueue;
  if (command === 'download') {
    workQueue = Array.from({ length: torrent.info.splitPieces.length }, (_, index) => index); // Create a queue for all pieces
  } else {
    workQueue = [pieceIndex]; // Queue the specific piece to download
  }

  // Try each peer until successful
  let socket = null;
  let connectedPeer = null;
  
  for (let i = 0; i < peers.length; i++) {
    const peer = peers[i];
    console.log(`Attempting to connect to peer ${i+1}/${peers.length}: ${peer.host}:${peer.port}`);
    
    try {
      resetState(); // Reset state for each connection attempt
      socket = await connect(peer.host, peer.port, dataEventHandler);
      try {
        await performHandshake(socket, torrent);
        await sendInterestedMessage(socket);
        connectedPeer = peer;
        console.log(`Successfully established communication with peer: ${peer.host}:${peer.port}`);
        break; // Successfully connected and performed handshake
      } catch (handshakeError) {
        console.error(`Failed to perform handshake with peer ${peer.host}:${peer.port}: ${handshakeError.message}`);
        disconnect(socket);
        socket = null;
      }
    } catch (connectionError) {
      console.error(`Failed to connect to peer ${peer.host}:${peer.port}: ${connectionError.message}`);
    }
  }

  if (!socket || !connectedPeer) {
    throw new Error('Failed to connect to any peer');
  }

  console.log(`Initialised communication with peer ${connectedPeer.host}:${connectedPeer.port}`);

  try {
    let fileBuffer = Buffer.alloc(0);
    for (const pieceIndex of workQueue) {
      console.log(`Downloading piece ${pieceIndex + 1}/${workQueue.length}`);
      try {
        const pieceBuffer = await downloadPiece(socket, pieceIndex, torrent); // Download the piece
        validatePieceHash(pieceBuffer, torrent.info.splitPieces[pieceIndex]); // Validate the piece hash
        fileBuffer = Buffer.concat([fileBuffer, pieceBuffer]); // Concatenate the pieces
      } catch (pieceError) {
        console.error(`Error downloading piece ${pieceIndex}: ${pieceError.message}`);
        throw pieceError;
      }
    }

    // Truncate the file to the correct length (last piece might be shorter)
    if (fileBuffer.length > torrent.info.length) {
      fileBuffer = fileBuffer.subarray(0, torrent.info.length);
    }

    writeFileSync(outputFilePath, fileBuffer); // Write the file to disk
    console.log(`Successfully downloaded file to ${outputFilePath}`);
  } finally {
    // Clean up the connection
    disconnect(socket);
  }
}

// Export the handleCommand function as the module's default export
module.exports = handleCommand;
