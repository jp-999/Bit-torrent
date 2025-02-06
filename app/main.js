const process = require("process");
const util = require("util");

// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
function decodeBencode(bencodedValue) {
  // Handle integers (format: i<number>e)
  if (bencodedValue[0] === 'i') {
    const lastIndex = bencodedValue.indexOf('e');
    if (lastIndex === -1) {
      throw new Error("Invalid integer encoding: missing 'e' terminator");
    }
    const numberStr = bencodedValue.substring(1, lastIndex);
    
    // Check for invalid integer formats
    if (numberStr.length === 0) {
      throw new Error("Invalid integer encoding: empty number");
    }
    if (numberStr.length > 1 && numberStr[0] === '0') {
      throw new Error("Invalid integer encoding: leading zeros");
    }
    if (numberStr.length > 1 && numberStr[0] === '-' && numberStr[1] === '0') {
      throw new Error("Invalid integer encoding: negative zero");
    }
    
    const number = parseInt(numberStr, 10);
    if (isNaN(number)) {
      throw new Error("Invalid integer encoding: not a number");
    }
    return number;
  }
  
  // Handle strings
  if (!isNaN(bencodedValue[0])) {
    const firstColonIndex = bencodedValue.indexOf(":");
    if (firstColonIndex === -1) {
      throw new Error("Invalid encoded value");
    }
    const lengthStr = bencodedValue.substring(0, firstColonIndex);
    const length = parseInt(lengthStr, 10);
    return bencodedValue.substr(firstColonIndex + 1, length);
  }
  
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
