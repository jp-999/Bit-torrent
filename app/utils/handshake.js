function isHandshakeResponse(handshakeResponse) {
  if (!handshakeResponse || handshakeResponse.length < 1) {
    console.log(`Handshake check: Empty buffer`);
    return false;
  }
  
  if (handshakeResponse.length < 68) {
    console.log(`Handshake check: Buffer too small (${handshakeResponse.length} bytes), waiting for more data`);
    return false;
  }

  try {
    const protocolLength = handshakeResponse.readUint8(0);
    
    // BitTorrent protocol is 19 bytes long
    if (protocolLength !== 19) {
      // If we're seeing 0 as the first byte, it might be a piece response or other message
      // We should just return false without logging an error as it's probably not a handshake
      if (protocolLength === 0 && handshakeResponse.length >= 4) {
        const msgLength = handshakeResponse.readUInt32BE(0);
        if (msgLength > 0 && msgLength < 16384) { // Reasonable piece message size
          return false; // Likely a piece message, not a handshake
        }
      }
      
      console.log(`Handshake check: Invalid protocol length: ${protocolLength}, expected 19`);
      return false;
    }
    
    // Check the protocol string
    const protocol = handshakeResponse.subarray(1, protocolLength + 1).toString();
    const isValidProtocol = protocol === 'BitTorrent protocol';
    
    if (isValidProtocol) {
      console.log('Handshake check: Valid BitTorrent protocol detected');
    } else {
      console.log(`Handshake check: Invalid protocol: "${protocol}"`);
    }
    
    return isValidProtocol;
  } catch (error) {
    console.error('Error checking handshake response:', error.message);
    return false;
  }
}

function parseHandshake(data) {
  try {
    if (data.length < 68) {
      throw new Error(`Handshake data too short: ${data.length} bytes`);
    }
    
    const supportsExtension = data.readUint8(25) === 0x10;
    const infoHash = data.subarray(28, 48).toString('hex');
    const peerId = data.subarray(48, 68).toString('hex');

    console.log(`Parsed handshake - Info hash: ${infoHash}, Peer ID: ${peerId}, Supports Extension: ${supportsExtension}`);
    return { supportsExtension, infoHash, peerId };
  } catch (error) {
    console.error('Error parsing handshake:', error.message);
    throw error;
  }
}

module.exports = {
  isHandshakeResponse,
  parseHandshake,
};
