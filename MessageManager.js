"use strict";

var Core = require("lapis-core/index.js");


module.exports = Core.MessageManager;


module.exports.define("render", function (elmt, tag, prefix, type) {
    prefix = this.getNewPrefix(prefix);
    this.chain(function (msg_mgr) {
        msg_mgr.render(elmt, tag, prefix, type);
    });
    this.messages.forEach(function (msg) {
        var msg_elmt;
        if ((!tag || msg[tag] !== false) && (!type || type === msg.type)) {
            msg_elmt = elmt.makeElement("div");
            msg_elmt.attr("data-msg-type", msg.type);
            if (msg.link) {
                msg_elmt.attr("data-msg-link", msg.link);
            }
            msg_elmt.text(prefix + msg.text);
        }
    });
});
