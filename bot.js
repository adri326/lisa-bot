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

var lang = "en";

var onStartupTime = new Date().getTime();
var onLoginTime, onLoadedTime;

const fs = require("fs");
const Discord = require("discord.js");
const CircularJSON = require("circular-json");
const attrmgtR = require("./attrmgt");

var bot = new Discord.Client();
var botdata; // Defined later
var talking = [{
	state: false,
	id: 0,
	trigger: function(msg) {}
}];
var rp = [];

var RP = {
	new: function(id, creator) {
		this.creator = creator.id;
		this.id = id;
		this.chars = {};
		this.classes = [config.defaults.class];
		this.species = [config.defaults.specie];
		this.objects = [config.defaults.object];
		this.adventure_mode = config.defaults.adventure_mode;
		this.admins = [creator.id];
		this.user_rights_level = config.defaults.user_rights_level;
		return this;
	},
	set_char: function(rp, id, name) {
		rp.chars[id] = {
			name: name,
			classId: -1,
			specieId: -1,
			inventory: []
		};
		rp.chars[id].ATK = config.defaults.ATK;
		rp.chars[id].DEF = config.defaults.DEF;
		rp.chars[id].VIT = config.defaults.VIT;
		rp.chars[id].MGC = config.defaults.MGC;
		rp.chars[id].AGI = config.defaults.AGI;
		rp.chars[id].STR = config.defaults.STR;
	}
};

const Level = {
	new: function(width, height, depth, stairsNumber, specialsNumber) {
		var level = [];
		for (y = 0; y < height; y++) {
			level[y] = [];
			for (x = 0; x < width; x++) {
				level[y][x] = [];
			}
		}
		for (s = 0, t = 0; s < stairsNumber; s++, t++) {
			var x = Math.floor(Math.random() * width);
			var y = Math.floor(Math.random() * height);

			if (level[y][x].indexOf("stair") <= -1) {
				level[y][x].push("stair");
			} else if (t <= stairsNumber * 2) {
				s--; // Make the loadin' time longer;
			}
		}
		return level;
	}
}

function splitCommand(str) {
	return [].concat.apply([], str.split('"').map(function(v,i){
	   return i%2 ? v : v.split(' ')
	})).filter(Boolean);
}

function replyMessage(msg, content) {
	// NOTE: Sends a message back
	msg.channel.send(content);
}

function logMessage(msg) {
	console.log(msg.author.username + ":" + msg.author.discriminator + " => " + msg.content); // Log message content
}

function talk(msg, trigger) {
	actTalking = {};
	actTalking.state = true;
	actTalking.id = msg.author.id;
	actTalking.trigger = trigger;
	talking[msg.channel.id] = actTalking;
	return talking[msg.channel.id];
	//console.log("[waiting for non-command answer]");
}
function getTalking(msg) {
	return talking[msg.channel.id];
}

function initRP(channel, creator) {
	channel.send(config.lang[lang].init_alert);
	rp[channel.id] = RP.new(channel.id, creator);
	channel.send(config.lang[lang].init_success);
}

function say(msg, msg_name) {
	var string = config.lang[lang][msg_name];
	try {
		if (string.indexOf("{{NAME}}")>-1)
			string = string.replace("{{NAME}}", rp[msg.channel.id].chars[msg.author.id].name);
		if (string.indexOf("{{CLASSES}}")>-1)
			string = string.replace("{{CLASSES}}", listClass(msg));
		if (string.indexOf("{{SPECIES}}")>-1)
			string = string.replace("{{SPECIES}}", listSpecie(msg));
		if (string.indexOf("{{CLASS}}")>-1)
			string = string.replace("{{CLASS}}", rp[msg.channel.id].classes[rp[msg.channel.id].chars[msg.author.id].classId].name);
		if (string.indexOf("{{SPECIE}}")>-1)
			string = string.replace("{{SPECIE}}", rp[msg.channel.id].species[rp[msg.channel.id].chars[msg.author.id].specieId].name);
	} catch (err) {
		console.log(err);
	}
	return string;
}

