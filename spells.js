exports.findSpell = function(msg, string) {
  for (spell in rp[msg.channel].spells) {
    var actSpell = rp[msg.channel].spells[spell];
    for (match in actSpell.matches) {
      var re = new RegExp(actSpell.matches[match].when, "i");
      var result = re.exec(string);
      if (!(result === null)) {
        return {
          data: result,
          action: actSpell.matches[match].action
        };
      }
    }
  }
  return null;
}
