const process = require("process");
const util = require("util");

// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
function decodeBencode(bencodedValue) {
  // Handle lists (format: l<bencoded_elements>e)
  if (bencodedValue[0] === 'l') {
    const result = [];
    let currentIndex = 1;  // Skip the initial 'l'
    
    // Continue parsing elements until we hit the end marker 'e'
    while (currentIndex < bencodedValue.length && bencodedValue[currentIndex] !== 'e') {
      // Get the substring from current position to end
      const remainingData = bencodedValue.slice(currentIndex);
      
      let decodedValue;
      if (remainingData[0] === 'i') {
        // Handle integers
        const endIndex = remainingData.indexOf('e');
        const numberStr = remainingData.substring(1, endIndex);
        decodedValue = parseInt(numberStr, 10);
        currentIndex += endIndex + 1;
      } else if (!isNaN(remainingData[0])) {
        // Handle strings
        const colonIndex = remainingData.indexOf(':');
        const lengthStr = remainingData.substring(0, colonIndex);
        const length = parseInt(lengthStr, 10);
        decodedValue = remainingData.substr(colonIndex + 1, length);
        currentIndex += colonIndex + 1 + length;
      } else if (remainingData[0] === 'l') {
        // For nested lists, find the matching end marker
        let depth = 1;
        let i = 1;
        while (depth > 0 && i < remainingData.length) {
          if (remainingData[i] === 'l') depth++;
          if (remainingData[i] === 'e') depth--;
          i++;
        }
        // Create a new array with just the nested elements
        const nestedResult = [decodeBencode(remainingData.slice(0, i))];
        decodedValue = nestedResult;
        currentIndex += i;
      }
      result.push(decodedValue);
    }
    
    currentIndex++; // Skip the closing 'e'
    return result;
  }
  
  // Check if the input starts with 'i' which indicates a bencoded integer
  if (bencodedValue[0] === 'i') {
    const lastIndex = bencodedValue.indexOf('e');
    if (lastIndex === -1) {
      throw new Error("Invalid integer encoding: missing 'e' terminator");
    }
    const numberStr = bencodedValue.substring(1, lastIndex);
    
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
  
  // Handle bencoded strings (format: <length>:<string>)
  if (!isNaN(bencodedValue[0])) {
    const firstColonIndex = bencodedValue.indexOf(":");
    if (firstColonIndex === -1) {
      throw new Error("Invalid encoded value");
    }
    const lengthStr = bencodedValue.substring(0, firstColonIndex);
    const length = parseInt(lengthStr, 10);
    return bencodedValue.substr(firstColonIndex + 1, length);
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
