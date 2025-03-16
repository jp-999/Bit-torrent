// Import the decodeBencode function from the decoder utility
const { decodeBencode } = require('../utils/decoder');

// Function to recursively convert Buffers to strings in an object
function convertBuffersToStrings(obj) {
  if (Buffer.isBuffer(obj)) {
    return obj.toString(); // Convert Buffer to string
  } else if (Array.isArray(obj)) {
    return obj.map(convertBuffersToStrings); // Recursively convert elements in an array
  } else if (obj !== null && typeof obj === 'object') {
    // Recursively convert values in an object
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, convertBuffersToStrings(value)]));
  }
  return obj; // Return the value if it's neither a Buffer, array, nor object
}

// Function to handle the decode command
function handleCommand(parameters) {
  const [, bencodedValue] = parameters; // Extract the bencoded value from parameters
  const buffer = Buffer.from(bencodedValue); // Convert the bencoded value to a Buffer
  const result = decodeBencode(buffer); // Decode the bencoded value
  console.log(JSON.stringify(convertBuffersToStrings(result))); // Convert Buffers to strings and print the result
}

// Export the handleCommand function as the module's default export
module.exports = handleCommand;
