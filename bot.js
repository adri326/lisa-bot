// My very own, first bot - don't blame it
/*
	Timeline:
	[START]
	* Read config.json
	* Parse config.json
	* Load {config.rpdir}'s saves (if any)
	* Login with the token provided in data.json
	* Prints login success

	[ON MESSAGE]
	* Check the message's content:
		^Starts with "l!"^:
			^Command is "help"^: Print the help message
			^Command is "RP"^:
				^Channel hasn't any RP yet^: Initialise RP
				^Next word is "char"^:
					^Next word is "list"^: Lists all characters
					^Next word is "create"^: Ask to the user to type in a name;
						> Name typed: Greet the user and save the user name
				^Next word is "save"^: Saves the current channel's RP content to {config.rpdir}/{channel.id}
*/

default_lang = "en_US";
lang = {};
var token;
hashedKey = "";



console.log("Loading modules...");

// external requirements
const fs = require("fs");
const Discord = require("discord.js");
const CircularJSON = require("circular-json");
const crypto = require("crypto");

// Internal requirements
const utils = require("./utils");
const io = require("./io");
const presets_mod = require("./rpg/presets");
const rpg = require("./rpg/main");
const colors = require("./colors/colors.js");
//const colors = colors_mod();

var onStartupTime = new Date().getTime();
var onLoginTime, onLoadedTime;
problems = 0;

console.log("Initialising variables");

reqs = {
	has_char: 1,
	has_class: 2,
	has_specie: 4,
	are_classes: 8,
	are_species: 16,
	are_mobs: 32,
	are_objects: 64,
	is_room: 128,
	are_mobs_in_room: 256,
	is_alive: 512
};


bot = new Discord.Client();
talking = [{
	state: false,
	id: 0,
	trigger: function(msg) {}
}];
rp = [];
presets = [];

initRP = function initRP(msg) {
	utils.replyMessage(msg, io.say(msg, "init_alert"));
	rp[msg.guild] = utils.createRP(msg);
	utils.replyMessage(msg, io.say(msg, "init_success"));
}



canCheat = function canCheat(msg) {
	if (msg.rpg.admins != undefined && msg.rpg.user_right_level != undefined)
		return msg.rpg.admins.indexOf(msg.author) > -1 || msg.rpg.user_rights_level >= 2;
	else
		return true;
}

saveRP = io.saveRP;

bot.on("ready", () => {
	onLoginTime = new Date().getTime();
	// Prints login success
	console.log("Logged in as "+bot.user.tag+"!");
	console.log("STATUS: ");
	console.log(" - active RPs: " + Object.keys(rp).length);
	console.log(" - loading time: " + (onLoadedTime - onStartupTime) + "ms");
	console.log(" - login time: " + (onLoginTime - onLoadedTime) + "ms");
	console.log(" - errors found: " + problems);
	Object.keys(rp).forEach(o => {console.log(o)});
	console.log("");
	setInterval(() => {
		//console.log("Saving RPs...");
		for (i in rp) {
			saveRP(i);
		}
	}, 30000);
	if (typeof on_bot_ready !== "undefined") {
		on_bot_ready();
	}
});

