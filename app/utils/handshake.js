function isHandshakeResponse(handshakeResponse) {
  if (!handshakeResponse || handshakeResponse.length < 68) {
    console.log(`Handshake check: Buffer too small (${handshakeResponse ? handshakeResponse.length : 0} bytes)`);
    return false;
  }

  try {
    const protocolLength = handshakeResponse.readUint8(0);
    
    // BitTorrent protocol is 19 bytes long
    if (protocolLength !== 19) {
      console.log(`Handshake check: Invalid protocol length: ${protocolLength}, expected 19`);
      return false;
    }
    
    // Check if we have enough bytes to read the protocol name
    if (handshakeResponse.length < protocolLength + 1) {
      console.log(`Handshake check: Buffer too small for protocol name (${handshakeResponse.length} bytes)`);
      return false;
    }
    
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
