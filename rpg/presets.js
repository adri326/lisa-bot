const fs = require("fs");
const CircularJSON = require("circular-json");
const utils = require("../utils");
const io = require("../io");

exports.loadPresets = function() {

  items = fs.readdirSync("./" + config.presetsdir + "/");
  if (items === null) {
		console.log("Error while listing the presets directory, please create it before starting the bot!");
		throw err;
	}
	if (items != null) {
    for (item in items) {
      var data = fs.readFileSync("./" + config.presetsdir + "/" + items[item]);
      if (data === null || data == undefined) {
        console.log("Error while loading "+config.presetsdir+"/"+items[item]+", skipping!");
      }
      else {
        var preset = CircularJSON.parse(data.toString());
        presets[preset.id] = preset;
      }
    }
  }
}
exports.import = function(msg, name) { // Import everything from the preset %name%.js into the roleplay of the channel
  var preset = presets[name || presets[utils.getObjectID(presets, name)]];
  if (preset != undefined) {
    for (setting in config.settingList) {
      var actSetting = rp[msg.channel][config.settingList[setting]];
      var foundElements = [];
      for (item in actSetting) {
        var id = utils.getObjectID(preset[config.settingList[setting]], actSetting[item].name);
        if (id != -1) {
          var foundPreset = preset[config.settingList[setting]][id];
          if (actSetting[item].source == preset.id) {
            actSetting[item] = Object.assign({}, foundPreset, {source: preset.id});
          }
          foundElements.push(actSetting[item].name);
        } else {
          if (actSetting[item].source == preset.id) {
            actSetting.splice(item, 1);
          }
        }
      }
      for (item in preset[config.settingList[setting]]) {
        var actPreset = preset[config.settingList[setting]][item];
        if (foundElements.indexOf(actPreset.name) <= -1) {
          actSetting.push(Object.assign({}, actPreset, {source: preset.id}));
        }
      }
    }
    utils.replyMessage(msg, io.say(msg, "import_preset_success"));
  } else {
    utils.replyMessage(msg, io.say(msg, "error_preset_not_found"));
  }
}
exports.remove = function(msg, name) {
  var preset = presets[name || presets[utils.getObjectID(presets, name)]];
  if (preset != undefined) {
    for (setting in config.settingList) {
      var actSetting = rp[msg.channel][config.settingList[setting]];
      for (item = 0; item < actSetting.length; item++) {
        if (actSetting[item].source == preset.id) {
          actSetting.splice(item, 1);
          item--;
        }
      }
    }
    utils.replyMessage(msg, say(msg, "remove_preset_success"));
  }
  else {
    utils.replyMessage(msg, say(msg, "error_preset_not_found"));
  }
}
