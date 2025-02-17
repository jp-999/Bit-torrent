const process = require("process");
const fs = require("fs");
const crypto = require('crypto');
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

// Converts JavaScript data structures back to bencoded format
// Handles strings, numbers, arrays, and dictionaries
function bencode(data) {
    // For strings, prefix with length and colon
    if (typeof data === 'string') {
        return `${data.length}:${data}`;
    // For numbers, wrap with 'i' and 'e'
    } else if (typeof data === 'number') {
        return `i${data}e`;
    // For arrays, wrap items with 'l' and 'e'
    } else if (Array.isArray(data)) {
        return `l${data.map(item => bencode(item)).join('')}e`;
    // For objects (dictionaries), wrap with 'd' and 'e'
    } else if (typeof data === 'object' && data !== null) {
        // Sort keys for consistent encoding across implementations
        const sortedKeys = Object.keys(data).sort();
        return `d${sortedKeys.map(key => bencode(key) + bencode(data[key])).join('')}e`;
    }
    throw new Error('Unsupported type for bencode');
}

// Calculates SHA1 hash of the bencoded info dictionary
// Returns the hash in hexadecimal format
function calculateInfoHash(info) {
    // First bencode the info dictionary
    const bencoded = bencode(info);
    // Create SHA1 hash object
    const hash = crypto.createHash('sha1');
    // Update hash with bencoded data using latin1 encoding
    hash.update(bencoded, 'latin1');
    // Return final hash in hex format
    return hash.digest('hex');
}

// Reads and parses a .torrent file, extracting key information
function parseTorrentFile(filePath) {
    // Read file as buffer to handle binary data
    const buffer = fs.readFileSync(filePath);
    // Convert to string preserving byte values
    const content = buffer.toString('latin1');
    // Parse bencoded content
    const torrentData = decodeBencode(content);
    
    // Extract required fields
    const trackerUrl = torrentData.announce;
    const info = torrentData.info;
    
    // Validate presence of required fields
    if (!trackerUrl || !info) {
        throw new Error("Invalid torrent file: missing required fields");
    }
    
    // Calculate unique identifier for torrent
    const infoHash = calculateInfoHash(info);
    
    // Return relevant torrent information
    return {
        trackerUrl,
        fileLength: info.length,
        infoHash
    };
}

// Command-line interface handler
function main() {
    const command = process.argv[2];
    
    if (command === "decode") {
        // Decode and display bencoded value
        const bencodedValue = process.argv[3];
        console.log(JSON.stringify(decodeBencode(bencodedValue)));
    } else if (command === "info") {
        // Parse and display torrent file information
        const torrentFile = process.argv[3];
        const torrentInfo = parseTorrentFile(torrentFile);
        console.log(`Tracker URL: ${torrentInfo.trackerUrl}`);
        console.log(`Length: ${torrentInfo.fileLength}`);
        console.log(`Info Hash: ${torrentInfo.infoHash}`);
    } else {
        throw new Error(`Unknown command ${command}`);
    }
}

// Run the program
main();