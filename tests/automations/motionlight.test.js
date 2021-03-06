const R = require("ramda");
const Kefir = require('kefir');

require('../extend-expect');

const {prop, stream, pool, activate, deactivate, value, error, end, send} = KTU;

describe("Motionlight tests", () => {

    beforeEach(() => {
        jest.resetModules();
    });

    const presenceDetected = value({id: "PresenceDetected", room: "light_room", state: [{},{}]});
    const presenceGone = value({id: "PresenceGone", room: "light_room", state: [{},{}]});
    const turnLightsOn = value({id: "TurnLightsOn", room: "light_room", state: [{},{}]});
    const turnLightsOff = value({id: "TurnLightsOff", room: "light_room", state: [{},{}]});
    const turnNightLightsOn = value({id: "TurnNightLightsOn", room: "light_room2", state: [{},{}]});

    test('Motion light will ignore PresenceGone events from other rooms', () => {
        const MotionLight = require("../../src/automations/motionLight");

        const presenceGoneOtherRoom = value({id: "PresenceGone", room: "other_room", state: [{},{}]});

        expect(MotionLight.output).toEmit([turnLightsOn, end()], () => {
            send(
                MotionLight.input, [presenceDetected, presenceGoneOtherRoom, end()]
            );
        })
    });

    test('Motion light will not turn light off whenever a light has changed during the presence', () => {

        const startSceneInRoom = value({ state: [{},{}], id: "StartScene", scene: "test_scene_1"});
        const noAction = value({ state: [{},{}], id: "NoAction"});

        const MotionLight = require("../../src/automations/motionLight");

        expect(MotionLight.output).toEmit([turnLightsOn, noAction, end()], () => {
            send(
                MotionLight.input, [presenceDetected, startSceneInRoom, end()]
            );
        })
    });


    test('Motion light with night light configuration will turn on with minimal brightness during night time', () => {

        jest.doMock("../../src/model/dayPeriod", () => ({
            itsDayTime: () => () => false,
            itsNightTime: () => () => true
        }));

        const MotionLight = require("../../src/automations/motionLight");

        const presenceDetected = value({ state: [{},{}], id: "PresenceDetected", room: "light_room2"});

        expect(MotionLight.output).toEmit([turnNightLightsOn, end()], () => {
            send(
                MotionLight.input, [presenceDetected, end()]
            );
        })
    });

    test('Motion light with night light configuration will turn on normally during daytime', () => {
        const output = value({ state: [{},{}], id: "TurnLightsOn", room: "light_room2"});
        const presenceDetected = value({ state: [{},{}], id: "PresenceDetected", room: "light_room2"});

        jest.doMock("../../src/model/dayPeriod", () => ({
            itsDayTime: () => true,
            itsNightTime: () => false
        }));

        const MotionLight = require("../../src/automations/motionLight");

        expect(MotionLight.output).toEmit([output, end()], () => {
            send(
                MotionLight.input, [presenceDetected, end()]
            );
        })
    });

    test('Basic motion light turn on', () => {
        const MotionLight = require("../../src/automations/motionLight");

        expect(MotionLight.output).toEmit([turnLightsOn, end()], () => {
            send(
                MotionLight.input, [presenceDetected, end()]
            );
        })
    });

    test('Basic motion light turn off', () => {

        const MotionLight = require("../../src/automations/motionLight");

        expect(MotionLight.output).toEmit([turnLightsOn, turnLightsOff, end()], () => {
            send(
                MotionLight.input, [presenceDetected, presenceGone, end()]
            );
        })
    });

    test('Motion light will not trigger, when room is illuminated', () => {

        jest.doMock("../../src/service/luminosity", () => ({
            isRoomToDark: () => () => false
        }));

        const MotionLight = require("../../src/automations/motionLight");

        expect(MotionLight.output).toEmit([end()], () => {
            send(
                MotionLight.input, [presenceDetected, end()]
            );
        })
    });

    test('Motion light will not trigger, when room is illuminated (unmocked)', () => {
        const MotionLight = require("../../src/automations/motionLight");

        const presenceDetected = value({id: "PresenceDetected", room: "light_room", state: [{},{motion_sensor_1: {illuminance_lux: 3000}}]});

        expect(MotionLight.output).toEmit([end()], () => {
            send(
                MotionLight.input, [presenceDetected, end()]
            );
        })
    });

    test('Motion light will trigger, when room is to dark', () => {

        jest.doMock("../../src/service/luminosity", () => ({
            isRoomToDark: () => () => true
        }));

        const MotionLight = require("../../src/automations/motionLight");

        expect(MotionLight.output).toEmit([turnLightsOn, end()], () => {
            send(
                MotionLight.input, [presenceDetected, end()]
            );
        })
    });

    test('Motion light will trigger, when room is to dark (unmocked)', () => {
        const MotionLight = require("../../src/automations/motionLight");

        const presenceDetected = value({id: "PresenceDetected", room: "light_room", state: [{},{motion_sensor_1: {illuminance_lux: 1}}]});
        const turnLightsOn = value({id: "TurnLightsOn", room: "light_room", state: [{},{motion_sensor_1: {illuminance_lux: 1}}]});
        expect(MotionLight.output).toEmit([turnLightsOn, end()], () => {
            send(
                MotionLight.input, [presenceDetected, end()]
            );
        })
    });

    test('Motion light will not trigger, when room has enabled lights', () => {

        jest.doMock("../../src/service/lights", () => ({
            lightsInRoomOff: () => () => false
        }));

        const MotionLight = require("../../src/automations/motionLight");

        expect(MotionLight.output).toEmit([end()], () => {
            send(
                MotionLight.input, [presenceDetected, end()]
            );
        })
    });

    test('Motion light will not trigger, when room has enabled lights (unmocked)', () => {
        const MotionLight = require("../../src/automations/motionLight");

        const presenceDetected = value({id: "PresenceDetected", room: "light_room", state: [{},{light_1: {state: "ON"}}]});

        expect(MotionLight.output).toEmit([end()], () => {
            send(
                MotionLight.input, [presenceDetected, end()]
            );
        })
    });
});