bot.on("message", msg => {
	//console.log(msg.content);
	try {
		var start = new Date().getTime();
		var message_split = msg.content.split("\n") || [msg.content];
		if (msg.content.startsWith("l!admin")) {
			message_split = [msg.content];
		}
		for (msg_index = 0; msg_index < Math.min(config.maxBranchedCmds, message_split.length); msg_index++) { // Loop for every new-line (maximum is config.maxBranchedCmds times)
			const msg_t = {
				content: message_split[msg_index],
				author: msg.author.id,
				author_username: msg.author.username,
				author_discriminator: msg.author.discriminator,
				channel: msg.channel.id,
				guild: msg.channel.guild.id,
				rpg: rp[msg.guild.id]
			};
			if (rp[msg.guild.id] != undefined && rp[msg.guild.id] !== null) {
				if (rp[msg.guild.id].rp_shortcut) {
					if (msg_t.content.startsWith("!")) {
						msg_t.content = msg_t.content.replace(/\!/, "l!rpg ");
					}
				}
			}
			treatMsg(msg_t);
		}
		var end = new Date().getTime();
		if (msg.content.startsWith("l!"))
			console.log(" " + (end-start) + "ms");
	}
	catch (err) {
		utils.replyMessage({channel: msg.channel.id, guild: msg.channel.guild.id}, {embed: {
			title: "ERROR ERROR!",
			color: config.colors.error,
			description: err.toString()
		}});
		console.error(err);
	}
});
function treatMsg(msg) {
	if (!msg.content.startsWith("l!")) {
		if (talking[msg.channel] != null) {
			if (msg.author == talking[msg.channel].id && talking[msg.channel].state) {
				utils.logMessage(msg);
				talking[msg.channel].state = false;
				talking[msg.channel].trigger(msg);
			}
		}
	}
	else if (msg.content == "<@318041916094677002>") {
		switch (msg.author) {
			case "238841636581277698":
				utils.replyMessage(msg, "Yes, *my god* ?");
				break;
			case "205413726625595394":
				utils.replyMessage(msg, "*prosternates*");
				break;
			default:
				utils.replyMessage(msg, "Print `l!help` for more help!");
				break;
		}
	}

	if (msg.content.startsWith("l!")) {
		utils.logMessage(msg);
		//Trims the message and separate the command
		const command = msg.content.slice(2);
		const commandParts = utils.splitCommand(msg.content);

		if (command.startsWith("help")) {

			var query = command.slice(4).trim();
			var data = lang[io.langName(msg.rpg.lang)].help[query.replace(" ", "_")];
			if (data == undefined) {
				data = lang[io.langName(msg.rpg.lang)].help["_"];
			}
			utils.replyMessage(msg, {embed: Object.assign({}, data, {color: config.colors.help})});
		}

		if (command.startsWith("admin")) {
			if (msg.author == config.admin) {
				if (commandParts[1] == "reload") {
					if (commandParts[2] == "presets") {
						console.log("Reloading presets...");
						presets_mod.loadPresets();
						utils.replyMessage(msg, "Reloaded presets!");
					}
					else if (commandParts[2] == "config") {
						console.log("Reloading config...");
						data = fs.readFileSync("./config.json");
						if (data !== null) {
							config = CircularJSON.parse(data.toString());
							utils.replyMessage(msg, "Reloaded config! Warning, changes may not apply!");
						}
					}
					else if (commandParts[2] == "lang") {
						console.log("Reloading lang files..");
						io.loadLang();
						utils.replyMessage(msg, "Lang files reloaded!");
					}
				}
				else if (commandParts[1] == "eval") {
					eval(command.split("```")[1]);
				}
				else if (commandParts[1] == "history") {
					let guild = bot.guilds.get(msg.guild);
					if (guild != undefined) {
						let channel = guild.channels.get(msg.channel);
						if (channel != undefined) {
							channel.fetchMessage(commandParts[2])
								.then(messages => {
									utils.replyMessage(msg, (() => {
										let s = "";
										messages.edits.forEach(m => {
											s = s + "```" + m.content + "```"
										});
										return s;
									})());
								})
								.catch(console.error);
						}
						else {
							utils.replyMessage(msg, "Error :3");
						}
					}
					else {
						utils.replyMessage(msg, "Error :3");
					}
				}
			}
		}

		if (command.toLowerCase().startsWith("rpg")) {
			rpg(msg, commandParts, command);
		}
		else if (command.toLowerCase().startsWith("color")) {
			colors(msg, commandParts, command);
		}
	}
}
var initLoading = function () {
	console.log("Reading config.json ...");

	data = fs.readFileSync("./config.json");
	// Read data.json
	if (data === null) {
		console.log("Error while reading the config.json file, be sure to have it with the right name and with the right permissions!");
	}
	console.log("Successfully read config.json, parsing its data ...");
	// Success; Parse data.json
	config = JSON.parse(data.toString());
	console.log("Successfully parsed config data, loading the saves ...");
	try {
		var keyRaw = fs.readFileSync("./key.txt").toString().trim();
		hashedKey = crypto.createHash(config.hashName).update(keyRaw, "utf-8").digest();
	}
	catch (err) {
		console.error("Error while loading the key, be sure to have something creative in the file key.txt and that it is the same with witch the saves have been crypted, with utf-8 encoding!")
	}
	io.loadRP();
	console.log("Loaded the saves, loading language files");

	io.loadLang();
	console.log("Loaded the language files, loading the presets...");

	presets_mod.loadPresets();
	console.log("Loaded the presets, loading the colors...");

	colors("init");
	console.log("Loaded the colors, loading the token...");

	onLoadedTime = new Date().getTime();


	data = fs.readFile("./token.txt", (err, data) => {
		if (err) {
			console.log("Error while loading the token, be sure that you have it in plain text in the file token.txt!");
			throw err;
		}
		console.log("Successfully loaded the token, logging in...");
		token = data.toString().trim();
		bot.login(token);
		//console.log(token);
	});
}();
function exitHandler(options, err) {
	if (options.exception === undefined) {
		if (options.exit === undefined) {
			console.log("");
			console.log("Disconnecting...");
			bot.destroy((err) => {
				console.log("Error while disconnecting!");
			});
			console.log("Attempting to save all the data...");
			for (i in rp) {
				saveRP(i);
			}
			console.log("Goodbye!");
		}
		process.exit();
	} else {
		console.error(err);
		process.exit();
	}
}

process.on("exit", exitHandler.bind(null, {exit: true}));
process.on("SIGINT", exitHandler.bind(null, {}));
process.on("uncaughtException", exitHandler.bind(null, {exception: true}));

// Ability to debug the code
exports.trigger_msg = function(msg_base, content) {
	var message_split = content.split("\n");
	const msg_t = {
		content: content,
		author: msg_base.author,
		author_username: msg_base.author_username,
		author_discriminator: msg_base.author_discriminator,
		channel: msg_base.channel,
		guild: msg_base.guild,
		rpg: rp[msg_base.guild]
	};
	treatMsg(msg_t);
}
