const io = require("./io");
const wildstring = require("wildstring");

exports.require = function(msg, requirements = 0, display = true) {
	if ((requirements & reqs.has_char) == reqs.has_char) {
		// User has character
		if (rp[msg.channel].chars[msg.author] === undefined) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_no_char"));
			return false;
		}
	}
	if ((requirements & reqs.has_class) == reqs.has_class) {
		// User has class
		var user = rp[msg.channel].chars[msg.author];
		if (user.classId == -1 || user.classId === undefined) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_char_no_class"));
			return false;
		}
	}
	if ((requirements & reqs.has_specie) == reqs.has_specie) {
		// User has specie
		var user = rp[msg.channel].chars[msg.author];
		if (user.specieId == -1 || user.specieId === undefined) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_char_no_specie"));
			return false;
		}
	}
	if ((requirements & reqs.are_classes) == reqs.are_classes) {
		// Are there classes
		if (rp[msg.channel].classes === undefined || (rp[msg.channel].classes || []).length == 0) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_no_class"));
			return false;
		}
	}
	if ((requirements & reqs.are_species) == reqs.are_species) {
		// Are there species
		if (rp[msg.channel].species === undefined || (rp[msg.channel].species || []).length == 0) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_no_specie"));
			return false;
		}
	}
	if ((requirements & reqs.are_mobs) == reqs.are_mobs) {
		// Are there mobs
		if (rp[msg.channel].mobs === undefined || (rp[msg.channel].mobs || []).length == 0) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_no_mob"));
			return false;
		}
	}
	if ((requirements & reqs.are_objects) == reqs.are_objects) {
		// Are there objects
		if (rp[msg.channel].objects === undefined || (rp[msg.channel].objects || []).length == 0) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_no_object"));
			return false;
		}
	}
	if ((requirements & reqs.has_class) == reqs.has_class && (requirements & reqs.are_classes) == reqs.are_classes) {
		// User has *valid* class
		if (rp[msg.channel].classes[rp[msg.channel].chars[msg.author].classId] === undefined) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_char_class_invalid"));
			return false;
		}
	}
	if ((requirements & reqs.has_specie) == reqs.has_specie && (requirements & reqs.are_species) == reqs.are_species) {
		// User has *valid* specie
		if (rp[msg.channel].species[rp[msg.channel].chars[msg.author].specieId] === undefined) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_char_specie_invalid"));
			return false;
		}
	}
	if ((requirements & reqs.is_room) === reqs.is_room) {
		if (rp[msg.channel].room === undefined) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_no_room"));
			return false;
		}
	}
  if ((requirements & reqs.are_mobs_in_room) === reqs.are_mobs_in_room) {
    if (rp[msg.channel].room.entities.length == 0) {
      if (display) module.exports.replyMessage(msg, io.say(msg, "error_no_mob_in_room"));
      return false;
    }
  }
	if ((requirements & reqs.is_alive) == reqs.is_alive) {
		if (rp[msg.channel].chars[msg.author].HP <= 0) {
			if (display) module.exports.replyMessage(msg, io.say(msg, "error_dead"));
			return false;
		}
	}


	return true;
}
exports.splitCommand = function(str) {
	return [].concat.apply([], str.split('"').map(function(v,i){
	   return i%2 ? v : v.split(' ')
	})).filter(Boolean);
}

exports.random = function(a, b) {
	return Math.random() * (b-a) + a;
}
exports.sigma = function(a) {
	return a/(1+Math.abs(a));
}
exports.xp_per_level = function(lvl) {
	return Math.floor(Math.pow(lvl, 1.5) * config.xp_mult/10)*10;
}
exports.inverse_difficulty = function(difficulty) {
	return 0.5 * (2 * difficulty + 1) - 0.5 * Math.sqrt(4 * difficulty + 1);
}

