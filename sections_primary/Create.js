"use strict";

var UI = require("lazuli-ui/index.js");

/**
* To represent a newly-created record
*/
module.exports = UI.FormBase.clone({
    id: "Create",
});

/**
* To prepare the Create section, calling setFieldSet() on the page's primary_row,
*   if the entity id's match and there is no link_field defined
*/
module.exports.defbind("setupFieldSet", "setup", function () {
    if (this.fieldset) {
        return;             // set already
    }
    if (this.link_field) {
        this.setFieldSet(this.owner.page.getTrans().createNewRow(this.entity.id));
        this.fieldset.linkToParent(this.owner.page.getPrimaryRow(), this.link_field);
    } else if (this.entity.id === this.owner.page.entity.id) {
        this.setFieldSet(this.owner.page.getPrimaryRow());
    } else {
        this.setFieldSet(this.owner.page.getTrans().createNewRow(this.entity.id));
    }
});


module.exports.defbind("setExitURL", "presave", function () {
    if (this.fieldset === this.owner.page.getPrimaryRow()
            && this.fieldset.isKeyComplete() && this.fieldset.getDisplayPage()) {
        this.owner.page.exit_url_save = this.fieldset.getDisplayURL();
    }
});
