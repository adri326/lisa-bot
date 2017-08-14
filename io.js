var parent = module.parent;
const utils = require("./utils");
const attrmgt = require("./rpg/attrmgt");
const specie = require("./rpg/specie");
const combat = require("./rpg/combat");
const fs = require("fs");
const CircularJSON = require("circular-json");

exports.say = function(msg, msg_name, msg_info = {}) {
	var string = config.lang[lang][msg_name];
  if (string !== undefined) {
  	try {
  		if (string.indexOf("{{NAME}}")>-1) // Replace {{NAME}} by the author's character name TODO: add fallback on the user's pseudo
  			string = string.replace("{{NAME}}", rp[msg.channel].chars[msg.author].name || msg.author_username);
			if (string.indexOf("{{CHARS}}")>-1)
				string = string.replace("{{CHARS}}", module.exports.listChars(msg));
  		if (string.indexOf("{{CLASSES}}")>-1) // Replace {{CLASSES}} by a list of the available classes
  			string = string.replace("{{CLASSES}}", module.exports.listClass(msg));
  		if (string.indexOf("{{SPECIES}}")>-1) // Replace {{SPECIES}} by a list of the available species
  			string = string.replace("{{SPECIES}}", module.exports.listSpecie(msg));
  		if (string.indexOf("{{CLASS}}")>-1) // Replace {{CLASS}} by the class of the character of the author
  			string = string.replace("{{CLASS}}", rp[msg.channel].classes[rp[msg.channel].chars[msg.author].classId].name);
  		if (string.indexOf("{{SPECIE}}")>-1) // Replace {{SPECIE}} by the specie of the character of the author
  			string = string.replace("{{SPECIE}}", rp[msg.channel].species[rp[msg.channel].chars[msg.author].specieId].name);
			{
				var s = 0, e = 0;
				while (s > -1 && e > -1) {
					if ((s = string.indexOf("[[")) > -1) { // Find the first brackets
						if ((e = string.slice(s).indexOf("]]")) > -1) { // Find the second brackets
							var u = string.slice(s+2, s+e);
							if (u != "" && u !== null) {
								if (!isNaN(+u)) {
									// Replaces [[%n%]] by the word of the command located at {n} (excluding "l!")
									string = string.replace("[["+u+"]]", utils.splitCommand(msg.content.slice(2))[+u]);
								} else if (typeof(msg_info[u]) !== "undefined") {
									// Replaces [[%name%]] by the value given in msg_info
									string = string.replace("[[" + u + "]]", msg_info[u]);
								}
							} else {
								break;
							}
						}
					}
				}


			}
  	} catch (err) {
  		console.log(err);
  	}
  	return string;
  } else {
    return "";
  }
}
exports.talk = function(msg, trigger) {
	actTalking = {};
	actTalking.state = true;
	actTalking.id = msg.author;
	actTalking.trigger = trigger;
	talking[msg.channel] = actTalking;
	return talking[msg.channel];
}
exports.getTalking = function(msg) {
	return talking[msg.channel];
}


// NOTE: YELLOW deprecated alert!
exports.askChar = function(msg) {

  if (utils.require(msg, reqs.are_classes | reqs.are_species)) {
  	utils.replyMessage(msg, module.exports.say(msg, "char_init"));
  	module.exports.talk(msg, function(msg) {
  		rp[msg.channel].chars[msg.author] = utils.createChar(msg.author, msg.content);
  		utils.replyMessage(msg, module.exports.say(msg, "char_init_success"));
  		module.exports.askClass(msg);
  	});
  }
};
exports.listChars = function(msg) {
	var chars = "";
	for (i in rp[msg.channel].chars) {
		var actchar = rp[msg.channel].chars[i];
		chars = chars + "\r\n - " + actchar.name;
	}
	return chars;
}
exports.listClass = function(msg) {
	var list = "";

  if (utils.require(msg, reqs.are_classes)) {
  	for (i in rp[msg.channel].classes) {
  		list = list + "\r\n - " + rp[msg.channel].classes[i].name;
  	}
  }

	return list;
};
exports.askClass = function(msg) {
	// NOTE: Ask CLASS
	if (utils.require(msg, reqs.has_char | reqs.are_classes)) {


		utils.replyMessage(msg, module.exports.say(msg, "char_ask_class"));
		module.exports.talk(msg, function(msg) {
			var foundClass = -1;
			for (i in rp[msg.channel].classes) {
				if (msg.content.toLowerCase() == rp[msg.channel].classes[i].name.toLowerCase()) {
					foundClass = i;
					break;
				}
			}
			if (foundClass>-1) {
				rp[msg.channel].chars[msg.author].classId = foundClass;
				utils.replyMessage(msg, module.exports.say(msg, "char_ask_class_success"));
				if (rp[msg.channel].chars[msg.author].specieId == -1) {
					module.exports.askSpecie(msg);
				}
			} else {
				utils.replyMessage(msg, module.exports.say(msg, "error_char_ask_class_syntax"));
			}

		});
	}
}
exports.listSpecie = function(msg) {
	var list = "";

  if (utils.require(msg, reqs.are_species)) {
  	for (i in rp[msg.channel].species) {
  		list = list + "\r\n - " + rp[msg.channel].species[i].name;
  	}
  }

	return list;
}
exports.askSpecie = function(msg) {
	// NOTE: Ask SPECIE
	if (utils.require(msg, reqs.are_species)) {
		utils.replyMessage(msg, module.exports.say(msg, "char_ask_specie"));
		module.exports.talk(msg, function(msg) {
			var foundSpecie = -1;
			for (i in rp[msg.channel].species) {
				if (msg.content.toLowerCase() == rp[msg.channel].species[i].name.toLowerCase()) {
					foundSpecie = i;
					break;
				}
			}
			if (foundSpecie>-1) {
				rp[msg.channel].chars[msg.author].specieId = foundSpecie;
				specie.applySpecieAttrs(msg, foundSpecie);
				utils.replyMessage(msg, module.exports.say(msg, "char_ask_specie_success"));
			} else {
				utils.replyMessage(msg, module.exports.say(msg, "error_char_ask_specie_syntax"));
			}

		});
	}
}

