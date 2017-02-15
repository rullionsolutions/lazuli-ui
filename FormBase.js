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
module.exports.override("render", function (element, render_opts) {
    var count = 0;
    UI.Section.render.call(this, element, render_opts);
    this.form_elem = null;
    if (!this.fieldset) {
        this.throwError("formbase no fieldset");
    }
    count += this.renderForm(this.fieldset, render_opts);
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
module.exports.define("getFormElement", function (render_opts) {
    if (!this.form_elem) {
        this.form_elem = this.getSectionElement(render_opts).makeElement("div", "css_form_body " + this.layout);
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


/**
* To render the FieldSet as a form with 1 column, calling renderFieldFunction on each field, except
*   where (this.separate_textareas && field.separate_row_in_form)
* @param FieldSet object of fields to render, render_opts, section_opts (defaults to the Section
*   object itself)
* @return Number of fields rendered
*/
module.exports.define("renderForm", function (fieldset, render_opts, section_opts) {
    var that = this;
    var form_elem;
    var count = 0;

    if (!section_opts) {
        section_opts = this;
    }

    fieldset.each(function (field) {
        if (field.isVisible(section_opts.field_group, section_opts.hide_blank_uneditable_fields)) {
            if (!form_elem) {
                form_elem = that.getSectionElement(render_opts).makeElement("form", fieldset.getTBFormType(that.layout));
            }
            field.renderFormGroup(form_elem, render_opts, that.layout);
            count += 1;
        }
    });
    return count;
});
