const utils = require("../utils");

exports.applySpecieAttrs = function(msg, specieId) {
	if (utils.require(msg, reqs.has_char | reqs.are_species)) {
		var char = rp[msg.channel].chars[msg.author];
		var specie = rp[msg.channel].species[specieId];
		if (specie.base != null) {
			char.ATK = specie.attrs.ATK | config.defaults.ATK;
			char.DEF = specie.attrs.DEF | config.defaults.DEF;
			char.VIT = specie.attrs.VIT | config.defaults.VIT;
			char.MGC = specie.attrs.MAG | config.defaults.MAG;
			char.AGI = specie.attrs.AGI | config.defaults.AGI;
			char.STR = specie.attrs.STR | config.defaults.STR;
		} else {
			char.ATK = config.defaults.ATK;
			char.DEF = config.defaults.DEF;
			char.VIT = config.defaults.VIT;
			char.MGC = config.defaults.MAG;
			char.AGI = config.defaults.AGI;
			char.STR = config.defaults.STR;
		}
	}
};
