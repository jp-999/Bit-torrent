const fs = require('fs');
const axios = require('axios');
const bencode = require('bencode'); // You may need to install this package
const { Peer, Torrent } = require('./app/models'); // Adjust the import based on your project structure

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
            const outputFilePath = process.argv[4];
            const downloadTorrent = Torrent.fromFile(process.argv[5]);
            console.log(`Total number of pieces: ${downloadTorrent.pieces.length}`);
            const pieceIndex = parseInt(process.argv[6]);
            await downloadPiece(downloadTorrent, pieceIndex, outputFilePath);
            fs.renameSync(`${outputFilePath}.part${pieceIndex}`, outputFilePath);
            break;

        case "download":
            const downloadOutputFilePath = process.argv[4];
            const downloadTorrentFile = Torrent.fromFile(process.argv[5]);
            downloadTorrentFile.getPeers();

            console.log(`Total number of pieces: ${downloadTorrentFile.pieces.length}`);
            console.log(`Found ${downloadTorrentFile.peers.length} peers.`);

            const tasks = [];
            for (let pieceIndex = 0; pieceIndex < downloadTorrentFile.pieces.length; pieceIndex++) {
                const peer = downloadTorrentFile.peers[pieceIndex % downloadTorrentFile.peers.length];
                tasks.push(downloadPiece(downloadTorrentFile, pieceIndex, downloadOutputFilePath, peer));
            }

            await Promise.all(tasks);

            const finalFile = fs.createWriteStream(outputFilePath);
            for (let pieceIndex = 0; pieceIndex < downloadTorrentFile.pieces.length; pieceIndex++) {
                const pieceFileName = `${downloadOutputFilePath}.part${pieceIndex}`;
                const pieceData = fs.readFileSync(pieceFileName);
                finalFile.write(pieceData);
                fs.unlinkSync(pieceFileName);
            }
            finalFile.end();
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

            const { reader, writer } = await connectToPeer(handshakePeer);
            await performHandshake(magnetHandshakeTorrent.infoHash, writer, reader);
            console.log("Waiting for bitfield message...");
            await readMessage(5, writer, reader);
            await performExtensionHandshake(writer, reader);
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
            const downloadPeer = magnetDownloadTorrent.peers[0];

            const { reader: downloadReader, writer: downloadWriter } = await connectToPeer(downloadPeer);
            await performHandshake(magnetDownloadTorrent.infoHash, downloadWriter, downloadReader);
            await readMessage(5, downloadWriter, downloadReader);
            await performExtensionHandshake(downloadWriter, downloadReader);
            await sendRequestMetadataMessage(downloadWriter);
            const downloadInfoDict = await readDataMessage(downloadWriter, downloadReader);

            downloadWriter.close();
            await downloadWriter.waitClosed();

            magnetDownloadTorrent.populateInfoFromDict(downloadInfoDict);
            console.log(`Total number of pieces: ${magnetDownloadTorrent.pieces.length}`);
            const downloadPieceIndex = parseInt(process.argv[6]);
            await downloadPiece(magnetDownloadTorrent, downloadPieceIndex, magnetDownloadOutputFilePath);
            fs.renameSync(`${magnetDownloadOutputFilePath}.part${downloadPieceIndex}`, magnetDownloadOutputFilePath);
            break;

        case "magnet_download":
            const magnetDownloadOutputFilePath = process.argv[4];
            const magnetDownloadLink = process.argv[5];

            const magnetDownloadTorrent = Torrent.fromMagnetLink(magnetDownloadLink);
            magnetDownloadTorrent.getPeers();
            const downloadPeer = magnetDownloadTorrent.peers[0];

            const { reader: downloadReader, writer: downloadWriter } = await connectToPeer(downloadPeer);
            await performHandshake(magnetDownloadTorrent.infoHash, downloadWriter, downloadReader);
            await readMessage(5, downloadWriter, downloadReader);
            await performExtensionHandshake(downloadWriter, downloadReader);
            await sendRequestMetadataMessage(downloadWriter);
            const downloadInfoDict = await readDataMessage(downloadWriter, downloadReader);

            downloadWriter.close();
            await downloadWriter.waitClosed();

            magnetDownloadTorrent.populateInfoFromDict(downloadInfoDict);
            console.log(`Total number of pieces: ${magnetDownloadTorrent.pieces.length}`);
            console.log(`Found ${magnetDownloadTorrent.peers.length} peers.`);

            const downloadTasks = [];
            for (let pieceIndex = 0; pieceIndex < magnetDownloadTorrent.pieces.length; pieceIndex++) {
                const peer = magnetDownloadTorrent.peers[pieceIndex % magnetDownloadTorrent.peers.length];
                downloadTasks.push(downloadPiece(magnetDownloadTorrent, pieceIndex, magnetDownloadOutputFilePath, peer));
            }

            await Promise.all(downloadTasks);

            const finalDownloadFile = fs.createWriteStream(magnetDownloadOutputFilePath);
            for (let pieceIndex = 0; pieceIndex < magnetDownloadTorrent.pieces.length; pieceIndex++) {
                const pieceFileName = `${magnetDownloadOutputFilePath}.part${pieceIndex}`;
                const pieceData = fs.readFileSync(pieceFileName);
                finalDownloadFile.write(pieceData);
                fs.unlinkSync(pieceFileName);
            }
            finalDownloadFile.end();
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
