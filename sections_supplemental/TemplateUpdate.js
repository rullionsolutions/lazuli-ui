"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


module.exports = UI.ListUpdate.clone({
    id: "TemplateUpdate",
    allow_add_rows: false,
    allow_delete_rows: false,
    right_align_numbers: false,
});


module.exports.override("setupLoadQuery", function () {
    UI.ListUpdate.setupLoadQuery.call(this);
    if (this.base_field_group) {
        this.query.addCondition({
            column: "form",
            operator: "=",
            value: this.base_field_group,
        });
    }
});


module.exports.defbind("setupLogic", "setup", function () {
    var template = this;
    var entity = Data.Entity.getEntity(this.base_entity_id);

    this.field_rows = {};
    entity.each(function (field) {
        if (!template.field_rows[template.id + "_" + field.id] &&
                (!template.base_field_group || template.base_field_group === field.field_group)) {
            template.addNewRow(field);
        }
    });
});


module.exports.override("addNewRow", function (field) {
    var row = this.addNewRowInternal("field", field.id);
    var flex_field = row.getField("val");
    var row_index;
    var seq_number = 10;

    this.debug("TemplateUpdate.addNewRow() resetting flex field: " + flex_field + " to base field: " + field.id);
    flex_field.reset(field);
    flex_field.inner_field.visible = true;
    flex_field.inner_field.editable = true;
    flex_field.inner_field.mandatory = false;
    flex_field.validate();
    row_index = this.rows.indexOf(row);
    if (row_index > 0) {
        seq_number = this.rows[row_index - 1].getField("seq_number").getNumber(0) + 10;
    }
    row.getField("seq_number").set(seq_number);
    row.getField("form").set(field.field_group);
    row.getField("label").set(field.label);
    return row;
});


module.exports.override("addRow", function (row) {
    var section = this;
    var flex_field;

    row.each(function (field) {
        field.column = section.columns.get(field.id);
        if (field.column.tb_input) {
            field.tb_input = field.column.tb_input;
        }
    });
    row.id_prefix = this.id + "_" + row.getField("field").get();

    this.debug("adding template row: " + row.id_prefix);

//    delete this.owner.page.fields[flex_field.inner_field.getControl()];
    flex_field = row.getField("val");
    if (flex_field.inner_field) {
        flex_field.inner_field.control = this.id + "_" + flex_field.inner_field.id + "_val";
    }
//    this.owner.page.addField(flex_field.inner_field);

    row.linkToParent(this.parent_record, this.link_field);
    row.addToPage(this.owner.page);
    this.field_rows[row.id_prefix] = row;           // field id
    this.rows.push(row);
});

