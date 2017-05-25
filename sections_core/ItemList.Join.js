"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");
var UI = require("lazuli-ui/index.js");

var original_functions = {};


UI.ItemList.define("join_limit", 2);


UI.ItemList.defbind("setupJoins", "setup", function () {
    this.joins = {};                // map of table aliases to JoinRecord objects
    if (typeof this.allow_join_cols !== "boolean") {
        this.allow_join_cols = this.owner.page.session.isUserInRole("sysmgr") || this.owner.page.session.isUserInRole("rl_admin");
    }
});


UI.ItemList.define("isJoinLimitExceeded", function () {
    var out = false;
    if (typeof this.join_limit === "number") {
        out = this.getActiveJoinCount() >= this.join_limit;
    }
    return out;
});


UI.ItemList.define("getActiveJoinCount", function () {
    var that = this;
    var out = 0;
    Object.keys(this.joins).forEach(function (alias) {
        if (that.joins[alias].active) {
            out += 1;
        }
    });
    return out;
});


UI.ItemList.defbind("updateJoins", "update", function (params) {
    var regex1 = new RegExp("list_" + this.id + "_(\\w+)_join_col_(\\w+)");     // \1 is col id, \2 is operation
    var regex2 = new RegExp("list_" + this.id + "_(\\w+)_join_rcd_(\\w+)");     // \1 is alias, \2 is operation
    var match;

    if (this.allow_join_cols && params.page_button) {
        match = regex1.exec(params.page_button);
        this.trace("updateJoins(): " + params.page_button + ", " + regex1.toString() + ", " + match);
        if (match) {
            this.columns.get(match[1]).updateJoin(match[2], params);
        }
        match = regex2.exec(params.page_button);
        this.trace("updateJoins(): " + params.page_button + ", " + regex2.toString() + ", " + match);
        if (match) {
            if (!this.joins[match[1]]) {
                this.throwError("unrecognized alias: " + match[1]);
            }
            this.joins[match[1]].updateJoin(match[2], params);
        }
    }
});


UI.ItemList.override("populateRecordFromQuery", function () {
    var that = this;
    this.record.populate(this.query.resultset);
    Object.keys(this.joins).forEach(function (alias) {
        that.joins[alias].populateRecordFromQuery();
    });
});


original_functions.renderColumnChooser = UI.ItemList.renderColumnChooser;

UI.ItemList.reassign("renderColumnChooser", function (render_opts) {
    var foot_elmt = this.getFootElement();
    this.debug("renderColumnChooser() reassigned, joins: " + Object.keys(this.joins));
    if (this.allow_choose_cols) {
        original_functions.renderColumnChooser.call(this, foot_elmt, render_opts);
        // Render Join Column Choosers
        this.renderJoinColumnChoosers(foot_elmt, render_opts);
    }
});


UI.ItemList.define("renderJoinColumnChoosers", function (foot_elmt, render_opts) {
    var that = this;
    // this.join_choosers = 0;
    Object.keys(this.joins).forEach(function (alias) {
        that.debug("renderJoinColumnChoosers(): " + alias);
        that.joins[alias].renderJoinColumnChooser(foot_elmt, render_opts);
    });
});


UI.ItemList.Column.define("updateJoin", function (operation, params) {
    if (operation === "remove_join") {
        this.removeJoin();
    } else if (operation === "add_join") {
        this.addJoin();
    }
});


UI.ItemList.Column.define("addJoin", function (opt) {
    if (!this.field || !this.field.ref_entity) {
        this.throwError("no field, or field has no ref_entity property");
    }
    if (this.join) {
        this.join.reactivate();
    } else {
        if (this.owner.section.isJoinLimitExceeded() && !(opt && opt.ignore_limit)) {
            this.throwError("join limit exceeded");
        }
        this.join = UI.ItemList.Join.clone({
            id: this.id,
            active: true,
            instance: true,
            section: this.owner.section,
            entity_id: this.field.ref_entity,
            origin_column: this,
        });
    }
    return this.join;
});


