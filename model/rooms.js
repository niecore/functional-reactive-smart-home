const R = require('ramda');
const Rooms = require('../config/rooms.json');

// knownRooms
const knownRooms = Rooms.rooms;

// getRoomByName :: String => Room | undefined
const getRoomByName = R.prop(R.__, knownRooms);

// getDevicesInRoom :: String => [Devices]
const getDevicesInRoom = R.pipe(
    getRoomByName,
    R.propOr([], "devices")
);

// getRoomOfDevice :: String -> String | undefined
const getRoomOfDevice = device => R.head(R.keys(R.filter(
    R.includes(device),
    R.reject(R.isNil, R.map(R.prop("devices"), knownRooms))
)));

// deviceIsInRoom :: String -> String -> Boolean
const deviceIsInRoom = room => R.pipe(
    getRoomOfDevice,
    R.equals(room)
);


module.exports = {
    getRoomByName,
    getDevicesInRoom,
    getRoomOfDevice,
    deviceIsInRoom
};

