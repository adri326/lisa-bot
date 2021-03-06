const utils = require("../utils");
const io = require("../io");

exports.findSpell = function(msg, string) {
  for (spell in msg.rpg.spells) {
    var actSpell = msg.rpg.spells[spell];
    for (match in actSpell.matches) {
      var re = new RegExp(actSpell.matches[match].when, "i");
      var result = re.exec(string);
      if (!(result === null)) {
        return {
          name: actSpell.name,
          MP: actSpell.MP,
          data: result,
          action: actSpell.matches[match].action
        };
      }
    }
  }
  return null;
}

exports.executeSpell = function(msg, spell) {
  var caster = msg.rpg.chars[msg.author];
  if (caster.MP >= spell.MP) {
    caster.MP -= spell.MP;
    if (utils.execute_pseudocode(msg, spell.action, spell.data)) {
      utils.replyMessage(msg, io.say(msg, "spell_success"));
    }
  } else {
    utils.replyMessage(msg, io.say(msg, "error_not_enough_MP"));
  }
}
