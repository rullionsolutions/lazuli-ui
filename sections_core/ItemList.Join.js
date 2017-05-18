"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");

/**
* To represent a column in a table
*/
module.exports = Core.Base.clone({
    id: "ItemList.Join",
});


module.exports.define("setupTable", function (/* query*/) {
    this.record = Data.entities.getThrowIfUnrecognized(this.entity_id).clone({
        id: this.entity_id,
        skip_registration: true,
    });
    this.table = this.owner.section.query.addTable({ table: this.entity_id, });
    this.alias = this.table.alias;
});


module.exports.define("setType", function (type) {
    if (type === SQL.Query.Table.types.outer_join || type === SQL.Query.Table.types.inner_join) {
        this.table.type = type;
    }
});


module.exports.define("setCondition", function (addl_cond) {
    var alias = this.owner_alias || "A";
    var sql_funct = this.owner.section.columns.get(this.column_id).field.sql_function;
    var join_value;
    var join_cond;

    // Handle sql_function field
    if (sql_funct) {
        join_value = "(" + SQL.Connection.detokenizeAlias(sql_funct, alias) + ")";
    } else {
        join_value = alias + "." + this.field_id;
    }
    join_cond = "?._key = " + join_value;
    if (addl_cond) {
        join_cond += " AND (" + addl_cond + ")";
    }

    join_cond = SQL.Connection.detokenizeAlias(join_cond, this.alias);
    this.table.join_cond = join_cond;
});


module.exports.define("addFields", function () {
    var that = this;
    this.record.each(function (field) {
        field.query_column = this.table_alias + (field.sql_function ? "_" : ".") + field.id;
        if (field.accessible !== false) {
            that.section.addColumn(field);
        }
    });
});


module.exports.define("addField", function (ignore /*join_record*/, field) {
    if (field.accessible !== false) {
        this.fields.push({
            id: field.id, label: field.label, column_id: this.alias + "_" + field.id,
            sql_column: this.alias + (field.sql_function ? "_" : ".") + field.id,
            is_ref: (field.ref_entity !== undefined) // this boolean indicates that this field is a reference field and is therefore 'join-able'. (w/o storing a field object)
        });
        this.addFieldToRecord(field);
    }
});


module.exports.define("addFieldToRecord", function (field) {
    var sctn = this.owner.section,
        i = "",
        col_id = this.alias + "_" + field.id;

    //Override entity
    field.id = col_id;
    field.table_alias = this.alias;
    field.join_column = this.column_id;

    sctn.record.addField(field);
    //Not sure why I have to do this? All of this should be in the spec
    for (i in field) {
        if (typeof field[i] !== "function" && i !== "query_column") {
            sctn.record.getField(col_id)[i] = field[i];
        }
    }
    sctn.record.getField(col_id).query_column = null;//Keeps field out of the section query until the column is active
});


module.exports.define("update", function (opt) {
    var prev_active = this.active;

    if (opt) {
        if (typeof opt.active === "boolean") {
            this.active = opt.active;
            this.table.active = opt.active;

            if (prev_active !== this.active) {
                this.updateColumns();
            }
        }
        if (typeof opt.type === "string") {
            this.setType(opt.type);
        }
        if (typeof opt.cond === "string") {
            this.setCondition(opt.cond);
        }
    }
});


//Deactivates/reactivate column based upon whether this join is activate or not
module.exports.define("updateColumns", function () {
    var sctn = this.owner.section,
        col,
        i;

    for (i = 0; i < sctn.columns.length(); i += 1) {
        col = sctn.columns.get(i);
        if (col.join_id === this.id) {
            if (this.active) {
                col.field.query_column = col.field.sql_column;
            } else {
                col.visible = false;
                col.query_column.sort_seq = null;
                col.field.query_column = null;//Nullifying this excludes the column from this section's query
                col.removeJoin();//If there is a join based on this column remove it
            }
        }
    }
});


module.exports.define("deactivate", function (opt) {
    opt = opt || {};
    opt.active = false;
    opt.type = ((opt && opt.type) ? opt.type : x.sql.outer_join);
    this.update(opt);
});


module.exports.define("reactivate", function (opt) {
    opt = opt || {};
    opt.active = true;
    opt.type = ((opt && opt.type) ? opt.type : x.sql.outer_join);
    this.update(opt);
});


module.exports.define("getFieldObj", function (id) {
    var i,
        field = null;

    for (i = 0; i < this.fields.length; i += 1) {
        if (this.fields[i].id === id) {
            field = this.fields[i];
            break;
        }
    }

    return field;
});


module.exports.define("addColumn", function (field_id) {
    var sctn  = this.owner.section,
        field = this.getFieldObj(field_id),
        column,
        col_id;

    if (field) {
        col_id = field.column_id;

        sctn.record.getField(col_id).query_column = field.sql_column;
        //sql_column is used to repopulate query_column if this column is deactivated
        sctn.record.getField(col_id).sql_column = field.sql_column;

        //Add column to query
        if (!sctn.query.getColumn(col_id)) {
            this.table.addColumn({ name: field.id, sql_function: sctn.record.getField(col_id).sql_function });
        }

        column = sctn.columns.add({
            field: sctn.record.getField(col_id),
            label: this.label + " - " + field.label,
            query_column: sctn.query.getColumn(sctn.record.getField(col_id).query_column),
            visible: false
        });

        //add join_id property to the column
        column.join_id = this.id;

        //Position Column based on field order
        this.positionColumn(column, field);
    }
    return column;
});


