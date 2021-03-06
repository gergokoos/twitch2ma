import * as index from "../src/lib/index";
import {Config} from "../src/lib/Config";
import Twitch2Ma from "../src/lib/Twitch2Ma";

import Fs = require("fs");
import _ = require("lodash");

// Workaround, see https://github.com/evanw/node-source-map-support/issues/279
jest.mock("source-map-support");
////

jest.mock("../src/lib/Twitch2Ma");

afterEach(() => jest.clearAllMocks());

test("Update notification", () => {

    const packageInformation = require("../package.json");
    const higherVersion = require("semver/functions/inc")(packageInformation.version, "major");

    let consoleSpy = jest.spyOn(console, "log").mockImplementationOnce(() => {});

    index.notifyUpdate(higherVersion);

    expect(consoleSpy).toBeCalledWith(
        expect.stringMatching("A new version of \\w+ is available!"));
});

test("Event handlers attached", () => {

    let twitch2Ma = new Twitch2Ma(loadConfig());

    // For unknown reasons jest.mock() removes these...
    twitch2Ma.onTelnetConnected = jest.fn();
    twitch2Ma.onTwitchConnected = jest.fn();
    twitch2Ma.onCommandExecuted = jest.fn();
    twitch2Ma.onHelpExecuted = jest.fn();
    twitch2Ma.onPermissionDenied = jest.fn();
    twitch2Ma.onGodMode = jest.fn();
    twitch2Ma.onNotice = jest.fn();
    twitch2Ma.onError = jest.fn();
    twitch2Ma.onConfigReloaded = jest.fn();

    index.attachEventHandlers(twitch2Ma);

    expect(twitch2Ma.onTelnetConnected).toBeCalled();
    expect(twitch2Ma.onTwitchConnected).toBeCalled();
    expect(twitch2Ma.onCommandExecuted).toBeCalled();
    expect(twitch2Ma.onHelpExecuted).toBeCalled();
    expect(twitch2Ma.onPermissionDenied).toBeCalled();
    expect(twitch2Ma.onGodMode).toBeCalled();
    expect(twitch2Ma.onNotice).toBeCalled();
    expect(twitch2Ma.onError).toBeCalled();
    expect(twitch2Ma.onConfigReloaded).toBeCalled();
});

test("Load JSON config successful", () => {
    return expect(index.loadConfig("config.json.sample")).resolves.toMatchObject(loadConfig());
});

test("Load YAML config successful", () => {
    return expect(index.loadConfig("config.yml.sample")).resolves.toMatchObject(loadConfig());
});

test("File does not exist",  () => {
    return expect(index.loadConfig("doesNotExist.json")).rejects
        .toHaveProperty("message", "Could not open config file doesNotExist.json!");
});

test("Default config.json loaded", async () => {

    let configTmp = secureConfigFile();
    Fs.copyFileSync("config.json.sample", "config.json");

    await expect(index.loadConfig(null)).resolves.toMatchObject(loadConfig());

    Fs.unlinkSync("config.json");
    restoreConfigFile(configTmp);
});

test("Invalid config file", async () => {

    let configTmp = secureConfigFile();
    Fs.writeFileSync("config.json", "{ invalid-json: haha ");

    await expect(index.loadConfig(null)).rejects.toMatchObject(new Error("Config file config.json is not a valid JSON or YAML file!"));

    Fs.unlinkSync("config.json");
    restoreConfigFile(configTmp);
});

test("Invalid config", async () => {

    let configTmp = secureConfigFile();
    Fs.writeFileSync("config.json", "{ everything-missing: true }");

    await expect(index.loadConfig(null)).rejects.toBeInstanceOf(Error);

    Fs.unlinkSync("config.json");
    restoreConfigFile(configTmp);
});

test("Exit with error", async () => {

    let consoleSpy = jest.spyOn(console, "error").mockImplementationOnce(() => {});

    // @ts-ignore
    let exitSpy = jest.spyOn(process, "exit").mockImplementationOnce(() => {});

    await expect(index.exitWithError(new Error("Fuck dat!"))).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching("Fuck dat! Exiting..."));
    expect(exitSpy).toHaveBeenCalledWith(1);
});

function loadConfig(overrideConfigValues?: any): Config {
    return new Config(_.assign({}, JSON.parse(Fs.readFileSync("config.json.sample", {encoding: "utf-8"})), overrideConfigValues));
}

function secureConfigFile() {
    let oldFilename = "config.old" + new Date().getTime() + ".json";
    if(Fs.existsSync("config.json")) {
        Fs.renameSync("config.json", oldFilename);
        return oldFilename;
    }
    return null;
}

function restoreConfigFile(configTmp: string) {
    if(_.isString(configTmp)) {
        Fs.renameSync(configTmp, "config.json");
    }
}
