const path = require("path");
const utils = require("../utils");
const io = require("../io");
const attrmgt = require(path.join(__dirname, "/attrmgt"));

exports.hit = function(msg, someone) {
	if (someone.inv != undefined && someone.inv != null) {
		if (someone.inv.length > 0 && someone.holding > -1) {

		}
	}
	// (else)
	var s_t = attrmgt.treat(someone, msg.rpg.species[someone.specieId | -1], msg.rpg.classes[someone.classId | -1]);
	return s_t.stats["ATK"];
}
exports.give_xp = function(msg, someone, amount, disp = false) {

	someone.xp += amount;
	var lxp = utils.xp_per_level(someone.lvl);
	var text = io.say(msg, "player_got_xp", {name: someone.name, level: someone.lvl, xp: Math.round(someone.xp*10)/10, maxxp: lxp, amount: Math.round(amount*10)/10});
	if (someone.xp >= lxp) {
		while (someone.xp >= lxp) {
			someone.lvl++;
			someone.xp -= lxp;
			lxp = someone.lvl * someone.lvl * 100;
			var sub = module.exports.level_up_awards(msg, someone);
			if (sub !== null)
				text += "\r\n" + sub;
			text += "\r\n" + io.say(msg, "player_level_up", {name: someone.name, level: someone.lvl, xp: Math.round(someone.xp*10)/10, maxxp: lxp})
		}
	}
	[someone.holding, someone.equipped].forEach(child => {
		var object = msg.rpg.objects[child.id];
		if (object != undefined) {
			if (child.level < object.maxlevel || 1) {
				child.xp += amount;
				var lxp = object.xp_per_level || config.defaults.object_xp_per_level;
				while (child.xp >= lxp) {
					if (child.level < object.maxlevel) {
						child.level++;
						text += "\r\n" + io.say(msg, "object_level_up", {name: object.name, holder: someone.name});
					}
					child.xp -= lxp;
				}
			}
		}
	});

	if (disp) {
		utils.replyMessage(msg, text);
	}
	return text;
}
exports.level_up_awards = function(msg, someone) {
	someone.skill_points += Math.max(0, msg.rpg.skill_points_per_level);
	if (msg.rpg.skill_points_per_level>0) {
		return io.say(msg, "player_got_skill_points", {name: someone.name, amount: msg.rpg.skill_points_per_level});
	}
	return null;
}

exports.action_time = function(msg, action_name) { // Actions parser and calculator
	if (utils.require(msg, reqs.has_char)) {
		var action = config.actions_times[action_name];
		if (action != undefined) {
			if (typeof(action) === "object") {
				var base = action.base || 1;
				var speed = action.speed || base;
				var speed_range = action.speed_range || 10;
				var player_speed = msg.rpg.chars[msg.author].VIT;
				return base - utils.sigma(player_speed/speed_range)*speed;
			} else {
				return +action;
			}
		}
	}
}

exports.reset_turns = function(msg) {

}

exports.calc_item_stats = function(msg, id, level) {
	var object = msg.rpg.objects[id];
	if (object != undefined) {
		var output = {
			name: object.name,
			desc: object.desc,
			class: object.class,
			subclass: object.subclass,
			attrs: object.attrs.map(item => item),
			level: level,
			maxlevel: object.maxlevel
		};
		if (typeof(object.levels_affect) === "object") {
			Object.keys(object.levels_affect).forEach(o => {
				output.attrs.push({name: "stat_add", values: [o, +object.levels_affect[o] * (level-1)]});
			});
		}
		return output;
	}
}

