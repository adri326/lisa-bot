const fs = require("fs");
const CircularJSON = require("circular-json");

exports.loadPresets = function() {

  fs.readdir("./" + config.presetsdir + "/", (err, items) => {
    if (err) {
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
  });
}
