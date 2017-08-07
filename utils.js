const io = require("./io");

exports.require = function(msg, requirements = 0) {
	if ((requirements & reqs.has_char) == reqs.has_char) {
		// User has character
		if (rp[msg.channel].chars[msg.author] === undefined) {
			module.exports.replyMessage(msg, io.say(msg, "error_no_char"));
			return false;
		}
	}
	if ((requirements & reqs.has_class) == reqs.has_class) {
		// User has class
		var user = rp[msg.channel].chars[msg.author];
		if (user.classId == -1 || user.classId === undefined) {
			module.exports.replyMessage(msg, io.say(msg, "error_char_no_class"));
			return false;
		}
	}
	if ((requirements & reqs.has_specie) == reqs.has_specie) {
		// User has specie
		var user = rp[msg.channel].chars[msg.author];
		if (user.specieId == -1 || user.specieId === undefined) {
			module.exports.replyMessage(msg, io.say(msg, "error_char_no_specie"));
			return false;
		}
	}
	if ((requirements & reqs.are_classes) == reqs.are_classes) {
		// Are there classes
		if (rp[msg.channel].classes === undefined || (rp[msg.channel].classes || []).length == 0) {
			module.exports.replyMessage(msg, io.say(msg, "error_no_class"));
			return false;
		}
	}
	if ((requirements & reqs.are_species) == reqs.are_species) {
		// Are there species
		if (rp[msg.channel].species === undefined || (rp[msg.channel].species || []).length == 0) {
			module.exports.replyMessage(msg, io.say(msg, "error_no_specie"));
			return false;
		}
	}
	if ((requirements & reqs.are_mobs) == reqs.are_mobs) {
		// Are there mobs
		if (rp[msg.channel].mobs === undefined || (rp[msg.channel].mobs || []).length == 0) {
			module.exports.replyMessage(msg, io.say(msg, "error_no_mob"));
			return false;
		}
	}
	if ((requirements & reqs.are_objects) == reqs.are_objects) {
		// Are there objects
		if (rp[msg.channel].objects === undefined || (rp[msg.channel].objects || []).length == 0) {
			module.exports.replyMessage(msg, io.say(msg, "error_no_object"));
			return false;
		}
	}
	if ((requirements & reqs.has_class) == reqs.has_class && (requirements & reqs.are_classes) == reqs.are_classes) {
		// User has *valid* class
		if (rp[msg.channel].classes[rp[msg.channel].chars[msg.author].classId] === undefined) {
			module.exports.replyMessage(msg, io.say(msg, "error_char_class_invalid"));
			return false;
		}
	}
	if ((requirements & reqs.has_specie) == reqs.has_specie && (requirements & reqs.are_species) == reqs.are_species) {
		// User has *valid* specie
		if (rp[msg.channel].species[rp[msg.channel].chars[msg.author].specieId] === undefined) {
			module.exports.replyMessage(msg, io.say(msg, "error_char_specie_invalid"));
			return false;
		}
	}
	if ((requirements & reqs.is_room) === reqs.is_room) {
		if (rp[msg.channel].room === undefined) {
			module.exports.replyMessage(msg, io.say(msg, "error_no_room"));
			return false;
		}
	}
  if ((requirements & reqs.are_mobs_in_room) === reqs.are_mobs_in_room) {
    if (rp[msg.channel].room.entities.length == 0) {
      module.exports.replyMessage(msg, io.say(msg, "error_no_mob_in_room"));
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

exports.getObjectID = function(obj_list, name) {
	var foundId = -1;
	if (typeof(name) == "string") {
		if (name.startsWith("#")) {
			return parseInt(name.slice(1));
		}

		for (i in obj_list) {
			if (obj_list[i].name == name) {
				foundId = i;
				break;
			}
		}
	}
	return foundId;
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
		xp: 0,
		lvl: 1
	};
	char.ATK = config.defaults.ATK;
	char.DEF = config.defaults.DEF;
	char.VIT = config.defaults.VIT;
	char.MGC = config.defaults.MGC;
	char.AGI = config.defaults.AGI;
	char.STR = config.defaults.STR;
	char.HP = config.defaults.HP;
	return char;
}

exports.createRoom = function(msg) {
	var difficulty = rp[msg.channel].difficulty;
	var room = {
		entities: [],
		items: []
	};
	var mobCount = module.exports.random(Math.sqrt(difficulty), difficulty);
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
				room.entities.push({id: n, HP: HP, MP: rp[msg.channel].mobs[n].MP, holding: module.exports.getObjectID(rp[msg.channel].objects, rp[msg.channel].mobs[n].holding)});
				found = true;
			}
		}
	}
	return room;
}