// NOTE: RED deprecated alert!
exports.displayChar = function(msg, char) {
	if (utils.require(msg, reqs.has_char | reqs.has_specie | reqs.has_class | reqs.are_classes | reqs.are_species)) {
		var actChar = rp[msg.channel].chars[char];
		var embed = {color: config.colors.player,
			author: {name: actChar.name, icon_url: msg.author.avatarURL},
			fields: []};
		var actClass = rp[msg.channel].classes[actChar.classId];
		var actSpecie = rp[msg.channel].species[actChar.specieId];
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
		var lxp = utils.xp_per_level(actChar.lvl);
		embed.fields.push({name: "Level " + actChar.lvl, value: "xp: " + Math.round(actChar.xp) + "/" + lxp});
		embed.fields.push({name: "Skill points", value: actChar.skill_points + " points (" + rp[msg.channel].skill_points_per_level + " points per level)"});
		utils.replyMessage(msg, {embed: embed});
	}
}
exports.displayInv = function(msg) {
	if (utils.require(msg, reqs.has_char | reqs.are_objects)) {
		var actChar = rp[msg.channel].chars[msg.author];
		var embed = {
			color: config.colors.player,
			author: {name: actChar.name + "'s inventory'", icon_url: msg.author.avatarURL},
			fields: []
		};

		if (actChar.inventory != undefined && actChar.inventory.length != 0) {
			var string = "";
			for (item in actChar.inventory) {
				if (actChar.inventory[item] !== null) {
					string = string + "\r\n" + module.exports.displayItem(msg, rp[msg.channel].objects[actChar.inventory[item].id]);
					if (actChar.inventory[item].quantity != 1) {
						string = string + " (" + actChar.inventory[item].quantity + "x)";
					}
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
			embed.fields.push({name: "Holding", value: module.exports.displayItem(msg, combat.calc_item_stats(msg, actChar.holding.id, actChar.holding.level))});
		}
		if (actChar.equipped == -1) {
			embed.fields.push({name: "Equipped", value: "*Nothing*"});
		} else {
			embed.fields.push({name: "Equipped", value: module.exports.displayItem(msg,combat.calc_item_stats(msg, actChar.equipped.id, actChar.equipped.level))});
		}
		utils.replyMessage(msg, {embed: embed});
	}
}
exports.displayItem = function(msg, item, desc = false) {
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
		var player = rp[msg.channel].chars[msg.author];
		var specie = rp[msg.channel].species[player.specieId];
		var holder_class = rp[msg.channel].classes[player.classId];
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
		if (item.level != undefined) {
			string = string + " \\*Level " + item.level + "\\*";
		}
	}
	return string;
}
exports.displayItemFancy = function(msg, item, holder) {
	var embed = {
		color: config.colors.dungeon,
		title: item.name,
		fields: []
	};
	if (item.desc != undefined) {
		embed.fields.push({name: "Description", value: item.desc});
	}
	if (item.class != undefined) {
		if (item.subclass != undefined) {
			embed.fields.push({name: "Class", value: "@**" + item.class + "**/" + item.subclass});
		}
		else {
			embed.fields.push({name: "Class", value: "@**" + item.class + "**"});
		}
	}
	var holder_specie = rp[msg.channel].species[holder.specieId];
	var holder_class = rp[msg.channel].classes[holder.classId];
	var Titem = attrmgt.treat(item, holder_specie, holder_class);
	var n = 0, stats = "";
	for (stat in config.baseStats) {
		if (Titem.stats[config.baseStats[stat]] != undefined) {
			n++;
			stats = stats + "**" + config.baseStats[stat] + "**: " + Math.round(Titem.stats[config.baseStats[stat]]*10)/10 + "\t";
			if (n%3 == 0) {
				stats = stats + "\r\n";
			}
		}
	}
	if (stats != "") {
		embed.fields.push({name: "Statistics", value: stats});
	}
	if (item.difficulty != undefined) {
		var rarity = Math.floor(+(item.rate || 1)*4-0.001);
		if (item.max_difficulty != undefined) {
			embed.fields.push({
				name: "Rarity",
				value: module.exports.say(msg,
					"rarity_max_difficulty",
					{
						min_difficulty: Math.round(utils.inverse_difficulty(item.difficulty)*10)/10,
						difficulty: item.difficulty,
						max_difficulty: item.max_difficulty,
						rarity: module.exports.say(msg, "rarity_" + rarity)
					})
			});
		}
		else {
			embed.fields.push({
				name: "Rarity",
				value: module.exports.say(msg,
					"rarity",
					{
						min_difficulty: Math.round(utils.inverse_difficulty(item.difficulty)*10)/10,
						difficulty: item.difficulty,
						rarity: module.exports.say(msg, "rarity_" + rarity)
					})
			});
		}
	}
	if (item.level != undefined && item.maxlevel != undefined) {
		embed.fields.push({name: "Level", value: "" + item.level + "/" + item.maxlevel});
	}
	return {embed: embed};
}
exports.displayRoom = function(msg) {
	if (utils.require(msg, reqs.is_room | reqs.are_mobs | reqs.are_objects)) {
		var actRoom = rp[msg.channel].room;
		var embed = {
			color: config.colors.dungeon,
			title: "Room: *" + (actRoom.name || "Default") + "*",
			fields: []
		};
		var string = "";
		if (actRoom.entities !== undefined) {
			if (actRoom.entities.length > 0) {
				for (i in actRoom.entities) {
					var parent = rp[msg.channel].mobs[actRoom.entities[i].id];
					if (parent != undefined) {
						string = string + parent.name;
						if (parent.HP != undefined) string = string + " (" + (actRoom.entities[i].HP | "Error") + "/" + (parent.HP[1] || parent.HP[0] || parent.HP) + ")";
						if (actRoom.entities[i].holding != -1 && actRoom.entities[i].holding != undefined) {
							var item = rp[msg.channel].objects[actRoom.entities[i].holding];
							if (item != undefined) string = string + " [" + item.name + "]";
						}
						if (Array.isArray(actRoom.entities[i].effects)) {
							actRoom.entities[i].effects.forEach(o => {
								string = string + " <" + o.name + ">";
							});
						}
						string = string + "\r\n";
					} else {
						string = string + actRoom.entities[i].id;
					}
				}
			}
			else {
				string = string + "*Nobody's here* D:";
			}
		}
		else {
			string = string + "*Nobody's here* D:";
		}
		embed.fields.push({name: "Entities", value: string.toString()});
		string = "";
		if (actRoom.items !== undefined) {
			if (actRoom.items.length > 0) {
				for (i in actRoom.items) {
					if (actRoom.items[i] !== null) {
						var parent = rp[msg.channel].objects[actRoom.items[i].id];
						string = string + parent.name;

						string = string + "\r\n";
					}
				}
			}
			else {
				string = string + "*There is no item in this room* !";
			}
		}
		else {
			string = string + "*There is no item in this room* !";
		}
		embed.fields.push({name: "Items", value: string.toString()});
		string = "";
		if (actRoom.structures !== undefined) {
			if (actRoom.structures.length > 0) {
				for (s in actRoom.structures) {
					var actStruct = config.structures[actRoom.structures[s]];
					if (actStruct != undefined) {
						string = string + "\r\n**" + actStruct.name + "**: " + actStruct.desc;
					}
				}
			}
			else {
				string = string + "*There is no structure in this room* !";
			}
		}
		else {
			string = string + "*There is no structure in this room* !";
		}
		embed.fields.push({name: "Structures", value: string.toString()});
		utils.replyMessage(msg, {embed: embed});
	}
}
exports.displaySkills = function(msg, target) {
	var actChar = rp[msg.channel].chars[target];
	var embed = {
		color: config.colors.player,
		author: {name: "Skill points: " + actChar.name, icon_url: msg.author.avatarURL},
		fields: []
	};
	var n = 0, stats = "";
	config.baseStats.forEach(stat => {
		if (stat != "HP" && stat != "MP") {
			n++;
			stats = stats + "**" + stat + "**: " + Math.round(actChar[stat]*10)/10 + "\t";
			if (n%3 == 0) {
				stats = stats + "\r\n";
			}
		}
	});
	embed.fields.push({"name": "Stats", "value": stats});
	embed.fields.push({"name": "Points", "value": actChar.skill_points + " (" + rp[msg.channel].skill_points_per_level + " points per level)"});
	utils.replyMessage(msg, {embed: embed});
}

exports.border = function(R, T, L, B) {
	var disc = R + T*2 + L*4 + B*8;
	const chars = [-1, -1, -1, 10, -1, 0, 13, 25, -1, 4, 1, 16, 7, 22, 19, 28];
	if (chars[disc] == -1) {
		return " ";
	} else {
		return String.fromCharCode(0x2550+chars[disc]);
	}
}

exports.loadRP = function() {
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
						if (chan.chars[x].HP == undefined || isNaN(chan.chars[x].HP)) {
							chan.chars[x].HP = config.defaults.HP;
							console.log(items[i] + ": char(" + x + ").HP");
							problems++;
						}
						if (chan.chars[x].MP == undefined || isNaN(chan.chars[x].MP)) {
							chan.chars[x].MP = config.defaults.MP;
							console.log(items[i] + ": char(" + x + ").MP");
							problems++;
						}
						if (chan.chars[x].holding === undefined || typeof(chan.chars[x].holding) === "number") {
							chan.chars[x].holding = {id: chan.chars[x].holding ||-1, quantity: 1, level: 1, xp: 0};
							console.log(items[i] + ": char(" + x + ").holding");
							problems++;
						}
						if (chan.chars[x].equipped === undefined || typeof(chan.chars[x].equipped) === "number") {
							chan.chars[x].equipped = {id: chan.chars[x].equipped || -1, quantity: 1, level: 1, xp: 0};
							console.log(items[i] + ": char(" + x + ").equipped");
							problems++;
						}
						if (chan.chars[x].xp === undefined || chan.chars[x].lvl === undefined) {
							chan.chars[x].xp = 0;
							chan.chars[x].lvl = 1;
							console.log(items[i] + ": char(" + x + ").xp");
							problems++;
						}
						if (chan.chars[x].skill_points === undefined) {
							chan.chars[x].skill_points = 0;
							console.log(items[i] + ": char(" + x + ").skill_points");
						}
						if (isNaN(chan.chars[x].MGC) || chan.chars[x].MGC === undefined || chan.chars[x].MGC === null) {
							chan.chars[x].MGC = config.defaults.MGC;
							console.log(items[i] + ": char(" + x + ").MGC");
						}
					}
					for (item in config.settingList) {
						if (chan[config.settingList[item]] === undefined) {
							chan[config.settingList[item]] = [config.defaults[item]];
							console.log(items[i] + ": assets." + config.settingList[item]);
							problems++;
						}
					}
					for (item in config.printableSettings) {
						if (chan[item] === undefined) {
							chan[item] = config.printableSettings[item];
							console.log(items[i] + ": settings." + item);
							problems++;
						}
					}
					if (typeof(chan.room) === "undefined") {
						console.log(items[i] + ": chan.room");
					}
					else {
						if (!Array.isArray(chan.room.mobs)) {
							chan.room.mobs = [];
							console.log(items[i] + ": room.mobs");
							problems++;
						}
						else {
							chan.room.mobs.forEach(mob => {
								if (typeof(mob.holding) !== "object") {
									mob.holding = {id: +mob.holding || -1, quantity: 1, level: 1, xp: 0};
									console.log(items[i] + ": room.mobs.holding");
									problems++;
								}
							});
						}
						if (!Array.isArray(chan.room.items)) {
							chan.room.items = [];
							console.log(items[i] + ": room.items");
							problems++;
						}
						else {
							chan.room.items.forEach(item => {
								if (item.level == undefined) {
									item.level = 1;
									console.log(items[i] + ": room.items.level");
									problems++;
								}
								if (item.xp == undefined) {
									item.xp = 0;
									console.log(items[i] + ": room.items.xp");
									problems++;
								}
							});
						}
					}
					if (chan.turn_amount === undefined) {
						chan.turn_amount = 0;
						console.log(items[i] + ": turn_amount");
					}
					rp[chan.id] = chan;

				}
			}
		}
	})
}
