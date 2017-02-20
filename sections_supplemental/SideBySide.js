"use strict";

var UI = require("lazuli-ui/index.js");

/**
* To show the fields of two Records from the same Entity side-by-side
*/
module.exports = UI.Section.clone({
    id: "SideBySide",
    hide_blank_uneditable_fields: true,
});


/**
* Add the FieldSet argument to this object as the left-hand fieldset and call its
* addFieldsByControl() method to add its fields to the page-level field collection
* @param FieldSet object to apply to this section
*/
module.exports.define("setLeftFieldSet", function (fieldset) {
    this.left_fieldset = fieldset;
    this.left_fieldset.id_prefix = this.id + "_left";
    this.left_fieldset.addToPage(this.owner.page, this.field_group);
});


/**
* Add the FieldSet argument to this object as the left-hand fieldset and call its
* addFieldsByControl() method to add its fields to the page-level field collection
* @param FieldSet object to apply to this section
*/
module.exports.define("setRightFieldSet", function (fieldset) {
    this.right_fieldset = fieldset;
    this.right_fieldset.id_prefix = this.id + "_right";
    this.right_fieldset.addToPage(this.owner.page, this.field_group);
});


module.exports.override("isValid", function () {
    return this.left_fieldset && this.left_fieldset.isValid(null, this.field_group)
        && this.right_fieldset && this.right_fieldset.isValid(null, this.field_group);
});


/**
* Generate HTML output for this section, given its current state
* @param XmlStream object for the parent div to add this section HTML to; render_opts
* @return XmlStream object for this section's div element
*/
module.exports.override("render", function (element, render_opts) {
    UI.Section.render.call(this, element, render_opts);
    if (!this.left_fieldset) {
        this.throwError("no left fieldset");
    }
    if (!this.right_fieldset) {
        this.throwError("no right fieldset");
    }
    this.renderTableElement(render_opts);
    this.renderTableBody(render_opts);
});


/**
* To create the HTML element for the table and its CSS class
* @param render_opts
* @return the XMLStream object of the table element
*/
module.exports.define("renderTableElement", function (render_opts) {
    var css_class = "css_list table table-bordered table-condensed table-hover";
    var row_elem;

    this.table_elem = this.getSectionElement().makeElement("table", css_class, this.id);
    this.row_count = 0;
    if (this.left_heading || this.right_heading) {
        row_elem = this.table_elem.makeElement("tr");
        row_elem.makeElement("th").text("Field");
        row_elem.makeElement("th").text(this.left_heading || "");
        row_elem.makeElement("th").text(this.right_heading || "");
    }
    return this.table_elem;
});


/**
* To generate HTML output for the table body - one row per field in the left_fieldset
* (and in the field_group if specified)
* @param render_opts
*/
module.exports.define("renderTableBody", function (render_opts) {
    var that = this;

    this.left_fieldset.each(function (left_field) {
        var css_class;
        var right_field;
        var row_elem;

        if (!left_field.visible) {
            return;
        }
        if (that.field_group && that.field_group !== left_field.field_group) {
            return;
        }
        css_class = that.getRowCSSClass();
        right_field = that.right_fieldset.getField(left_field.id);
        if (!right_field || left_field.get() !== right_field.get()) {
            css_class = "info";
        }
        row_elem = that.table_elem.makeElement("tr", css_class);
        row_elem.makeElement("td").text(left_field.label);
        left_field.renderCell(row_elem, render_opts);
        if (right_field) {
            right_field.renderCell(row_elem, render_opts);
        } else {
            row_elem.makeElement("td");
        }
        that.row_count += 1;
    });
});


/**
* To return the CSS class string for the tr object - 'css_row_even' or 'css_row_odd'
* for row striping
* @param row_obj
* @return CSS class string
*/
module.exports.define("getRowCSSClass", function () {
    return (this.row_count % 2 === 0) ? "css_row_even" : "css_row_odd";
});
