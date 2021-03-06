var CircularJSON = require("circular-json");

exports.treat = function(obj, specie, holder_class) {
  var treatedObj = {};
  if (obj != null && obj != undefined) {
    treatedObj.name = obj.name;
    treatedObj.desc = obj.desc;
    treatedObj.class = obj.class;
    treatedObj.subclass = obj.subclass;
  } else {
    treatedObj.name = "";
    treatedObj.desc = "";
    treatedObj.class = "";
    treatedObj.subclass = "";
  }
  treatedObj.attrs = [];
  treatedObj.stats = {};
  if (obj !== undefined) {
    if (obj.attrs != undefined && obj.attrs != null)
    for (i in obj.attrs) {
      // NOTE: Step 1; object attrs
      this.executeAttr(treatedObj, obj.attrs[i], true);
    }
  }
  if (specie !== undefined && specie != null) {
    if (specie.attrs != undefined && specie.attrs != null)
    for (i in specie.attrs) {
      this.executeAttr(treatedObj, specie.attrs[i], false);
    }
  }
  if (holder_class !== undefined && holder_class != null) {
    if (holder_class.attrs != undefined && holder_class.attrs != null)
    for (i in holder_class.attrs) {
      this.executeAttr(treatedObj, holder_class.attrs[i], false);
    }
  }
  return treatedObj;
}

exports.executeAttr =  function(obj, attr, is_object) {
  if (is_object && attr.name == "base_stat") {
    var value = attr.values[1];
    if (attr.values[2] != null) {
      if (attr.values[2] == "int") {
        value = parseInt(value);
      } else if (attr.values[2] == "float") {
        value = parseFloat(value);
      }
    }
    obj.stats[attr.values[0]] = value;
  } else if (is_object && attr.name == "stat_mult" || attr.name == "obj_stat_mult" ||
    is_object && attr.name == "stat_add" || attr.name == "obj_stat_add") {
    var mod_val, stat_name;
    if (attr.name == "obj_stat_mult" || attr.name == "obj_stat_add") {
      // Big, ugly, class verification
      //console.log(typeof(attr.values[0]) + ": " + attr.values[0]);
      if (module.exports.isSelected(attr.values[0], obj)) {
          mod_val = parseFloat(attr.values[2]);
          stat_name = attr.values[1];
      }
    } else {
      mod_val = parseFloat(attr.values[1]);
      stat_name = attr.values[0];
    }
    if (stat_name != undefined) {
      if (typeof obj.stats[stat_name] == 'number') {
        if (attr.name == "stat_mult" || attr.name == "obj_stat_mult")
        obj.stats[stat_name] *= mod_val;
        else if (attr.name == "stat_add" || attr.name == "obj_stat_add")
        obj.stats[stat_name] += mod_val;
      }
    }
  }
}
module.exports.isSelected = function isSelected(selecter, obj) {
  var result = false;
  if (selector == "*") result = true;
  if (selector.startsWith("@")) {
    var subselector = selector.slice("/");
    if (subselector[0].startsWith("@!")) {
      result = result && subselector[0].slice(2) != obj.class;
    }
    else {
      result = result && subselector[0].slice(1) == obj.class;
    }
    if (subselector[1] != undefined) {
      if (subselector[1].startsWith("!")) {
        result = result && subselector[1].slice(1) != obj.subclass;
      }
      else {
        result = result && subselector[1] == obj.subclass
      }
    }
  }
  if (selector == obj.name) result = true;
  return result;
}
