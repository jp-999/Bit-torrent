const process = require("process");
const util = require("util");

// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
function decodeBencode(bencodedValue) {
  // Check if the input starts with 'i' which indicates a bencoded integer
  if (bencodedValue[0] === 'i') {
    // Find the position of the closing 'e' that marks the end of the integer
    const lastIndex = bencodedValue.indexOf('e');
    // If there's no closing 'e', the integer encoding is invalid
    if (lastIndex === -1) {
      throw new Error("Invalid integer encoding: missing 'e' terminator");
    }
    // Extract the number string between 'i' and 'e'
    const numberStr = bencodedValue.substring(1, lastIndex);
    
    // Validation checks for integer format
    // Check if the number string is empty (i.e., "ie")
    if (numberStr.length === 0) {
      throw new Error("Invalid integer encoding: empty number");
    }
    // Check for leading zeros which are not allowed (i.e., "i052e")
    if (numberStr.length > 1 && numberStr[0] === '0') {
      throw new Error("Invalid integer encoding: leading zeros");
    }
    // Check for negative zero which is not allowed (i.e., "i-0e")
    if (numberStr.length > 1 && numberStr[0] === '-' && numberStr[1] === '0') {
      throw new Error("Invalid integer encoding: negative zero");
    }
    
    // Convert the string to an actual integer
    const number = parseInt(numberStr, 10);
    // Ensure the parsed value is actually a number
    if (isNaN(number)) {
      throw new Error("Invalid integer encoding: not a number");
    }
    // Return the parsed integer
    return number;
  }
  
  // Handle bencoded strings (format: <length>:<string>)
  // Check if the first character is a number (string length)
  if (!isNaN(bencodedValue[0])) {
    // Find the colon that separates length from content
    const firstColonIndex = bencodedValue.indexOf(":");
    // If there's no colon, the string encoding is invalid
    if (firstColonIndex === -1) {
      throw new Error("Invalid encoded value");
    }
    // Extract the length prefix before the colon
    const lengthStr = bencodedValue.substring(0, firstColonIndex);
    // Convert the length string to a number
    const length = parseInt(lengthStr, 10);
    // Return the substring of specified length after the colon
    return bencodedValue.substr(firstColonIndex + 1, length);
  }
  
  // If the input doesn't match integer or string format, throw an error
  throw new Error("Only strings and integers are supported at the moment");
}

function main() {
  const command = process.argv[2];

  // You can use print statements as follows for debugging, they'll be visible when running tests.
  console.error("Logs from your program will appear here!");

  // Uncomment this block to pass the first stage
  if (command === "decode") {
    const bencodedValue = process.argv[3];
  
    // In JavaScript, there's no need to manually convert bytes to string for printing
    // because JS doesn't distinguish between bytes and strings in the same way Python does.
    console.log(JSON.stringify(decodeBencode(bencodedValue)));
  } else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();
