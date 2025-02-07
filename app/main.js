const process = require("process");
const util = require("util");
// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
function decodeBencode(bencodedValue) {
    if (bencodedValue.length >= 3 && bencodedValue[0] === "i" && bencodedValue[bencodedValue.length - 1] === "e") {
        return parseInt(bencodedValue.substr(1, bencodedValue.length - 2), 10);
    }
    
    if(bencodedValue[0] === "l" && bencodedValue[bencodedValue.length - 1] === "e") {
        if(bencodedValue.length === 2) {
            return [];
        }
        
        // Handle nested list with single number (format: lli<number>ee)
        if(bencodedValue[1] === "l" && bencodedValue[2] === "i" && !bencodedValue.includes(":")) {
            const innerPart = bencodedValue.substring(2, bencodedValue.length - 2);
            const number = parseInt(innerPart.substring(1, innerPart.length - 1), 10);
            return [[number], parseInt(bencodedValue.substring(bencodedValue.lastIndexOf("e") + 2, bencodedValue.length - 1))];
        }
        
        // Handle nested list case (format: lli<number>e<string>ee)
        if(bencodedValue[1] === "l" && bencodedValue[2] === "i" && bencodedValue.includes(":")) {
            const parts = bencodedValue.split(":");
            const numberStr = parts[0].substring(3, parts[0].length - 1);
            const number = parseInt(numberStr, 10);
            
            const stringLength = parseInt(parts[0].charAt(parts[0].length - 1), 10);
            const text = parts[1].substring(0, stringLength);
            
            const innerList = [number, text];
            return [innerList];
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
    
    if (!isNaN(bencodedValue[0])) {
        const parts = bencodedValue.split(":");
        const length = parseInt(parts[0], 10);
        return parts[1].substr(0, length);
    }
    
    throw new Error("Only strings, integers, and lists are supported at the moment");
}
function main() {
  const command = process.argv[2];
  // You can use print statements as follows for debugging, they'll be visible when running tests.
  // console.log("Logs from your program will appear here!");
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