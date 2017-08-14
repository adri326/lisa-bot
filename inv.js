const utils = require("./utils");
const io = require("./io");
const combat = require("./combat");

exports.give = function(msg, from, to, item, _quantity="1", cheat=false) {
  if (rp[msg.channel].chars[to] != undefined) {
    quantity = parseInt(_quantity | "1");
    var objectId = utils.getObjectID(rp[msg.channel].objects, item);
    if (objectId != -1) {
      var canGive = true;
      if (!cheat) {
        canGive = false;
        var actChar = rp[msg.channel].chars[from];
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
        rp[msg.channel].chars[to].inventory.push({id: objectId, quantity: quantity});
        utils.replyMessage(msg, "Successully gave item to " + rp[msg.channel].chars[to].name + "!");
        return true;
      } else {
        if (quantity==1) {
          utils.replyMessage(msg, say("error_item_not_in_possession"));
          return false;
        }
        else {
          utils.replyMessage(msg, say("error_not_enough_item_in_possession"));
          return false;
        }
      }
    } else {
      utils.replyMessage(msg, "I couldn't find the object you were looking for!");
      return false;
    }
  } else {
    utils.replyMessage(msg, "The player doesn't have an in-game character!");
    return false;
  }
}
exports.hold = function(msg, item = "") {
  if (utils.require(msg, reqs.is_alive | reqs.has_char)) {
    var actChar = rp[msg.channel].chars[msg.author];
    var objectId = utils.getObjectID(utils.getIDMatchingObjects(rp[msg.channel].objects, actChar.inventory), item);
    if (objectId != -1) {
      if (actChar.holding != -1 && actChar.holding != undefined)
        actChar.inventory.push({id: actChar.holding, quantity: 1});
      actChar.holding = actChar.inventory[objectId].id;
      actChar.inventory.splice(objectId, 1);
      utils.replyMessage(msg, io.say(msg, "hold_success", {name: rp[msg.channel].objects[actChar.holding].name}));
      rp[msg.channel].turn_amount += combat.action_time(msg, "hold");
    } else {
      utils.replyMessage(msg, "Item not found!");
    }
  }
}
exports.equip = function(msg, item = "") {
  if (utils.require(msg, reqs.is_alive | reqs.has_char)) {
    var actChar = rp[msg.channel].chars[msg.author];
    var objectId = utils.getObjectID(utils.getIDMatchingObjects(rp[msg.channel].objects, actChar.inventory), item);
    if (objectId != -1) {
      if (rp[msg.channel].objects[actChar.inventory[objectId].id].class == "armor") {
        if (actChar.equipped != -1 && actChar.equipped != undefined)
          actChar.inventory.push({id: actChar.equipped, quantity: 1});
        actChar.equipped = actChar.inventory[objectId].id;
        actChar.inventory.splice(objectId, 1);
        utils.replyMessage(msg, io.say(msg, "equip_success", {name: rp[msg.channel].objects[actChar.equipped].name}));
        rp[msg.channel].turn_amount += combat.action_time(msg, "equip");
      }
      else {
        utils.replyMessage(msg, io.say(msg, "error_not_armor"));
      }
    } else {
      utils.replyMessage(msg, "Item not found!");
    }
  }
}
