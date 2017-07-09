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
var onLoginTime, onLoadedTime, problems = 0;

const fs = require("fs");
const Discord = require("discord.js");
const CircularJSON = require("circular-json");
const attrmgtR = require("./attrmgt");
const reqs = {
	has_char: 1,
	has_class: 2,
	has_specie: 4,
	are_classes: 8,
	are_species: 16,
	are_mobs: 32,
	are_objects: 64,
	is_room: 128
};


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
		this.difficulty = config.defaults.difficulty;
		return this;
	},
	set_char: function(rp, id, name) {
		rp.chars[id] = {
			name: name,
			classId: -1,
			specieId: -1,
			inventory: [],
			xp: 0,
			lvl: 1
		};
		rp.chars[id].ATK = config.defaults.ATK;
		rp.chars[id].DEF = config.defaults.DEF;
		rp.chars[id].VIT = config.defaults.VIT;
		rp.chars[id].MGC = config.defaults.MGC;
		rp.chars[id].AGI = config.defaults.AGI;
		rp.chars[id].STR = config.defaults.STR;
		rp.chars[id].HP = config.defaults.HP;
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




function _require(msg, requirements = 0) {
	if ((requirements & reqs.has_char) == reqs.has_char) {
		// User has character
		if (rp[msg.channel.id].chars[msg.author.id] === undefined) {
			replyMessage(msg, say(msg, "error_no_char"));
			return false;
		}
	}
	if ((requirements & reqs.has_class) == reqs.has_class) {
		// User has class
		var user = rp[msg.channel.id].chars[msg.author.id];
		if (user.classId == -1 || user.classId === undefined) {
			replyMessage(msg, say(msg, "error_char_no_class"));
			return false;
		}
	}
	if ((requirements & reqs.has_specie) == reqs.has_specie) {
		// User has specie
		var user = rp[msg.channel.id].chars[msg.author.id];
		if (user.specieId == -1 || user.specieId === undefined) {
			replyMessage(msg, say(msg, "error_char_no_specie"));
			return false;
		}
	}
	if ((requirements & reqs.are_classes) == reqs.are_classes) {
		// Are there classes
		if (rp[msg.channel.id].classes === undefined || (rp[msg.channel.id].classes || []).length == 0) {
			replyMessage(msg, say(msg, "error_no_class"));
			return false;
		}
	}
	if ((requirements & reqs.are_species) == reqs.are_species) {
		// Are there species
		if (rp[msg.channel.id].species === undefined || (rp[msg.channel.id].species || []).length == 0) {
			replyMessage(msg, say(msg, "error_no_specie"));
			return false;
		}
	}
	if ((requirements & reqs.are_mobs) == reqs.are_mobs) {
		// Are there mobs
		if (rp[msg.channel.id].mobs === undefined || (rp[msg.channel.id].mobs || []).length == 0) {
			replyMessage(msg, say(msg, "error_no_mob"));
			return false;
		}
	}
	if ((requirements & reqs.are_objects) == reqs.are_objects) {
		// Are there objects
		if (rp[msg.channel.id].objects === undefined || (rp[msg.channel.id].objects || []).length == 0) {
			replyMessage(msg, say(msg, "error_no_object"));
			return false;
		}
	}
	if ((requirements & reqs.has_class) == reqs.has_class && (requirements & reqs.are_classes) == reqs.are_classes) {
		// User has *valid* class
		if (rp[msg.channel.id].classes[rp[msg.channel.id].chars[msg.author.id].classId] === undefined) {
			replyMessage(msg, say(msg, "error_char_class_invalid"));
			return false;
		}
	}
	if ((requirements & reqs.has_specie) == reqs.has_specie && (requirements & reqs.are_species) == reqs.are_species) {
		// User has *valid* specie
		if (rp[msg.channel.id].species[rp[msg.channel.id].chars[msg.author.id].specieId] === undefined) {
			replyMessage(msg, say(msg, "error_char_specie_invalid"));
			return false;
		}
	}
	if ((requirements & reqs.is_room) === reqs.is_room) {
		if (rp[msg.channel.id].room === undefined) {
			replyMessage(msg, say(msg, "error_no_room"));
			return false;
		}
	}


	return true;
}

function splitCommand(str) {
	return [].concat.apply([], str.split('"').map(function(v,i){
	   return i%2 ? v : v.split(' ')
	})).filter(Boolean);
}

function random(a, b) {
	return Math.random() * (b-a) + a;
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

function createRoom(msg) {
	var difficulty = rp[msg.channel.id].difficulty;
	var room = {
		entities: [],
		items: []
	};
	var mobCount = random(Math.sqrt(difficulty), difficulty);
	for (i = 0; i < mobCount; i++) {
		var found = false;
		for (j = 0; j < 5 && !found; j++) {
			var n = Math.floor(Math.random() * rp[msg.channel.id].mobs.length);
			var mob = rp[msg.channel.id].mobs[n];
			if (mob.difficulty <= difficulty) {
				room.entities.push({id: n, HP: rp[msg.channel.id].mobs[n].HP, MP: rp[msg.channel.id].mobs[n].MP});
				found = true;
			}
		}
	}
	return room;
}

function hit(msg, someone) {
	if (someone.inv != undefined && someone.inv != null) {
		if (someone.inv.length > 0 && someone.holding > -1) {

		}
	}
	// (else)
	var s_t = attrmgt.treat(someone, rp[msg.channel.id].species[someone.specieId | -1], rp[msg.channel.id].classes[someone.classId | -1]);
	return s_t.stats["ATK"];
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
				data = fs.readFileSync("./"+config.rpdir+"/"+items[i])
				if (data == null || data == undefined) {
					console.log("Error while reading "+config.rpdir+"/"+items[i]+", skipping!");
				} else {
					var chan = CircularJSON.parse(data.toString());
					for (x in chan.chars) {
						if (chan.chars[x].HP === undefined) {
							chan.chars[x].HP = config.defaults.HP;
							console.log(items[i] + ": char(" + x + ").HP");
							problems++;
						}
						if (chan.chars[x].holding === undefined) {
							chan.chars[x].holding = -1;
							console.log(items[i] + ": char(" + x + ").holding");
							problems++;
						}
						if (chan.chars[x].xp === undefined || chan.chars[x].lvl === undefined) {
							chan.chars[x].xp = 0;
							chan.chars[x].lvl = 1;
							console.log(items[i] + ": char(" + x + ").xp");
							problems++;
						}
					}
					if (chan.mobs === undefined) {
						chan.mobs = [config.defaults.mob];
						console.log(items[i] + ": mobs");
						problems++;
					}
					if (chan.difficulty === undefined) {
						chan.difficulty = config.defaults.difficulty;
						console.log(items[i] + ": difficulty");
						problems++;
					}
					rp[chan.id] = chan;

				}
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
	if (_require(msg, reqs.are_classes)) {


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
	if (_require(msg, reqs.are_species)) {
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
	}
}

function applySpecieAttrs(msg, specieId) {
	if (_require(msg, reqs.has_char | reqs.are_species)) {
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
}

function displayChar(msg) {
	if (_require(msg, reqs.has_char | reqs.has_specie | reqs.has_class | reqs.are_classes | reqs.are_species)) {
		var actChar = rp[msg.channel.id].chars[msg.author.id];
		var embed = {color: config.colors.player,
			author: {name: actChar.name, icon_url: msg.author.avatarURL},
			fields: []};
		var actClass = rp[msg.channel.id].classes[actChar.classId];
		var actSpecie = rp[msg.channel.id].species[actChar.specieId];
		embed.fields.push({name: ("Class: " + actClass.name), value: actClass.desc});
		embed.fields.push({name: ("Specie: " + actSpecie.name), value: actSpecie.desc});
		var n = 0, stats = "";
		for (stat in config.baseStats) {
			n++;
			stats = stats + "**" + config.baseStats[stat] + "**: " + Math.round(actChar[config.baseStats[stat]]*10)/10 + "\t";
			if (n%3 == 0) {
				stats = stats + "\r\n";
			}
		}
		embed.fields.push({name: "Statistics", value: stats});
		var lxp = actChar.lvl * actChar.lvl * 100;
		embed.fields.push({name: "Level " + actChar.lvl, value: "xp: " + actChar.xp + "/" + lxp});
		replyMessage(msg, {embed: embed});
	}
}

function displayInv(msg) {
	if (_require(msg, reqs.has_char | reqs.are_objects)) {
		var actChar = rp[msg.channel.id].chars[msg.author.id];
		var embed = {
			color: config.colors.player,
			author: {name: actChar.name + "'s inventory'", icon_url: msg.author.avatarURL},
			fields: []
		};

		if (actChar.inventory != undefined && actChar.inventory.length != 0) {
			var string = "";
			for (item in actChar.inventory) {
				string = string + "\r\n" + displayItem(msg, rp[msg.channel.id].objects[actChar.inventory[item].id]);
				if (actChar.inventory[item].quantity != 1) {
					string = string + " (" + actChar.inventory[item].quantity + "x)";
				}
			}
			embed.fields.push({name: "Inventory", value: string});
		} else {
			if (actChar.inventory == undefined) {
				actChar.inventory = [];
			}
			embed.fields.push({name: "Inventory", value: "*Empty*"});
		}
		if (actChar.holding == -1) {
			embed.fields.push({name: "Holding", value: "*Nothing*"});
		} else {
			embed.fields.push({name: "Holding", value: displayItem(msg, rp[msg.channel.id].objects[actChar.holding])});
		}
		replyMessage(msg, {embed: embed});
	}
}
function displayItem(msg, item, desc = false) {
	// TODO: remove msg
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

function displayRoom(msg) {
	if (_require(msg, reqs.is_room | reqs.are_mobs | reqs.are_objects)) {
		var actRoom = rp[msg.channel.id].room;
		var embed = {
			color: config.colors.dungeon,
			title: "Room",
			fields: []
		};
		var string = "";
		if (actRoom.entities !== undefined) {
			if (actRoom.entities.length > 0) {
				for (i in actRoom.entities) {
					var parent = rp[msg.channel.id].mobs[actRoom.entities[i].id];
					string = string + parent.name;
					if (parent.HP != undefined) string = string + " (" + (actRoom.entities[i].HP | "Error") + "/" + parent.HP + ")";
					if (actRoom.entities[i].holding != -1 && actRoom.entities[i].holding != undefined) {
						var item = rp[msg.channel.id].items[actRoom.entities[i]];
						if (item != undefined) string = string + "[" + item.name + "]";
					}
					string = string + "\r\n";
				}
			}
			else {
				string = string + "*Nobody's here* D:";
			}
		}
		else {
			string = string + "*Nobody's here* D:";
		}
		embed.fields.push({name: "Entities", value: string});
		replyMessage(msg, {embed: embed});
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
	console.log(" - errors found: " + problems);
	console.log("");
	setInterval(() => {
		//console.log("Saving RPs...");
		for (i in rp) {
			saveRP(i);
		}
	}, 30000);
});

bot.on("message", msg => {
	try {
		treatMsg(msg);
	}
	catch (err) {
		replyMessage(msg, {embed: {
			color: 0x85171e,
			title: err.name,
			description: err.message
		}});
		console.log(err);
	}
});
function treatMsg(msg) {
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
			"	> char [create / list / class / specie]\r\n" +
			"	> save\r\n" +
			"	> settings\r\n" +
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
			else if (rp[msg.channel.id].id != msg.channel.id) {
				replyMessage(msg, "There was an error in the configuration!");
				initRP(msg.channel, msg.author);
			}
			else {

				// NOTE: Character management
				if (commandParts[1] == "char") {

					if (commandParts[2] == "create") {
						// l!RP char create

						askChar(msg);
					}
					else if (commandParts[2] == "list") {

						var chars = "";
						for (i in rp[msg.channel.id].chars) {
							var actchar = rp[msg.channel.id].chars[i];
							chars = chars + "\r\n - " + actchar.name;
						}
						replyMessage(msg, "*Those are all the ones I've heard of* :"+chars);

					}
					else if (commandParts[2] == "class") {

						askClass(msg);

					}
					else if (commandParts[2] == "specie") {

						askSpecie(msg);

					}
					else if (commandParts[2] == null || commandParts[2].length == 0) {

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
							var objectId = getObjectId(rp[msg.channel.id].objects, objectInfo[0]);
							if (objectId != -1) {
								rp[msg.channel.id].chars[msg.author.id].inventory.push({id: objectId, quantity: parseInt(objectInfo[1] | "1")});
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
					else if (commandParts[2] == "hold") {
						if (commandParts[3] != undefined) {
							var objectInfo = splitCommand(command.slice(11).trim());

							var objectId = getObjectId(rp[msg.channel.id].objects, objectInfo[0]);
							if (objectId != -1) {
								var actChar = rp[msg.channel.id].chars[msg.author.id];
								var objectFound = false;
								for (item in actChar.inventory) {
									if (actChar.inventory[item].id == objectId) {
										if (actChar.holding != -1 && actChar.holding != undefined)
											actChar.inventory.push({id: actChar.holding, quantity: 1});
										actChar.holding = objectId;
										actChar.inventory.splice(item, 1);
										replyMessage(msg, "Successfully equiped the item "+commandParts[3]);
										objectFound = true;
										break;
									}
								}
								if (!objectFound)
									replyMessage(msg, "You don't have the item!");
							} else {
								replyMessage(msg, "Item not found!");
							}
						}
					}
				}
				else if (commandParts[1] == "room") {
					if (commandParts[2] == undefined) {
						displayRoom(msg);
					}
					else if (commandParts[2] == "next") {
						if (_require(msg, reqs.is_room | reqs.are_mobs)) {
							if (rp[msg.channel.id].room.entities.length == 0) {
								rp[msg.channel.id].room = createRoom(msg);
								replyMessage(msg, "Moved to the next room!");
								displayRoom(msg);
							}
							else {
								replyMessage(msg, "Not every mob has been killed!");
							}
						}
					}
					else if (commandParts[2] == "init") {
						if (rp[msg.channel.id].room == undefined) {
							rp[msg.channel.id].room = createRoom(msg);
							displayRoom(msg);
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

							var setting = msg.content.slice(20, msg.content.length).split("=");

							if (rp[msg.channel.id][setting[0]] !== null || printableSettings.indexOf(setting[0]) >= 0) {
								if (setting[1]=="true") {

									setting[1] = true;

								} else if (setting[1]=="false") {

									setting[1] = false;

								}
								if (Array.isArray(rp[msg.channel.id][setting[0]])) {

									setting[1] = setting[1].split(",");

								}
								if (setting[1].startsWith("_")) {
									setting[1] = parseFloat(setting[1].slice(1));
								}
								console.log(setting[0] + ": "+ setting[1]);
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

						//rp[msg.channel.id].mobs = [config.defaults.mob];
						rp[msg.channel.id].room = createRoom(msg);

						/*rp[msg.channel.id].dungeon = [Level.new(4, 4, 0, 2, 1)];
						rp[msg.channel.id].position

						string = displayLevel(rp[msg.channel.id].dungeon[0]);*/

						string = CircularJSON.stringify(rp[msg.channel.id].room);

						//string = string + "\r\n ATK: " + hit(msg, rp[msg.channel.id].mobs[0]);

						replyMessage(msg, "```\r\n" + string + "```");



					}
					else if (config.settingList[commandParts[2]] != undefined) {

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
								//console.log(CircularJSON.stringify(actSetting));
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
								replyMessage(msg, "Successfully modified "+command[0]);
							});

							talk_obj.actSetting = actSetting;

						}
						else if (commandParts[3] == "list") {
							// NOTE: List elements w/ or w/o their attrs
							// TODO: Separate in multiple messages
							var embed = {
								color: config.colors.admin,
								title: ("List of " + commandParts[2]),
								fields: []
							};
							for (i in actSetting) {
								var string = "";
								string = string + "*" + actSetting[i].desc + "*";
								if (commandParts[2] == "object") {
									//Display the class and the subclass for objects
									string = string + "; @" + actSetting[i].class + "/" + actSetting[i].subclass;
								}
								if (commandParts[2] == "mob") {
									//Display the HP, ATK and so on...
									for (j in config.mobStats) {
										if (actSetting[i][config.mobStats[j]] != undefined) {
											string = string + "\r\n" + config.mobStats[j] +": " + actSetting[i][config.mobStats[j]];
										}
									}
								}
								if (commandParts[4] == "attrs") {
									string = string + "\r\n```json";
									for (j in actSetting[i].attrs) {
										string = string + "\r\n[" + j + "] " + actSetting[i].attrs[j].name;
										for (k in actSetting[i].attrs[j].values) {
											string = string + " " + actSetting[i].attrs[j].values[k];
										}
									}
									string = string + " ```";

								}
								embed.fields.push({name: actSetting[i].name, value: string});
							}
							replyMessage(msg, {embed: embed});

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
						else if (commandParts[3] == "set") {
							replyMessage(msg, "Modifying a " + commandParts[2] + ", input the `name`, the value `name` and its `content`");
							var talk_obj = talk(msg, msg => {
								var actSetting = getTalking(msg).actSetting;
								var command = splitCommand(msg.content);
								if (config.mobStats.indexOf(command[1]) > -1) {
									for (i in actSetting) {
										if (command[0]==actSetting[i].name) {
											actSetting[i][command[1]] = parseFloat(command[2]);
											replyMessage(msg, "Successfully modified / added the value `" + command[1] + "` of " + command[0]);
										}
									}
								}
							});
							talk_obj.actSetting = actSetting;
						}
					}
					else if (commandParts[2] == "summon") {
						var name = splitCommand(command.slice(15).trim())[0];
						var mobId = getObjectId(rp[msg.channel.id].mobs, name);
						if (mobId != -1) {
							var mob = rp[msg.channel.id].mobs[mobId];
							var actRoom = rp[msg.channel.id].room;
							actRoom.entities.push({id: mobId, HP: mob.HP});
							replyMessage(msg, "Successfully summoned the mob " + name + "!");
						}
						else {
							replyMessage(msg, "I couldn't find the mob you were looking for!");
						}
					}
					else if (commandParts[2] == "kill") {
						var name = splitCommand(command.slice(13).trim())[0];
						var mobId = getObjectId(rp[msg.channel.id].mobs, name);
						if (mobId != -1) {
							var mob = rp[msg.channel.id].mobs[mobId];
							var actRoom = rp[msg.channel.id].room;
							actRoom.entities.splice(mobId, 1);
							replyMessage(msg, "Successfully killed the mob " + name + "!");
						}
					}
					else {
						replyMessage(msg, "I couldn't find the mob you were looking for!");
					}
				}
				else if (commandParts[1] == "attack" || commandParts[1] == "atk") {
					if (_require(msg, reqs.has_char | reqs.has_class | reqs.has_specie | reqs.are_classes | reqs.are_species | reqs.are_objects | reqs.are_mobs | reqs.is_room)) {
						// TODO: separate the player => mob and the mob => player, to make ALL the mob attack
						var actRoom = rp[msg.channel.id].room;
						var targetId = Math.floor(random(0, actRoom.entities.length));
						if (commandParts[2] != undefined) {
							targetId = getObjectId(actRoom.entities, commandParts[2]);
						}
						if (targetId != -1) {
							var player_raw = rp[msg.channel.id].chars[msg.author.id];
							var player = {};
							player.item = attrmgt.treat(rp[msg.channel.id].objects[player_raw.holding], rp[msg.channel.id].species[player_raw.specieId | -1], rp[msg.channel.id].classes[player_raw.classId | -1]);
							player.ATK = (player.item.stats.ATK || 0) + (player_raw.ATK || 0);
							player.DEF = (player.item.stats.DEF || 0) + (player_raw.DEF || 0);
							//console.log(CircularJSON.stringify(player));
							var mob_impl = actRoom.entities[targetId];
							var mob_raw = rp[msg.channel.id].mobs[mob_impl.id];
							var mob = {};
							mob.item = attrmgt.treat(rp[msg.channel.id].objects[mob_raw.holding], rp[msg.channel.id].species[mob_raw.specieId | -1], rp[msg.channel.id].classes[mob_raw.classId | -1]);
							mob.ATK = (mob.item.stats.ATK || 0) + (mob_raw.ATK || 0);
							mob.DEF = (mob.item.stats.DEF || 0) + (mob_raw.DEF || 0);
							//console.log(CircularJSON.stringify(mob));
							var PtMdmg = (player.ATK) / (0.01 * mob.DEF * mob.DEF + 1);
							var MtPdmg = (mob.ATK) / (0.01 * player.DEF * player.DEF + 1);

							mob_impl.HP -= PtMdmg;

							if (mob_impl.HP <= 0) {
								// Give the xp to the player
								var xp_togive = mob_impl.difficulty * mob_raw.HP
								replyMessage(msg, "You killed " + mob_raw.name + " with " + Math.round(PtMdmg*10)/10 + " of damage!");
								actRoom.entities.splice(targetId, 1);
							} else {
								replyMessage(msg, "You hit " + mob_raw.name + " with " + Math.round(PtMdmg*10)/10 + " of damage. " + Math.round(mob_impl.HP*10)/10  + " HP left.");
								player_raw.HP -= MtPdmg;

								if (player_raw.HP <= 0) {
									// TODO: le reste ici
									replyMessage(msg, "You took " + Math.round(MtPdmg*10)/10 + " and YOU DIED. But idk what death is, so I'm gonna give you your health back!");
									player_raw.HP = 20;
								} else {
									replyMessage(msg, "You took " + Math.round(MtPdmg*10)/10 + " of damage from " + mob_raw.name + ". " + Math.round(player_raw.HP*10)/10 + " HP left.");
								}
							}
						} else {
							replyMessage(msg, say(msg, "error_mob_name_syntax"));
						}
					}
				}
			}
		}
	}
}

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
		console.error("Caught that exception just before our death, Sir: ", err);
	}
}

process.on("exit", exitHandler.bind(null, {exit: true}));
process.on("SIGINT", exitHandler.bind(null, {}));
process.on("uncaughtException", exitHandler.bind(null, {exception: true}));
