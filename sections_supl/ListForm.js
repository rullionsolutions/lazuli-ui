"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ItemSet.clone({
    id: "ListForm",
    main_tag: "div",
    layout: "form-horizontal",
    hide_blank_uneditable_fields: true,
});


/**
* To render an object (usually a fieldset) as a form block
* @param element (xmlstream), render_opts, fieldset
*/
module.exports.override("renderItem", function (parent_elmt, render_opts, fieldset) {
    var that = this;
    var form_elem = parent_elmt.makeElement("form", fieldset.getTBFormType(that.layout));
    fieldset.each(function (field) {
        if (field.isVisible(that.field_group, that.hide_blank_uneditable_fields)) {
            field.renderFormGroup(form_elem, render_opts, that.layout);
        }
    });
});