exports.replyMessage = function(msg, content) {
	if (config._no_message !== true) {
		// NOTE: Sends a message back
		var guild = bot.guilds.get(msg.guild);// || bot.guilds.get(msg.guild.id);
		if (guild!=undefined)
			guild.channels.get(msg.channel).send(content);
		//msg.channel.send(content);
	}
}
exports.logMessage = function(msg) {
	if (config._no_log !== true) {
		console.log(msg.author_username + ":" + msg.author_discriminator + " => " + msg.content); // Log message content
	}
}

var reg_leading_chars = new RegExp(/(?:[^a-z]|^)([a-z])/, "gi");
exports.leadingChars = function(string) {
	var result = "";
	string.match(reg_leading_chars).forEach(s => {
		result += s.trim();
	});
	return result;
}
exports.getObjectID = function(obj_list, name, sub_obj_function = (key, index) => true) {
	var steps = [-1, -1, -1];
	// Step 1: basic equal
	// Step 2: more advanced (acronyms, wildcards...)
	if (obj_list !== null && obj_list !== undefined)
	obj_list.forEach((key, index) => {
		if (sub_obj_function(key, index) && typeof(key.name) === "string" && typeof(name) === "string") {
			if (key.name.toLowerCase() == name.toLowerCase() || key.id == name) {
				steps[0] = index;
			}
			if (wildstring.match(name.toLowerCase(), key.name.toLowerCase())) {
				steps[1] = index;
			}
			if (module.exports.leadingChars(key.name) === name) {
				steps[2] = index;
			}
		}
	});
	for (s in steps) {
		if (steps[s] > -1) {
			return +steps[s];
		}
	}
	return -1;
}
exports.getIDMatchingObjects = function(obj_list, id_list) {
	var result = [];
	id_list.forEach(o => {
		if (o !== null)
			result.push(obj_list[o.id]);
	});
	return result;
}

exports.createRP = function(msg) {

	var newRP = {};
	newRP.creator = msg.author;
	newRP.id = msg.channel;
	newRP.chars = {};
	for (item in config.settingList) {
		newRP[config.settingList[item]] = [config.defaults[item]];
	}
	Object.assign(newRP, config.printableSettings); // Include all the printableSettings set in config.json
	return newRP;
}
exports.createChar = function(id, name) {
	char = {
		name: name,
		classId: -1,
		specieId: -1,
		inventory: [],
		holding: -1,
		equipped: -1,
		xp: 0,
		lvl: 1,
		skill_points: 0
	};
	char.ATK = config.defaults.ATK;
	char.DEF = config.defaults.DEF;
	char.VIT = config.defaults.VIT;
	char.MGC = config.defaults.MGC;
	char.AGI = config.defaults.AGI;
	char.STR = config.defaults.STR;
	char.HP = config.defaults.HP;
	char.MP = config.defaults.MP;
	return char;
}
exports.createRoom = function(msg) {
	var difficulty = rp[msg.channel].difficulty;
	var room = {
		entities: [],
		items: [],
		structures: [],
		name: "Room"
	};
	var template = config.rooms[Math.floor(module.exports.random(1, config.rooms.length))];
	if (module.exports.random(0, 1) > (template.rate || 1) ||
		rp[msg.channel].difficulty < (template.min_difficulty || 0) && rp[msg.channel].difficulty > (template.max_difficulty || 100000)) { // Test failed
		template = config.rooms[0];
	}
	room.name = template.name || room.name;
	if (template.mobs === true) {
		var mobCount = module.exports.random(1, Math.sqrt(difficulty));
		for (i = 0; i < mobCount; i++) {
			var found = false;
			for (j = 0; j < mobCount*rp[msg.channel].mob_mult && !found; j++) {
				var n = Math.floor(Math.random() * rp[msg.channel].mobs.length);
				var mob = rp[msg.channel].mobs[n];
				if (mob.difficulty != undefined &&
					+mob.difficulty <= +difficulty + module.exports.random(0, Math.sqrt(difficulty)) &&
					+(mob.rate || 1) >= module.exports.random(0, 1)
				) {
					module.exports.spawn_mob(msg, room, n);
					found = true;
				}
			}
		}
	}
	else if (Array.isArray(template.mobs)) {
		template.mobs.forEach(o => {
			if (typeof(o) == "string") {
				module.exports.spawn_mob(msg, room, module.exports.getObjectID(rp[msg.channel].mobs, o));
			}
			else if (typeof(o) == "object") {
				if (module.exports.random(0, 1) < (+o.rate || 1)) {
					module.exports.spawn_mob(msg, room, module.exports.getObjectID(rp[msg.channel].mobs, o.name));
				}
			}
		});
	}
	if (template.items === true) {
		var itemCount = module.exports.random(1, Math.sqrt(difficulty));
		for (i = 0; i < itemCount; i++) {
			var found = false;
			for (j = 0; j < itemCount*rp[msg.channel].item_mult && !found; j++) {
				var targetId = Math.floor(module.exports.random(0, rp[msg.channel].objects.length));
				var actObj = rp[msg.channel].objects[targetId];
				if (actObj.difficulty != undefined &&
					+actObj.difficulty <= +difficulty + module.exports.random(0, Math.sqrt(difficulty)) &&
					+(actObj.max_difficulty || 100000) >= +difficulty &&
					+(actObj.rate || 1) >= module.exports.random(0, 1)
				) {
					found = true;
					var quantity = 1;
					if (Array.isArray(actObj.spawn_quantity)) {
						quantity = actObj.spawn_quantity[Math.floor(module.exports.random(0, actObj.spawn_quantity.length))];
					}
					room.items.push({id: targetId, quantity: quantity});
				}
			}
		}
	}
	template.structures.forEach(o => {
		room.structures.push(o);
	});
	return room;
}

