// Define a set of constants for peer connection statuses
const Constants = Object.freeze({
  PENDING: 'pending', // Status indicating that the connection is pending
  HANDSHAKE_RECEIVED: 'handshake received', // Status indicating that a handshake has been received
  UNCHOKE_RECEIVED: 'unchoke received', // Status indicating that an unchoke message has been received
});

// Export the constants as part of an object for use in other modules
module.exports = {
  PeerConnectionStatus: Constants, // Export the peer connection statuses
};
