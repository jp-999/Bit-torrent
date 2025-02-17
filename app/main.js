const process = require("process");
const fs = require("fs");
// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
// Main function to decode bencoded values
function decodeBencode(bencodedValue) {
    // Handle lists (starts with 'l')
    if (bencodedValue[0] === 'l') {
        const list = [];
        let index = 1;
        
        while (index < bencodedValue.length && bencodedValue[index] !== 'e') {
            const { value, length } = decodeNextElement(bencodedValue.slice(index));
            list.push(value);
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
    
    // Check if value is an integer (starts with 'i')
    if (bencodedValue[0] === 'i') {
        const endIndex = bencodedValue.indexOf('e');
        const numberStr = bencodedValue.substring(1, endIndex);
        return parseInt(numberStr, 10);
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
    
    throw new Error("Unsupported bencoded value");
}

// Helper function to decode next element and return its value and length
function decodeNextElement(bencodedValue) {
    // Handle dictionaries
    if (bencodedValue[0] === 'd') {
        const dict = {};
        let index = 1;
        
        while (index < bencodedValue.length && bencodedValue[index] !== 'e') {
            const { value: key, length: keyLength } = decodeNextElement(bencodedValue.slice(index));
            if (typeof key !== 'string') {
                throw new Error("Dictionary keys must be strings");
            }
            index += keyLength;
            
            const { value, length: valueLength } = decodeNextElement(bencodedValue.slice(index));
            index += valueLength;
            
            dict[key] = value;
        }
        
        return {
            value: dict,
            length: index + 1
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
    
    // Handle integers
    if (bencodedValue[0] === 'i') {
        const endIndex = bencodedValue.indexOf('e');
        return {
            value: parseInt(bencodedValue.substring(1, endIndex), 10),
            length: endIndex + 1
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
    
    throw new Error("Unsupported bencoded value");
}

// Function to parse torrent file and extract info
function parseTorrentFile(filePath) {
    // Read the torrent file as a buffer
    const buffer = fs.readFileSync(filePath);
    
    // Convert buffer to string
    const content = buffer.toString('latin1');
    
    // Decode the bencoded content
    const torrentData = decodeBencode(content);
    
    // Extract tracker URL and file length
    const trackerUrl = torrentData.announce;
    const fileLength = torrentData.info.length;
    
    return {
        trackerUrl,
        fileLength
    };
}

// Main program entry point
function main() {
    const command = process.argv[2];
    
    if (command === "decode") {
        const bencodedValue = process.argv[3];
        console.log(JSON.stringify(decodeBencode(bencodedValue)));
    } else if (command === "info") {
        const torrentFile = process.argv[3];
        const torrentInfo = parseTorrentFile(torrentFile);
        console.log(`Tracker URL: ${torrentInfo.trackerUrl}`);
        console.log(`Length: ${torrentInfo.fileLength}`);
    } else {
        throw new Error(`Unknown command ${command}`);
    }
}

// Run the program
main();