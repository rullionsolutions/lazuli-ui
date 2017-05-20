"use strict";

var UI = require("lazuli-ui/index.js");

/**
* To represent a single record or other FieldSet
*/
module.exports = UI.Section.clone({
    id: "FormBase",
    columns: 1,
    // for Create/Update/Display, or "basic", form-inline", "form-inline-labelless", or "table-cell"
    layout: "form-horizontal",
    form_bordered: true,
    hide_section_if_empty: true,
    hide_blank_uneditable_fields: true,
});


/**
* Add the FieldSet argument to this object and call its addFieldsByControl() method
*   to add its fields to the page-level field collection
* @param FieldSet object to apply to this section
*/
module.exports.define("setFieldSet", function (fieldset) {
    this.fieldset = fieldset;
    this.fieldset.id_prefix = this.id;
    this.fieldset.addToPage(this.owner.page, this.field_group);
});


/**
* Return this section's FieldSet object
* @return This section's FieldSet object
*/
module.exports.define("getFieldSet", function () {
    return this.fieldset;
});


module.exports.override("isValid", function () {
    return !this.fieldset || this.fieldset.isValid(null, this.field_group);
});


/**
* Generate HTML output for this section, given its current state; depending on
*    'layout' property, it calls renderFormHorizontal()
* @param XmlStream object for the parent div to add this section HTML to; render_opts
* @return XmlStream object for this section's div element
*/
module.exports.defbind("renderFormBase", "render", function (render_opts) {
    var that = this;
    var count = 0;
    this.form_elem = null;
    if (!this.fieldset) {
        this.throwError("formbase no fieldset");
    }
    this.fieldset.each(function (field) {
        if (field.isVisible(that.field_group, that.hide_blank_uneditable_fields)) {
            field.renderFormGroup(that.getFormElement(that.fieldset, render_opts),
                render_opts, that.layout);
            count += 1;
        }
    });

//    count += this.renderSeparateTextareas(this.fieldset, render_opts);
// this.sctn_elem will be set if hide_section_if_empty = false
    if (count === 0 && this.sctn_elem) {
        this.sctn_elem.makeElement("div", "css_form_footer").text("no items");
    }
});


/**
* To return the form_elem XmlStream object (a div) during render, creating it
*    if it doesn't already exist
* @param render_opts
* @return XmlStream object for this section's form div element
*/
module.exports.define("getFormElement", function (fieldset, render_opts) {
    if (!this.form_elem) {
        this.form_elem = this.getSectionElement(render_opts)
            .makeElement("form", fieldset.getTBFormType(this.layout) + (this.form_bordered ? " form-bordered" : ""));
    }
    return this.form_elem;
});


/**
* To determine whether the given field is visible in this Form context
* @param field, section_opts
* @return true if the field should be visible, otherwise false
*/
module.exports.define("isFieldVisible", function (field, section_opts) {
    var visible = field.isVisible(section_opts.field_group,
        section_opts.hide_blank_uneditable_fields);
    return visible;
});
