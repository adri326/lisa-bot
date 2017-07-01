var CircularJSON = require("circular-json");

exports.init = function() {
  return {
    treat: function(obj, specie, holder_class) {
      var treatedObj = {};
      treatedObj.name = obj.name;
      treatedObj.desc = obj.desc;
      treatedObj.class = obj.class;
      treatedObj.subclass = obj.subclass;
      treatedObj.attrs = [];
      treatedObj.stats = {};
      for (i in obj.attrs) { // NOTE: Step 1; object attrs
        this.executeAttr(treatedObj, obj.attrs[i], true);
      }
      for (i in specie.attrs) {
        this.executeAttr(treatedObj, specie.attrs[i], false);
      }
      for (i in holder_class.attrs) {
        this.executeAttr(treatedObj, holder_class.attrs[i], false);
      }
      return treatedObj;
    },
    executeAttr: function(obj, attr, is_object) {
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
          console.log(typeof(attr.values[0]) + ": " + attr.values[0]);
          if (attr.values[0] == "*" ||
            attr.values[0].startsWith("@") &&
            attr.values[0].slice(1) == obj.class
            && (
              ! (attr.values[0].indexOf("/") > -1) ||
              attr.values[0].split("/")[1] == obj.subclass
            ) ||
            attr.values[0] == obj.name) {
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
  };
}
