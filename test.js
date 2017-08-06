const fs = require("fs");
const Discord = require("discord.js");
const CircularJSON = require("circular-json");

const utils = require("./utils");
const attrmgt = require("./attrmgt");
const inv = require("./inv");
const io = require("./io");
const specie = require("./specie");
const combat = require("./combat");
const presets_mod = require("./presets");
const spells = require("./spells");

reqs = {
	has_char: 1,
	has_class: 2,
	has_specie: 4,
	are_classes: 8,
	are_species: 16,
	are_mobs: 32,
	are_objects: 64,
	is_room: 128,
	are_mobs_in_room: 256
};
config = {};
talking = [{
	state: false,
	id: 0,
	trigger: function(msg) {}
}];

// Read data.json
data = fs.readFileSync("./config.json");

if (data === null) {
	console.log("Error while reading the config.json file, be sure to have it with the right name and with the right permissions!");
	throw err;
}
console.log("Successfully read config.json, parsing its data ...");
// Success; Parse data.json
config = JSON.parse(data.toString());
console.log("Successfully parsed config data, loading the token ...");

var msg = {
  author: "0",
  channel: "0",
  guild: "0",
  author_username: "test0u",
  author_discriminator: "0000d"
};

rp = [];
presets = [];
lang = "en";
presets_mod.loadPresets();

config._no_message = true;
rp["0"] = utils.createRP(msg);
rp["0"].chars["0"] = utils.createChar("0", "test0c");
presets_mod.import(Object.assign({content: "l!rp admin import default"}, msg), "default");
console.log(CircularJSON.stringify(rp));
console.log(CircularJSON.stringify(presets));

console.log(CircularJSON.stringify(spells.findSpell(Object.assign({content: "l!rp spell inferno"}, msg), "inferno")));
