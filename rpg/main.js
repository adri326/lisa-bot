const path = require("path");
const CircularJSON = require("circular-json");

const utils = require("../utils");
const io = require("../io");
const spells = require(path.join(__dirname, "/spells"));
const specie = require(path.join(__dirname, "/specie"));
const combat = require(path.join(__dirname, "/combat"));
const inv = require(path.join(__dirname, "/inv"));
const presets_mod = require(path.join(__dirname, "/presets"));
const attrmgt = require(path.join(__dirname, "/attrmgt"));


module.exports = function main(msg, commandParts, command) {
  if (rp[msg.guild] === null || rp[msg.guild] == undefined) {
    // NOTE: Init RP if not done
    initRP(msg);
  }
  else {
    var turns_embed = {
      color: config.colors.dungeon,
      fields: []
    };
    var players_turn = "";
    if (msg.rpg.turn_type == 0) {
      msg.rpg.turn_amount = 0;
    }

    if (commandParts[1] == "char") {
      if (commandParts[2] == "create") {
        io.askChar(msg);
      }
      else if (commandParts[2] == "list") {
        utils.replyMessage(msg, io.say(msg, "list_chars"));
      }
      else if (commandParts[2] == "class") {
        io.askClass(msg);
      }
      else if (commandParts[2] == "specie") {
        io.askSpecie(msg);
      }
      else if (commandParts[2] == null || commandParts[2].length == 0 || commandParts[2] == "disp") {
        if (commandParts[3] == undefined || commandParts[3] === null) {
          io.displayChar(msg, msg.author);
        }
        else {
          for (player in msg.rpg.chars) {
            if (msg.rpg.chars[player].name.toLowerCase() == commandParts[3].toLowerCase()) {
              io.displayChar(msg, player);
              break;
            }
          }
        }
      }
    }
    else if (commandParts[1] == "inv") {
      if (commandParts[2] == undefined || commandParts[2] == "list") {
        io.displayInv(msg);
      }
      else if (commandParts[2] == "desc") {
        var objectID = utils.getObjectID(msg.rpg.objects, commandParts[3]);
        var level = 1;
        msg.rpg.chars[msg.author].inventory.forEach(o => {
          if (o.id == objectID) {
            level = o.level;
          }
        });
        if (msg.rpg.chars[msg.author].holding.id == objectID) {
          level = msg.rpg.chars[msg.author].holding.level;
        }
        if (msg.rpg.chars[msg.author].equipped.id == objectID) {
          level = msg.rpg.chars[msg.author].equipped.level;
        }
        utils.replyMessage(msg, io.displayItemFancy(msg, combat.calc_item_stats(msg, objectID, level), msg.rpg.chars[msg.author]));
      }
      else if (commandParts[2] == "give" || commandParts[2] == "cgive" && canCheat(msg)) {
        msg.rpg.turn_amount += combat.action_time(msg, "give_cheat");
        if (commandParts[3] == "self" && canCheat(msg)) {
          var objectInfo = utils.splitCommand(command.slice(17));
          var objectId = utils.getObjectID(msg.rpg.objects, objectInfo[0]);
          if (objectId != -1) {
            msg.rpg.chars[msg.author].inventory.push({id: objectId, quantity: parseInt(objectInfo[1] | "1")});
            utils.replyMessage(msg, "Successfully gave the item!");
          } else {
            utils.replyMessage(msg, "I couldn't find the object you were looking for!");
          }
        } else {
          if (utils.require(msg, reqs.is_alive | reqs.has_char)) {
            var player = "";
            if (commandParts[3].startsWith("<@")) {
              player = commandParts[3].slice(2, commandParts[3].length - 1);
            } else {
              Object.keys(msg.rpg.chars).forEach(key => {
                if (msg.rpg.chars[key].name == commandParts[3]) {
                  player = key;
                }
              });
            }
            if (inv.give(msg, msg.author, player, commandParts[4], commandParts[5], commandParts[2]=="cgive")) {
              if (commandParts[2] == "cgive") {
                msg.rpg.turn_amount += combat.action_time(msg, "give_cheat");
              }
              else {
                msg.rpg.turn_amount += combat.action_time(msg, "give");
              }
            }
          }
        }
      }
      else if (commandParts[2] == "hold") {
        inv.hold(msg, commandParts[3]);
      }
      else if (commandParts[2] == "equip") {
        inv.equip(msg, commandParts[3]);
      }
      else if (commandParts[2] == "pick") {
        if (utils.require(msg, reqs.is_alive | reqs.has_char)) {
          var pickable = utils.getObjectID(utils.getIDMatchingObjects(msg.rpg.objects, msg.rpg.room.items), commandParts[3]);
          if (pickable !== -1 && msg.rpg.room.items[pickable] !== null) {
            msg.rpg.chars[msg.author].inventory.push(msg.rpg.room.items[pickable]);
            utils.replyMessage(msg, io.say(msg, "item_pick_success", {name: msg.rpg.objects[msg.rpg.room.items[pickable].id].name}));
            msg.rpg.room.items.splice(pickable, 1);
          } else {
            utils.replyMessage(msg, io.say(msg, "error_item_not_in_room"));
          }
        }
      }
      else if (commandParts[2] == "drop") {
        if (utils.require(msg, reqs.is_alive | reqs.has_char)) {
          var foundID = utils.getObjectID(utils.getIDMatchingObjects(msg.rpg.objects, msg.rpg.chars[msg.author].inventory), commandParts[3]);
          if (foundID != -1) {
            msg.rpg.room.items.push(msg.rpg.chars[msg.author].inventory[foundID]);
            utils.replyMessage(msg, io.say(msg, "item_drop_success", {name: msg.rpg.objects[msg.rpg.chars[msg.author].inventory[foundID].id].name}));
            msg.rpg.chars[msg.author].inventory.splice(foundID, 1);
          }
          else {
            utils.replyMessage(msg, io.say(msg, "error_item_not_in_possession"));
          }
        }
      }
    }
    else if (commandParts[1] == "skill" || commandParts[1] == "skills") {
      if (commandParts[2] == undefined || commandParts[2] == "" || commandParts[2] === null || commandParts[2] == "disp") {
        io.displaySkills(msg, msg.author);
      }
      else if (commandParts[2] == "assign") {
        if (utils.require(msg, reqs.has_char)) {
          var actChar = msg.rpg.chars[msg.author];
          if (actChar.skill_points > 0) {
            if (config.baseStats.includes(commandParts[3]) && commandParts[3] != "HP" && commandParts[3] != "MP" && actChar[commandParts[3]] != undefined) {
              if (actChar[commandParts[3]] === null || isNaN(actChar[commandParts[3]])) {
                actChar[commandParts[3]] = config.defaults[commandParts[3]] + 1;
              }
              else {
                actChar[commandParts[3]]++;
              }
              utils.replyMessage(msg, io.say(msg, "skill_assign_success", {name: commandParts[3]}));
            }
            else {
              utils.replyMessage(msg, io.say(msg, "error_stat_syntax"));
            }
          }
          else {
            utils.replyMessage(msg, io.say(msg, "error_not_enough_skill_points"));
          }
        }
      }
    }
    else if (commandParts[1] == "room") {
      if (commandParts[2] == undefined) {
        io.displayRoom(msg);
      }
      else if (commandParts[2] == "next") {
        if (utils.require(msg, reqs.is_room | reqs.are_mobs | reqs.has_char | reqs.is_alive)) {
          if (msg.rpg.room.entities.length == 0) {
            msg.rpg.room = utils.createRoom(msg);
            utils.replyMessage(msg, "Moved to the next room!");
            io.displayRoom(msg);
            combat.reset_turns(msg);
            msg.rpg.difficulty = (+msg.rpg.difficulty + +msg.rpg.difficulty_increment) + "";
            for (char in msg.rpg.chars) {
              if (msg.rpg.chars[char].HP <= 0) {
                msg.rpg.chars[char].HP = config.maxHP/2;
                msg.rpg.chars[char].xp = 0;
                players_text += "\r\n" + io.say(msg, "player_ressuscited", {name: msg.rpg.chars[char].name});
              }
            }
          }
          else {
            utils.replyMessage(msg, "Not every mob has been killed!");
          }
        }
      }
      else if (commandParts[2] == "init") {
        if (msg.rpg.room == undefined) {
          msg.rpg.room = utils.createRoom(msg);
          io.displayRoom(msg);
          combat.reset_turns(msg);
        }
      }
      else if (commandParts[2] == "use") {
        var actRoom = msg.rpg.room;
        for (s = 0; s < actRoom.structures.length; s++) {
          var actStruct = config.structures[actRoom.structures[s]];
          if (actStruct != undefined) {
            if (actStruct.name.toLowerCase() == commandParts[3].toLowerCase()) {
              players_text += io.say(msg, "use_structure", {name: actStruct.name, player: msg.rpg.chars[msg.author].name});
              if (actStruct.vanish) {
                actRoom.structures.splice(s, 1);
                s--;
              }
              utils.execute_pseudocode(msg, actStruct.action);
              break;
            }
          }
        }
      }
    }
    else if (commandParts[1] == "save") {
      /* NOTE: Save the game */
      // DEPRECATED

      saveRP(msg.channel);
      utils.replyMessage(msg, "*I'll try to remember your tale, young adventurer!*");

    }
    else if (commandParts[1] == "admin" && canCheat(msg)) {
      if (commandParts[2] == "settings") {
        if (commandParts[3] != undefined && commandParts[4] != undefined) {

          var setting = [commandParts[3], commandParts[4]];

          if (msg.rpg[setting[0]] !== null || printableSettings.indexOf(setting[0]) >= 0) {
            if (setting[1]=="true") {

              setting[1] = true;

            } else if (setting[1]=="false") {

              setting[1] = false;

            }
            if (Array.isArray(msg.rpg[setting[0]])) {

              setting[1] = setting[1].split(",");

            }
            if (setting[1].startsWith("_")) {
              setting[1] = parseFloat(setting[1].slice(1));
            }
            console.log(setting[0] + ": "+ setting[1]);
            msg.rpg[setting[0]] = setting[1];

          }

        } else {
          // Print active settings

          var string = "";
          for (i in config.printableSettings) {
            string = string + "\r\n" + i + ": " + msg.rpg[i];
          }
          utils.replyMessage(msg, "```" + string + "```");

        }
      }
      else if (commandParts[2] == "**RESET**") {
        // NOTE: WARNING: RESET

        utils.replyMessage(msg, "**Are you really sure? If yes, type \*\*YES\*\* (With the asterisks). Every data will be lost!");
        io.talk(msg, msg => {
          if (msg.content=="**YES**") {

            utils.replyMessage(msg, "**Erasing data...**");
            delete msg.rpg;
            utils.replyMessage(msg, "**All data have been erased**. *You can initialise the RP at any time using `l!RP`*!");

          }
        });

      }
      else if (commandParts[2] == "DEBUG") {
        // TODO: Remove

        var string = "";

        //msg.rpg.mobs = [config.defaults.mob];
        msg.rpg.room = utils.createRoom(msg);

        /*msg.rpg.dungeon = [Level.new(4, 4, 0, 2, 1)];
        msg.rpg.position

        string = io.displayLevel(msg.rpg.dungeon[0]);*/

        string = CircularJSON.stringify(msg.rpg.room);

        //string = string + "\r\n ATK: " + combat.hit(msg, msg.rpg.mobs[0]);

        utils.replyMessage(msg, "```\r\n" + string + "```");



      }
      else if (commandParts[2] == "tidy") {
        var amount = 0;
        Object.keys(msg.rpg.chars).forEach(o => {
          var actChar = msg.rpg.chars[o];
          for (item = 0; item < actChar.inventory.length; item++) {
            var actItem = actChar.inventory[item];
            if (actItem === null || actItem === undefined) {
              actChar.inventory.splice(item, 1);
              item--;
              amount++;
            } else {
              if (actItem.id === null || actItem.id === undefined || msg.rpg.objects[actItem.id] === undefined && actChar.inventory.length > 1) {
                actChar.inventory.splice(item, 1);
                item--;
                amount++;
              } else {
                if (actItem.quantity === null || actItem.quantity === undefined) {
                  actItem.quantity = 1;
                }
              }
            }
          }
        });
        for (item = 0; item < msg.rpg.room.items.length; item++) {
          var actItem =  msg.rpg.room.items[item];
          if (actItem === null || actItem === undefined) {
             msg.rpg.room.items.splice(item, 1);
             item--;
             amount++;
          } else {
            if (actItem.id === null || actItem.id === undefined) {
              msg.rpg.room.items.splice(item, 1);
              item--;
              amount++;
            } else {
              if (actItem.quantity === null || actItem.quantity === undefined) {
                actItem.quantity = 1;
              }
            }
          }
        }
        for (mob = 0; mob < msg.rpg.room.entities; mob++) {
          var actMob = msg.rpg.room.entities[mob];
          if (actMob === null || actMob === undefined) {
            msg.rpg.room.items.splice(mob, 1);
            mob--;
            amount++;
          }
        }
        utils.replyMessage(msg, io.say(msg, "admin_tidy_success", {n: amount}));
      }
      else if (config.settingList[commandParts[2]] != undefined) {

        actSetting = msg.rpg[config.settingList[commandParts[2]]];
        if (commandParts[3] == "create") {

          if (commandParts[2] == "object") {

            utils.replyMessage(msg, "Adding the " + commandParts[2] + ", please input the `name`, the `desc`, `class` and `subclass`");

          } else {

          utils.replyMessage(msg, "Adding the " + commandParts[2] + ", please input the `name` and the `desc`");

          }
          var talk_obj = io.talk(msg, msg => {
            var actSetting = io.getTalking(msg).actSetting;
            var command = utils.splitCommand(msg.content);
            if (commandParts[2] == "object") {

              actSetting.push({name: command[0], desc: command[1], class: command[2], subclass: command[3], attrs: []});

            } else {

              actSetting.push({name: command[0], desc: command[1], attrs: []});

            }
            utils.replyMessage(msg, "Successfully added the " + commandParts[2] + " "+command[0]);
          });

          talk_obj.actSetting = actSetting;

        }
        else if (commandParts[3] == "edit") {
          // NOTE: Edit an element

          utils.replyMessage(msg, "Modifiying a " + commandParts[2] + ", input the old `name`, the new `name` and `desc`");
          var talk_obj = io.talk(msg, msg => {
            var actSetting = io.getTalking(msg).actSetting;
            //console.log(CircularJSON.stringify(actSetting));
            var command = utils.splitCommand(msg.content);
            for (i in actSetting) {
              if (command[0]==actSetting[i].name) {

                actSetting[i].name = command[1];
                actSetting[i].desc = command[2];
                if (commandParts[2] == "object") {

                  actSetting[i].class = command[3];
                  actSetting[i].subclass = command[4];

                }

              }
            }
            utils.replyMessage(msg, "Successfully modified "+command[0]);
          });

          talk_obj.actSetting = actSetting;

        }
        else if (commandParts[3] == "list") {
          // NOTE: List elements w/ or w/o their attrs
          // TODO: Separate in multiple messages
          var mpages = Math.ceil(actSetting.length/config.itemsPerPage),
          page = Math.max(Math.min(parseInt(commandParts[4] || "1") || 1, mpages), 1);
          var embed = {
            color: config.colors.admin,
            title: ("List of " + commandParts[2] +" (page " + page + "/" + mpages + ")"),
            fields: []
          };
          for (i = (page-1)*config.itemsPerPage; i < Math.min((page)*config.itemsPerPage, actSetting.length); i++) {
            var string = "";
            string = string + "*" + actSetting[i].desc + "*";
            if (commandParts[2] == "object") {
              //Display the class and the subclass for objects
              string = string + "; @" + actSetting[i].class + "/" + actSetting[i].subclass;
            }
            if (commandParts[2] == "mob") {
              //Display the HP, ATK and so on...
              for (j in config.mobStats) {
                if (actSetting[i][config.mobStats[j]] != undefined) {
                  if (Array.isArray(actSetting[i][config.mobStats[j]]))
                    string = string + "\r\n" + config.mobStats[j] +": " + CircularJSON.stringify(actSetting[i][config.mobStats[j]]);
                  else
                    string = string + "\r\n" + config.mobStats[j] +": " + actSetting[i][config.mobStats[j]];
                }
              }
            }
            if (commandParts[5] == "attrs") {
              string = string + "\r\n```json";
              for (j in actSetting[i].attrs) {
                string = string + "\r\n[" + j + "] " + actSetting[i].attrs[j].name;
                for (k in actSetting[i].attrs[j].values) {
                  string = string + " " + actSetting[i].attrs[j].values[k];
                }
              }
              string = string + " ```";

            }
            embed.fields.push({name: actSetting[i].name, value: string});
          }
          utils.replyMessage(msg, {embed: embed});

        }
        else if (commandParts[3] == "remove") {

          for (i in actSetting) {
            if (commandParts[4] == msg.rpg.species[i].name) {

              actSetting.splice(i, 1);
              utils.replyMessage(msg, "Removed " + commandParts[2] + " " + commandParts[4]);
              break;

            }
          }
        }
        else if (commandParts[3] == "attrs") {
          // TODO: fix that stuff, especially the "everything's alright" verification
          // TODO: add isNaN everywhere it needs it
          // TODO: add object_found everywhere it needs it
          if (commandParts[4] == "create") {

            utils.replyMessage(msg, "Please input the `" + commandParts[2] + "`, the `name` and the `value`s");
            var talk_obj = io.talk(msg, msg => {
              var actSetting = io.getTalking(msg).actSetting;
              var command = utils.splitCommand(msg.content);
              var found = false;
              for (i in actSetting) {
                if (actSetting[i].name == command[0]) {
                  if (actSetting[i].attrs == null || actSetting[i].attrs == undefined) {
                    actSetting[i].attrs = [];
                  }
                  actSetting[i].attrs.push({"name": command[1], "values": command.slice(2)});
                  utils.replyMessage(msg, "Successfully added the `" + command[1] + "` to the `" + command[0] + "` " + commandParts[2] + "!");
                  found = true;
                  break;

                }
              }
              if (!found)
              utils.replyMessage(msg, "Could't find the target to link the attribute!");
            });

            talk_obj.actSetting = actSetting;

          }
          else if (commandParts[4] == "edit") {

            utils.replyMessage(msg, "Please input the `" + commandParts[2] + "`, the `id`, the `name` and the `value`s");

            var talk_obj = io.talk(msg, msg => {
              var actSetting = io.getTalking(msg).actSetting;
              var command = utils.splitCommand(msg.content);
              for (i in actSetting) {
                if (actSetting[i].name == command[0]) {

                  var specie = actSetting[i];
                  var ID = parseInt(command[1]);
                  if (ID != null && !isNaN(ID)) {

                    specie.attrs[ID] = {"name": command[2], "values": command.slice(3)};
                    utils.replyMessage(msg, "Successfully modified the attribute [" + command[1] + "] to the `" + command[0] + "` " + commandParts[2] + "!");

                  } else {

                    utils.replyMessage(msg, "Couldn't read the ID, aborting!");

                  }
                }
              }
            });

            talk_obj.actSetting = actSetting;
          }
          else if (commandParts[4] == "remove") {
            utils.replyMessage(msg, "Please in the `" + commandParts[2] + "` and the `id`");
            var talk_obj = io.talk(msg, msg => {
              var actSetting = io.getTalking(msg).actSetting;
              var command = utils.splitCommand(msg.content);
              for (i in actSetting) {
                if (actSetting[i].name == command[0]) {
                  var ID = parseInt(command[1]);
                  if (ID != null && !isNaN(ID)) {
                    actSetting[i].attrs.splice(ID);
                    utils.replyMessage(msg, "Successfully removed the attr [" + ID + "] from " + command[0]);
                  } else {
                    utils.replyMessage(msg, "Couldn't read the ID, aborting!");
                  }
                  break;
                }
              }
            });
            talk_obj.actSetting = actSetting;
          }
        }
        else if (commandParts[3] == "set") {
          utils.replyMessage(msg, "Modifying a " + commandParts[2] + ", input the `name`, the value `name` and its `content`");
          var talk_obj = io.talk(msg, msg => {
            var actSetting = io.getTalking(msg).actSetting;
            var command = utils.splitCommand(msg.content);
            if (config.mobStats.indexOf(command[1]) > -1) {
              for (i in actSetting) {
                if (command[0]==actSetting[i].name) {
                  actSetting[i][command[1]] = parseFloat(command[2]);
                  utils.replyMessage(msg, "Successfully modified / added the value `" + command[1] + "` of " + command[0]);
                }
              }
            }
          });
          talk_obj.actSetting = actSetting;
        }
      }
      else if (commandParts[2] == "summon") {
        var name = utils.splitCommand(command.slice(15).trim())[0];
        var mobId = utils.getObjectID(msg.rpg.mobs, name);
        if (mobId != -1) {
          var mob = msg.rpg.mobs[mobId];
          var actRoom = msg.rpg.room;
          actRoom.entities.push({id: mobId, HP: mob.HP});
          utils.replyMessage(msg, "Successfully summoned the mob " + name + "!");
        }
        else {
          utils.replyMessage(msg, "I couldn't find the mob you were looking for!");
        }
      }
      else if (commandParts[2] == "kill") {
        var name = utils.splitCommand(command.slice(13).trim())[0];
        var mobId = -1;
        msg.rpg.room.entities.forEach((o, i) => {
          if (msg.rpg.mobs[o.id].name == commandParts[3]) {
            mobId = i;
          }
        });
        if (mobId != -1) {
          var mob = msg.rpg.mobs[mobId];
          var actRoom = msg.rpg.room;
          actRoom.entities.splice(mobId, 1);
          utils.replyMessage(msg, "Successfully killed the mob " + name + "!");
        }
        else {
          utils.replyMessage(msg, "I couldn't find the mob you were looking for!");
        }
      }
      else if (commandParts[2] == "presets") {
        if (commandParts[3] == "import") {
          presets_mod.import(msg, commandParts[4]);
        }
        else if (commandParts[3] == "remove") {
          presets_mod.remove(msg, commandParts[4]);
        }
        else if (commandParts[3] == undefined || commandParts[3] === null || commandParts[3] == "list") {
          utils.replyMessage(msg, {embed: presets_mod.displayPresets(commandParts[4])});
        }
      }
      else if (commandParts[2] == "turn") {
        msg.rpg.turn_amount += combat.action_time(msg, "turn");
        replyMessage(msg, say(msg, "admin_turn_success"));
      }
      else if (commandParts[2] == "reinit") {
        if (config.settingList[commandParts[3]] != undefined) {
          msg.rpg[config.settingList[commandParts[3]]] = [config.defaults[commandParts[3]]];
          utils.replyMessage(msg, io.say(msg, "admin_reinit_success"));
        }
      }
      else if (commandParts[2] == "HP" || commandParts[2] == "MP") {
        Object.keys(msg.rpg.chars).filter(
          p => msg.rpg.chars[p].name == commandParts[3] || (new RegExp(commandParts[3]).test(msg.rpg.chars[p].name))
        ).forEach(
          p => msg.rpg.chars[p][commandParts[2]] += +commandParts[4]
        );
      }
      else if (commandParts[2] == "levelup") {
        var embed = {
          color: config.colors.admin,
          fields: []
        };

        Object.keys(msg.rpg.chars).filter(
          p => msg.rpg.chars[p].name == commandParts[3] || (new RegExp(commandParts[3]).test(msg.rpg.chars[p].name))
        ).forEach(
          p => {
            var text = "";
            actChar = msg.rpg.chars[p];
            actChar.xp = 0;
            actChar.lvl++;
            var lxp = utils.xp_per_level(actChar.lvl);
            text += "\r\n" + io.say(msg, "player_level_up", {name: actChar.name, level: actChar.lvl, xp: actChar.xp, maxxp: lxp});
            var sub = combat.level_up_awards(msg, actChar);
            if (sub != null) {
              text += "\r\n" + sub;
            }
            embed.fields.push({name: actChar.name, value: text});
          }
        );
        utils.replyMessage(msg, {embed: embed});
      }
      else if (commandParts[2] == "room") {
        if (commandParts[3] == "next") {
          msg.rpg.room = utils.createRoom(msg);
          utils.replyMessage(msg, "Moved to the next room!");
          io.displayRoom(msg);
          combat.reset_turns(msg);
        }
        else if (commandParts[3] == "add") {
          if (commandParts[4] == "structure") {
            if (commandParts[5] != undefined && commandParts[5] != "") {
              if (Array.isArray(msg.rpg.room.structures)) {
                msg.rpg.room.structures.push(commandParts[5]);
              }
            }
          }
        }
      }
    }
    else if (commandParts[1] == "attack" || commandParts[1] == "atk") {
      if (utils.require(msg, reqs.has_char | reqs.has_class | reqs.has_specie | reqs.are_classes | reqs.are_species | reqs.are_objects | reqs.are_mobs | reqs.is_room | reqs.are_mobs_in_room | reqs.is_alive)) {
        // TODO: separate the player => mob and the mob => player, to make ALL the mob attack
        var actRoom = msg.rpg.room;
        var targetId = Math.floor(utils.random(0, actRoom.entities.length));
        if (commandParts[2] != undefined) {
          var foundID = utils.getObjectID(utils.getIDMatchingObjects(msg.rpg.mobs, actRoom.entities), commandParts[2]);
          if (foundID != -1) targetId = foundID;
        }
        if (targetId != -1) {
          var player_raw = msg.rpg.chars[msg.author];
          var player = {};
          player.item = attrmgt.treat(msg.rpg.objects[player_raw.holding], msg.rpg.species[player_raw.specieId | -1], msg.rpg.classes[player_raw.classId | -1]);
          player.VIT = (player.item.stats.VIT || 0) + (player_raw.VIT || 0);
          if (player.VIT < 0) {
            msg.rpg.turn_amount += 1-player.VIT*combat.action_time(msg, "attack");
          } else {
            msg.rpg.turn_amount += combat.action_time(msg, "attack")-utils.sigma(player.VIT/combat.action_time(msg, "attack_range"));
          }
          var text = combat.combat(msg, msg.author, targetId, false, true);
          if (text != "") {
            players_turn += "\r\n" + text;
          }
        } else {
          utils.replyMessage(msg, io.say(msg, "error_mob_name_syntax"));
        }
      }
    }
    else if (commandParts[1] == "wait") {
      if (utils.require(msg, reqs.is_alive | reqs.has_char)) {
        msg.rpg.turn_amount += combat.action_time(msg, "wait");
      }
    }
    else if (commandParts[1] == "spell") {
      if (utils.require(msg, reqs.is_alive | reqs.has_char)) {
        var spellRaw = /(?:"?rp"? "?spell"?) ([a-zA-Z" ]*)/.exec(command)[1];
        var spell = spells.findSpell(msg, spellRaw);
        if (spell !== null) {
          utils.replyMessage(msg, io.say(msg, "casting_spell", {"spell": spell.name}));
          var text = spells.executeSpell(msg, spell);
          if (text != "" && text != undefined && text !== null) {
            players_turn += "\r\n" + text;
          }
        } else {
          utils.replyMessage(msg, io.say(msg, "error_spell_not_found"));
        }
      }
    }
    else if (commandParts[1] == "use") {
      var holding = true;
      var actChar = msg.rpg.chars[msg.author];
      var actObj = msg.rpg.objects[actChar.holding.id];
      var objectId = -1;
      if (commandParts[2] != undefined && commandParts[2] !== null) {
        objectId = utils.getObjectID(utils.getIDMatchingObjects(msg.rpg.objects, actChar.inventory), commandParts[2]);
        if (objectId != -1) {
          actObj = msg.rpg.objects[actChar.inventory[objectId].id];
          holding = false;
        }
        else {
          utils.replyMessage(msg, io.say(msg, "error_item_not_in_possession"));
        }
      }
      var used = false;
      actObj.attrs.forEach(a => {
        console.log(CircularJSON.stringify(a));
        if (a.name == "on_use") {
          if (utils.execute_pseudocode(msg, a.values, [actObj.name])) {
            used = true;
          }
        }

      });
      if (used) {
        if (holding) {
          actChar.holding = -1;
        } else {
          actChar.inventory.splice(objectId, 1);
        }
        utils.replyMessage(msg, io.say(msg, "use_item_success", {name: actObj.name}));
        msg.rpg.turn_amount += combat.action_time(msg, "use_" + actObj.class + "/" + actObj.subclass) ||
          combat.action_time(msg, "use_" + actObj.class) ||
          combat.action_time(msg, "use");
      } else if (objectId != -1) {
        utils.replyMessage(msg, io.say(msg, "error_use_item"));
      }
    }

    if (players_turn != "" && players_turn != undefined && players_turn !== null) {
      turns_embed.fields.push({name: "Player's turn", value: players_turn});
    }

    if (msg.rpg != undefined)
    if (msg.rpg.turn_type == 0) {
      if (msg.rpg.turn_amount > 0) {
        var turn_count = 0;

        for (turn_count = 1; msg.rpg.turn_amount >= 1 || utils.random(0, +msg.rpg.turn_randomness) < msg.rpg.turn_amount && msg.rpg.turn_amount > 0; msg.rpg.turn_amount--, turn_count++) { // Loop back into msg.rpg.turn_amount until it reaches a value below 1
          var mob_text = "", players_text = "", combat_text = "";
          if (utils.require(msg, reqs.is_room | reqs.are_mobs_in_room | reqs.are_mobs, false)) {

            var targetId = Math.floor(utils.random(0, msg.rpg.room.entities.length));
            if (utils.getObjectID(msg.rpg.room.entities[targetId].effects, "suspend") == -1) {
              combat_text += "\r\n" + combat.mob_action(msg, targetId);
            } else {
              combat_text += "\r\n" + io.say(msg, "mob_suspended", {name: msg.rpg.mobs[msg.rpg.room.entities[targetId].id].name});
            }

            for (mob = 0; mob < msg.rpg.room.entities.length; mob++) {
              var actMob = msg.rpg.room.entities[mob];
              var actMobParent = msg.rpg.mobs[actMob.id];
              if (actMobParent != undefined) {
                for (effect = 0; effect < actMob.effects.length; effect++) {
                  var actEffect = actMob.effects[effect];
                  switch (actEffect.name) {
                    case "fire":
                      actMob.HP -= config.fire_damage;
                      mob_text += "\r\n" + io.say(msg, "mob_damage_fire", {name: actMobParent.name, damage: config.fire_damage});
                      break;
                  }
                  actEffect.length -= 1;
                  if (isNaN(actEffect.length) || actEffect.length == null || actEffect.length <= 0) {
                    actMob.effects.splice(effect, 1);
                    effect--;
                  }
                }
              }
              if (actMob.HP <= 0) {
                mob_text += "\r\n" + io.say(msg, "mob_died", {name: actMobParent.name});
                msg.rpg.room.entities.splice(mob, 1);
              }
            }

          }

          for (player in msg.rpg.chars) {

            var actChar = msg.rpg.chars[player];
            if (actChar.MP < config.maxMP && actChar.HP > 0) {
              actChar.MP += config.MP_recovery;
              actChar.MP = Math.min(actChar.MP, config.maxMP);
              players_text += "\r\n" + io.say(msg, "player_heal_MP", {name: actChar.name, amount: config.MP_recovery, now: Math.round(actChar.MP*10)/10});
            }
            if (actChar.HP < config.maxHP && actChar.HP > 0) {
              actChar.HP += config.HP_recovery;
              actChar.HP = Math.min(actChar.HP, config.maxHP);
              players_text += "\r\n" + io.say(msg, "player_heal_HP", {name: actChar.name, amount: config.HP_recovery, now: Math.round(actChar.HP*10)/10});
            }
          }

          var text = "";

          if (msg.rpg.display_combat_text && combat_text != "") {
            text += combat_text;
          }
          if (msg.rpg.display_passive_damages && mob_text != "") {
            text += mob_text;
          }
          if (msg.rpg.display_players_heal && players_text != "") {
            text += players_text;
          }

          if (text != "") {
            turns_embed.fields.push({name: "Turn " + turn_count, value: text});
          }

        }
        /*if (msg.rpg.turn_amount > 0) {
          turn_count++;
          if (utils.random(0, 1)>msg.rpg.turn_amount) {
            var targetId = Math.floor(utils.random(0, actRoom.entities.length));
            turns_embed.fields.push({name: "Turn " + turn_count, value: combat.mob_action(msg, targetId)});
          }
        }*/
      }
    }
    if (turns_embed.fields.length != 0) {
      utils.replyMessage(msg, {embed: turns_embed});
    }
    else if (msg.rpg.display_noop) {
      utils.replyMessage(msg, {embed: {
        title: "Nothing happenned",
        color: config.colors.dungeon
      }})
    }
  }
}
