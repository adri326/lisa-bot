const fs = require("fs");
const CircularJSON = require("circular-json");

msg_base = {
  channel: "test_channel",
  author: "test_author",
  author_username: "test_author_username",
  author_discriminator: "0000",
  guild: "test_guild"
};

on_bot_ready = () => {
  var success_amount = 0;
  for (test in tests) {
    try {
      bot.trigger_msg(msg_base, tests[test].msg);
    } catch (err) {
      console.log("FAILED:  " + (tests[test].name || tests[test].msg));
      //throw err;
    }
    if (tests[test].test()) {
      console.log("SUCCESS: " + (tests[test].name || tests[test].msg));
      success_amount++;
    } else {
      console.log("ERROR:   " + (tests[test].name || tests[test].msg));
      //console.log(CircularJSON.stringify(rp[msg_base.channel]));
    }
  }
  delete rp[msg_base.channel];
  console.log();
  console.log("SCORE:" + success_amount + "/" + tests.length);
  if (success_amount == tests.length) console.log("SUCCESS");
  else console.log("NOT SUCCESS");
  console.log();
  process.exit();
}


const bot = require("./bot.js");



//delete rp[msg_base.channel];
config._no_message = true;
config._no_login = true;
config._no_log = true;

var tests = [
  {
    name: "init",
    msg: "l!rp",
    test: () => { return (rp[msg_base.channel] != undefined); }
  },
  {
    name: "char creation (1/4)",
    msg: "l!rp char create",
    test: () => { return (talking[msg_base.channel] != undefined); }
  },
  {
    name: "char creation (2/4)",
    msg: "Test char",
    test: () => { return (rp[msg_base.channel].chars[msg_base.author] != undefined); }
  },
  {
    name: "char creation (3/4)",
    msg: "Adventurer",
    test: () => { return (rp[msg_base.channel].chars[msg_base.author].classId != undefined); }
  },
  {
    name: "char creation (4/4)",
    msg: "Human",
    test: () => { return (rp[msg_base.channel].chars[msg_base.author].specieId != undefined); }
  },
  {
    name: "give self",
    msg: "l!rp inv give self Stick",
    test: () => { return (rp[msg_base.channel].chars[msg_base.author].inventory[0].id == 0)}
  },
  {
    name: "hold",
    msg: "l!rp inv hold Stick",
    test: () => { return (rp[msg_base.channel].chars[msg_base.author].holding == 0)}
  },
  {
    name: "create room",
    msg: "l!rp room init",
    test: () => { return (rp[msg_base.channel].room != undefined)}
  }
]
