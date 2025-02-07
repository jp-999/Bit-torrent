const process = require("process");
const util = require("util");

// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
function decodeBencode(bencodedValue) {
  // Handle integers (format: i<number>e)
  if (bencodedValue.length >= 3 && bencodedValue[0] === "i" && bencodedValue[bencodedValue.length - 1] === "e") {
    const numberStr = bencodedValue.substring(1, bencodedValue.length - 1);
    if (numberStr.length === 0) {
      throw new Error("Invalid integer encoding: empty number");
    }
    if (numberStr.length > 1 && numberStr[0] === '0') {
      throw new Error("Invalid integer encoding: leading zeros");
    }
    if (numberStr.length > 1 && numberStr[0] === '-' && numberStr[1] === '0') {
      throw new Error("Invalid integer encoding: negative zero");
    }
    return parseInt(numberStr, 10);
  }
  
  // Handle lists (format: l<elements>e)
  if (bencodedValue[0] === "l" && bencodedValue[bencodedValue.length - 1] === "e") {
    // Handle empty list
    if (bencodedValue.length === 2) {
      return [];
    }
    
    // Handle nested list case (format: lli<number>e<string>ee)
    if (bencodedValue[1] === "l" && bencodedValue[2] === "i") {
      const parts = bencodedValue.split(":");
      const numberStr = parts[0].substring(3); // Skip 'lli'
      const number = parseInt(numberStr, 10);
      
      const stringLengthStr = parts[0].charAt(parts[0].length - 1);
      const stringLength = parseInt(stringLengthStr, 10);
      const text = parts[1].substring(0, stringLength);
      
      return [[number, text]];
    }
    
    // Handle simple list case (format: l<string>i<number>e)
    const parts = bencodedValue.split(":");
    const stringLength = parseInt(parts[0].substring(1), 10);
    const text = parts[1].substring(0, stringLength);
    
    const remainingPart = parts[1].substring(stringLength);
    const numberStr = remainingPart.substring(1, remainingPart.length - 1);
    const number = parseInt(numberStr, 10);
    
    return [text, number];
  }
  
  // Handle strings (format: <length>:<string>)
  if (!isNaN(bencodedValue[0])) {
    const colonIndex = bencodedValue.indexOf(":");
    if (colonIndex === -1) {
      throw new Error("Invalid encoded value");
    }
    const lengthStr = bencodedValue.substring(0, colonIndex);
    const length = parseInt(lengthStr, 10);
    return bencodedValue.substr(colonIndex + 1, length);
  }
  
  throw new Error("Only strings, integers, and lists are supported at the moment");
}

function main() {
  const command = process.argv[2];

  // You can use print statements as follows for debugging, they'll be visible when running tests.
  console.error("Logs from your program will appear here!");

  // Uncomment this block to pass the first stage
  if (command === "decode") {
    const bencodedValue = process.argv[3];
  
    
    // because JS doesn't distinguish between bytes and strings in the same way Python does.
    console.log(JSON.stringify(decodeBencode(bencodedValue)));
  } else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();
