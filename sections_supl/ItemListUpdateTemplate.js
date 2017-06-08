"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


module.exports = UI.ItemListUpdate.clone({
    id: "ItemListUpdateTemplate",
    allow_add_rows: false,
    allow_delete_rows: false,
    right_align_numbers: false,
});


module.exports.defbind("initializeFieldRows", "cloneInstance", function () {
    this.field_rows = {};
});


module.exports.defbind("setupLoadQuery", "setup", function () {
    if (this.base_field_group) {
        this.query.addCondition({
            column: "form",
            operator: "=",
            value: this.base_field_group,
        });
    }
});


module.exports.defbind("setupLogic", "setup", function () {
    var that = this;
    var entity = Data.entities.get(this.base_entity_id);
    var prev_seq_number = 0;

    entity.each(function (field) {
        var row = that.field_rows[that.id + "_" + field.id];
        if (row) {
            prev_seq_number = row.getField("seq_number").getNumber(0);
        } else if (!that.base_field_group || that.base_field_group === field.field_group) {
            that.addNewRow(field, prev_seq_number);
        }
    });
});


module.exports.define("addNewRow", function (field, prev_seq_number) {
    var row = this.addItemInternal({
        field_id: "field",
        field_val: field.id,
    });
    var flex_field = row.getField("val");

    this.debug("TemplateUpdate.addNewRow() resetting flex field: " + flex_field + " to base field: " + field.id);
    flex_field.reset(field);
    flex_field.inner_field.visible = true;
    flex_field.inner_field.editable = true;
    flex_field.inner_field.mandatory = false;
    flex_field.validate();
    row.getField("seq_number").set(prev_seq_number + 10);
    row.getField("form").set(field.field_group);
    row.getField("label").set(field.label);
    return row;
});


module.exports.defbind("addRow", "addItem", function (row) {
    // var section = this;
    var flex_field;

    // row.each(function (field) {
    //     field.column = section.columns.get(field.id);
    //     if (field.column.tb_input) {
    //         field.tb_input = field.column.tb_input;
    //     }
    // });
    // row.id_prefix = this.id + "_" + row.getField("field").get();

    this.debug("adding template row: " + row.id_prefix);

//    delete this.owner.page.fields[flex_field.inner_field.getControl()];
    flex_field = row.getField("val");
    if (flex_field.inner_field) {
        flex_field.inner_field.control = this.id + "_" + flex_field.inner_field.id + "_val";
    }
//    this.owner.page.addField(flex_field.inner_field);

    // row.linkToParent(this.parent_record, this.link_field);
    // row.addToPage(this.owner.page);
    this.field_rows[row.id_prefix] = row;           // field id
    // this.rows.push(row);
});

