const utils = require("./utils");

exports.give = function(msg, from, to, item, _quantity="1", cheat=false) {
  if (rp[msg.channel].chars[player] != undefined) {
    quantity = parseInt(_quantity | "1");
    var objectId = utils.getObjectID(rp[msg.channel].objects, item);
    if (objectId != -1) {
      var canGive = true;
      if (!cheat) {
        canGive = false;
        var actChar = rp[msg.channel].chars[msg.author];
        for (item in actChar.inventory) {
          if (actChar.inventory[item].id == objectId) {
            if (actChar.inventory[item].quantity < quantity) {
              actChar.inventory[item].quantity -= quantity;
              canGive = true;
            } else if (actChar.inventory[item].quantity == quantity) {
              actChar.inventory.splice(item);
              canGive = true;
            }
            break;
          }
        }
      }
      if (canGive) {
        rp[msg.channel].chars[player].inventory.push({id: objectId, quantity: quantity});
        utils.replyMessage(msg, "Successully gave item to " + rp[msg.channel].chars[player].name + "!");
      } else {
        if (quantity==1)
          utils.replyMessage(msg, say("error_item_not_in_possession"));
        else
          utils.replyMessage(msg, say("error_not_enough_item_in_possession"));
      }
    } else {
      utils.replyMessage(msg, "I couldn't find the object you were looking for!");
    }
  } else {
    utils.replyMessage(msg, "The player doesn't have an in-game character!");
  }
}