function loadRP() {
	fs.readdir("./"+config.rpdir+"/", (err, items) => {
		if (err) {
			console.log("Error while listing the RP directory, please create it before starting the bot");
			throw err;
		}
		if (items != null)
		for (i = 0; i < items.length; i++) {
			if (items[i]!="undefined" && items[i]!="[object Object]") {
				fs.readFile("./"+config.rpdir+"/"+items[i], (err, data) => {
					if (err) {
						console.log("Error while reading "+config.rpdir+"/"+items[i]+", skipping!");
					} else {
						var chan = CircularJSON.parse(data.toString());
						rp[chan.id] = chan;
					}
				});
			}
		}
	})
}

function askChar(msg) {
	replyMessage(msg, say(msg, "char_init"));
	talk(msg, function(msg) {
		RP.set_char(rp[msg.channel.id], msg.author.id, msg.content);
		replyMessage(msg, say(msg, "char_init_success"));
		askClass(msg);
	});
}
function listClass(msg) {
	var list = "";

	for (i in rp[msg.channel.id].classes) {
		list = list + "\r\n - " + rp[msg.channel.id].classes[i].name;
	}

	return list;
}
function askClass(msg) {
	// NOTE: Ask CLASS
	if (rp[msg.channel.id].classes !== null && rp[msg.channel.id].classes.length > 0) {


		replyMessage(msg, say(msg, "char_ask_class"));
		talk(msg, function(msg) {
			var foundClass = -1;
			for (i in rp[msg.channel.id].classes) {
				if (msg.content.toLowerCase() == rp[msg.channel.id].classes[i].name.toLowerCase()) {
					foundClass = i;
					break;
				}
			}
			if (foundClass>-1) {
				rp[msg.channel.id].chars[msg.author.id].classId = foundClass;
				replyMessage(msg, say(msg, "char_ask_class_success"));
				if (rp[msg.channel.id].chars[msg.author.id].specieId == -1) {
					askSpecie(msg);
				}
			} else {
				replyMessage(msg, say(msg, "error_char_ask_class_syntax"));
			}

		});
	} else {
		replyMessage(msg, say(msg, "error_no_class"));
	}
}
function listSpecie(msg) {
	var list = "";

	for (i in rp[msg.channel.id].species) {
		list = list + "\r\n - " + rp[msg.channel.id].species[i].name;
	}

	return list;
}
function askSpecie(msg) {
	// NOTE: Ask SPECIE
	if (rp[msg.channel.id].species !== null && rp[msg.channel.id].species.length > 0) {
		replyMessage(msg, say(msg, "char_ask_specie"));
		talk(msg, function(msg) {
			var foundSpecie = -1;
			for (i in rp[msg.channel.id].species) {
				if (msg.content.toLowerCase() == rp[msg.channel.id].species[i].name.toLowerCase()) {
					foundSpecie = i;
					break;
				}
			}
			if (foundSpecie>-1) {
				rp[msg.channel.id].chars[msg.author.id].specieId = foundSpecie;
				applySpecieAttrs(msg, foundSpecie);
				replyMessage(msg, say(msg, "char_ask_specie_success"));
			} else {
				replyMessage(msg, say(msg, "error_char_ask_specie_syntax"));
			}

		});
	} else {
		replyMessage(msg, say(msg, "error_no_specie"));
	}
}

function applySpecieAttrs(msg, specieId) {
	var char = rp[msg.channel.id].chars[msg.author.id];
	var specie = rp[msg.channel.id].species[specieId];
	if (specie.base != null) {
		char.ATK = specie.attrs.ATK | config.defaults.ATK;
		char.DEF = specie.attrs.DEF | config.defaults.DEF;
		char.VIT = specie.attrs.VIT | config.defaults.VIT;
		char.MGC = specie.attrs.MAG | config.defaults.MAG;
		char.AGI = specie.attrs.AGI | config.defaults.AGI;
		char.STR = specie.attrs.STR | config.defaults.STR;
	} else {
		char.ATK = config.defaults.ATK;
		char.DEF = config.defaults.DEF;
		char.VIT = config.defaults.VIT;
		char.MGC = config.defaults.MAG;
		char.AGI = config.defaults.AGI;
		char.STR = config.defaults.STR;
	}
}

