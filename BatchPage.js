"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Page.clone({
    id: "BatchPage",
    title: "Generic Batch Page",
    allow_no_modifications: true,
});


module.exports.defbind("setupNonTrans", "setupEnd", function () {
    if (!this.transactional) {
        this.buttons.add({
            id: "exec",
            label: "Execute",
            main_button: false,
            css_class: "btn-primary",
        });
    }
});


module.exports.defbind("runController", "updateAfterSections", function (params) {
    if (this.session.user_id === "batch" || params.page_button === "save"
            || params.page_button === "exec") {
        if (this.transactional) {
            this.getTrans();            // ensure this.trans always created
        }
        this.execute();
        if (!this.transactional) {
            this.sendEmails();
        }
    }
});
