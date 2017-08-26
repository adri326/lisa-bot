const utils = require("../utils");

exports.applySpecieAttrs = function(msg, specieId) {
	if (utils.require(msg, reqs.has_char | reqs.are_species)) {
		var char = msg.rpg.chars[msg.author];
		var specie = msg.rpg.species[specieId];
		if (specie !== null && specie !== undefined) {
			char.ATK = specie.ATK | config.defaults.ATK;
			char.DEF = specie.DEF | config.defaults.DEF;
			char.VIT = specie.VIT | config.defaults.VIT;
			char.MGC = specie.MGC | config.defaults.MGC;
			char.AGI = specie.AGI | config.defaults.AGI;
			char.STR = specie.STR | config.defaults.STR;
		} else {
			char.ATK = config.defaults.ATK;
			char.DEF = config.defaults.DEF;
			char.VIT = config.defaults.VIT;
			char.MGC = config.defaults.MGC;
			char.AGI = config.defaults.AGI;
			char.STR = config.defaults.STR;
		}
	}
};