function displayChar(msg) {
	var actChar = rp[msg.channel.id].chars[msg.author.id];
	if (actChar != null) {
		var actClass = rp[msg.channel.id].classes[actChar.classId];
		var actSpecie = rp[msg.channel.id].species[actChar.specieId];
		if (actClass != null && actSpecie != null) {
			replyMessage(msg, "**" + actChar.name + "**\r\n" +
				"*Class*: " + actClass.name + "\r\n\t*" + actClass.desc + "*\r\n" +
				"*Specie*: " + actSpecie.name + "\r\n\t*" + actSpecie.desc + "*");
			var inv = "";
			for (i in actChar.inventory) {
				var actObject = rp[msg.channel.id].objects[actChar.inventory[i].id];
				inv = inv + "\r\n - " + actObject.name;
				if (actChar.inventory[i].quantity != 1) {
					inv = inv + " (" + actChar.inventory[i].quantity + ")";
				}
			}
			if (actChar.inventory.length == 0) {
				inv = "\r\n\t*Empty*";
			}
			replyMessage(msg, "*Inventory:*" + inv);
		} else if (actChar.classId == -1 || actChar.specieId == -1) {
			replyMessage(msg, "*The class or the specie hasn't been initialised yet*: ```\r\nclass: " + (actChar.classId != -1) + "\r\nspecie: " + (actChar.specieId != -1) + "```")
		} else {
			replyMessage(msg, "*There isn't any classes or species yet, first create one using `RP admin class create` and assign it using `RP char class`*!");

		}
	} else {
		replyMessage(msg, "*I don't know you! First introduce you using `RP char create`*!");
	}
}
function displayInv(msg) {
	var actChar = rp[msg.channel.id].chars[msg.author.id];
	if (actChar.inventory != undefined && actChar.inventory.length != 0) {
		var string = "";
		for (item in actChar.inventory) {
			string = string + "\r\n - " + displayItem(msg, rp[msg.channel.id].objects[actChar.inventory[item].id]);
			if (actChar.inventory[item].quantity != 1) {
				string = string + " (" + actChar.inventory[item].quantity + "x)";
			}
		}
		replyMessage(msg, "*Your inventory*:```\r\n" + string + "```");
	} else {
		if (actChar.inventory == undefined) {
			actChar.inventory = [];
		}
		replyMessage(msg, "*Your inventory is empty!*");
	}
}
function displayItem(msg, item, desc = false) {
	var string = item.name;
	if (desc) {
		if (item.desc != undefined) {
			string = string + " (" + item.desc + ")";
		}
		if (item.class != undefined) {
			string = string + " [@" + item.class;
			if (item.subclass != undefined) {
				string = string + "/" + item.subclass;
			}
			string = string + "]";
		}
	}
	if (desc || item.name.length < 24) {
		var player = rp[msg.channel.id].chars[msg.author.id];
		var specie = rp[msg.channel.id].species[player.specieId];
		var holder_class = rp[msg.channel.id].classes[player.classId];
		var Titem = attrmgt.treat(item, specie, holder_class);
		var statsFound = 0;
		for (bs in config.baseStats) {
			if (Titem.stats[config.baseStats[bs]] != undefined) {
				var headChar = ",";
				if (statsFound++ == 0) {
					headChar = ";";
				}
				string = string + headChar + " " + config.baseStats[bs] + ": " + Titem.stats[config.baseStats[bs]];
			}
		}
	}
	return string;
}
function displayLevel(level, level_atop) {
	var height = level.length, width = level[0].length;
	var string = "";
	for (y = 0; y < height; y++) {
		string = string + "\r\n";

		if (y == 0) {
			// NOTE: First line
			string = string + border(1, 0, 0, 1);
			for (x = 0; x < width - 1; x++) {
				string = string + border(1, 0, 1, 0);
				string = string + border(1, 0, 1, 0);
				string = string + border(1, 0, 1, 0);
				string = string + border(1, 0, 1, 1);
			}
			string = string + border(1, 0, 1, 0);
			string = string + border(1, 0, 1, 0);
			string = string + border(1, 0, 1, 0);
			string = string + border(0, 0, 1, 1);
		}
		else {
			// NOTE: all the other in-between lines
			string = string + border(1, 1, 0, 1);
			for (x = 0; x < width - 1; x++) {
				string = string + border(1, 0, 1, 0);
				string = string + border(1, 0, 1, 0);
				string = string + border(1, 0, 1, 0);
				string = string + border(1, 1, 1, 1);
			}
			string = string + border(1, 0, 1, 0);
			string = string + border(1, 0, 1, 0);
			string = string + border(1, 0, 1, 0);
			string = string + border(0, 1, 1, 1);
		}

		string = string + "\r\n";

		for (x = 0; x < width; x++) {
			string = string + border(0, 1, 0, 1);
			string = string + " ";
			if (level[y][x].indexOf("stair") > -1) {
				if (level_atop != undefined && level_atop[y][x].indexOf("stair") > -1) {
					string = string + String.fromCharCode(0x2195);
				} else {
					string = string + String.fromCharCode(0x2193);
				}
			} else {
				if (level_atop != undefined && level_atop[y][x].indexOf("stair") > -1) {
					string = string + String.fromCharCode(0x2191);
				} else {
					string = string + " ";
				}
			}
			string = string + " ";
		}

		string = string + border(0, 1, 0, 1);
	}
	// Last line
	{
		// NOTE: The last border line
		string = string + "\r\n";
		string = string + border(1, 1, 0, 0);
		for (x = 0; x < width - 1; x++) {
			string = string + border(1, 0, 1, 0);
			string = string + border(1, 0, 1, 0);
			string = string + border(1, 0, 1, 0);
			string = string + border(1, 1, 1, 0);
		}
		string = string + border(1, 0, 1, 0);
		string = string + border(1, 0, 1, 0);
		string = string + border(1, 0, 1, 0);
		string = string + border(0, 1, 1, 0);
		return string;
	}
}