UI.ItemList.Column.define("getJoin", function () {
    return this.join;
});


original_functions.renderColumnChooserColumn = UI.ItemList.Column.renderColumnChooser;

UI.ItemList.Column.reassign("renderColumnChooser", function (ctrl_elem, render_opts, list_id) {
    var group_elem;
    var join_added = this.getJoin() && this.getJoin().active;
    var join_limit_hit = this.owner.section.isJoinLimitExceeded();

    // If column is for a reference field add button group including join button
    if (this.owner.section.allow_join_cols && this.field && this.field.ref_entity
            && (!join_limit_hit || (join_limit_hit && join_added))) {
        group_elem = ctrl_elem.makeElement("div", "btn-group css_list_cols_btn_group",
            "list_" + list_id + "_" + this.id + "_join_col_show_hide");

        group_elem.makeElement("button",
            "btn btn-default btn-xs css_cmd " + (this.visible ? "active" : ""),
            "list_" + list_id + "_" + this.id + "_join_col_" + (this.visible ? "hide" : "show"))
            .attr("type", "button")
            .attr("data-toggle", "button")
            .text(this.label);

        group_elem.makeElement("button",
            "btn btn-default btn-xs css_cmd " + (join_added ? "active" : ""),
            "list_" + list_id + "_" + this.id + "_join_col_" + (join_added ? "remove_join" : "add_join"))
            .attr("type", "button")
            .attr("data-toggle", "button")
            .text(join_added ? "Remove Join" : "Add Join");      // Label TBD
    } else {
        original_functions.renderColumnChooserColumn.call(this, ctrl_elem, render_opts, list_id);
    }
});


/**
* To represent a column in a table
*/
module.exports = Core.Base.clone({
    id: "ItemList.Join",
});


module.exports.defbind("initialize", "cloneInstance", function () {
    if (!this.section) {
        this.throwError("section property is required");
    }
    this.origin_table = (this.origin_join && this.origin_join.table) || this.section.query.main;
    this.record = Data.entities.getThrowIfUnrecognized(this.entity_id).getRecord({
        page: this.section.owner.page,
    });
    this.table = this.section.query.addTable({ table: this.entity_id, });
    if (this.type) {
        this.setType(this.type);
    }
    if (this.origin_column) {
        this.setColumnCondition(this.origin_column);
    }
    if (!this.label && this.origin_column && this.origin_column.field) {
        this.label = this.origin_column.field.label;
    }
    this.section.joins[this.table.alias] = this;
    this.debug("added to " + this.section + ".joins[" + this.table.alias + "]");

    // Joined record field columns are NOT all added to the query object immediately
    // but only on demand. record.populate() should only try to call field.setFromResultSet()
    // on the fields whose query columns have been added
    this.record.each(function (field) {
        field.ignore_in_query = true;
    });
});


module.exports.define("setType", function (type) {
    if (type !== SQL.Query.Table.types.outer_join && type !== SQL.Query.Table.types.inner_join) {
        this.throwError("invalid join type: " + type);
    }
    this.table.type = type;
});


module.exports.define("setColumnCondition", function (column) {
    var origin_alias = this.origin_table.alias;
    var join_cond;
    if (!column.field) {
        this.throwError("column must have a field property");
    }
    if (column.field.sql_function) {
        join_cond = "?._key = ("
            + SQL.Connection.detokenizeAlias(column.field.sql_funct, origin_alias) + ")";
    } else {
        join_cond = "?._key = " + origin_alias + "." + column.field.id;
    }
    this.setCondition(join_cond);
});


module.exports.define("setCondition", function (join_cond) {
    join_cond = SQL.Connection.detokenizeAlias(join_cond, this.table.alias);
    this.table.join_cond = join_cond;
});


module.exports.define("populateRecordFromQuery", function () {
    this.record.populate(this.section.query.resultset);
});


