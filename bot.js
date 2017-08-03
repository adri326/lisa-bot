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
const attrmgt = require("./attrmgt");
const inv = require("./inv");
const io = require("./io");
const specie = require("./specie");
const combat = require("./combat");
const presets_mod = require("./presets");

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
	are_mobs_in_room: 256
};


bot = new Discord.Client();
talking = [{
	state: false,
	id: 0,
	trigger: function(msg) {}
}];
rp = [];
presets = [];

RP = {
	new: function(id, creator) {
		this.creator = creator.id;
		this.id = id;
		this.chars = {};
		this.classes = [config.defaults.class];
		this.species = [config.defaults.specie];
		this.objects = [config.defaults.object];
		Object.assign(this, config.printableSettings); // Include all the printableSettings set in config.json
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

Level = {
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







function initRP(channel, creator) {
	channel.send(config.lang[lang].init_alert);
	rp[channel.id] = RP.new(channel.id, creator);
	channel.send(config.lang[lang].init_success);
}

function createRoom(msg) {
	var difficulty = rp[msg.channel].difficulty;
	var room = {
		entities: [],
		items: []
	};
	var mobCount = utils.random(Math.sqrt(difficulty), difficulty);
	for (i = 0; i < mobCount; i++) {
		var found = false;
		for (j = 0; j < 5 && !found; j++) {
			var n = Math.floor(Math.random() * rp[msg.channel].mobs.length);
			var mob = rp[msg.channel].mobs[n];
			if (mob.difficulty <= difficulty) {
				var HP = 0;
				if (Array.isArray(rp[msg.channel].mobs[n].HP)) {
					if (rp[msg.channel].mobs[n].HP.length == 2)
						HP = utils.random(rp[msg.channel].mobs[n].HP[0], rp[msg.channel].mobs[n].HP[1]);
					else {
						HP = rp[msg.channel].mobs[n].HP[0];
					}
				} else {
					HP = rp[msg.channel].mobs[n].HP;
				}
				room.entities.push({id: n, HP: HP, MP: rp[msg.channel].mobs[n].MP, holding: utils.getObjectID(rp[msg.channel].objects, rp[msg.channel].mobs[n].holding)});
				found = true;
			}
		}
	}
	return room;
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
});

bot.on("message", msg => {
	try {
		var message_split = msg.content.split("\n");
		for (msg_index in message_split) {
			const msg_t = {
				content: message_split[msg_index],
				author: msg.author.id,
				author_username: msg.author.username,
				author_discriminator: msg.author.discriminator,
				channel: msg.channel.id,
				guild: msg.channel.guild.id
			};
			treatMsg(msg_t);
		}
	}
	catch (err) {
		utils.replyMessage(msg, {embed: {
			color: 0x85171e,
			title: err.name,
			description: err.message
		}});
		console.log(err);
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

		if (command.startsWith("admin")) {
			if (msg.author == config.admin) {
				if (commandParts[1] == "reload") {
					if (commandParts[2] == "presets") {
						console.log("Reloading presets...");
						presets_mod.loadPresets();
						utils.replyMessage(msg, "Reloaded presets!");
					}
				}
			}
		}

		if (command.startsWith("RP") || command == "RP" || command.startsWith("rp") || command == "rp") {

			if (rp[msg.channel] == null || rp[msg.channel] == undefined) {
				// NOTE: Init RP if not done
				initRP(msg.channel, msg.author);

			}
			else if (rp[msg.channel].id != msg.channel) {
				utils.replyMessage(msg, "There was an error in the configuration!");
				initRP(msg.channel, msg.author);
			}
			else {

				var turn_amount;
				if (rp[msg.channel].turn_type == 0) {
					turn_amount = 0;
				}

				// NOTE: Character management
				if (commandParts[1] == "char") {

					if (commandParts[2] == "create") {
						// l!RP char create

						io.askChar(msg);
					}
					else if (commandParts[2] == "list") {

						var chars = "";
						for (i in rp[msg.channel].chars) {
							var actchar = rp[msg.channel].chars[i];
							chars = chars + "\r\n - " + actchar.name;
						}
						utils.replyMessage(msg, "*Those are all the ones I've heard of* :"+chars);

					}
					else if (commandParts[2] == "class") {

						io.askClass(msg);

					}
					else if (commandParts[2] == "specie") {

						io.askSpecie(msg);

					}
					else if (commandParts[2] == null || commandParts[2].length == 0) {

						io.displayChar(msg);

					}

				}
				else if (commandParts[1] == "inv") {
					if (commandParts[2] == undefined || commandParts[2] == "list") {
						io.displayInv(msg);
					}
					else if (commandParts[2] == "desc") {
						var arg = utils.splitCommand(command.slice(11, command.length));
						//console.log(arg[0]);
						for (i in rp[msg.channel].objects) {
							if (arg[0] == rp[msg.channel].objects[i].name) {
								utils.replyMessage(msg, io.displayItem(msg, rp[msg.channel].objects[i], true));
								break;
							}
						}
					}
					else if (commandParts[2] == "give" || commandParts[2] == "cgive" && canCheat(msg)) {
						turn_amount += combat.action_time("give_cheat");
						if (commandParts[3] == "self" && canCheat(msg)) {
							var objectInfo = utils.splitCommand(command.slice(17));
							var objectId = utils.getObjectID(rp[msg.channel].objects, objectInfo[0]);
							if (objectId != -1) {
								rp[msg.channel].chars[msg.author].inventory.push({id: objectId, quantity: parseInt(objectInfo[1] | "1")});
								utils.replyMessage(msg, "Successfully gave the item!");
							} else {
								utils.replyMessage(msg, "I couldn't find the object you were looking for!");
							}
						} else if (commandParts[3].startsWith("<@")) {

							var player = commandParts[3].slice(2, commandParts[3].length - 1);
							var oinfo = utils.splitCommand(command.slice(34).trim());
							if (inv.give(msg, rp[msg.channel].chars[msg.author], player, oinfo[0], oinfo[1], commandParts[2]=="cgive")) {
								if (commandParts[2] == "cgive") {
									turn_amount += combat.action_time("give_cheat");
								}
								else {
									turn_amount += combat.action_time("give");
								}
							}
						}
					}
					else if (commandParts[2] == "hold") {
						if (commandParts[3] != undefined) {
							var objectInfo = utils.splitCommand(command.slice(11).trim());

							var objectId = utils.getObjectID(rp[msg.channel].objects, objectInfo[0]);
							if (objectId != -1) {
								var actChar = rp[msg.channel].chars[msg.author];
								var objectFound = false;
								for (item in actChar.inventory) {
									if (actChar.inventory[item].id == objectId) {
										if (actChar.holding != -1 && actChar.holding != undefined)
											actChar.inventory.push({id: actChar.holding, quantity: 1});
										actChar.holding = objectId;
										actChar.inventory.splice(item, 1);
										utils.replyMessage(msg, "Successfully equiped the item "+objectInfo[0]);
										turn_amount += combat.action_time("hold");
										objectFound = true;
										break;
									}
								}
								if (!objectFound)
									utils.replyMessage(msg, "You don't have the item!");
							} else {
								utils.replyMessage(msg, "Item not found!");
							}
						}
					}
				}
				else if (commandParts[1] == "room") {
					if (commandParts[2] == undefined) {
						io.displayRoom(msg);
					}
					else if (commandParts[2] == "next") {
						if (utils.require(msg, reqs.is_room | reqs.are_mobs)) {
							if (rp[msg.channel].room.entities.length == 0) {
								rp[msg.channel].room = createRoom(msg);
								utils.replyMessage(msg, "Moved to the next room!");
								io.displayRoom(msg);
								combat.reset_turns(msg);
							}
							else {
								utils.replyMessage(msg, "Not every mob has been killed!");
							}
						}
					}
					else if (commandParts[2] == "init") {
						if (rp[msg.channel].room == undefined) {
							rp[msg.channel].room = createRoom(msg);
							io.displayRoom(msg);
							combat.reset_turns(msg);
						}
					}
				}
				else if (commandParts[1] == "save") {
					/* NOTE: Save the game */
					// DEPRECATED

					saveRP(msg.channel);
					utils.replyMessage(msg, "*I'll try to remember your tale, young adventurer!*");

				}
				else if (commandParts[1] == "admin" && canCheat(msg)) {

					if (commandParts[2] == "settings") {
						if (commandParts[3] != undefined && commandParts[4] != undefined) {

							var setting = [commandParts[3], commandParts[4]];

							if (rp[msg.channel][setting[0]] !== null || printableSettings.indexOf(setting[0]) >= 0) {
								if (setting[1]=="true") {

									setting[1] = true;

								} else if (setting[1]=="false") {

									setting[1] = false;

								}
								if (Array.isArray(rp[msg.channel][setting[0]])) {

									setting[1] = setting[1].split(",");

								}
								if (setting[1].startsWith("_")) {
									setting[1] = parseFloat(setting[1].slice(1));
								}
								console.log(setting[0] + ": "+ setting[1]);
								rp[msg.channel][setting[0]] = setting[1];

							}

						} else {
							// Print active settings

							var string = "";
							for (i in config.printableSettings) {
								string = string + "\r\n" + i + ": " + rp[msg.channel][i];
							}
							utils.replyMessage(msg, "```" + string + "```");

						}
					}
					else if (commandParts[2] == "**RESET**") {
						// NOTE: WARNING: RESET

						utils.replyMessage(msg, "**Are you really sure? If yes, type \*\*YES\*\* (With the asterisks). Every data will be lost!");
						io.talk(msg, msg => {
							if (msg.content=="**YES**") {

								utils.replyMessage(msg, "**Erasing data...**");
								rp[msg.channel] = null;
								utils.replyMessage(msg, "**All data have been erased**. *You can initialise the RP at any time using `l!RP`*!");

							}
						});

					}
					else if (commandParts[2] == "DEBUG") {
						// TODO: Remove

						var string = "";

						//rp[msg.channel].mobs = [config.defaults.mob];
						rp[msg.channel].room = createRoom(msg);

						/*rp[msg.channel].dungeon = [Level.new(4, 4, 0, 2, 1)];
						rp[msg.channel].position

						string = io.displayLevel(rp[msg.channel].dungeon[0]);*/

						string = CircularJSON.stringify(rp[msg.channel].room);

						//string = string + "\r\n ATK: " + combat.hit(msg, rp[msg.channel].mobs[0]);

						utils.replyMessage(msg, "```\r\n" + string + "```");



					}
					else if (config.settingList[commandParts[2]] != undefined) {

						actSetting = rp[msg.channel][config.settingList[commandParts[2]]];
						if (commandParts[3] == "create") {

							if (commandParts[2] == "object") {

								utils.replyMessage(msg, "Adding the " + commandParts[2] + ", please input the `name`, the `desc`, `class` and `subclass`");

							} else {

							utils.replyMessage(msg, "Adding the " + commandParts[2] + ", please input the `name` and the `desc`");

							}
							var talk_obj = io.talk(msg, msg => {
								var actSetting = io.getTalking(msg).actSetting;
								var command = utils.splitCommand(msg.content);
								if (commandParts[2] == "object") {

									actSetting.push({name: command[0], desc: command[1], class: command[2], subclass: command[3], attrs: []});

								} else {

									actSetting.push({name: command[0], desc: command[1], attrs: []});

								}
								utils.replyMessage(msg, "Successfully added the " + commandParts[2] + " "+command[0]);
							});

							talk_obj.actSetting = actSetting;

						}
						else if (commandParts[3] == "edit") {
							// NOTE: Edit an element

							utils.replyMessage(msg, "Modifiying a " + commandParts[2] + ", input the old `name`, the new `name` and `desc`");
							var talk_obj = io.talk(msg, msg => {
								var actSetting = io.getTalking(msg).actSetting;
								//console.log(CircularJSON.stringify(actSetting));
								var command = utils.splitCommand(msg.content);
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
								utils.replyMessage(msg, "Successfully modified "+command[0]);
							});

							talk_obj.actSetting = actSetting;

						}
						else if (commandParts[3] == "list") {
							// NOTE: List elements w/ or w/o their attrs
							// TODO: Separate in multiple messages
							var mpages = Math.ceil(actSetting.length/config.itemsPerPage),
							page = Math.max(Math.min(parseInt(commandParts[4] || "1") || 1, mpages), 1);
							var embed = {
								color: config.colors.admin,
								title: ("List of " + commandParts[2] +" (page " + page + "/" + mpages + ")"),
								fields: []
							};
							for (i = (page-1)*config.itemsPerPage; i < Math.min((page)*config.itemsPerPage, actSetting.length); i++) {
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
											if (Array.isArray(actSetting[i][config.mobStats[j]]))
												string = string + "\r\n" + config.mobStats[j] +": " + CircularJSON.stringify(actSetting[i][config.mobStats[j]]);
											else
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
							utils.replyMessage(msg, {embed: embed});

						}
						else if (commandParts[3] == "remove") {

							for (i in actSetting) {
								if (commandParts[4] == rp[msg.channel].species[i].name) {

									actSetting.splice(i, 1);
									utils.replyMessage(msg, "Removed " + commandParts[2] + " " + commandParts[4]);
									break;

								}
							}
						}
						else if (commandParts[3] == "attrs") {
							// TODO: fix that stuff, especially the "everything's alright" verification
							// TODO: add isNaN everywhere it needs it
							// TODO: add object_found everywhere it needs it
							if (commandParts[4] == "create") {

								utils.replyMessage(msg, "Please input the `" + commandParts[2] + "`, the `name` and the `value`s");
								var talk_obj = io.talk(msg, msg => {
									var actSetting = io.getTalking(msg).actSetting;
									var command = utils.splitCommand(msg.content);
									var found = false;
									for (i in actSetting) {
										if (actSetting[i].name == command[0]) {
											if (actSetting[i].attrs == null || actSetting[i].attrs == undefined) {
												actSetting[i].attrs = [];
											}
											actSetting[i].attrs.push({"name": command[1], "values": command.slice(2)});
											utils.replyMessage(msg, "Successfully added the `" + command[1] + "` to the `" + command[0] + "` " + commandParts[2] + "!");
											found = true;
											break;

										}
									}
									if (!found)
									utils.replyMessage(msg, "Could't find the target to link the attribute!");
								});

								talk_obj.actSetting = actSetting;

							}
							else if (commandParts[4] == "edit") {

								utils.replyMessage(msg, "Please input the `" + commandParts[2] + "`, the `id`, the `name` and the `value`s");

								var talk_obj = io.talk(msg, msg => {
									var actSetting = io.getTalking(msg).actSetting;
									var command = utils.splitCommand(msg.content);
									for (i in actSetting) {
										if (actSetting[i].name == command[0]) {

											var specie = actSetting[i];
											var ID = parseInt(command[1]);
											if (ID != null && !isNaN(ID)) {

												specie.attrs[ID] = {"name": command[2], "values": command.slice(3)};
												utils.replyMessage(msg, "Successfully modified the attribute [" + command[1] + "] to the `" + command[0] + "` " + commandParts[2] + "!");

											} else {

												utils.replyMessage(msg, "Couldn't read the ID, aborting!");

											}
										}
									}
								});

								talk_obj.actSetting = actSetting;
							}
							else if (commandParts[4] == "remove") {
								utils.replyMessage(msg, "Please in the `" + commandParts[2] + "` and the `id`");
								var talk_obj = io.talk(msg, msg => {
									var actSetting = io.getTalking(msg).actSetting;
									var command = utils.splitCommand(msg.content);
									for (i in actSetting) {
										if (actSetting[i].name == command[0]) {
											var ID = parseInt(command[1]);
											if (ID != null && !isNaN(ID)) {
												actSetting[i].attrs.splice(ID);
												utils.replyMessage(msg, "Successfully removed the attr [" + ID + "] from " + command[0]);
											} else {
												utils.replyMessage(msg, "Couldn't read the ID, aborting!");
											}
											break;
										}
									}
								});
								talk_obj.actSetting = actSetting;
							}
						}
						else if (commandParts[3] == "set") {
							utils.replyMessage(msg, "Modifying a " + commandParts[2] + ", input the `name`, the value `name` and its `content`");
							var talk_obj = io.talk(msg, msg => {
								var actSetting = io.getTalking(msg).actSetting;
								var command = utils.splitCommand(msg.content);
								if (config.mobStats.indexOf(command[1]) > -1) {
									for (i in actSetting) {
										if (command[0]==actSetting[i].name) {
											actSetting[i][command[1]] = parseFloat(command[2]);
											utils.replyMessage(msg, "Successfully modified / added the value `" + command[1] + "` of " + command[0]);
										}
									}
								}
							});
							talk_obj.actSetting = actSetting;
						}
					}
					else if (commandParts[2] == "summon") {
						var name = utils.splitCommand(command.slice(15).trim())[0];
						var mobId = utils.getObjectID(rp[msg.channel].mobs, name);
						if (mobId != -1) {
							var mob = rp[msg.channel].mobs[mobId];
							var actRoom = rp[msg.channel].room;
							actRoom.entities.push({id: mobId, HP: mob.HP});
							utils.replyMessage(msg, "Successfully summoned the mob " + name + "!");
						}
						else {
							utils.replyMessage(msg, "I couldn't find the mob you were looking for!");
						}
					}
					else if (commandParts[2] == "kill") {
						var name = utils.splitCommand(command.slice(13).trim())[0];
						var mobId = utils.getObjectID(rp[msg.channel].mobs, name);
						if (mobId != -1) {
							var mob = rp[msg.channel].mobs[mobId];
							var actRoom = rp[msg.channel].room;
							actRoom.entities.splice(mobId, 1);
							utils.replyMessage(msg, "Successfully killed the mob " + name + "!");
						}
						else {
							utils.replyMessage(msg, "I couldn't find the mob you were looking for!");
						}
					}
					else if (commandParts[2] == "presets") {
						if (commandParts[3] == "import") {
							presets_mod.import(msg, commandParts[4]);
						}
						else if (commandParts[3] == "remove") {
							presets_mod.remove(msg, commandParts[4]);
						}
					}
					else if (commandParts[2] == "turn") {
						turn_amount += combat.action_time("turn");
						replyMessage(msg, say(msg, "admin_turn_success"));
					}
				}
				else if (commandParts[1] == "attack" || commandParts[1] == "atk") {
					if (utils.require(msg, reqs.has_char | reqs.has_class | reqs.has_specie | reqs.are_classes | reqs.are_species | reqs.are_objects | reqs.are_mobs | reqs.is_room | reqs.are_mobs_in_room)) {
						// TODO: separate the player => mob and the mob => player, to make ALL the mob attack
						var actRoom = rp[msg.channel].room;
						var targetId = Math.floor(utils.random(0, actRoom.entities.length));
						if (commandParts[2] != undefined) {
							for (mob in actRoom.entities) {
								if (rp[msg.channel].mobs[actRoom.entities[mob].id].name == commandParts[3]) {
									targetId = mob;
									break;
								}
							}
							targetId = +commandParts[3] || targetId;
						}
						if (targetId != -1) {
							var player_raw = rp[msg.channel].chars[msg.author];
							var player = {};
							player.item = attrmgt.treat(rp[msg.channel].objects[player_raw.holding], rp[msg.channel].species[player_raw.specieId | -1], rp[msg.channel].classes[player_raw.classId | -1]);
							player.ATK = (player.item.stats.ATK || 0) + (player_raw.ATK || 0);
							player.DEF = (player.item.stats.DEF || 0) + (player_raw.DEF || 0);
							player.VIT = (player.item.stats.VIT || 0) + (player_raw.VIT || 0);
							//console.log(CircularJSON.stringify(player));
							var mob_impl = actRoom.entities[targetId];
							var mob_raw = rp[msg.channel].mobs[mob_impl.id];
							var mob = {};
							mob.item = attrmgt.treat(rp[msg.channel].objects[mob_impl.holding], rp[msg.channel].species[mob_raw.specieId | -1], rp[msg.channel].classes[mob_raw.classId | -1]);
							mob.ATK = (mob.item.stats.ATK || 0) + (mob_raw.ATK || 0);
							mob.DEF = (mob.item.stats.DEF || 0) + (mob_raw.DEF || 0);
							//console.log(CircularJSON.stringify(mob));
							var PtMdmg = (player.ATK) / (0.01 * mob.DEF * mob.DEF + 1);
							var MtPdmg = (mob.ATK) / (0.01 * player.DEF * player.DEF + 1);

							mob_impl.HP -= PtMdmg;
							if (player.VIT < 0) {
								turn_amount += 1-player.VIT;
							} else {
								turn_amount += 1-utils.sigma(player.VIT);
							}
							if (mob_impl.HP <= 0) {
								// Give the xp to the player
								var xp_togive = mob_impl.difficulty * mob_raw.HP
								utils.replyMessage(msg, "You killed " + mob_raw.name + " with " + Math.round(PtMdmg*10)/10 + " of damage!");

								actRoom.entities.splice(targetId, 1);

								var xp = utils.getObjectID(mob_raw.attrs, "xp_drop");
								if (xp != -1) {
									var a = parseInt(mob_raw.attrs[xp].values[0]);
									var b = parseInt(mob_raw.attrs[xp].values[1]);
									if (a !== null && b !== null) {
										combat.give_xp(msg, player_raw, utils.random(a, b), true);
									} else {
										utils.replyMessage(msg, io.say(msg, "error_attr_syntax"));
									}
								}
							} else {
								utils.replyMessage(msg, "You hit " + mob_raw.name + " with " + Math.round(PtMdmg*10)/10 + " of damage. " + Math.round(mob_impl.HP*10)/10  + " HP left.");


								// TODO: remove that thing
								player_raw.HP -= MtPdmg;

								if (player_raw.HP <= 0) {
									// TODO: le reste ici
									utils.replyMessage(msg, "You took " + Math.round(MtPdmg*10)/10 + " and YOU DIED. But idk what death is, so I'm gonna give you your health back!");
									player_raw.HP = 20;
								} else {
									utils.replyMessage(msg, "You took " + Math.round(MtPdmg*10)/10 + " of damage from " + mob_raw.name + ". " + Math.round(player_raw.HP*10)/10 + " HP left.");
								}
							}
						} else {
							utils.replyMessage(msg, io.say(msg, "error_mob_name_syntax"));
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
	console.log("Successfully parsed config data, loading the token ...");

	fs.readFile("./token.txt", (err, data) => {
		if (err) {
			console.log("Error while loading the token, be sure that you have it in plain text in the file token.txt!");
			throw err;
		}

		console.log("Successfully loaded the token, loading the saves...");

		io.loadRP();

		console.log("Loaded the saves, loading presets");

		presets_mod.loadPresets();

		console.log("Loaded the presets, attempting to log in...");

		onLoadedTime = new Date().getTime();

		token = data.toString().trim();

		console.log(token);

		bot.login(token);
	});


});
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
