"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");

/**
* To represent an updateable grid of records relating to a parent record
*/
module.exports = UI.ListBase.clone({
    id: "ListUpdate",
    allow_add_rows: true,
    allow_delete_rows: true,
    add_row_icon: "<i class='icon-plus'></i>",       // ordinary plus ; "&#x2795;" heavy plus sign
    delete_row_icon: "<i class='icon-remove'></i>",     // ordinary cross; "&#x274C;" heavy cross mark
    add_row_label: "Add a new row",
    delete_row_label: "Remove this row",
});


module.exports.register("addRow");
module.exports.register("deleteRow");


module.exports.defbind("cloneListUpdate", "cloneInstance", function () {
    this.rows = [];
});


/**
* To setup this grid, by setting 'entity' to the entity specified by 'entity', then calling
*/
module.exports.defbind("setupSequence", "setup", function () {
    if (typeof this.entity_id === "string" || typeof this.entity === "string") {        // 'entity' as a string property is deprecated
        this.entity = Data.Entity.getEntityThrowIfUnrecognized(this.entity_id || this.entity);
    }
//    this.generated_title = this.entity.getPluralLabel();
    this.getParentRecord();
    this.setupColumns();
    if (this.add_row_field) {
        this.setupAddRowField(this.add_row_field, this.add_row_unique);
    }
    if (this.auto_fill !== false && !this.query) {
        this.setupLoadQuery();
        this.load();
    }
});


/**
* To set 'parent_record' if not already, as follows: if the owning page has 'page_key_entity'
* and it is the
* @return this.parent_record
*/
module.exports.define("getParentRecord", function () {
    if (!this.parent_record && this.entity && this.link_field) {
        if (this.owner.page.page_key_entity && this.entity.getField(this.link_field).ref_entity
                === this.owner.page.page_key_entity.id) {
            this.parent_record = this.owner.page.page_key_entity.getRow(this.owner.page.page_key);
        } else if (this.entity.getField(this.link_field).ref_entity === this.owner.page.entity.id) {
            this.parent_record = this.owner.page.getPrimaryRow();
        }
    }
    this.debug(this + " has parent_record " + this.parent_record);
    return this.parent_record;
});


/**
* To create a delete row control column if 'allow_delete_rows', and then to loop through
* the fields in
*/
module.exports.define("setupColumns", function () {
    if (this.allow_delete_rows) {
        this.addDeleteControlColumn();
    }
    this.addEntityColumns(this.entity);
});


module.exports.define("addDeleteControlColumn", function () {
    var that = this;
    var col = this.columns.add({
        id: "_delete",
        label: " ",
        css_class: "css_col_control",
    });

    col.override("renderCell", function (row_elem, render_opts, j, row_obj) {
        var cell_elem;
        if (this.visible) {
            cell_elem = row_elem.makeElement("td", this.css_class);
            if (this.allow_delete !== false) {      // support individual rows not deletable
                cell_elem.addChild("a", "list_delete_" + that.id + "_" + that.rows.indexOf(row_obj), "css_cmd btn btn-mini")
                    .attr("title", that.delete_row_label)
                    .text(that.delete_row_icon, true);
            }
        }
    });
});


module.exports.define("addEntityColumns", function (entity) {
    var that = this;
    entity.each(function (field) {
        var col;
        if (field.accessible !== false) {
            col = that.columns.add({ field: field, });
            this.trace("Adding field as column: " + field.id + " to section " + that.id);
            if (col.id === that.link_field) {
                col.visible = false;
            }
        }
    });
});


