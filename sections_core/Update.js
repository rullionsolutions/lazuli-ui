"use strict";

var UI = require("lazuli-ui/index.js");


/**
* To represent an existing record in the database being updated
*/
module.exports = UI.FormBase.clone({
    id: "Update",
});


/**
* To prepare the Update section, calling setFieldSet() on the page's primary_row, if the entity
* id's match and there is no link_field defined
*/
module.exports.defbind("setupFieldSet", "setup", function () {
    var key;
    if (this.fieldset) {
        return;                    // done manually in setupStart
    }
    key = this.deduceKey();
    if (key) {
        this.setFieldSet(this.owner.page.getTrans().getActiveRow(this.entity.id, this.deduceKey()));
        this.fieldset.touch();
    }
});
