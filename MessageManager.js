"use strict";

var Core = require("lapis-core/index.js");


module.exports = Core.MessageManager;


module.exports.define("render", function (elmt, tag, prefix, type) {
    var i;
    var msg;
    prefix = this.getNewPrefix(prefix);
    this.chain(function (msg_mgr) {
        msg_mgr.render(elmt, tag, prefix, type);
    });

    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if ((!tag || msg[tag] !== false) && (!type || type === msg.type)) {
            elmt.makeElement("div")
                .attr("data-msg-type", msg.type)
                .text((prefix || "") + msg.text, true);      // allow full HTML markup
        }
    }
});