module.exports.define("updateJoin", function (operation, params) {
    if (operation.indexOf("add_col_") === 0) {
        this.showColumn(operation.substr(8));
    } else if (operation === "show" || operation === "add_join") {
        this.addJoin();         // TODO
    } else if (operation === "remove_join_btn") {
        this.deactivate();
    } else if (operation === "inner_join_enable" || operation === "outer_join_disable") {
        this.setType(SQL.Query.Table.types.inner_join);
    } else if (operation === "outer_join_enable" || operation === "inner_join_disable") {
        this.setType(SQL.Query.Table.types.outer_join);
    }
});


module.exports.define("deactivate", function (opt) {
    this.active = false;
    this.table.active = false;
});


module.exports.define("reactivate", function (opt) {
    this.active = true;
    this.table.active = true;
});


module.exports.define("showColumn", function (field_id) {
    var col = this.section.columns.get(this.table.alias + "." + field_id);
    if (col) {
        col.visible = true;
    } else {
        this.addColumn(field_id);
    }
});


module.exports.define("addColumn", function (field_id) {
    var column;
    var field = this.record.getField(field_id);
    field.query_column = field.addColumnToTable(this.table);
    delete field.ignore_in_query;
    column = this.section.columns.add({
        id: field.query_column.name,
        field: field,
        label: this.label + " / " + field.label,
        visible: true,
    });
    this.debug("Adding field as column: " + column.id + " to section " + this.section.id
        + ", query_column: " + field.query_column);
    return column;
});


module.exports.define("renderJoinColumnChooser", function (foot_elem, render_opts) {
    var that = this;
    var ctrl_elem = foot_elem.makeElement("div",
        "css_list_choose_cols" + (this.section.show_choose_cols ? "" : " css_hide"),
        "css_list_choose_cols_join_" + this.id);
    var header_elem = ctrl_elem.makeElement("div", "css_list_choose_cols_header");
    var is_outer_join = (this.table.type === SQL.Query.Table.types.outer_join);
    var opt_elem;
    var group_elem;

    header_elem.makeElement("div", "span6")
        .makeElement("h4").text(this.label);

    opt_elem = header_elem.makeElement("div", "span6");

    if (this.section.allow_join_cols) {
        opt_elem.makeElement("button", "css_remove_join_btn css_cmd close pull-right",
            "list_" + this.section.id + "_" + this.table.alias + "_join_rcd_remove_join_btn", "X");

        group_elem = opt_elem.makeElement("div", "btn-group pull-right css_list_choose_cols_join_type_btn_group",
            "list_" + this.section.id + "_" + this.table.alias + "_join_rcd_join_type");

        group_elem.makeElement("button",
            "btn btn-default btn-xs css_cmd " + (is_outer_join ? "active" : ""),
            "list_" + this.section.id + "_" + this.table.alias + "_join_rcd_outer_join" + (is_outer_join ? "_disable" : "_enable"))
            .attr("type", "button")
            .attr("data-toggle", "button")
            .text("Outer Join");

        group_elem.makeElement("button",
            "btn btn-default btn-xs css_cmd " + (is_outer_join ? "active" : ""),
            "list_" + this.section.id + "_" + this.table.alias + "_join_rcd_inner_join" + (is_outer_join ? "_disable" : "_enable"))
            .attr("type", "button")
            .attr("data-toggle", "button")
            .text("Inner Join");
    }

    this.record.each(function (field) {
        that.renderJoinColumnChooserField(field, ctrl_elem, render_opts);
    });
});


module.exports.define("renderJoinColumnChooserField", function (field, ctrl_elem, render_opts) {
    var col = this.section.columns.get(this.table.alias + "." + field.id);
    this.debug("renderJoinColumnChooserField(): " + field);
    if (col) {
        col.renderColumnChooser(ctrl_elem, render_opts, this.section.id);
    } else {
        ctrl_elem.makeElement("button", "btn btn-default btn-xs css_cmd",
            "list_" + this.section.id + "_" + this.table.alias + "_join_rcd_add_col_" + field.id)
            .attr("type", "button")
            .attr("data-toggle", "button")
            .text(field.label);
    }
});

