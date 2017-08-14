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

lang = "en";
var token;



console.log("Loading modules...");

// external requirements
const fs = require("fs");
const Discord = require("discord.js");
const CircularJSON = require("circular-json");

// Internal requirements
const utils = require("./utils");
const io = require("./io");
const presets_mod = require("./rpg/presets");
const rpg = require("./rpg/main");
const colors = require("./colors/colors.js")();
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

function initRP(msg) {
	utils.replyMessage(msg, io.say("init_alert"));
	rp[msg.channel] = utils.createRP(msg.channel);
	utils.replyMessage(msg, io.say("init_success"));
}



function canCheat(msg) {
	if (rp[msg.channel].admins != undefined && rp[msg.channel].user_right_level != undefined)
		return rp[msg.channel].admins.indexOf(msg.author) > -1 || rp[msg.channel].user_rights_level >= 2;
	else
		return true;
}

function saveRP(id) {
	if (id != undefined && id != null && rp[id] != undefined && rp[id] != null) {
		var string = CircularJSON.stringify(rp[id]);
		//console.log(string);
		fs.writeFileSync("./"+config.rpdir+"/"+id, string);
	}
}

bot.on("ready", () => {
	onLoginTime = new Date().getTime();
	// Prints login success
	console.log("Logged in as "+bot.user.tag+"!");
	console.log("STATUS: ");
	console.log(" - active RPs: " + Object.keys(rp).length);
	console.log(" - loading time: " + (onLoadedTime - onStartupTime) + "ms");
	console.log(" - login time: " + (onLoginTime - onLoadedTime) + "ms");
	console.log(" - errors found: " + problems);
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
				guild: msg.channel.guild.id
			};
			if (rp[msg.channel.id] != undefined && rp[msg.channel.id] !== null) {
				if (rp[msg.channel.id].rp_shortcut) {
					if (msg_t.content.startsWith("!")) {
						msg_t.content = msg_t.content.replace(/\!/, "l!rp ");
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

	if (msg.content == "<@318041916094677002>" && msg.author == "238841636581277698") {
		utils.replyMessage(msg, "Yes, *my god* ?");
	}
	else if (msg.content == "<@318041916094677002>") {
		utils.replyMessage(msg, "Print `l!help` for more help!");
	}

	if (msg.content.startsWith("l!")) {
		utils.logMessage(msg);

		//Trims the message and separate the command
		const command = msg.content.slice(2);
		const commandParts = utils.splitCommand(msg.content);


		if (command.startsWith("help")) {

			var query = command.slice(4).trim();
			var data = config.lang[lang].help[query.replace(" ", "_")];
			if (data == undefined) {
				data = config.lang[lang].help["_"];
			}
			utils.replyMessage(msg, {embed: Object.assign({}, data, {color: config.colors.help})});
		}

		if (command.startsWith("test")) {
			// test
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
				}
				else if (commandParts[1] == "eval") {
					eval(command.split("```")[1]);
				}
			}
		}

		if (command.toLowerCase().startsWith("rp")) {
			rpg(msg, commandParts, command);
		}
		else if (command.toLowerCase().startsWith("col")) {
			if (commandParts[1] == "list") {
				var setID = utils.getObjectID(colors, commandParts[2]);
				if (commandParts[2] == undefined || colorID == -1) {
					var mpages = Math.ceil(colors.length/config.itemsPerPage),
					page = Math.max(Math.min(+(commandParts[2] || 1), mpages), 1);
					var embed = {
						color: config.colors.colors,
						title: ("List of my handful colors (page " + page + "/" + mpages + ")"),
						description: "Those are all colors that I took from my environment, feel free to use them. You don't need to credit me, but I'd be very happy if you do!",
						fields: []
					};
					for (i = (page-1)*config.itemsPerPage; i < Math.min((page)*config.itemsPerPage, colors.length); i++) {
						embed.fields.push({name: colors[i].name || "*Unnamed*", value: colors[i].desc || "*No description given*"});
					}
					utils.replyMessage(msg, {embed: embed});
				}
				else if (setID > -1) {
					var colorID = utils.getObjectID(colors[setID].sets, commandParts[3]);
					if (colorID == -1) {
						var mpages = Math.ceil(colors[setID].sets.length/config.itemsPerPage),
						page = Math.max(Math.min(+(commandParts[3] || 1), mpages), 1);
						var embed = {
							color: config.colors.colors,
							title: ("List of my handful colors in " + colors[setID].name + " (page " + page + "/" + mpages + ")"),
							description: colors[setID].desc,
							fields: []
						};
						for (i = (page-1)*config.itemsPerPage; i < Math.min((page)*config.itemsPerPage, colors[setID].sets.length); i++) {
							embed.fields.push({name: colors[setID].sets[i].name || "*Unnamed*", value: colors[setID].sets[i].desc || "*No description given*"});
						}
						utils.replyMessage(msg, {embed: embed});
					}
					else if (colorID > -1) {
						var mpages = Math.ceil(colors[setID].sets[colorID].colors.length/config.itemsPerPage),
						page = Math.max(Math.min(+(commandParts[4] || 1), mpages), 1);
						var embed = {
							color: config.colors.colors,
							title: ("List of my handful colors in " + colors[setID].name + "/" + colors[setID].sets[colorID].name + " (page " + page + "/" + mpages + ")"),
							description: colors[setID].sets[colorID].desc,
							fields: []
						};
						for (i = (page-1)*config.itemsPerPage; i < Math.min((page)*config.itemsPerPage, colors[setID].sets[colorID].colors.length); i++) {
							var actColor = colors[setID].sets[colorID].colors[i];
							embed.fields.push({name: colors.parse(actColor).html, value: colors.display(actColor)});
						}
						utils.replyMessage(msg, {embed: embed});
					}
				}
			}
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



	io.loadRP();
	console.log("Loaded the saves, loading presets");

	presets_mod.loadPresets();
	console.log("Loaded the presets, loading the token");

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
		guild: msg_base.guild
	};
	treatMsg(msg_t);
}
