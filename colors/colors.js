const fs = require("fs");

var parse = function parse(color) {
  var red, green, blue, int, named;
  var parsed = /^([a-f0-9])([a-f0-9])([a-f0-9])$/i.exec(color)
    || /^([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.exec(color);
  if (parsed !== null) {
    red = parseInt(parsed[1], 16);
    green = parseInt(parsed[2], 16);
    blue = parseInt(parsed[3], 16);
    int = parseInt(color, 16);
    html = "#" + color;
  }
  return {
    red: red,
    green: green,
    blue: blue,
    int: int,
    html: html
  }
}

var display = function display(color) {
  var parsed = parse(color);
  return "**`" + parsed.int + "`** (red: `" + parsed.red + "`, green: `" + parsed.green + "`, blue: `" + parsed.blue + "`)";
}

module.exports = () => {
  var colors = [];
  var list = fs.readFileSync("./colors/list.json");
  JSON.parse(list).forEach(o => {
    var sets = fs.readFileSync("./colors/sets/" + (o.file || o.name) + ".json");
    colors.push(Object.assign({sets: JSON.parse(sets)}, o));
  });
  colors["display"] = display;
  colors["parse"] = parse;
  return colors;
}