/**
* To setup this section to use an 'add row field', i.e. a field in entity (usually of Option type)
* @return the field in entity specified by 'add_row_field'
*/
module.exports.define("setupAddRowField", function (add_row_field_id, add_row_unique) {
    var orig_add_row_field = this.entity.getField(add_row_field_id);
    this.add_row_unique = (typeof add_row_unique === "boolean") ? add_row_unique : this.entity.isKey(add_row_field_id);
    this.add_row_field_id = add_row_field_id;
    this.add_row_field_obj = Data.Option.clone({
        id: "add_row_field_" + this.id,           // Autocompleter doesn't work here yet
        label: this.add_row_label,
        tb_input: "input-medium",
        editable: true,
        css_reload: true,
        input_group_addon_before: this.add_row_label,
        list: orig_add_row_field.list,
        ref_entity: orig_add_row_field.ref_entity,
        selection_filter: this.selection_filter,
        config_item: orig_add_row_field.config_item,
        label_prop: orig_add_row_field.label_prop,
        active_prop: orig_add_row_field.active_prop,
    });
    this.add_row_field_obj.override("getFormGroupCSSClass", function (form_type, editable) {
        return Data.Entity.field_types.get("Option").getFormGroupCSSClass.call(this, form_type, editable) + " css_list_add";
    });
    // make sure we have full lov here..
    this.add_row_field_obj.getOwnLoV({ skip_full_load: false, });
    this.debug("setupAddRowField(): " + this.add_row_field_obj.lov);
    this.columns.get(this.add_row_field_id).editable = false;
    return orig_add_row_field;
});


module.exports.define("getAddRowItem", function (val) {
    var item;
    if (this.add_row_field_obj) {
        this.debug("getAddRowItem(): " + val + ", from " + this.add_row_field_obj.lov);
        item = this.add_row_field_obj.lov.getItem(val);
        if (!item) {
            this.throwError("unrecognized item: " + val);
        }
        return item;
    }
    return null;
});


/**
* To create a new x.sql.Query object, stored to 'query' to be used to load initial rows
* into the grid;
*/
module.exports.define("setupLoadQuery", function () {
    if (this.load_entity_id) {
        this.query = Data.Entity.getEntity(this.load_entity_id).getQuery(true);      // default sort
    } else {
        this.query = this.entity.getQuery(true);                            // default sort
    }
// this.link_field is the field in this.parent_record that defines the relationship in each
//  record in this grid
// this.load_link_field (if supplied) is the field in this.load_entity_id (if supplied,
//  otherwise this.entity)
//        which defines the load filter condition
// e.g. this.entity = "vc_sbm_skill", this.parent_entity.id = "vc_sbm" - so this grid is a grid
//  of submission skills related to a submission
// this.load_entity_id = "vr_rqmt_skill", this.load_link_field = "rqmt",
// and this.load_parent_link = "rqmt"
//            so
    if (this.load_link_field && this.load_link_value) {
        this.setLinkField(this.load_link_field, this.load_link_value);
    } else if (this.link_field && this.parent_record) {
        this.setLinkField(this.link_field, this.parent_record.getKey());
    }
});


/**
* To load initial rows into this grid by looping over this.query, calling addExistingRow()
* on each row's key
*/
module.exports.define("load", function () {
    while (this.query.next()) {
        this.addExistingRow(this.query.getColumn("A._key").get());
    }
    this.query.reset();
});


module.exports.define("addExistingRow", function (row_key) {
    var row = this.owner.page.getTrans().getActiveRow(this.entity.id, row_key);
    this.addRow(row);
    return row;
});


module.exports.define("addNewRow", function (field_id, field_val) {
    var row;
    if (this.add_row_field_id === field_id && this.add_row_unique
            && !this.getAddRowItem(field_val).active) {
        this.info("addNewRow() row already exists: " + field_val);
        return null;
    }
    row = this.addNewRowInternal(field_id, field_val);
    return row;
});


module.exports.define("addNewRowInternal", function (field_id, field_val) {
    var trans = this.owner.page.getTrans();
    var row = trans.createNewRow(this.entity.id);
    this.getParentRecord();
// superseded by linkToParent()
//    if (this.parent_record && this.link_field
//          && typeof this.parent_record.getKey() === "string") {
//        row.getField(this.link_field).set(this.parent_record.getKey());
//    }
    if (field_id && field_val) {
        row.getField(field_id).set(field_val);
    }
    // if (row.duplicate_key) {
    //     key = row.getKey();
    //     trans.new_rows.splice(trans.new_rows.indexOf(row), 1);
    //     row = trans.getActiveRow(this.entity.id, key);
    //     row.setDelete(false);
    // }
    this.addRow(row);
    return row;
});


