"use strict";

var UI = require("lazuli-ui/index.js");

module.exports = UI.ListQuery.clone({
    id: "FlexUpdate",
    field_seq_number: 0,
    compact: false,
    active_flex: null,        // Id of the flex field in the entity which is actively maintained by this grid (if not supplied in Section spec, can be inherited from Entity, string, Optional in spec
    override_edit_type: false,
    right_align_numbers: false,
    hide_section_if_empty: true,
    form_horiz_tb_input: "span6",
});

module.exports.define("setup", function () {
    x.sections.ListBase.setup.call(this);
    if (!this.entity || !x.entities[this.entity]) {
        throw x.Exception.clone({ id: "entity_not_found", entity: this.entity });
    }
    this.entity_obj = x.entities[this.entity];
    this.generated_title = this.entity_obj.getPluralLabel();
    this.getParentRecord();
    this.setupColumns();
    if (this.add_row_field) {
        this.setupAddRowField();
    }
    if (this.query && this.query.getColumn("seq_number")) {
        this.field_seq_number = this.query.getColumn("seq_number").getInt(0);
    }
    if (!this.active_flex && this.entity_obj.active_flex) {
        this.active_flex = this.entity_obj.active_flex;
    }
    if (this.active_flex && !this.add_row_field) {
        this.add_row_field = this.active_flex;
        this.setupAddRowField();
    }
    if (this.form) {
        this.generated_title = x.data.forms[this.form].label;
        this.form_object     = x.data.forms[this.form];
    }
    this.fields = {};
    if (typeof this.auto_fill !== "boolean" || this.auto_fill) {
        this.setupLoadQuery();
        this.load();
    }
});


module.exports.define("setupLoadQuery", function () {
    x.sections.ListUpdate.setupLoadQuery.call(this);
    if (this.form) {
        this.query.addCondition({ column: "form", operator: "=", value: this.form });
    }
});


module.exports.define("setupAddRowField", function () {
    var orig_add_row_field = x.sections.ListUpdate.setupAddRowField.call(this);
    if (orig_add_row_field.type === "Flex" && this.form) {
        if (!this.form_object) {
            this.form_object = x.data.forms[this.form];
        }
        this.add_row_field_obj.lov = x.LoV.clone({
            id:     this.form
        });
        this.add_row_field_obj.lov.loadObject(this.form_object.fields, "label");
    }
    return orig_add_row_field;
});


module.exports.define("setupAddRowFieldFromFieldset", function (fieldset, field_group) {
    var lov;
    if (!this.add_row_field_obj.lov) {
        this.add_row_field_obj.lov = x.LoV.clone({ id: fieldset.id });
    }
    lov = this.add_row_field_obj.lov;
    fieldset.each(function(field) {
       if (!field_group || field.field_group === field_group) {
           lov.addItem(field.id, field.label, true);
       }
    });
});


module.exports.define("addNewRow", function (field_id, field_val) {
    var row = this.addNewRowInternal(field_id, field_val),
        form_field,
        flex_field;

    if (this.form_object) {
        form_field = this.form_object.fields[field_val];
        form_field.id = field_val;
        flex_field = row.getField(field_id);
        this.debug("addNewRow() resetting flex field: " + flex_field + " to base field: " + form_field.id);
        flex_field.reset(form_field);
    }
    this.addFlexFieldToHash(flex_field);
    this.field_seq_number += 10;
    if (row.getField("seq_number")) {
        row.getField("seq_number").set(this.field_seq_number);
    }
    this.setupNewRow(row);
//    this.resetControl(row.getField(this.active_flex));
//    this.setEditType(row);
    return row;
});


module.exports.define("copyRow", function (query, orig_flex) {
    var row,
        orig_field,
        flex_field,
        orig_val;

    row = this.addNewRowInternal(this.active_flex, query.getColumn("A.field").get());
    orig_field = JSON.parse(query.getColumn(orig_flex).get());
    flex_field = row.getField(this.active_flex);
    orig_val   = orig_field.val;
    delete orig_field.val;
    this.debug("copyRow() resetting flex field: " + flex_field + " to base field: " + orig_field.id + ", with orig val: " + orig_val);
    flex_field.reset(orig_field);
    this.addFlexFieldToHash(flex_field);
    if (orig_val) {
        flex_field.set(orig_val);
    }
    if (row.getField("seq_number") && query.getColumn("A.seq_number")) {
        row.getField("seq_number").copyFromQuery(query, "A.seq_number");
    }
//    if (row.getField("edit_type") && query.getColumn("A.edit_type")) {
    if (query.getColumn("A.edit_type")) {
        this.setEditType(flex_field, query.getColumn("A.edit_type").get());
//        row.getField("edit_type").set(query.getColumn("A.edit_type").get());
    }
    this.setupNewRow(row);
//    this.resetControl(row.getField(this.active_flex));
//    this.setEditType(row);
    return row;
});