exports.combat = function(msg, playerID, mobID, mob_atk = false, player_atk = true) {
	var text = "";

	var actRoom = msg.rpg.room;
	var player_raw = msg.rpg.chars[playerID];
	var player = {};
	player.item = attrmgt.treat(module.exports.calc_item_stats(msg, player_raw.holding.id, player_raw.holding.level), msg.rpg.species[player_raw.specieId | -1], msg.rpg.classes[player_raw.classId | -1]);
	player.armor = attrmgt.treat(module.exports.calc_item_stats(msg, player_raw.equipped.id, player_raw.equipped.level), msg.rpg.species[player_raw.specieId | -1], msg.rpg.classes[player_raw.classId | -1]);
	player.ATK = (player.item.stats.ATK || 0) + (player_raw.ATK || 0) + (player.armor.stats.ATK || 0);
	player.DEF = (player.item.stats.DEF || 0) + (player_raw.DEF || 0) + (player.armor.stats.DEF || 0);
	player.VIT = (player.item.stats.VIT || 0) + (player_raw.VIT || 0) + (player.armor.stats.VIT || 0);
	player.AGI = (player.item.stats.AGI || 0) + (player_raw.AGI || 0) + (player.armor.stats.AGI || 0);
	//console.log(CircularJSON.stringify(player));
	var mob_impl = actRoom.entities[mobID];
	var mob_raw = msg.rpg.mobs[mob_impl.id];
	var mob = {};
	mob.item = attrmgt.treat(module.exports.calc_item_stats(msg, mob_impl.holding.id, mob_impl.holding.level), msg.rpg.species[mob_raw.specieId | -1], msg.rpg.classes[mob_raw.classId | -1]);
	mob.ATK = (mob.item.stats.ATK || 0) + (mob_raw.ATK || 0);
	mob.DEF = (mob.item.stats.DEF || 0) + (mob_raw.DEF || 0);
	mob.AGI = (mob.item.stats.AGI || 0) + (mob_raw.AGI || 0);
	//console.log(CircularJSON.stringify(mob));
	var PtMdmg = (player.ATK) / (0.01 * mob.DEF * mob.DEF + 1);
	var MtPdmg = (mob.ATK) / (0.01 * player.DEF * player.DEF + 1);

	if (player_atk) {
		var hit_prob = Math.min(1-utils.sigma(Math.sinh(mob.AGI - player.AGI + 0.5) * config.dodge_probability)/2,1);
		var hit = utils.random(0, 1) < hit_prob;

		if (hit)
			mob_impl.HP -= PtMdmg;

		if (mob_impl.HP <= 0) {
			// Give the xp to the player
			var xp_togive = mob_impl.difficulty * mob_raw.HP
			text += io.say(msg, "mob_killed", {amount: Math.round(PtMdmg*10)/10, name: mob_raw.name, player: player_raw.name});

			actRoom.entities.splice(mobID, 1);

			var xp = utils.getObjectID(mob_raw.attrs, "xp_drop");
			if (xp != -1) {
				var a = parseInt(mob_raw.attrs[xp].values[0]);
				var b = parseInt(mob_raw.attrs[xp].values[1]);
				if (a !== null && b !== null) {
					text += "\r\n" + module.exports.give_xp(msg, player_raw, utils.random(a, b), false);
				} else {
					utils.replyMessage(msg, io.say(msg, "error_attr_syntax"));
				}
			}
			mob_raw.attrs.forEach(o => {
				if (o.name == "item_drop") {
					var rate = +o.values[1] || 1;
					if (utils.random(0, 1) <= rate) {
						msg.rpg.objects.forEach((p, i) => {
							if (p.name == o.values[0]) {
								msg.rpg.room.items.push({id: i, quantity: 1});
								text += "\r\n" + io.say(msg, "mob_drops", {name: mob_raw.name, object: msg.rpg.objects[i].name});
							}
						});
					}
				}
			});
			return text;
		}
		else if (hit) {
			text += "\r\n" + "You hit " + mob_raw.name + " with " + Math.round(PtMdmg*10)/10 + " of damage. " + Math.round(mob_impl.HP*10)/10  + " HP left.";
		}
		else if (!hit) {
			text += io.say(msg, "mob_dodged", {name: mob_raw.name, player: player_raw.name})
		}
	}

	if (mob_atk) {
		if (mob_impl.HP > 0) {
			var hit_prob = Math.min(1-utils.sigma(Math.sinh(player.AGI - mob.AGI + 0.5) * config.dodge_probability)/2,1);
			var hit = utils.random(0, 1) < hit_prob;
			if (hit)
				player_raw.HP -= MtPdmg;

			if (player_raw.HP <= 0) {
				// TODO: le reste ici
				text += "\r\n" + "You took " + Math.round(MtPdmg*10)/10 + " and **YOU DIED**. You will ressuscite when entering the next room!"
				player_raw.HP = 0;
			}
			else if (hit) {
				text += "\r\n" + "You took " + Math.round(MtPdmg*10)/10 + " of damage from " + mob_raw.name + ". " + Math.round(player_raw.HP*10)/10 + " HP left."
			}
			else if (!hit) {
				text += io.say(msg, "player_dodged", {name: mob_raw.name, player: player_raw.name});
			}
		}
	}
	return text;
}

exports.mob_action = function(msg, mobID) {
	if (msg.rpg.room.entities[mobID] != undefined) return module.exports.combat(msg, msg.author, mobID, true, false);
	return "";
}
