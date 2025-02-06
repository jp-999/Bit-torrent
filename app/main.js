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
      // Recursively decode the next element
      const decodedValue = decodeBencode(remainingData);
      result.push(decodedValue);
      
      // Move the index past the current element
      if (typeof decodedValue === 'string') {
        // For strings, skip past the length prefix, colon, and string content
        const lengthStr = remainingData.substring(0, remainingData.indexOf(':'));
        currentIndex += lengthStr.length + 1 + parseInt(lengthStr, 10);
      } else if (typeof decodedValue === 'number') {
        // For integers, skip past 'i', the number, and 'e'
        const endIndex = remainingData.indexOf('e');
        currentIndex += endIndex + 1;
      } else if (Array.isArray(decodedValue)) {
        // For nested lists, count 'l' and 'e' until we find matching end
        let depth = 1;
        let i = 1;  // Start after the 'l'
        while (depth > 0 && i < remainingData.length) {
          if (remainingData[i] === 'l') depth++;
          if (remainingData[i] === 'e') depth--;
          i++;
        }
        currentIndex += i;
      }
    }
    
    currentIndex++; // Skip the closing 'e'
    return result;
  }
  
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
  
    
    // because JS doesn't distinguish between bytes and strings in the same way Python does.
    console.log(JSON.stringify(decodeBencode(bencodedValue)));
  } else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();