// In ListUpdate, 'row.getField(field_id).set(field_val)' moved from addNewRow() to addNewRowInternal()
// causing the following line to break, so rest of addNewRowInternal copied to here
module.exports.define("addNewRowInternal", function (/*field_id, field_val*/) {
    var row = this.owner.page.getTrans().createNewRow(this.entity);
    this.getParentRecord();
    if (this.parent_record && this.link_field && typeof this.parent_record.getKey() === "string") {
        row.getField(this.link_field).set(this.parent_record.getKey());
    }
    this.addRow(row);
    return row;
});


module.exports.define("addFlexFieldToHash", function (flex_field) {
    var inner_field = flex_field.inner_field;
    if (!inner_field) {
        throw x.Exception.clone({ id: "flex_field_not_initialised", flex_field: flex_field });
    }

    delete this.owner.page.fields[inner_field.control];
    inner_field.control = this.id + "_" + inner_field.id;

    if (!this.fields[inner_field.id]) {
        this.fields[inner_field.id] = flex_field;
        this.fields[inner_field.id].count = 1;
    } else {
        if (!this.fields[inner_field.id].additional) {
            this.fields[inner_field.id].additional = [];
        }
        this.fields[inner_field.id].additional.push(flex_field);
        this.fields[inner_field.id].count += 1;
        inner_field.control += "_" + this.fields[inner_field.id].count;
    }
    inner_field.tb_input = this.form_horiz_tb_input;
    this.owner.page.addField(inner_field);
    this.trace("addFlexFieldToHash() " + flex_field.inner_field.id + ", count: " + this.fields[flex_field.inner_field.id].count);
});


module.exports.define("setupNewRow", function (row) {
    var inner_field = row.getField(this.active_flex).inner_field;
    if (row.getField("field")) {
        row.getField("field").set(inner_field.id);
    }
    if (row.getField("label")) {
        row.getField("label").set(inner_field.label);
    }
    if (row.getField("form") && this.form) {
        row.getField("form").set(this.form);
    }
});


module.exports.define("addExistingRow", function (row_key) {
    var row = x.sections.ListUpdate.addExistingRow.call(this, row_key);
//    row.getField(this.active_flex).inner_field.control = row.getField(this.active_flex).control;
    if (this.active_flex) {
        this.addFlexFieldToHash(row.getField(this.active_flex));
//        this.resetControl(row.getField(this.active_flex));
    }
//    this.setEditType(row);
    return row;
});


module.exports.define("setEditType", function (flex_field, edit_type) {
    var inner_field = flex_field.inner_field;
    inner_field.mandatory = (edit_type === 'E');
    inner_field.editable  = (edit_type !== 'U');
    inner_field.visible   = (edit_type !== 'H');
    inner_field.validate();
});


module.exports.define("populate", function (from_entity_id, from_link_field, from_link_value, orig_flex) {
    var query = x.entities[from_entity_id].getQuery(null, true);
    query.addCondition({ column: from_link_field, operator: "=", value: from_link_value });
    if (this.form) {
        query.addCondition({ column: "form", operator: "=", value: this.form });
    }
    while (query.next()) {
        this.copyRow(query, orig_flex);
    }
    query.reset();
});


module.exports.define("getFlex", function (field_id) {
    return this.fields[field_id];
});


module.exports.define("setFlex", function (field_id, val) {
    if (this.fields[field_id]) {
        this.fields[field_id].set(val);
    }
});


module.exports.define("setFlexVisible", function (field_id, visible) {
    if (this.fields[field_id]) {
        this.fields[field_id].inner_field.visible = visible;
    }
});


module.exports.define("setFlexesFromFieldset", function (fieldset) {
    var flexupdate = this;
    fieldset.each(function(field) {
        flexupdate.setFlex(field.id, field.get());
    });
});


module.exports.define("setFieldsetFromFlexes", function (fieldset) {
    var flexupdate = this;
    fieldset.each(function(field) {
        if (flexupdate.getFlex(field.id)) {
            field.set(flexupdate.getFlex(field.id).get());
        }
    });
});


module.exports.override("render", function (element, render_opts) {
    if (this.compact) {
        x.sections.Section.render.call(this, element, render_opts);
        this.renderForm(render_opts);
    } else {
        x.sections.ListUpdate.render.call(this, element, render_opts);
    }
});


module.exports.define("renderForm", function (render_opts /*, renderFieldFunction*/) {
    var i,
        field;

    this.form_elem = null;
    for (i = 0; i < this.rows.length; i += 1) {
        if (this.rows[i].deleting) {
            continue;
        }
        field = this.rows[i].getField(this.active_flex).inner_field;
        if (!field.visible) {
            continue;
        }
        if (this.hide_blank_uneditable_fields && field.isBlank() && !field.editable) {
            continue;
        }
        field.renderControlGroup(this.getFormElement(render_opts), render_opts);
    }
});


module.exports.define("getFormElement", function (render_opts) {
    var css_class;
    if (!this.form_elem) {
        css_class = "css_form_body form-horizontal";
        this.form_elem = this.getSectionElement(render_opts).addChild("div", null, css_class);
    }
    return this.form_elem;
});
