import {Command} from "commander";
import Twitch2Ma from "./Twitch2Ma";
import {Config} from "./Config";

import Fs = require("fs");
import YAML = require("yaml");
import _ = require("lodash");
import chalk = require("chalk");

const semverGt = require('semver/functions/gt')
const packageInformation = require("../../package.json");

let twitch2Ma: Twitch2Ma;

export async function main() {

    process.on("SIGINT", () => {
        console.log(chalk`\n{bold Thank you for using twitch2ma} ❤️`);
        if(twitch2Ma) {
            twitch2Ma.stop()
                .catch((err: Error) => {
                    error(err.message);
                    process.exit(1);
                })
                .then(process.exit(0))
        }
        process.exit(0);
    });

    return require("libnpm")
        .manifest(`${packageInformation.name}@latest`)
        .then(notifyUpdate)
        .catch(() => warning("Could not get update information!"))
        .then(init);
}

function init(): void {
    new Command()
        .name(packageInformation.name)
        .description(packageInformation.description)
        .version(packageInformation.version, "-v, --version", "output the current version")
        .arguments("[configFile]")
        .action(configFile => {
            loadConfig(configFile)
                .then(config => {
                    twitch2Ma = new Twitch2Ma(config);
                    return twitch2Ma;
                })
                .then(attachEventHandlers)
                .then(twitch2Ma => twitch2Ma.start())
                .catch(exitWithError);
        })
        .parse(process.argv);
}

export function notifyUpdate(manifest: any) {
    if(semverGt(manifest.version, packageInformation.version)) {
        console.log(chalk`🔔 {blue A new version of ${packageInformation.name} is available!} ` +
            chalk`{blue (current: {bold ${packageInformation.version}}, new: {bold ${manifest.version}})}`);
    }
}

export async function attachEventHandlers(twitch2Ma: Twitch2Ma): Promise<Twitch2Ma> {

    twitch2Ma.onTelnetConnected((host, user) => confirm(chalk`Telnet connected to {bold ${user}:***@${host}:30000}.`));
    twitch2Ma.onTwitchConnected(channel => confirm(chalk`Twitch connected to {bold #${channel}}.`));

    twitch2Ma.onCommandExecuted((channel, user, chatCommand, parameterName, consoleCommand) => {

        parameterName = _.isString(parameterName) ? ` ${parameterName}` : "";

        channelMessage(channel, chalk`💡 User {bold ${user}} executed {bold.blue !${chatCommand}${parameterName}}`
            + (_.isString(consoleCommand) ? chalk` ({magenta ${consoleCommand}}) on the desk.` : '.'));
    });

    twitch2Ma.onHelpExecuted((channel, user, helpCommand) => {
        if (_.isString(helpCommand)) {
            channelMessage(channel, chalk`🤨 User {bold ${user}} got help for {bold.blue !${helpCommand}}.`);
        } else {
            channelMessage(channel, chalk`📖 User {bold ${user}} listed available commands.`);
        }
    });

    twitch2Ma.onGodMode((channel, user, reason) => channelMessage(channel,
        chalk`💪 User {bold ${user}} activated {bold.inverse  god mode } because: ${reason}.`));

    twitch2Ma.onPermissionDenied((channel, user, command, reason) => channelMessage(channel,
        chalk`✋ User {bold ${user}} tried to run {bold.blue ${command}} but permissions were denied by ${reason}.`))

    twitch2Ma.onError(exitWithError);

    return twitch2Ma;
}

export async function loadConfig(configFile: string): Promise<Config> {

    let configFileIsDefault = !_.isString(configFile);

    if (configFileIsDefault) {
        configFile = "config.json";
    }

    let rawConfigFile = Fs.readFileSync(configFile, {encoding: "utf-8"});
    let rawConfigObject = _.attempt(() => JSON.parse(rawConfigFile));

    if (rawConfigObject instanceof Error) {
        try {
            rawConfigObject = YAML.parse(rawConfigFile);
        } catch (ignored) {
            throw new Error(`Config file ${configFile} is not a valid JSON or YAML file!`);
        }
    }

    return new Config(rawConfigObject);
}

export function exitWithError(err: Error) {
    error((err.message.slice(-1) === "!" ? err.message : err.message + "!") + " Exiting...");
    process.exit(1);
}

function channelMessage(channel: string, message: string): void {
    console.log(chalk`{bgGreen.black  ${channel} }: ${message}`);
}

function confirm(message: string): void {
    console.log(chalk`✅ {green ${message}}`);
}

function warning(message: string): void {
    console.warn(chalk`⚠️ {yellow ${message}}`)
}

function error(message: string): void {
    console.error(chalk`❌ {bold.red ${message}}`);
}
