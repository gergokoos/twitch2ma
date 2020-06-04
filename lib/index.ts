import Twitch2Ma from "./Twitch2Ma";
import {Config} from "./Config";

import Fs = require("fs");
import _ = require("lodash");
import chalk = require("chalk");

if (!_.isString(process.argv[2])) {
    exitWithError(new Error("No config file specified!"));
}

let jsonObject = failOnErrorOrReturnValue(_.attempt(() => JSON.parse(Fs.readFileSync(process.argv[2], {encoding: "utf-8"}))),
    new Error(`Cannot read config file ${process.argv[2]}!`));

const config = failOnErrorOrReturnValue(_.attempt(() => new Config(jsonObject)));
const twitch2ma = new Twitch2Ma(config);

twitch2ma.onCommandExecuted((channel, user, chatCommand, parameterName, consoleCommand) => {

    parameterName = _.isString(parameterName) ? ` ${parameterName}` : "";

    console.log(chalk`{bgGreen.black  ${channel} }: User {bold ${user}} executed {bold.blue !${chatCommand}${parameterName}}`
        + (_.isString(consoleCommand) ? chalk` ({magenta ${consoleCommand}}) on the desk.` : '.'));
});

twitch2ma.onHelpExecuted(((channel, user, helpCommand) => {
    if (_.isString(helpCommand)) {
        console.log(chalk`{bgGreen.black  ${channel} }: User {bold ${user}} got help for {bold.blue !${helpCommand}}.`);
    } else {
        console.log(chalk`{bgGreen.black  ${channel} }: User {bold ${user}} listed available commands.`);
    }
}));

twitch2ma.onError(exitWithError);

twitch2ma.start()
    .then(() => {
        console.log(chalk`{green Twitch2MA started!}`);
        console.log(chalk`{green Telnet connected to {bold ${config.ma.user}:***@${config.ma.host}:30000}}`);
        console.log(chalk`{green Twitch connected to {bold #${config.twitch.channel}}}`);
        console.log();
    })
    .catch(exitWithError);

function failOnErrorOrReturnValue(value: any, overrideError?: Error) {
    if (_.isError(value)) {
        exitWithError(_.isError(overrideError) ? overrideError : value);
    } else {
        return value;
    }
}

function exitWithError(error: Error) {
    console.error(chalk`{bold.red ${error.message} Exiting...}`);
    process.exit(1);
}
