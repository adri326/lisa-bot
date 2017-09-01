const fs = require("fs");

const utils = require("../utils");
const io = require("../io");

var colors = [];

function init() {
  var list = fs.readFileSync("./colors/list.json");
  JSON.parse(list).forEach(o => {
    var sets = fs.readFileSync("./colors/sets/" + (o.file || o.name) + ".json");
    colors.push(Object.assign({sets: JSON.parse(sets)}, o));
  });
  return colors;
}

function parse(color) {
  var red, green, blue, alpha;
  var parsed = /^#?([a-f0-9])([a-f0-9])([a-f0-9])([a-f0-9])?$/i.exec(color)
    || /^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})?$/i.exec(color);
  if (parsed !== null) {
    red = parseInt(parsed[1], 16);
    green = parseInt(parsed[2], 16);
    blue = parseInt(parsed[3], 16);
    alpha = parseInt(parsed[4], 16) || -1;
  }
  else {
    parsed = /^(?:rgb)?a?\( *(\d+) *, *(\d+) *, *(\d+) *,? *(\d+)?\)$/.exec(color);
    if (parsed !== null) {
      red = parseInt(parsed[1], 10);
      green = parseInt(parsed[2], 10);
      blue = parseInt(parsed[3], 10);
      alpha = parseInt(parsed[4], 10) || -1;
    }
  }
  return {
    red, green, blue, alpha
  }
}

function display(color) {
  var parsed = parse(color);
  return "**`" + convert(parsed, "int") + "`** (red: `" + parsed.red + "`, green: `" + parsed.green + "`, blue: `" + parsed.blue + "`)";
}

function convert(color, to) {
  let toHex = (int, len = 2) => {
    return ("00" + int.toString(16)).slice(-len);
  };

  if (to == "int") {
    return "" + (color.red * 65536 * (1 + 255 * (color.alpha != -1)) +
      color.green * 256 * (1 + 255 * (color.alpha != -1)) +
      color.blue * (1 + 255 * (color.alpha != -1)) +
      color.alpha * (color.alpha != -1));
  }
  if (to == "html") {
    return "#" + toHex(color.red) + toHex(color.green) + toHex(color.blue);
  }
  if (to == "long" || to == "rgb" || to == "html_long") {
    return "rgb(" + color.red.toString() + ", " + color.green.toString() + ", " + color.blue.toString() + ")";
  }
}

module.exports = (msg, commandParts, command) => {
  if (msg === "init") {
    init();
  }
  else {

    if (commandParts[1] == "list") {
      var setID = utils.getObjectID(colors, commandParts[2]);
      if (commandParts[2] == undefined || colorID == -1) {
        var mpages = Math.ceil(colors.length/config.itemsPerPage),
        page = Math.max(Math.min(+(commandParts[2] || 1), mpages), 1);
        var embed = {
          color: config.colors.colors,
          title: ("List of my handful colors (page " + page + "/" + mpages + ")"),
          description: "Those are all colors that I took from my environment, feel free to use them. You don't need to credit me, but I'd be very happy if you do!",
          fields: []
        };
        for (i = (page-1)*config.itemsPerPage; i < Math.min((page)*config.itemsPerPage, colors.length); i++) {
          embed.fields.push({name: colors[i].name || "*Unnamed*", value: colors[i].desc || "*No description given*"});
        }
        utils.replyMessage(msg, {embed: embed});
      }
      else if (setID > -1) {
        var colorID = utils.getObjectID(colors[setID].sets, commandParts[3]);
        if (colorID == -1) {
          var mpages = Math.ceil(colors[setID].sets.length/config.itemsPerPage),
          page = Math.max(Math.min(+(commandParts[3] || 1), mpages), 1);
          var embed = {
            color: config.colors.colors,
            title: ("List of my handful colors in " + colors[setID].name + " (page " + page + "/" + mpages + ")"),
            description: colors[setID].desc,
            fields: []
          };
          for (i = (page-1)*config.itemsPerPage; i < Math.min((page)*config.itemsPerPage, colors[setID].sets.length); i++) {
            embed.fields.push({name: colors[setID].sets[i].name || "*Unnamed*", value: colors[setID].sets[i].desc || "*No description given*"});
          }
          utils.replyMessage(msg, {embed: embed});
        }
        else if (colorID > -1) {
          var mpages = Math.ceil(colors[setID].sets[colorID].colors.length/config.itemsPerPage),
          page = Math.max(Math.min(+(commandParts[4] || 1), mpages), 1);
          var embed = {
            color: config.colors.colors,
            title: ("List of my handful colors in " + colors[setID].name + "/" + colors[setID].sets[colorID].name + " (page " + page + "/" + mpages + ")"),
            description: colors[setID].sets[colorID].desc,
            fields: []
          };
          for (i = (page-1)*config.itemsPerPage; i < Math.min((page)*config.itemsPerPage, colors[setID].sets[colorID].colors.length); i++) {
            var actColor = colors[setID].sets[colorID].colors[i];
            embed.fields.push({name: convert(parse(actColor), "html"), value: display(actColor)});
          }
          utils.replyMessage(msg, {embed: embed});
        }
      }
    }
    else if (commandParts[1] == "convert") {
      if (commandParts.length >= 4) {
        utils.replyMessage(msg, {embed: {
          title: "Result: " + convert(parse(commandParts[2]), commandParts[3].trim()),
          description: "Input: `" + commandParts[2] + "`\r\nType: `" + commandParts[3] + "`",
          color: config.colors.colors}});
      }
      else {
        utils.replyMessage(msg, io.say(msg, "error_syntax_see", {see: "l!help color"}));
      }
    }
    else {
      utils.replyMessage(msg, io.say(msg, "error_syntax_see", {see: "l!help color"}));
    }
  }
}
