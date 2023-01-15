const net = require('net');
const bson = require('bson');
const fs = require('fs');
var packetQueue = [];

function BSONDecode(buffer) {
    return bson.deserialize(buffer.slice(4));
}

function BSONEncode(json) {
    const data = bson.serialize(json);
    var buf = Buffer.alloc(4 + data.byteLength);
    buf.writeInt32LE(4 + data.byteLength);
    data.copy(buf, 4);
    return buf;
}

function SendPacket(data) {
    packetQueue.push(data);
}

function SendAll(socket) {
    var json = {};
    packetQueue.forEach((item, index) => {
        json["m" + String(index)] = item;
    });
    json["mc"] = packetQueue.length;
    socket.write(BSONEncode(json));
    if (packetQueue[0].ID != "p") {
        console.log(json);
    }
    packetQueue = [];
}

function HandlePlayerLogon(socket) {
    let playerData = fs.readFileSync("player.dat"); // https://github.com/playingoDEERUX/PixelWorldsServer2 (player.dat)
    playerData = playerData.slice(4);

    var resp = bson.deserialize(playerData);
    console.log(resp);
    socket.write(BSONEncode(resp));
}

function PacketProcessing(data, socket) {
    if (data == null || !data.hasOwnProperty("mc")) return data;
    var msgCount = data["mc"];
    if (msgCount == 0) {
        SendPacket({
            ID: "p"
        });
    }
    if (!msgCount == 0) console.log(data);

    for(let i = 0; i < msgCount; i++) {
        var current = data["m" + String(i)];
        var messageId = current["ID"];
        switch (messageId) {
            case "VChk":
                SendPacket({
                    ID: "VChk",
                    VN: 94
                });
                break;
            case "GPd":
                HandlePlayerLogon(socket);
                break;
            case "TTjW":
                
                break;
            case "ST":
                SendPacket({
                    ID: "ST",
                    STime: ((new Date()).getTime() * 10000) + 621355968000000000,
                    SSlp: 30
                });
                break;
            case "MWli":
                SendPacket({
                    ID: "MWli",
                    Ct: Math.floor(Math.random() * 50),
                });
            default:
                console.log("Unknown message ID: " + messageId);
                SendPacket({
                    ID: "p"
                });
                break;
        }
    }
}

const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        var packet = BSONDecode(data);
        PacketProcessing(packet, socket);
        if (packetQueue.length > 0) {
            SendAll(socket);
        }
    });
}).listen(10001, () => {
    console.log("Server started");
});