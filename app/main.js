const process = require("process");
const util = require("util");
const fs = require("fs");
// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
// Main function to decode bencoded values
function decodeBencode(bencodedValue) {
    // Check if value is an integer (starts with 'i')
    if (bencodedValue[0] === 'i') {
        // Find the end of the integer
        const endIndex = bencodedValue.indexOf('e');
        // Extract the number string between 'i' and 'e'
        const numberStr = bencodedValue.substring(1, endIndex);
        
        // Validate integer format
        // Check for empty number
        if (numberStr.length === 0) {
            throw new Error("Invalid integer encoding: empty number");
        }
        // Check for leading zeros
        if (numberStr.length > 1 && numberStr[0] === '0') {
            throw new Error("Invalid integer encoding: leading zeros");
        }
        // Check for negative zero
        if (numberStr.length > 1 && numberStr[0] === '-' && numberStr[1] === '0') {
            throw new Error("Invalid integer encoding: negative zero");
        }
        
        // Convert string to integer and return
        return parseInt(numberStr, 10);
    }
    
    // Check if value is a list (starts with 'l')
    if (bencodedValue[0] === 'l') {
        // Initialize empty list and index
        const list = [];
        let index = 1;
        
        // Process list elements until end marker 'e'
        while (index < bencodedValue.length && bencodedValue[index] !== 'e') {
            // Decode next element in the list
            const { value, length } = decodeNextElement(bencodedValue.slice(index));
            // Special handling for single-element nested lists
            if (Array.isArray(value) && value.length === 1) {
                list.push([value[0]]);
            } else {
                list.push(value);
            }
            // Move index forward by length of processed element
            index += length;
        }
        
        return list;
    }
    
    // Check if value is a dictionary (starts with 'd')
    if (bencodedValue[0] === 'd') {
        // Initialize empty dictionary and index
        const dict = {};
        let index = 1;
        
        // Process dictionary key-value pairs until end marker 'e'
        while (index < bencodedValue.length && bencodedValue[index] !== 'e') {
            // Get the key
            const { value: key, length: keyLength } = decodeNextElement(bencodedValue.slice(index));
            // Ensure key is a string
            if (typeof key !== 'string') {
                throw new Error("Dictionary keys must be strings");
            }
            index += keyLength;
            
            // Get the value
            const { value, length: valueLength } = decodeNextElement(bencodedValue.slice(index));
            index += valueLength;
            
            // Add key-value pair to dictionary
            dict[key] = value;
        }
        
        return dict;
    }
    
    // Check if value is a string (starts with a number)
    if (!isNaN(bencodedValue[0])) {
        // Find the colon separator
        const colonIndex = bencodedValue.indexOf(':');
        // Get the length of the string
        const length = parseInt(bencodedValue.substring(0, colonIndex), 10);
        // Extract and return the string
        return bencodedValue.substr(colonIndex + 1, length);
    }
    
    // Throw error for unsupported types
    throw new Error("Only strings, integers, lists, and dictionaries are supported");
}

// Helper function to decode next element and return its value and length
function decodeNextElement(bencodedValue) {
    // Handle integers
    if (bencodedValue[0] === 'i') {
        const endIndex = bencodedValue.indexOf('e');
        const numberStr = bencodedValue.substring(1, endIndex);
        return {
            value: parseInt(numberStr, 10),
            length: endIndex + 1
        };
    }
    
    // Handle lists
    if (bencodedValue[0] === 'l') {
        const list = [];
        let index = 1;
        
        while (index < bencodedValue.length && bencodedValue[index] !== 'e') {
            const { value, length } = decodeNextElement(bencodedValue.slice(index));
            list.push(value);
            index += length;
        }
        
        return {
            value: list,
            length: index + 1
        };
    }
    
    // Handle dictionaries
    if (bencodedValue[0] === 'd') {
        const dict = {};
        let index = 1;
        
        while (index < bencodedValue.length && bencodedValue[index] !== 'e') {
            // Get key
            const { value: key, length: keyLength } = decodeNextElement(bencodedValue.slice(index));
            if (typeof key !== 'string') {
                throw new Error("Dictionary keys must be strings");
            }
            index += keyLength;
            
            // Get value
            const { value, length: valueLength } = decodeNextElement(bencodedValue.slice(index));
            index += valueLength;
            
            dict[key] = value;
        }
        
        return {
            value: dict,
            length: index + 1
        };
    }
    
    // Handle strings
    if (!isNaN(bencodedValue[0])) {
        const colonIndex = bencodedValue.indexOf(':');
        const length = parseInt(bencodedValue.substring(0, colonIndex), 10);
        return {
            value: bencodedValue.substr(colonIndex + 1, length),
            length: colonIndex + 1 + length
        };
    }
    
    // Throw error for unsupported types
    throw new Error("Only strings, integers, lists, and dictionaries are supported");
}

// Function to parse torrent file and extract info
function parseTorrentFile(filePath) {
    // Read the torrent file as a buffer to handle non-UTF8 characters
    const fileContent = fs.readFileSync(filePath);
    
    // Decode the bencoded content
    const torrentData = decodeBencode(fileContent.toString('binary'));
    
    // Extract required information
    const trackerUrl = torrentData.announce;
    const fileLength = torrentData.info.length;
    
    return {
        trackerUrl,
        fileLength
    };
}

// Main program entry point
function main() {
    // Get command from command line arguments
    const command = process.argv[2];
    
    if (command === "decode") {
        // Handle decode command
        const bencodedValue = process.argv[3];
        console.log(JSON.stringify(decodeBencode(bencodedValue)));
    } else if (command === "info") {
        // Handle info command
        const torrentFile = process.argv[3];
        const torrentInfo = parseTorrentFile(torrentFile);
        
        // Print torrent information in required format
        console.log(`Tracker URL: ${torrentInfo.trackerUrl}`);
        console.log(`Length: ${torrentInfo.fileLength}`);
    } else {
        throw new Error(`Unknown command ${command}`);
    }
}

// Run the program
main();