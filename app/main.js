const process = require("process");
const fs = require("fs");
// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
// Main function to decode bencoded values
function decodeBencode(bencodedValue) {
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
function decodeNextElement(bencodedValue, startIndex = 0) {
    // Handle dictionaries
    if (bencodedValue[startIndex] === 'd') {
        const dict = {};
        let index = startIndex + 1;
        
        while (index < bencodedValue.length && bencodedValue[index] !== 'e') {
            // Get key
            const { value: key, length: keyLength } = decodeNextElement(bencodedValue, index);
            if (typeof key !== 'string') {
                throw new Error("Dictionary keys must be strings");
            }
            index += keyLength;
            
            // Get value
            const { value, length: valueLength } = decodeNextElement(bencodedValue, index);
            index += valueLength;
            
            dict[key] = value;
        }
        
        return {
            value: dict,
            length: index - startIndex + 1
        };
    }
    
    // Handle integers
    if (bencodedValue[startIndex] === 'i') {
        const endIndex = bencodedValue.indexOf('e', startIndex);
        return {
            value: parseInt(bencodedValue.substring(startIndex + 1, endIndex), 10),
            length: endIndex - startIndex + 1
        };
    }
    
    // Handle strings
    if (!isNaN(bencodedValue[startIndex])) {
        const colonIndex = bencodedValue.indexOf(':', startIndex);
        const length = parseInt(bencodedValue.substring(startIndex, colonIndex), 10);
        return {
            value: bencodedValue.substr(colonIndex + 1, length),
            length: (colonIndex - startIndex) + 1 + length
        };
    }
    
    throw new Error("Unsupported bencoded value");
}

// Function to convert binary string to hex
function binaryToHex(binaryStr) {
    let result = '';
    for (let i = 0; i < binaryStr.length; i++) {
        const hex = binaryStr.charCodeAt(i).toString(16).padStart(2, '0');
        result += hex;
    }
    return result;
}

// Function to find the info dictionary position
function findInfoDictionaryPosition(buffer) {
    const infoKey = Buffer.from('4:info');
    const infoIndex = buffer.indexOf(infoKey);
    if (infoIndex === -1) throw new Error("Could not find info dictionary");
    
    let depth = 0;
    let i = infoIndex + infoKey.length;
    
    if (buffer[i] !== 'd'.charCodeAt(0)) throw new Error("Info value is not a dictionary");
    
    do {
        if (buffer[i] === 'd'.charCodeAt(0)) depth++;
        else if (buffer[i] === 'e'.charCodeAt(0)) depth--;
        i++;
    } while (depth > 0 && i < buffer.length);
    
    return {
        start: infoIndex + infoKey.length,
        end: i
    };
}

// Function to parse torrent file and extract info
function parseTorrentFile(filePath) {
    // Read the torrent file as a buffer
    const buffer = fs.readFileSync(filePath);
    
    // Decode the bencoded content
    const torrentData = decodeBencode(buffer.toString('latin1'));
    
    // Extract required information
    const trackerUrl = torrentData.announce;
    const info = torrentData.info;
    
    // Validate required fields
    if (!trackerUrl || !info) {
        throw new Error("Invalid torrent file: missing required fields");
    }
    
    if (!info.length || !info.name || !info['piece length'] || !info.pieces) {
        throw new Error("Invalid torrent file: missing required info fields");
    }

    // Extract piece hashes (each hash is 20 bytes)
    const pieceHashes = [];
    const pieces = info.pieces;
    for (let i = 0; i < pieces.length; i += 20) {
        pieceHashes.push(binaryToHex(pieces.slice(i, i + 20)));
    }
    
    // Calculate info hash from raw info dictionary
    const infoPos = findInfoDictionaryPosition(buffer);
    const rawInfo = buffer.slice(infoPos.start, infoPos.end);
    const crypto = require('crypto');
    const infoHash = crypto.createHash('sha1').update(rawInfo).digest('hex');
    
    return {
        trackerUrl,
        fileLength: info.length,
        name: info.name,
        pieceLength: info['piece length'],
        pieceHashes,
        infoHash
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
        console.log(`Info Hash: ${torrentInfo.infoHash}`);
        console.log(`Piece Length: ${torrentInfo.pieceLength}`);
        console.log(`Piece Hashes:`);
        torrentInfo.pieceHashes.forEach(hash => {
            console.log(hash);
        });
    } else {
        throw new Error(`Unknown command ${command}`);
    }
}

// Run the program
main();