const utils = require("./utils");
const attrmgt = require("./attrmgt");

exports.hit = function(msg, someone) {
	if (someone.inv != undefined && someone.inv != null) {
		if (someone.inv.length > 0 && someone.holding > -1) {

		}
	}
	// (else)
	var s_t = attrmgt.treat(someone, rp[msg.channel].species[someone.specieId | -1], rp[msg.channel].classes[someone.classId | -1]);
	return s_t.stats["ATK"];
}
exports.give_xp = function(msg, someone, amount, disp = false) {

	someone.xp += amount;
	var lxp = someone.lvl * someone.lvl * 100;
	if (someone.xp >= lxp) {
		while (someone.xp >= lxp) {
			someone.lvl++;
			someone.xp -= lxp;
			lxp = someone.lvl * someone.lvl * 100;
		}
	}
	if (disp) {
		utils.replyMessage(msg, someone.name + " got " + Math.round(amount) + " xp points. He/she has now: " + Math.round(someone.xp) + "/" + lxp + " lvl: " + someone.lvl);
	}
}

exports.action_time = function(msg, action_name) { // Actions parser and calculator
	if (utils.require(msg, reqs.has_char)) {
		var action = config.actions_times[action_name];
		if (action != undefined) {
			if (typeof(action) === "object") {
				var base = action.base || 1;
				var speed = action.speed || base;
				var speed_range = action.speed_range || 10;
				var player_speed = rp[msg.channel].chars[msg.author].VIT;
				return base - utils.sigma(player_speed/speed_range)*speed;
			} else {
				return +action;
			}
		}
	}
}

exports.reset_turns = function(msg) {
	
}
