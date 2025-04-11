const { Socket } = require('net');

async function connect(host, port, dataEventHandler, connectionTimeout = 10000) {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let startTime;
    let connectionTimedOut = false;
    
    // Set timeout for the connection
    socket.setTimeout(connectionTimeout);
    
    socket.on('data', (data) => {
      try {
        dataEventHandler(data);
      } catch (error) {
        console.error(`Error handling data: ${error.message}`);
        console.error(error.stack);
      }
    });

    socket.on('close', (hadError) => {
      console.log(`Connection closed ${hadError ? 'with error' : 'normally'} after ${Date.now() - startTime} ms`);
    });

    socket.on('connect', () => {
      console.log(`Connected to ${socket.remoteAddress}:${socket.remotePort}`);
      startTime = Date.now();
      resolve(socket);
    });

    socket.on('end', () => {
      console.log('Connection ended by peer');
    });
    
    socket.on('error', (error) => {
      console.error(`Connection error: ${error.message}`);
      reject(error);
    });
    
    socket.on('timeout', () => {
      connectionTimedOut = true;
      console.error(`Connection to ${host}:${port} timed out after ${connectionTimeout}ms`);
      socket.destroy(new Error('Connection timeout'));
      reject(new Error(`Connection to ${host}:${port} timed out after ${connectionTimeout}ms`));
    });

    console.log(`Attempting to connect to ${host}:${port}`);
    socket.connect({ host, port });
    
    // Safety timer in case the socket events don't fire properly
    setTimeout(() => {
      if (!socket.destroyed && !socket.connecting && !connectionTimedOut) {
        console.log(`Connection established but no connect event fired, resolving anyway`);
        resolve(socket);
      }
    }, connectionTimeout + 1000);
  });
}

function disconnect(socket) {
  if (!socket) return;
  
  try {
    if (!socket.destroyed) {
      console.log('Disconnecting socket');
      socket.end();
      socket.destroy();
    }
  } catch (error) {
    console.error(`Error during disconnect: ${error.message}`);
  }
}

module.exports = {
  connect,
  disconnect,
};
