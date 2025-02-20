const process = require("process");
const fs = require("fs");
const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');

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
function decodeNextElement(bencodedValue) {
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

// Add encoding function to convert data back to bencode format
function bencode(data) {
    // Handle strings
    if (typeof data === 'string') {
        return `${data.length}:${data}`;
    }
    // Handle numbers
    else if (typeof data === 'number') {
        return `i${data}e`;
    }
    // Handle arrays
    else if (Array.isArray(data)) {
        return `l${data.map(item => bencode(item)).join('')}e`;
    }
    // Handle objects (dictionaries)
    else if (typeof data === 'object' && data !== null) {
        const sortedKeys = Object.keys(data).sort();
        return `d${sortedKeys.map(key => bencode(key) + bencode(data[key])).join('')}e`;
    }
    // If the type is unsupported, throw an error
    throw new Error('Unsupported type for bencode: ' + typeof data);
}

function calculateInfoHash(info) {
    const bencoded = bencode(info);
    const hash = crypto.createHash('sha1');
    hash.update(bencoded, 'latin1');
    return hash.digest('hex');
}

// Function to parse torrent file and extract info
function parseTorrentFile(filePath) {
    // Read the torrent file as a buffer
    const buffer = fs.readFileSync(filePath);
    
    // Convert buffer to string using latin1 encoding to preserve byte values
    const content = buffer.toString('latin1');
    
    // Decode the bencoded content
    const torrentData = decodeBencode(content);
    
    // Extract required information
    const trackerUrl = torrentData.announce;
    const info = torrentData.info;
    
    // Validate required fields
    if (!trackerUrl || !info) {
        throw new Error("Invalid torrent file: missing required fields");
    }
    
    // Calculate unique identifier for torrent
    const infoHash = calculateInfoHash(info);
    
    // Extract piece length and piece hashes
    const pieceLength = info['piece length'];
    const pieces = info.pieces;
    
    // Convert pieces from binary to hexadecimal format
    const pieceHashes = [];
    for (let i = 0; i < pieces.length; i += 20) {
        const pieceHash = pieces.slice(i, i + 20);
        pieceHashes.push(pieceHash.toString('hex')); // Convert to hex
    }
    
    // Return relevant torrent information
    return {
        trackerUrl,
        fileLength: info.length,
        infoHash,
        pieceLength,
        pieceHashes
    };
}

// Function to calculate SHA1 hash
function calculateSHA1(buffer) {
    return crypto.createHash('sha1').update(buffer).digest('hex');
}

// Function to URL encode the info hash
function urlEncodeInfoHash(infoHash) {
    return Buffer.from(infoHash, 'hex').toString('binary'); // Convert hex to binary for URL encoding
}

// Function to make a request to the tracker
async function requestTracker(trackerUrl, infoHash, port, left) {
    const peerId = '-MYCLIENT-123456789012'; // Example peer ID (20 bytes)
    const uploaded = 0;
    const downloaded = 0;
    const compact = 1;

    // Construct the query parameters
    const params = {
        info_hash: urlEncodeInfoHash(infoHash),
        peer_id: peerId,
        port: port,
        uploaded: uploaded,
        downloaded: downloaded,
        left: left,
        compact: compact
    };

    // Make the GET request to the tracker
    try {
        const response = await axios.get(trackerUrl, { params });
        return response.data; // Return the response data
    } catch (error) {
        console.error('Error contacting tracker:', error);
        throw error; // Rethrow the error for handling
    }
}

// Function to print torrent information
function printTorrentInfo(torrentInfo) {
    // Debugging: Log the entire torrentInfo object to see its structure
    console.log('Torrent Info:', torrentInfo);

    const trackerUrl = torrentInfo.announce;

    // Check if info is defined and has the expected structure
    if (!torrentInfo.info) {
        throw new Error("Invalid torrent info: missing 'info' property");
    }

    const fileLength = torrentInfo.info.length; // This line may throw an error if info is undefined
    const tmpBuff = Buffer.from(bencode(torrentInfo.info), "binary");
    const hash = calculateSHA1(tmpBuff);
    const pieceInfo = Buffer.from(torrentInfo.info.pieces, "binary");

    // Print the extracted information
    console.log(`Tracker URL: ${trackerUrl}`);
    console.log(`Length: ${fileLength}`);
    console.log(`Info Hash: ${hash}`);
    console.log(`Piece Length: ${torrentInfo.info['piece length']}`);

    console.log('Piece Hashes:');
    for (let i = 0; i < pieceInfo.length; i += 20) {
        console.log(pieceInfo.slice(i, i + 20).toString("hex")); // Print each piece hash in hex format
    }

    // Request peers from the tracker
    requestTracker(trackerUrl, hash, 6881, fileLength)
        .then(trackerResponse => {
            // Handle the tracker response
            console.log('Tracker Response:', trackerResponse);
            // Parse the response to extract peers
            const peers = parsePeers(trackerResponse.peers);
            console.log('Peers:', peers);
        })
        .catch(error => {
            console.error('Failed to get peers from tracker:', error);
        });
}

// Function to parse peers from the tracker response
function parsePeers(peersString) {
    const peers = [];
    for (let i = 0; i < peersString.length; i += 6) {
        const ip = peersString.slice(i, i + 4).join('.');
        const port = peersString.readUInt16BE(i + 4);
        peers.push({ ip, port });
    }
    return peers;
}

// Main function to handle command-line arguments
function main() {
    const command = process.argv[2];

    if (command === "decode") {
        const bencodedValue = process.argv[3];
        const result = decodeBencode(bencodedValue);
        if (result) {
            console.log(JSON.stringify(result));
        }
    } else if (command === "info") {
        const torrentFile = process.argv[3];
        const torrentInfo = parseTorrentFile(torrentFile);
        printTorrentInfo(torrentInfo); // Call the function to print torrent info
    } else {
        throw new Error(`Unknown command ${command}`);
    }
}

main();