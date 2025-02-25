const process = require("process");
const fs = require("fs");
const axios = require('axios');
const bencode = require('bencode'); // Ensure this package is installed
const { Peer, Torrent } = require('./app/models'); // Adjust the import based on your project structure

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
    
    if (!info.length || !info.name || !info['piece length'] || !info.pieces) {
        throw new Error("Invalid torrent file: missing required info fields");
    }
    
    return {
        trackerUrl,
        fileLength: info.length,
        name: info.name,
        pieceLength: info['piece length'],
        pieces: info.pieces
    };
}

async function main() {
    const command = process.argv[2];

    switch (command) {
        case "decode":
            const bencodedValue = Buffer.from(process.argv[3], 'utf-8');
            const decodedValue = bencode.decode(bencodedValue);
            console.log(JSON.stringify(decodedValue));
            break;

        case "info":
            const torrentInfo = Torrent.fromFile(process.argv[3]);
            torrentInfo.printInfo();
            break;

        case "peers":
            const peersTorrent = Torrent.fromFile(process.argv[3]);
            const peers = peersTorrent.getPeers();
            peers.forEach(peer => console.log(peer));
            break;

        case "handshake":
            const handshakeTorrent = Torrent.fromFile(process.argv[3]);
            const [ip, port] = process.argv[4].split(":");
            const peer = new Peer(ip, parseInt(port));
            await performHandshakeStandalone(peer, handshakeTorrent.infoHash);
            break;

        case "download_piece":
            const outputFilePathForPiece = process.argv[4];
            const downloadTorrent = Torrent.fromFile(process.argv[5]);
            console.log(`Total number of pieces: ${downloadTorrent.pieces.length}`);
            const pieceIndex = parseInt(process.argv[6]);
            await downloadPiece(downloadTorrent, pieceIndex, outputFilePathForPiece);
            fs.renameSync(`${outputFilePathForPiece}.part${pieceIndex}`, outputFilePathForPiece);
            break;

        case "download":
            const outputFilePathForDownload = process.argv[4];
            const downloadTorrentFile = Torrent.fromFile(process.argv[5]);
            downloadTorrentFile.getPeers();

            console.log(`Total number of pieces: ${downloadTorrentFile.pieces.length}`);
            console.log(`Found ${downloadTorrentFile.peers.length} peers.`);

            const downloadTasks = [];
            for (let pieceIndex = 0; pieceIndex < downloadTorrentFile.pieces.length; pieceIndex++) {
                const peer = downloadTorrentFile.peers[pieceIndex % downloadTorrentFile.peers.length];
                downloadTasks.push(downloadPiece(downloadTorrentFile, pieceIndex, outputFilePathForDownload, peer));
            }

            await Promise.all(downloadTasks);

            const finalDownloadFile = fs.createWriteStream(outputFilePathForDownload);
            for (let pieceIndex = 0; pieceIndex < downloadTorrentFile.pieces.length; pieceIndex++) {
                const pieceFileName = `${outputFilePathForDownload}.part${pieceIndex}`;
                const pieceData = fs.readFileSync(pieceFileName);
                finalDownloadFile.write(pieceData);
                fs.unlinkSync(pieceFileName);
            }
            finalDownloadFile.end();
            break;

        case "magnet_parse":
            const magnetLink = process.argv[3];
            const magnetTorrent = Torrent.fromMagnetLink(magnetLink);
            break;

        case "magnet_handshake":
            const magnetHandshakeLink = process.argv[3];
            const magnetHandshakeTorrent = Torrent.fromMagnetLink(magnetHandshakeLink);
            magnetHandshakeTorrent.getPeers();
            const handshakePeer = magnetHandshakeTorrent.peers[0];

            const { reader: handshakeReader, writer: handshakeWriter } = await connectToPeer(handshakePeer);
            await performHandshake(magnetHandshakeTorrent.infoHash, handshakeWriter, handshakeReader);
            console.log("Waiting for bitfield message...");
            await readMessage(5, handshakeWriter, handshakeReader);
            await performExtensionHandshake(handshakeWriter, handshakeReader);
            break;

        case "magnet_info":
            const magnetInfoLink = process.argv[3];
            const magnetInfoTorrent = Torrent.fromMagnetLink(magnetInfoLink);
            magnetInfoTorrent.getPeers();
            const infoPeer = magnetInfoTorrent.peers[0];

            const { reader: infoReader, writer: infoWriter } = await connectToPeer(infoPeer);
            await performHandshake(magnetInfoTorrent.infoHash, infoWriter, infoReader);
            await readMessage(5, infoWriter, infoReader);
            await performExtensionHandshake(infoWriter, infoReader);
            await sendRequestMetadataMessage(infoWriter);
            const infoDict = await readDataMessage(infoWriter, infoReader);

            infoWriter.close();
            await infoWriter.waitClosed();

            console.log("--------------------------------------------------");
            magnetInfoTorrent.populateInfoFromDict(infoDict);
            magnetInfoTorrent.printInfo();
            break;

        case "magnet_download_piece":
            const magnetDownloadOutputFilePath = process.argv[4];
            const magnetDownloadLink = process.argv[5];

            const magnetDownloadTorrent = Torrent.fromMagnetLink(magnetDownloadLink);
            magnetDownloadTorrent.getPeers();
            const downloadPeerForMagnet = magnetDownloadTorrent.peers[0];

            const { reader: downloadReader, writer: downloadWriter } = await connectToPeer(downloadPeerForMagnet);
            await performHandshake(magnetDownloadTorrent.infoHash, downloadWriter, downloadReader);
            await readMessage(5, downloadWriter, downloadReader);
            await performExtensionHandshake(downloadWriter, downloadReader);
            await sendRequestMetadataMessage(downloadWriter);
            const downloadInfoDict = await readDataMessage(downloadWriter, downloadReader);

            downloadWriter.close();
            await downloadWriter.waitClosed();

            magnetDownloadTorrent.populateInfoFromDict(downloadInfoDict);
            console.log(`Total number of pieces: ${magnetDownloadTorrent.pieces.length}`);
            const downloadPieceIndexForMagnet = parseInt(process.argv[6]);
            await downloadPiece(magnetDownloadTorrent, downloadPieceIndexForMagnet, magnetDownloadOutputFilePath);
            fs.renameSync(`${magnetDownloadOutputFilePath}.part${downloadPieceIndexForMagnet}`, magnetDownloadOutputFilePath);
            break;

        case "magnet_download":
            const magnetDownloadOutputFilePathForDownload = process.argv[4];
            const magnetDownloadLinkForDownload = process.argv[5];

            const magnetDownloadTorrentForDownload = Torrent.fromMagnetLink(magnetDownloadLinkForDownload);
            magnetDownloadTorrentForDownload.getPeers();
            const downloadPeerForMagnetDownload = magnetDownloadTorrentForDownload.peers[0];

            const { reader: downloadReaderForMagnet, writer: downloadWriterForMagnet } = await connectToPeer(downloadPeerForMagnetDownload);
            await performHandshake(magnetDownloadTorrentForDownload.infoHash, downloadWriterForMagnet, downloadReaderForMagnet);
            await readMessage(5, downloadWriterForMagnet, downloadReaderForMagnet);
            await performExtensionHandshake(downloadWriterForMagnet, downloadReaderForMagnet);
            await sendRequestMetadataMessage(downloadWriterForMagnet);
            const downloadInfoDictForMagnet = await readDataMessage(downloadWriterForMagnet, downloadReaderForMagnet);

            downloadWriterForMagnet.close();
            await downloadWriterForMagnet.waitClosed();

            magnetDownloadTorrentForDownload.populateInfoFromDict(downloadInfoDictForMagnet);
            console.log(`Total number of pieces: ${magnetDownloadTorrentForDownload.pieces.length}`);
            console.log(`Found ${magnetDownloadTorrentForDownload.peers.length} peers.`);

            const downloadTasksForMagnet = [];
            for (let pieceIndex = 0; pieceIndex < magnetDownloadTorrentForDownload.pieces.length; pieceIndex++) {
                const peer = magnetDownloadTorrentForDownload.peers[pieceIndex % magnetDownloadTorrentForDownload.peers.length];
                downloadTasksForMagnet.push(downloadPiece(magnetDownloadTorrentForDownload, pieceIndex, magnetDownloadOutputFilePathForDownload, peer));
            }

            await Promise.all(downloadTasksForMagnet);

            const finalDownloadFileForMagnet = fs.createWriteStream(magnetDownloadOutputFilePathForDownload);
            for (let pieceIndex = 0; pieceIndex < magnetDownloadTorrentForDownload.pieces.length; pieceIndex++) {
                const pieceFileName = `${magnetDownloadOutputFilePathForDownload}.part${pieceIndex}`;
                const pieceData = fs.readFileSync(pieceFileName);
                finalDownloadFileForMagnet.write(pieceData);
                fs.unlinkSync(pieceFileName);
            }
            finalDownloadFileForMagnet.end();
            break;

        default:
            throw new Error(`Unknown command ${command}`);
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}