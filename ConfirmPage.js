"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Page.clone({
    id: "ConfirmPage",
    title: "Confirm?", // Yes/no question to be asked, string, required in spec
    skin: "modal",
    requires_key: true,
    transactional: true,
    main_navigation: false,
    message: undefined, // Static message to display along with question and record name, string, optional in spec" }
});

module.exports.defbind("setupSections", "setupEnd", function () {
    this.full_title = this.title;
    this.sections.add({
        id: "title",
        type: "Section",
        text: "<h2>" + this.title + "</h2>",
    });
    this.sections.add({
        id: "label",
        type: "Section",
        text: "<h3>" + this.getPrimaryRow().getLabel() + "</h3>",
    });
    if (typeof this.message === "string") {
        this.sections.add({
            id: "main",
            type: "Section",
            text: this.message,
        });
    }
    this.buttons.get("save").label = "Yes";
    this.buttons.get("cancel").label = "No";
});
