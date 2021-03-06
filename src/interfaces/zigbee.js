const Mqtt = require("mqtt");
const MqttStream = require("./mqttStream");
const Kefir = require("kefir");
const R = require('ramda');
const RA = require('ramda-adjunct');
const Devices = require('../model/devices');
const Interfaces = require('../../config/interfaces.json');
const Util = require('../util');

// baseTopic :: String
const baseTopic = Interfaces.zigbee.baseTopic;

// baseTopic :: String
const address = Interfaces.zigbee.address;

// isZigbeeDevice :: Device -> bool
const isZigbeeDevice = R.propEq("interface", "zigbee");

// zigbeeDevices :: [Device]
const zigbeeDevices = R.pickBy(isZigbeeDevice, Devices.knownDevices);

// isKnownDevice :: String -> bool
const isKnownDevice = R.includes(R.__, R.keys(zigbeeDevices));

// prependBaseTopic :: String -> String
const prependBaseTopic = device => baseTopic + "/" + device;

// prependBaseTopicAndAppendAvailability :: String -> String
const prependBaseTopicAndAppendAvailability = device => baseTopic + "/" + device + "/availability";

// prependSetTopic :: String -> String
const appendSetTopic = R.concat(R.__, "/set");

// removeBaseTopic :: String -> String
const removeBaseTopic = R.replace(baseTopic + "/", "");

// removeAvailabilityTopic :: String -> String
const removeAvailabilityTopic = R.replace("/availability", "");

// isLogTopic :: String -> bool
const isLogTopic = R.endsWith("bridge/log");

// isLogMessage ::  Message -> bool
const isLogMessage = R.propSatisfies(isLogTopic, "topic");

// createGroupTopic :: String
const createGroupTopic = baseTopic + "/bridge/config/add_group";

// removeFromAllGroupsTopic :: String
const removeFromAllGroupsTopic = baseTopic + "/bridge/group/remove_all";

// addDeviceToGroupTopic :: String -> String
const addToGroupTopic = deviceName => baseTopic + "/bridge/group/" + deviceName + "/add";

// removeFromGroupTopic :: String -> String
const removeFromGroupTopic = deviceName => baseTopic + "/bridge/group/" + deviceName + "/remove";

const client = Mqtt.connect(address);
client.subscribe(R.map(prependBaseTopic, R.keys(zigbeeDevices)));
client.subscribe(R.map(prependBaseTopicAndAppendAvailability, R.keys(zigbeeDevices)));
client.subscribe(baseTopic + "/bridge/log");

const inputStream = MqttStream.inputStream(client)
    .map(R.over(MqttStream.topicLense, removeBaseTopic));

const deviceAvailabilityStream = inputStream
    .filter(msg => msg.topic.endsWith("/availability"))
    .map(R.over(MqttStream.topicLense, removeAvailabilityTopic))
    .map(R.over(MqttStream.payloadLense, R.toString))
    .filter(msg => isKnownDevice(msg.topic))
    .map(obj => R.objOf(obj.topic)({"availability": obj.payload}));

const isDeviceAnnouncedMessage = msg => R.propEq("type", "device_announced", msg.payload);

const getFriendlyDeviceName = R.path(["payload", "meta", "friendly_name"]);

const isMessageFromKnownDevice =  R.pipe(
    getFriendlyDeviceName,
    isKnownDevice
);

const createAvailabilityOnlineMessage = x => {
    const friendly_device_name = getFriendlyDeviceName(x);
    return R.objOf(friendly_device_name, {availability: "online"});
};

const parsePayloadAsJson = R.over(MqttStream.payloadLense, R.pipe(R.toString, JSON.parse));

const deviceAnnouncementStream = inputStream
    .filter(isLogMessage)
    .map(parsePayloadAsJson)
    .filter(isDeviceAnnouncedMessage)
    .filter(isMessageFromKnownDevice)
    .map(createAvailabilityOnlineMessage);

const deviceDataInputStream = inputStream
    .filter(msg => isKnownDevice(msg.topic))
    .map(parsePayloadAsJson)
    .map(obj => R.objOf(obj.topic)(obj.payload));



const deviceInputStream = Kefir.merge([deviceAvailabilityStream, deviceDataInputStream]);

const deviceOutputStream = new Kefir.pool();
const groupOutputStream = new Kefir.pool();

deviceOutputStream.plug(groupOutputStream);

deviceOutputStream
    .map(Util.convertToArray)
    .map(R.map(RA.renameKeys({key: 'topic', value: 'payload'})))
    .map(R.map(R.over(MqttStream.topicLense, R.pipe(prependBaseTopic, appendSetTopic))))
    .map(R.map(R.over(MqttStream.payloadLense, JSON.stringify)))
    .onValue(array => array.forEach(input =>
            MqttStream.publishTopic(client)(input.topic)(input.payload)
        )
    );

module.exports = {
    deviceInputStream,
    deviceOutputStream,
    groupOutputStream
};
