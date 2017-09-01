const path = require("path");
const utils = require("../utils");
const io = require("../io");
const combat = require(path.join(__dirname, "/combat"));

exports.give = function(msg, from, to, item, _quantity="1", cheat=false) {
  if (msg.rpg.chars[to] != undefined) {
    quantity = parseInt(_quantity | "1");
    var objectId = utils.getObjectID(msg.rpg.objects, item);
    var level = 1;
    var xp = 0;
    if (objectId != -1) {
      var canGive = true;
      if (!cheat) {
        canGive = false;
        var actChar = msg.rpg.chars[from];
        for (item in actChar.inventory) {
          if (actChar.inventory[item].id == objectId) {
            level = actChar.inventory[item].level || level;
            xp = actChar.inventory[item].xp || xp;
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
        msg.rpg.chars[to].inventory.push({id: objectId, quantity: quantity, level: level});
        utils.replyMessage(msg, "Successully gave item to " + msg.rpg.chars[to].name + "!");
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
    var actChar = msg.rpg.chars[msg.author];
    var objectId = utils.getObjectID(utils.getIDMatchingObjects(msg.rpg.objects, actChar.inventory), item);
    if (objectId != -1) {
      if (actChar.holding != -1 && actChar.holding != undefined)
        actChar.inventory.push(actChar.holding);
      actChar.holding = Object.assign({level: 1, xp: 0}, actChar.inventory[objectId]);
      actChar.inventory.splice(objectId, 1);
      utils.replyMessage(msg, io.say(msg, "hold_success", {name: msg.rpg.objects[actChar.holding.id].name}));
      msg.rpg.turn_amount += combat.action_time(msg, "hold");
    } else {
      utils.replyMessage(msg, "Item not found!");
    }
  }
}
exports.equip = function(msg, item = "") {
  if (utils.require(msg, reqs.is_alive | reqs.has_char)) {
    var actChar = msg.rpg.chars[msg.author];
    var objectId = utils.getObjectID(utils.getIDMatchingObjects(msg.rpg.objects, actChar.inventory), item);
    if (objectId != -1) {
      if (msg.rpg.objects[actChar.inventory[objectId].id].class == "armor") {
        if (actChar.equipped != -1 && actChar.equipped != undefined)
          actChar.inventory.push(actChar.equipped);
        actChar.equipped = Object.assign({level: 1, xp: 0}, actChar.inventory[objectId]);
        actChar.inventory.splice(objectId, 1);
        utils.replyMessage(msg, io.say(msg, "equip_success", {name: msg.rpg.objects[actChar.equipped.id].name}));
        msg.rpg.turn_amount += combat.action_time(msg, "equip");
      }
      else {
        utils.replyMessage(msg, io.say(msg, "error_not_armor"));
      }
    } else {
      utils.replyMessage(msg, "Item not found!");
    }
  }
}
