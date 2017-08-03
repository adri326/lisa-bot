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

exports.replyMessage = function(msg, content) {
	// NOTE: Sends a message back
	var guild = bot.guilds.get(msg.guild);// || bot.guilds.get(msg.guild.id);
	if (guild!=undefined)
		guild.channels.get(msg.channel).send(content);
	//msg.channel.send(content);
}

exports.logMessage = function(msg) {
	console.log(msg.author_username + ":" + msg.author_discriminator + " => " + msg.content); // Log message content
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
