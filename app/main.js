const process = require("process");
const util = require("util");
// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
function decodeBencode(bencodedValue) {
  if(bencodedValue[0] === "l" && bencodedValue[bencodedValue.length - 1] === "e") {
    const list = [];
    let i = 1;
    const lastIndex = bencodedValue.length - 1;
    while(i < lastIndex) {
      const value = bencodedValue[i];
      if(value === "i") {
        // get first index of e
        const end = bencodedValue.indexOf("e", i);
        list.push(parseInt(bencodedValue.substring(i+1, end)));
        i = end + 1;
      } else if(!isNaN(value)) {
        const parts = bencodedValue.substring(i).split(":");
        const length = parseInt(parts[0], 10);
        list.push(parts[1].substr(0, length));
        i += parts[0].length + length+1;
      } else if(value === "l") {
        // get last e
        const end = bencodedValue.length - 1;
        list.push(decodeBencode(bencodedValue.substring(i, end)));
        i = end + 1;
      }
    }
    return list;
  }
  if (!isNaN(bencodedValue[0])) {
    // Check if the first character is a digit
    const parts = bencodedValue.split(":");
    const length = parseInt(parts[0], 10);
    return parts[1].substr(0, length);
  } else {
    const output = bencodedValue.replace(/[ie]+/g, "");
    return parseInt(output);
  }
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