module.exports.define("addRow", function (row) {
    var section = this;
    var id;

    row.each(function (field) {
        field.column = section.columns.get(field.id);
        if (field.column) {
            if (field.column.tb_input) {
                field.tb_input = field.column.tb_input;
            }
            if (typeof field.column.editable === "boolean") {
                field.editable = field.column.editable;
            }
            if (typeof field.column.mandatory === "boolean") {
                field.mandatory = field.column.mandatory;
                field.validate();
            }
        }
    });
    if (this.add_row_unique && this.add_row_field_obj) {
        id = row.getField(this.add_row_field_id).get();
        this.debug("removing item from LoV: " + id);
        if (id) {
            this.getAddRowItem(id).active = false;
        }
    }
    row.id_prefix = this.id + "_" + this.rows.length;
    row.linkToParent(this.parent_record, this.link_field);
    row.addToPage(this.owner.page);
    this.rows.push(row);
    this.happen("addRow", row);
});


module.exports.define("deleteRow", function (row) {
    var id;
    if (row.allow_delete === false) {
        this.throwError("row cannot be deleted");
    }
    row.setDelete(true);
    if (this.add_row_unique && this.add_row_field_obj) {
        id = row.getField(this.add_row_field_id).get();
        if (id) {
            this.getAddRowItem(id).active = true;
        }
    }
    this.happen("deleteRow", row);
});


module.exports.define("eachRow", function (funct) {
    var i;
    for (i = 0; i < this.rows.length; i += 1) {
        funct(this.rows[i]);
    }
});


module.exports.override("isValid", function () {
    var valid = true;
    this.eachRow(function (row) {
        valid = valid && (row.deleting || row.isValid());
    });
    return valid;
});


module.exports.defbind("updateAddDeleteRows", "update", function (param) {
    var match;
    var row_nbr;

    if (this.allow_add_rows && param.page_button === "list_add_" + this.id) {
        this.addNewRow();
    } else if (this.allow_add_rows && param.page_button === "add_row_field_" + this.id) {
        this.addNewRow(this.add_row_field_id, param["add_row_field_" + this.id]);
    } else if (typeof param.page_button === "string") {
        match = param.page_button.match(new RegExp("list_delete_" + this.id + "_([0-9]*)"));
        if (match && match.length > 1 && this.allow_delete_rows) {
            row_nbr = parseInt(match[1], 10);
            if (this.rows.length <= row_nbr || !this.rows[row_nbr]) {
                this.throwError("row not found for delete");
            }
            this.deleteRow(this.rows[row_nbr]);
        }
    }
});


module.exports.override("renderBody", function (render_opts) {
    var i;
    var j;
    var col;

    if (this.allow_add_rows) {
        this.getTableElement(render_opts);                // force always table display
    }
//    this.resetAggregations(render_opts);
    for (i = 0; i < this.rows.length; i += 1) {
        if (!this.rows[i].deleting) {
            this.row_count += 1;
            for (j = 0; j < this.columns.length(); j += 1) {
                col = this.columns.get(j);
                this.trace("Setting column " + col + " to have field " + this.rows[i].getField(col.id));
                col.field = this.rows[i].getField(col.id);
            }
            this.renderRow(render_opts, this.rows[i]);
        }
    }
//    this.found_rows = this.rows.length;
    this.recordset_last = 1;
//    this.frst_record_in_set = 1;
//    this.last_record_in_set = this.rows.length;
});


module.exports.override("renderRowAdder", function (foot_elem, render_opts) {
    var ctrl_elem;
    if (this.allow_add_rows) {
        if (this.add_row_field_obj) {
            this.debug("renderRowAdder(): " + this.add_row_field_obj.lov);
            ctrl_elem = this.add_row_field_obj.renderFormGroup(foot_elem, render_opts, "table-cell");
            // ctrl_elem = foot_elem.addChild("span", null,
            // "css_list_add input-prepend css_reload");
            // ctrl_elem.addChild("span", null, "add-on").addText("Add new row");
            // this.add_row_field_obj.renderControl(ctrl_elem, render_opts);
        } else {
            ctrl_elem = foot_elem.addChild("span", null, "css_list_add");
            ctrl_elem.addChild("a", "list_add_" + this.id, "css_cmd btn btn-mini")
                .attribute("title", "Add another row")
                .addText(this.add_row_icon, true);
            // ctrl_elem.addChild("a", "list_add_" + this.id, "css_cmd css_uni_icon_lrg")
            //     .attribute("title", this.add_row_label)
            //     .addText(this.add_row_icon, true);
        }
    }
    return ctrl_elem;
});
