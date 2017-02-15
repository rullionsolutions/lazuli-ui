"use strict";

var UI = require("lazuli-ui/index.js");

/**
* To represent a set of paramteres being updated, which are not persisted in the database
*/
module.exports = UI.FormBase.clone({
    id: "FormParams",
});


/**
* To prepare the Update section, calling setFieldSet() on the page's primary_row, if the entity
*   id's match and there is no link_field defined
*/
module.exports.defbind("setupFieldSet", "setup", function () {
    var clone_fieldset = this.base_fieldset; // || FieldSet;
    this.setFieldSet(clone_fieldset.clone({
        id: "params",
        modifiable: true,
        instance: true,
        page: this.owner.page,
    }));
    this.fieldset.setDefaultVals();
});