module.exports.define("positionColumn", function (column, field) {
    var sctn  = this.owner.section,
        i,
        col_index   = -1,
        col_reached = false,
        col_after   = false;

    for (i = 0; i < this.fields.length; i += 1) {
        if (this.fields[i].id === field.id) {
            col_reached = true;
            continue;
        }
        if (sctn.columns.indexOf(this.alias + "_" + this.fields[i].id) === -1) {
            continue;
        }
        col_index = sctn.columns.indexOf(this.alias + "_" + this.fields[i].id);
        if (col_reached) {
            col_after = true;
            break;
        }
    }
    if (col_index !== -1) {
        sctn.columns.moveTo(column.id, col_index + (col_after ? 0 : 1));
    }

    //Move Row Control to the end - should always be the last control
    if (sctn.row_control_col) {
        sctn.columns.moveTo(sctn.row_control_col.id, sctn.columns.length() - 1);
    }
});


module.exports.define("renderJoinColumnChooser", function (foot_elem, render_opts) {
    var sctn      = this.owner.section,
        ctrl_elem = foot_elem.addChild("div", "css_list_choose_cols_join_" + this.id,
            "css_list_choose_cols" + (sctn.show_choose_cols ? "" : " css_hide")),
        label     = this.label,
        header_elem,
        opt_elem,
        group_elem,
        filter_elem,
        filter_input,
        i;

    //Append joins allowed count to label
    if (sctn.isJoinLimitExceeded()) {
        sctn.join_choosers += 1;
        label += " ("+sctn.join_choosers+" of "+sctn.join_limit+")";
    }

    header_elem = ctrl_elem.addChild("div", null, "css_list_choose_cols_header");
    header_elem.addChild("div", null, "span6")
               .addChild("h4", null, null, label);

    opt_elem = header_elem.addChild("div", null, "span6");
    if (sctn.allow_join_cols) {
        opt_elem.addChild("button","list_" + sctn.id + "_join_col_" + this.id + "_remove_join_btn", "css_remove_join_btn css_cmd close pull-right", "X");
        group_elem = opt_elem.addChild("div", "list_" + sctn.id + "_join_col_" + this.id + "_join_type", "btn-group pull-right css_list_choose_cols_join_type_btn_group");
        group_elem.addChild("button", "list_" + sctn.id + "_join_col_" + this.id + "_outer_join" + (this.table.type ===  x.sql.outer_join ? "_disable" : "_enable"),
                "btn btn-default btn-mini css_cmd " + (this.table.type ===  x.sql.outer_join ? "active" : ""))
            .attribute("type", "button")
            .attribute("data-toggle", "button")
            .addText("Outer Join");
        group_elem.addChild("button", "list_" + sctn.id + "_join_col_" + this.id + "_inner_join" + (this.table.type ===  x.sql.inner_join ? "_disable" : "_enable"),
                "btn btn-default btn-mini css_cmd " + (this.table.type ===  x.sql.inner_join ? "active" : ""))
            .attribute("type", "button")
            .attribute("data-toggle", "button")
            .addText("Inner Join");
    }

    filter_elem = ctrl_elem.addChild("span", null, "css_list_cols_filter");
    filter_input = filter_elem.addChild("input", null, "input-medium")
        .attribute("placeholder", "Filter Columns")
        .attribute("type", "text")
        .attribute("name", "cols_filter_" + sctn.id + "_" + this.id);
    if (this.cols_filter) {
        filter_input.attribute("value", this.cols_filter);
    }

    for (i = 0; i < this.fields.length; i += 1) {
        this.renderJoinColumnChooserField(this.fields[i], ctrl_elem, render_opts);
    }
});


module.exports.define("renderJoinColumnChooserField", function (field, ctrl_elem /* , render_opts*/) {
    var sctn = this.owner.section;
    var group_elem;
    var col_id = field.column_id;
    var col = null;
    var join_added;
    var join_limit_hit;

    if (!field.label.trim()) {
        return;
    }
    if (sctn.columns.indexOf(col_id) !== -1) {
        col = sctn.columns.get(col_id);
    }

    // Can't use column.getJoin as column may not exist
    join_added = (sctn.joins.indexOf(col_id) !== -1 && sctn.joins.get(col_id).active);
    join_limit_hit = sctn.isJoinLimitExceeded();

    if (sctn.allow_join_cols && field.is_ref
            && (!join_limit_hit || (join_limit_hit && join_added))) {
        group_elem = ctrl_elem.addChild("div", "list_" + sctn.id + "_join_col_" + col_id + "_show_hide", "btn-group css_list_cols_btn_group");
        group_elem.addChild("button", "list_" + sctn.id + "_join_col_" + col_id + ((col && col.visible) ? "_hide" : "_show"),
                "btn btn-default btn-mini css_cmd " + ((col && col.visible) ? "active" : ""))
            .attribute("type", "button")
            .attribute("data-toggle", "button")
            .addText(field.label);
        group_elem.addChild("button", "list_" + sctn.id + "_join_col_" + col_id + (join_added ? "_remove_join" : "_add_join"),
                "btn btn-default btn-mini css_cmd " + (join_added ? "active" : ""))
            .attribute("type", "button")
            .attribute("data-toggle", "button")
            .addText(join_added ? "Remove Join" : "Add Join"); // Label TBD
    } else {
        ctrl_elem.addChild("button", "list_" + sctn.id + "_join_col_" + col_id + ((col && col.visible) ? "_hide" : "_show"),
                "btn btn-default btn-mini css_cmd " + ((col && col.visible) ? "active" : ""))
            .attribute("type", "button")
            .attribute("data-toggle", "button")
            .addText(field.label);
    }
});

