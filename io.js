var parent = module.parent;
const utils = require("./utils");
const attrmgt = require("./attrmgt");
const specie = require("./specie");
const fs = require("fs");
const CircularJSON = require("circular-json");

exports.say = function(msg, msg_name) {
	var string = config.lang[lang][msg_name];
  if (string !== undefined) {
  	try {
  		if (string.indexOf("{{NAME}}")>-1) // Replace {{NAME}} by the author's character name TODO: add fallback on the user's pseudo
  			string = string.replace("{{NAME}}", rp[msg.channel].chars[msg.author].name);
  		if (string.indexOf("{{CLASSES}}")>-1) // Replace {{CLASSES}} by a list of the available classes
  			string = string.replace("{{CLASSES}}", module.exports.listClass(msg));
  		if (string.indexOf("{{SPECIES}}")>-1) // Replace {{SPECIES}} by a list of the available species
  			string = string.replace("{{SPECIES}}", module.exports.listSpecie(msg));
  		if (string.indexOf("{{CLASS}}")>-1) // Replace {{CLASS}} by the class of the character of the author
  			string = string.replace("{{CLASS}}", rp[msg.channel].classes[rp[msg.channel].chars[msg.author].classId].name);
  		if (string.indexOf("{{SPECIE}}")>-1) // Replace {{SPECIE}} by the specie of the character of the author
  			string = string.replace("{{SPECIE}}", rp[msg.channel].species[rp[msg.channel].chars[msg.author].specieId].name);
			{ // Replace [[%n%]] by the word of the command located at {n} (excluding "l!")
				var s = 0, e = 0;
				while (s > -1 && e > -1) {
					if ((s = string.indexOf("[[")) > -1) { // Find the first brackets
						if ((e = string.slice(s).indexOf("]]")) > -1) { // Find the second brackets
							var u = string.slice(s+2, s+e);
							console.log(u);
							if (u != "" && u !== null && +u !== null) {
								string = string.replace("[["+u+"]]", utils.splitCommand(msg.content.slice(2))[+u]);
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
  if (utils.require(msg, reqs.has_char | reqs.are_classes | reqs.are_species)) {
  	utils.replyMessage(msg, module.exports.say(msg, "char_init"));
  	module.exports.say(msg, function(msg) {
  		RP.set_char(rp[msg.channel], msg.author, msg.content);
  		utils.replyMessage(msg, module.exports.say(msg, "char_init_success"));
  		askClass(msg);
  	});
  }
};
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
exports.displayChar = function(msg) {
	if (utils.require(msg, reqs.has_char | reqs.has_specie | reqs.has_class | reqs.are_classes | reqs.are_species)) {
		var actChar = rp[msg.channel].chars[msg.author];
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
		var lxp = actChar.lvl * actChar.lvl * 100;
		embed.fields.push({name: "Level " + actChar.lvl, value: "xp: " + Math.round(actChar.xp) + "/" + lxp});
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
				string = string + "\r\n" + module.exports.displayItem(msg, rp[msg.channel].objects[actChar.inventory[item].id]);
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
			embed.fields.push({name: "Holding", value: module.exports.displayItem(msg, rp[msg.channel].objects[actChar.holding])});
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
	}
	return string;
}
exports.displayRoom = function(msg) {
	if (utils.require(msg, reqs.is_room | reqs.are_mobs | reqs.are_objects)) {
		var actRoom = rp[msg.channel].room;
		var embed = {
			color: config.colors.dungeon,
			title: "Room",
			fields: []
		};
		var string = "";
		if (actRoom.entities !== undefined) {
			if (actRoom.entities.length > 0) {
				for (i in actRoom.entities) {
					var parent = rp[msg.channel].mobs[actRoom.entities[i].id];
					string = string + parent.name;
					if (parent.HP != undefined) string = string + " (" + (actRoom.entities[i].HP | "Error") + "/" + (parent.HP[1] || parent.HP[0] || parent.HP) + ")";
					if (actRoom.entities[i].holding != -1 && actRoom.entities[i].holding != undefined) {
						var item = rp[msg.channel].objects[actRoom.entities[i].holding];
						if (item != undefined) string = string + " [" + item.name + "]";
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
		utils.replyMessage(msg, {embed: embed});
	}
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