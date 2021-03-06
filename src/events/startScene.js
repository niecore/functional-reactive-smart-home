const R = require("ramda");
const Kefir = require("kefir");

const Scenes = require("../model/scenes");
const Events = require("./events");

const isStartSceneEvent = Events.isEvent("StartScene");
const isStopSceneEvent = Events.isEvent("StopScene");

const input = new Kefir.pool();

const isSwitchedScene = R.pipe(
    R.prop("scene"),
    Scenes.getSceneByName,
    Scenes.isSwitchedScene
);

const isStaticScene = R.complement(isSwitchedScene);

const startSceneStream = input
    .filter(isStartSceneEvent);

const stopSceneStream = input
    .filter(isStopSceneEvent);

const startStaticScene = startSceneEvent => Scenes.getSceneByName(startSceneEvent.scene);

// startSwitchedSceneStream :: StartScene => Stream<>
const startSwitchedSceneStream = startSceneEvent => {
    const scene = Scenes.getSceneByName(startSceneEvent.scene);
    const switchedStream = Scenes.switchedSceneStream(scene);
    const stopSceneStreamWithSameScene = stopSceneStream.filter(R.propEq("scene",startSceneEvent.scene));

    return switchedStream.takeUntilBy(stopSceneStreamWithSameScene);
};

const staticSceneStream = startSceneStream
    .filter(isStaticScene)
    .map(startStaticScene);

const switchedSceneStream = startSceneStream
    .filter(isSwitchedScene)
    .flatMap(startSwitchedSceneStream);

const output = staticSceneStream.merge(switchedSceneStream);

module.exports = {
    input,
    output
};