exports.spawn_mob = function(msg, room, id) {
	var HP = 0;
	if (Array.isArray(rp[msg.channel].mobs[id].HP)) {
		if (rp[msg.channel].mobs[id].HP.length == 2)
			HP = module.exports.random(rp[msg.channel].mobs[id].HP[0], rp[msg.channel].mobs[id].HP[1]);
		else {
			HP = rp[msg.channel].mobs[id].HP[0];
		}
	} else {
		HP = rp[msg.channel].mobs[id].HP;
	}
	room.entities.push({id: id, HP: HP, MP: rp[msg.channel].mobs[id].MP, effects: [], holding: module.exports.getObjectID(rp[msg.channel].objects, rp[msg.channel].mobs[id].holding)});
}

var reg_args = new RegExp("(?: *, *|\\()([a-zA-Z_\"0-9]*)", "g"); // Gives back all the elements withing brackets: e.g "(a, 2)" will return ["(a, 2", "a", 2]
exports.execute_pseudocode = function(msg, code, match) {
	var selection = [];
	for (action in code) {
		console.log(code[action]);
		var cmd = code[action];
		switch (true) {
			// Absolute selection
			case cmd == "select_every_enemy":
				selection = rp[msg.channel].room.entities;
				break;
			case cmd == "select_every_ally":
				selection = [];
				Object.keys(rp[msg.channel].chars).forEach(key => {
					selection.push(rp[msg.channel].chars[key]);
				});
				selection.splice(msg.author);
				break;
			case cmd == "select_every_player":
				selection = [];
				Object.keys(rp[msg.channel].chars).forEach(key => {
					selection.push(rp[msg.channel].chars[key]);
				});
				break;
			case cmd == "select_holder":
				selection = [rp[msg.channel].chars[msg.author]];
				break;

			// Relative selection
			case cmd == "select_one_random":
				selection = [selection[Math.floor(module.exports.random(0, selection.length))]];
				break;
			case (/^select_match_input\(.*\)$/).test(cmd):
				var r = module.exports.find_args(cmd);
				var newselection = [];
				if (r !== null) {
					var s = match[+r[0]+1];
					if (s != undefined) {
						for (i in selection) {
							if (rp[msg.channel].room != undefined)
							if (selection[i] in rp[msg.channel].room.entities) {
								if (rp[msg.chanel].mobs[selection[i].id].name == s) {
									newselection.push(selection[i]);
								}
							} else {
								if (selection[i].name == s) {
									newselection.push(selection[i]);
								}
							}
						}
					}
				}
				break;

			// Tests
			case cmd == "if_room_cleared":
				if (rp[msg.channel].room != undefined) {
					if (rp[msg.channel].room.mobs != undefined) {
						if (rp[msg.channel].room.mobs.length > 0) {
							return false;
						}
					}
				}
				break;

			// Action
			case (/^give_effect\(.*\)$/).test(cmd):
				var r = module.exports.find_args(cmd);
				if (r !== null) {
					for (i in selection) {
						if (typeof(selection[i]) !== "undefined") {
							if (selection[i].effects != undefined) {
								var eid = module.exports.getObjectID(selection[i].effects, r[0]);
								if (eid != -1) {
									selection[i].effects[eid].length = Math.max(selection[i].effects[eid].length, +r[1]);
								} else {
									selection[i].effects.push({name: r[0], length: +r[1]});
								}
							}
						}
					}
				} else {
					console.log("Error, regexp couldn't work");
				}
				break;
			case (/^inc_HP\(.*\)$/).test(cmd):
				var r = module.exports.find_args(cmd);
				if (r !== null) {
					for (i in selection) {
						if (selection[i].HP != undefined) {
							selection[i].HP += +(r[0] || 0);
						}
					}
				}
				break;
			case (/^inc_HP_capped\(.*\)$/).test(cmd):
				var r = module.exports.find_args(cmd);
				if (r !== null) {
					for (i in selection) {
						if (selection[i].HP != undefined) {
							selection[i].HP += +(r[0] || 0);
							selection[i].HP = Math.min(selection[i].HP, config.maxHP);
						}
					}
				}
				break;
			case (/^inc_MP\(.*\)$/).test(cmd):
				var r = module.exports.find_args(cmd);
				if (r !== null) {
					for (i in selection) {
						if (selection[i].MP != undefined) {
							selection[i].MP += +(r[0] || 0);
						}
					}
				}
				break;
			case (/^inc_MP_capped\(.*\)$/).test(cmd):
				var r = module.exports.find_args(cmd);
				if (r !== null) {
					for (i in selection) {
						if (selection[i].MP != undefined) {
							selection[i].MP += +(r[0] || 0);
							selection[i].MP = Math.min(selection[i].MP, config.maxMP);
						}
					}
				}
				break;

			case (/^summon\(.*\)$/).test(cmd):
				var r = module.exports.find_args(cmd);
				if (r !== null) {
					var foundEntity = null;
					rp[msg.channel].mobs.forEach((o, i) => {
						if (o.name == r[1]) {
							foundEntity = i;
						}
					});
					if (foundEntity !== null) {
						var actMob = rp[msg.channel].mobs[foundEntity];
						rp[msg.channel].room.entities.push({id: foundEntity, HP: actMob.HP});
					}
				}
				break;
			case cmd == "room_next":
				rp[msg.channel].room = module.exports.createRoom(msg);
				module.exports.replyMessage(msg, "Moved to the next room!");
				io.displayRoom(msg);
				combat.reset_turns(msg);
				break;
			case (/^difficulty_inc\(.*\)$/).test(cmd):
				var r = module.exports.find_args(cmd);
				rp[msg.channel].difficulty = (+rp[msg.channel].difficulty + +rp[msg.channel].difficulty_increment * +((r || [1])[0])) + "";
				break;
			case cmd == 'ressuscite_players':
				for (char in rp[msg.channel].chars) {
					if (rp[msg.channel].chars[char].HP <= 0) {
						rp[msg.channel].chars[char].HP = config.maxHP/2;
						rp[msg.channel].chars[char].xp = 0;
					}
				}
				break;

			default:
				break;
		}
	}
	return true;
}
exports.find_args = function(string) {
	var matches, output = [];
	while (matches = reg_args.exec(string)) {
		output.push(matches[1]);
	}
	return output;
}
