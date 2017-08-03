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

exports.combat = function(msg, playerID, mobID, mob_atk = false, player_atk = true) {
	var actRoom = rp[msg.channel].room;
	var player_raw = rp[msg.channel].chars[playerID];
	var player = {};
	player.item = attrmgt.treat(rp[msg.channel].objects[player_raw.holding], rp[msg.channel].species[player_raw.specieId | -1], rp[msg.channel].classes[player_raw.classId | -1]);
	player.ATK = (player.item.stats.ATK || 0) + (player_raw.ATK || 0);
	player.DEF = (player.item.stats.DEF || 0) + (player_raw.DEF || 0);
	player.VIT = (player.item.stats.VIT || 0) + (player_raw.VIT || 0);
	//console.log(CircularJSON.stringify(player));
	var mob_impl = actRoom.entities[mobID];
	var mob_raw = rp[msg.channel].mobs[mob_impl.id];
	var mob = {};
	mob.item = attrmgt.treat(rp[msg.channel].objects[mob_impl.holding], rp[msg.channel].species[mob_raw.specieId | -1], rp[msg.channel].classes[mob_raw.classId | -1]);
	mob.ATK = (mob.item.stats.ATK || 0) + (mob_raw.ATK || 0);
	mob.DEF = (mob.item.stats.DEF || 0) + (mob_raw.DEF || 0);
	//console.log(CircularJSON.stringify(mob));
	var PtMdmg = (player.ATK) / (0.01 * mob.DEF * mob.DEF + 1);
	var MtPdmg = (mob.ATK) / (0.01 * player.DEF * player.DEF + 1);

	if (player_atk) {
		mob_impl.HP -= PtMdmg;

		if (mob_impl.HP <= 0) {
			// Give the xp to the player
			var xp_togive = mob_impl.difficulty * mob_raw.HP
			utils.replyMessage(msg, "You killed " + mob_raw.name + " with " + Math.round(PtMdmg*10)/10 + " of damage!");

			actRoom.entities.splice(mobID, 1);

			var xp = utils.getObjectID(mob_raw.attrs, "xp_drop");
			if (xp != -1) {
				var a = parseInt(mob_raw.attrs[xp].values[0]);
				var b = parseInt(mob_raw.attrs[xp].values[1]);
				if (a !== null && b !== null) {
					module.exports.give_xp(msg, player_raw, utils.random(a, b), true);
				} else {
					utils.replyMessage(msg, io.say(msg, "error_attr_syntax"));
				}
			}
			return;
		} else {
			utils.replyMessage(msg, "You hit " + mob_raw.name + " with " + Math.round(PtMdmg*10)/10 + " of damage. " + Math.round(mob_impl.HP*10)/10  + " HP left.");
		}
	}

	if (mob_atk) {
		if (mob_impl.HP > 0) {
			player_raw.HP -= MtPdmg;

			if (player_raw.HP <= 0) {
				// TODO: le reste ici
				utils.replyMessage(msg, "You took " + Math.round(MtPdmg*10)/10 + " and YOU DIED. But idk what death is, so I'm gonna give you your health back!");
				player_raw.HP = 20;
			} else {
				utils.replyMessage(msg, "You took " + Math.round(MtPdmg*10)/10 + " of damage from " + mob_raw.name + ". " + Math.round(player_raw.HP*10)/10 + " HP left.");
			}
		}
	}
}

exports.mob_action = function(msg, mobID) {
	module.exports.combat(msg, msg.author, mobID, true, false);
}