function border(R, T, L, B) {
	var disc = R + T*2 + L*4 + B*8;
	const chars = [-1, -1, -1, 10, -1, 0, 13, 25, -1, 4, 1, 16, 7, 22, 19, 28];
	if (chars[disc] == -1) {
		return " ";
	} else {
		return String.fromCharCode(0x2550+chars[disc]);
	}
}

function getObjectId(obj_list, name) {
	if (name.startsWith("#")) {
		return parseInt(name.slice(1));
	}
	var foundId = -1;
	for (i in obj_list) {
		if (obj_list[i].name == name) {
			foundId = i;
			break;
		}
	}
	return foundId;
}

function canCheat(msg) {
	if (rp[msg.channel.id].admins != undefined && rp[msg.channel.id].user_right_level != undefined)
	return rp[msg.channel.id].admins.indexOf(msg.author.id)>-1 || rp[msg.channel.id].user_rights_level >= 2;
	else return true;
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
	console.log("");
	setInterval(() => {
		//console.log("Saving RPs...");
		for (i in rp) {
			saveRP(rp[i]);
		}
	}, 30000);
});

bot.on("message", msg => {
	if (!msg.content.startsWith("l!")) {
		if (talking[msg.channel.id] != null) {
			if (msg.author.id == talking[msg.channel.id].id && talking[msg.channel.id].state) {
				logMessage(msg);
				talking[msg.channel.id].state = false;
				talking[msg.channel.id].trigger(msg);
			}
		}
	}

	if (msg.content.startsWith("l!")) {
		logMessage(msg);

		//Trims the message and separate the command
		const command = msg.content.slice(2, msg.length);
		const commandParts = msg.content.split(" ");
		if (command == "help") {
			replyMessage(msg, "*Hey there! Lookin' for some help?*\r\n" +
			"*There are some commands you may use* (note: type `l!` in front of each one):```\r\n" +
			"- help\r\n" +
			"- RP [\r\n" +
			"  > char [create / list / class / specie]\r\n" +
			"  > save\r\n" +
			"  > settings\r\n" +
			"	> admin [\r\n" +
			"		> class [create / list]\r\n" +
			"		> specie [create / list]\r\n" +
			"		> settings [*name*=*value]]\r\n" +
			"  > **RESET**\r\n" +
			"]```");
		}

		if (command.startsWith("RP") || command == "RP" || command.startsWith("rp") || command == "rp") {

			if (rp[msg.channel.id] == null || rp[msg.channel.id] == undefined) {
				// NOTE: Init RP if not done

				initRP(msg.channel, msg.author);

			}
			else {

				// NOTE: Character management
				if (commandParts[1] == "char") {

					if (commandParts[2] == "create") { // l!RP char create

						askChar(msg);
					} else if (commandParts[2] == "list") {

						var chars = "";
						for (i in rp[msg.channel.id].chars) {
							var actchar = rp[msg.channel.id].chars[i];
							chars = chars + "\r\n - " + actchar.name;
						}
						replyMessage(msg, "*Those are all the ones I've heard of* :"+chars);

					} else if (commandParts[2] == "class") {

						askClass(msg);

					} else if (commandParts[2] == "specie") {

						askSpecie(msg);

					} else if (commandParts[2] == null || commandParts[2].length == 0) {

						displayChar(msg);

					}

				}
				else if (commandParts[1] == "inv") {
					if (commandParts[2] == undefined || commandParts[2] == "list") {
						displayInv(msg);
					}
					else if (commandParts[2] == "desc") {
						var arg = splitCommand(command.slice(11, command.length));
						console.log(arg[0]);
						for (i in rp[msg.channel.id].objects) {
							if (arg[0] == rp[msg.channel.id].objects[i].name) {
								replyMessage(msg, displayItem(msg, rp[msg.channel.id].objects[i], true));
								break;
							}
						}
					}
					else if (commandParts[2] == "give" || commandParts[2] == "cgive" && canCheat(msg)) {
						if (commandParts[3] == "self" && canCheat(msg)) {
							var objectInfo = splitCommand(command.slice(17));
							var objectID = getObjectId(rp[msg.channel.id].objects, objectInfo[0]);
							if (objectId != -1) {
								rp[msg.channel.id].chars[msg.author.id].inventory.push({id: ObjectId, quantity: parseInt(objectInfo[1] | "1")});
								replyMessage(msg, "Successfully gave the item!");
							} else {
								replyMessage(msg, "I couldn't find the object you were looking for!");
							}
						} else if (commandParts[3].startsWith("<@")) {
							var player = commandParts[3].slice(2, commandParts[3].length - 1);
							if (rp[msg.channel.id].chars[player] != undefined) {
								var objectInfo = splitCommand(command.slice(34).trim());
								console.log(objectInfo[0]);
								objectInfo[1] = parseInt(objectInfo[1] | "1");
								var objectId = getObjectId(rp[msg.channel.id].objects, objectInfo[0]);
								if (objectId != -1) {
									var canGive = true;
									if (commandParts[2] != "cgive") {
										canGive = false;
										var actChar = rp[msg.channel.id].chars[msg.author.id];
										for (item in actChar.inventory) {
											if (actChar.inventory[item].id == objectId) {
												if (actChar.inventory[item].quantity < objectInfo[1]) {
													actChar.inventory[item].quantity -= objectInfo[1];
													canGive = true;
												} else if (actChar.inventory[item].quantity == objectInfo[1]) {
													actChar.inventory.splice(item);
													canGive = true;
												}
												break;
											}
										}
									}
									if (canGive) {
										rp[msg.channel.id].chars[player].inventory.push({id: objectId, quantity: objectInfo[1]});
										replyMessage(msg, "Successully gave item to " + rp[msg.channel.id].chars[player].name + "!");
									} else {
										replyMessage(msg, "You don't have enough of this item to give!");
									}
								} else {
									replyMessage(msg, "I couldn't find the object you were looking for!");
								}
							} else {
								replyMessage(msg, "The player doesn't have an in-game character!");
							}
						}
					}
				}
				else if (commandParts[1] == "save") {
					/* NOTE: Save the game */

					saveRP(msg.channel.id);
					replyMessage(msg, "*I'll try to remember your tale, young adventurer!*");

				}
				else if (commandParts[1] == "admin" && canCheat(msg)) {

					if (commandParts[2] == "settings") {
						if (msg.content.length>19) {

							var setting = msg.content.slice(19, msg.content.length).split("=");

							if (rp[msg.channel.id][setting[0]] !== null || printableSettings.indexOf(setting[0]) >= 0) {
								if (setting[1]=="true") {

									setting[1] = true;

								} else if (setting[1]=="false") {

									setting[2] = false;

								}
								if (Array.isArray(rp[msg.channel.id][setting[0]])) {

									setting[2] = setting[2].slice(",");

								}
								rp[msg.channel.id][setting[0]] = setting[1];

							}

						} else {
							// Print active settings

							var string = "";
							for (i in config.printableSettings) {
								string = string + "\r\n" + config.printableSettings[i] + ": " + rp[msg.channel.id][config.printableSettings[i]];
							}
							replyMessage(msg, "```" + string + "```");

						}
					}
					else if (commandParts[2] == "**RESET**") {
						// NOTE: WARNING: RESET

						replyMessage(msg, "**Are you really sure? If yes, type \*\*YES\*\* (With the asterisks). Every data will be lost!");
						talk(msg, msg => {
							if (msg.content=="**YES**") {

								replyMessage(msg, "**Erasing data...**");
								rp[msg.channel.id] = null;
								replyMessage(msg, "**All data have been erased**. *You can initialise the RP at any time using `l!RP`*!");

							}
						});

					}
					else if (commandParts[2] == "DEBUG") {
						// TODO: Remove

						var string = "";

						rp[msg.channel.id].dungeon = [Level.new(4, 4, 0, 2, 1)];

						string = displayLevel(rp[msg.channel.id].dungeon[0]);

						replyMessage(msg, "```\r\n" + string + "```");

						//console.log(CircularJSON.stringify(rp[msg.channel.id]));

					}
					else if (commandParts[2] == "specie" || commandParts[2] == "class" || commandParts[2] == "object") {

						actSetting = rp[msg.channel.id][config.settingList[commandParts[2]]];
						if (commandParts[3] == "create") {

							if (commandParts[2] == "object") {

								replyMessage(msg, "Adding the " + commandParts[2] + ", please input the `name`, the `desc`, `class` and `subclass`");

							} else {

							replyMessage(msg, "Adding the " + commandParts[2] + ", please input the `name` and the `desc`");

							}
							var talk_obj = talk(msg, msg => {
								var actSetting = getTalking(msg).actSetting;
								var command = splitCommand(msg.content);
								if (commandParts[2] == "object") {

									actSetting.push({name: command[0], desc: command[1], class: command[2], subclass: command[3], attrs: []});

								} else {

									actSetting.push({name: command[0], desc: command[1], attrs: []});

								}
								replyMessage(msg, "Successfully added the " + commandParts[2] + " "+command[0]);
							});

							talk_obj.actSetting = actSetting;

						}
						else if (commandParts[3] == "edit") {
							// NOTE: Edit an element

							replyMessage(msg, "Modifiying a " + commandParts[2] + ", input the old `name`, the new `name` and `desc`");
							var talk_obj = talk(msg, msg => {
								var actSetting = getTalking(msg).actSetting;
								console.log(CircularJSON.stringify(actSetting));
								var command = splitCommand(msg.content);
								for (i in actSetting) {
									if (command[0]==actSetting[i].name) {

										actSetting[i].name = command[1];
										actSetting[i].desc = command[2];
										if (commandParts[2] == "object") {

											actSetting[i].class = command[3];
											actSetting[i].subclass = command[4];

										}

									}
								}
								replyMessage(msg, "Successfully modified the " + commandParts[2] + " "+command[0]);
							});

							talk_obj.actSetting = actSetting;

						}
						else if (commandParts[3] == "list") {
							// NOTE: List elements w/ or w/o their attrs
							// TODO: Separate in multiple messages
							var string = "";
							for (i in actSetting) {
								string = string + "\r\n" + actSetting[i].name + ": *" + actSetting[i].desc + "*";
								if (commandParts[2] == "object") {

									string = string + "; @" + actSetting[i].class + "/" + actSetting[i].subclass;

								}
								if (commandParts[4] == "attrs") {

									string = string + "\r\n\t*attrs*:```";
									for (j in actSetting[i].attrs) {
										string = string + "\r\n[" + j + "] " + actSetting[i].attrs[j].name;
										for (k in actSetting[i].attrs[j].values) {
											string = string + " " + actSetting[i].attrs[j].values[k];
										}
									}
									string = string + " ```";

								}
							}
							replyMessage(msg, string);

						}
						else if (commandParts[3] == "remove") {

							for (i in actSetting) {
								if (commandParts[4] == rp[msg.channel.id].species[i].name) {

									actSetting.splice(i, 1);
									replyMessage(msg, "Removed " + commandParts[2] + " " + commandParts[4]);
									break;

								}
							}
						}
						else if (commandParts[3] == "attrs") {
							// TODO: fix that stuff, especially the "everything's alright" verification
							// TODO: add isNaN everywhere it needs it
							// TODO: add object_found everywhere it needs it
							if (commandParts[4] == "create") {

								replyMessage(msg, "Please input the `" + commandParts[2] + "`, the `name` and the `value`s");
								var talk_obj = talk(msg, msg => {
									var actSetting = getTalking(msg).actSetting;
									var command = splitCommand(msg.content);
									var found = false;
									for (i in actSetting) {
										if (actSetting[i].name == command[0]) {
											if (actSetting[i].attrs == null || actSetting[i].attrs == undefined) {
												actSetting[i].attrs = [];
											}
											actSetting[i].attrs.push({"name": command[1], "values": command.slice(2)});
											replyMessage(msg, "Successfully added the `" + command[1] + "` to the `" + command[0] + "` " + commandParts[2] + "!");
											found = true;
											break;

										}
									}
									if (!found)
									replyMessage(msg, "Could't find the target to link the attribute!");
								});

								talk_obj.actSetting = actSetting;

							}
							else if (commandParts[4] == "edit") {

								replyMessage(msg, "Please input the `" + commandParts[2] + "`, the `id`, the `name` and the `value`s");

								var talk_obj = talk(msg, msg => {
									var actSetting = getTalking(msg).actSetting;
									var command = splitCommand(msg.content);
									for (i in actSetting) {
										if (actSetting[i].name == command[0]) {

											var specie = actSetting[i];
											var ID = parseInt(command[1]);
											if (ID != null && !isNaN(ID)) {

												specie.attrs[ID] = {"name": command[2], "values": command.slice(3)};
												replyMessage(msg, "Successfully modified the attribute [" + command[1] + "] to the `" + command[0] + "` " + commandParts[2] + "!");

											} else {

												replyMessage(msg, "Couldn't read the ID, aborting!");

											}
										}
									}
								});

								talk_obj.actSetting = actSetting;
							}
							else if (commandParts[4] == "remove") {
								replyMessage(msg, "Please in the `" + commandParts[2] + "` and the `id`");
								var talk_obj = talk(msg, msg => {
									var actSetting = getTalking(msg).actSetting;
									var command = splitCommand(msg.content);
									for (i in actSetting) {
										if (actSetting[i].name == command[0]) {
											var ID = parseInt(command[1]);
											if (ID != null && !isNaN(ID)) {
												actSetting[i].attrs.splice(ID);
												replyMessage(msg, "Successfully removed the attr [" + ID + "] from " + command[0]);
											} else {
												replyMessage(msg, "Couldn't read the ID, aborting!");
											}
											break;
										}
									}
								});
								talk_obj.actSetting = actSetting;
							}
						}
					}
				}
			}
		}
	}
});

console.log("Reading config.json ...");

fs.readFile("./config.json", (err, data) => {
	// Read data.json
	if (err) {
		console.log("Error while reading the config.json file, be sure to have it with the right name and with the right permissions!");
		throw err;
	}
	console.log("Successfully read config.json, parsing its data ...");
	// Success; Parse data.json
	config = JSON.parse(data.toString());
	console.log("Successfully parsed config data, logging in with the token ...");
	// Login with the token provided by data.json

	loadRP();

	onLoadedTime = new Date().getTime();

	bot.login(config.token);
});

console.log("Initialising attrmgt ...");
var attrmgt = attrmgtR.init();
