"use strict";

// var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");
var SQL = require("lazuli-sql/index.js");

var original_functions = {};


UI.ItemList.define("join_limit", 2);


UI.ItemList.defbind("setupJoins", "setup", function () {
    this.joins = [];
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
    var out = 0;
    this.joins.forEach(function (join) {
        if (join.active) {
            out += 1;
        }
    });
    return out;
});


UI.ItemList.defbind("updateJoins", "update", function (params) {
    var column;
    var regex = new RegExp("list_" + this.id + "_col_(\\w+)_(add_join|remove_join)");
    var match;

    if (this.list_advanced_mode && this.allow_choose_cols && params.page_button) {
        if (this.allow_join_cols) {
            match = regex.exec(params.page_button);
            this.trace("updateJoins - page_button: " + params.page_button + "; patt: " + regex.toString()
                + "; match: " + match + "; match length: " + (match ? match.length : "N/A") + ";");
            if (match && match.length > 2) {
                column = this.columns.get(match[1]);
                if (match[2] === "remove_join") {
                    column.removeJoin();
                } else if (match[2] === "add_join") {
                    column.addJoin();
                }
                this.show_choose_cols = true;
            }
            this.updateJoin(params);
        }
    }
});


UI.ItemList.define("updateJoin", function (params) {
    var regex = new RegExp("list_" + this.id + "_join_col_(\\w+)_(remove_join_btn|((inner|outer)_join_(dis|en)able))");
    var join;
    var match;

    if (params.page_button) {
        match = regex.exec(params.page_button);
        this.trace("updateJoin() - page_button: " + params.page_button + "; patt: " + regex.toString()
            + "; match: " + match + "; match length: " + (match ? match.length : "N/A") + ";");
        if (match && match.length > 2) {
            join = this.joins.get(match[1]);
            if (join) {
                // Set join type to inner/outer
                if (match[2] === "remove_join_btn") {
                    join.deactivate();
                } else if (match[2] === "inner_join_enable" || match[2] === "outer_join_disable") {
                    join.setType(SQL.Query.Table.types.inner_join);
                } else if (match[2] === "outer_join_enable" || match[2] === "inner_join_disable") {
                    join.setType(SQL.Query.Table.types.outer_join);
                }
            } else {
                this.error("updateJoin() - unrecognized join: " + params.page_button + "; patt: " + regex.toString()
                    + "; match: " + match + "; match length: " + (match ? match.length : "N/A") + ";");
            }
            this.show_choose_cols = true;
        }
    }

    // Reset Chooser Filters
    this.joins.forEach(function (join2) {
        join2.cols_filter = "";
    });
});


UI.ItemList.defbind("updateJoinColumns", "update", function (params) {
    var regex = new RegExp("list_" + this.id + "_join_col_(\\w+)_(show|hide|add_join|remove_join)");
    var owner_join;
    var column;
    var match;

    if (this.list_advanced_mode && this.allow_choose_cols && params.page_button) {
        match = regex.exec(params.page_button);
        this.trace("updateJoinColumns() - page_button: " + params.page_button + "; patt: " + regex.toString()
            + "; match: " + match + "; match length: " + (match ? match.length : "N/A") + ";");
        if (match && match.length > 2) {
            column = this.columns.get(match[1]);
            if (!column && (match[2] === "show" || match[2] === "add_join")) {
                column = this.addJoinColumnFromId(match[1]);
            }

            if (column) {
                if (match[2] === "show") {
                    // Show Column
                    column.visible = true;
                } else if (match[2] === "hide") {
                    // Hide Column
                    column.visible = false;
                } else if (match[2] === "add_join") {
                    // Add join for this column
                    column.addJoin();
                } else if (match[2] === "remove_join") {
                    // Remove Join for this column
                    column.removeJoin();
                } else {
                    this.error("updateJoinColumns() - unrecognized join instruction: " + params.page_button + "; patt: " + regex.toString() + "; match: " + match);
                }

                // Retain column lookup filter value
                owner_join = column.getOwnerJoin();
                if (owner_join && params["cols_filter_" + this.id + "_" + owner_join.id]) {
                    owner_join.cols_filter = params["cols_filter_" + this.id + "_" + owner_join.id];
                }
            }

            this.show_choose_cols = true;
        }
    }
});


UI.ItemList.define("getJoinByAlias", function (alias) {
    var out = null;
    this.joins.forEach(function (join) {
        if (join.alias === alias) {
            out = join;
        }
    });
    return out;
});


UI.ItemList.define("addJoinColumnFromId", function (join_column_id) {
    var arr = join_column_id.split("_");
    var alias = arr.shift();
    var field_id = arr.join("_");
    var join = this.getJoinByAlias(alias);

    if (join) {
        return join.addColumn(field_id);
    }
    return null;
});


original_functions.renderColumnChooser = UI.ItemList.renderColumnChooser;

UI.ItemList.reassign("renderColumnChooser", function (foot_elem, render_opts) {
    if (this.allow_choose_cols) {
        original_functions.renderColumnChooser.call(this, foot_elem, render_opts);
        // Render Join Column Choosers
        this.renderJoinColumnChoosers(foot_elem, render_opts);
    }
});


original_functions.renderColumnChooserColumn = UI.ItemList.Column.renderColumnChooser;

UI.ItemList.Column.reassign("renderColumnChooser", function (ctrl_elem, render_opts, list_id) {
    var group_elem;
    var join_added;
    var join_limit_hit;

    if (!this.label.trim() || this.join_id) {
        return;
    }
    join_added = this.getJoin() && this.getJoin().active;
    join_limit_hit = this.owner.section.isJoinLimitExceeded();
    // If column is for a reference field add button group including join button
    if (this.owner.section.allow_join_cols && this.field && this.field.ref_entity
            && (!join_limit_hit || (join_limit_hit && join_added))) {
        group_elem = ctrl_elem.addChild("div", "list_" + this.owner.section.id + "_col_" + this.id + "_show_hide", "btn-group css_list_cols_btn_group");
        group_elem.addChild("button", "list_" + this.owner.section.id + "_col_" + this.id + (this.visible ? "_hide" : "_show"),
                "btn btn-default btn-mini css_cmd " + (this.visible ? "active" : ""))
            .attribute("type", "button")
            .attribute("data-toggle", "button")
            .addText(this.label);
        group_elem.addChild("button", "list_" + this.owner.section.id + "_col_" + this.id + (join_added ? "_remove_join" : "_add_join"),
                "btn btn-default btn-mini css_cmd " + (join_added ? "active" : ""))
            .attribute("type", "button")
            .attribute("data-toggle", "button")
            .addText(join_added ? "Remove Join" : "Add Join");      // Label TBD
    } else {
        original_functions.renderColumnChooserColumn.call(this, ctrl_elem, render_opts, list_id);
    }
});


UI.ItemList.define("renderJoinColumnChoosers", function (foot_elem, render_opts) {
    this.join_choosers = 0;
    this.joins.forEach(function (join) {
        if (join.active) {
            join.renderJoinColumnChooser(foot_elem, render_opts);
        }
    });
});


// Bookmarkable URL
UI.ItemList.define("getJoins", function () {
    var joins = "";
    var join_separator = "";

    if (this.list_advanced_mode && this.allow_choose_cols && this.allow_join_cols) {
        this.joins.forEach(function (join) {
            joins += join_separator + join.id + "|" + (join.active ? "A" : "I") + "|" + join.table.type;
            join_separator = "|";
        });
        joins = "&joins_filter_" + this.id + "_list=" + joins;
    }
    return joins;
});


UI.ItemList.define("setJoins", function (params) {
    var joins;
    var join_column_id;
    var join_column;
    var join;
    var i;
    var allow_join;

    // Deactivate all joins before setting
    this.joins.forEach(function (join2) {
        join2.deactivate();
    });

    if (this.list_advanced_mode && this.allow_choose_cols && this.allow_join_cols) {
        if (params.hasOwnProperty("joins_filter_" + this.id + "_list")) {
            joins = params["joins_filter_" + this.id + "_list"].split("|");
            for (i = 0; i < joins.length; i += 3) {
                join_column = null;
                join_column_id = joins[i];
                if (this.columns.indexOf(join_column_id) !== -1) {
                    join_column = this.columns.get(join_column_id);
                } else {
                    join_column = this.addJoinColumnFromId(join_column_id);
                }
                if (join_column) {
                    join = join_column.addJoin({ ignore_limit: true, });

                    // Only allow join if owning join is active (enforces dependency between joins)
                    allow_join = true;
                    if (join_column.getOwnerJoin() && !join_column.getOwnerJoin().active) {
                        allow_join = false;
                    }
                    join.update({
                        active: (allow_join && joins[i + 1] === "A"),
                        type: joins[i + 2],
                    });
                }
            }
        }
    }
});


original_functions.setColumnVisibility = UI.ItemList.setColumnVisibility;

UI.ItemList.reassign("setColumnVisibility", function (params) {
    var columns;
    var col;
    var i;

    if (this.list_advanced_mode && this.allow_choose_cols) {
        original_functions.setColumnVisibility.call(this, params);

        // Make Join Column Visible
        if (params.hasOwnProperty("cols_filter_" + this.id + "_list")) {
            columns = params["cols_filter_" + this.id + "_list"].split("|");

            // Add missing join columns in the list and make them visible
            for (i = 0; i < columns.length; i += 1) {
                col = null;
                if (this.columns.indexOf(columns[i]) === -1) {
                    col = this.addJoinColumnFromId(columns[i]);
                }
                if (col) {
                    col.visible = true;
                }
            }
        }
    }
});


UI.ItemList.Column.define("addJoin", function (opt) {
    var join;

    if (!(this.field && this.field.ref_entity)
            || (this.owner.section.isJoinLimitExceeded() && !(opt && opt.ignore_limit))) {
        return null;
    }

    join = this.getJoin();

    if (join) {
        join.reactivate(opt);
    } else {
        join = this.addNewJoin(opt);
    }

    return join;
});


// SDF - could you try this as a means to refactor addNewJoin() below?
UI.ItemList.Column.define("makeNewJoinObject", function () {
    var owner_join = this.getOwnerJoin();

    return UI.ItemList.Join.clone({
        id: this.id,
        active: true,
        section: this.owner.section,
        entity_id: this.field.ref_entity,
        column_id: this.id,
        field_id: owner_join ? this.id.substr(2, this.id.length) : this.id,
        label: owner_join ? (owner_join.label + " / " + this.field.label) : this.label,
        owner_alias: owner_join ? owner_join.table.alias : "A",
    });
});


UI.ItemList.Column.define("addNewJoin", function (opt) {
    var join = this.makeNewJoinObject();
    this.owner.section.joins.add(join);
    join.setupTable();
    join.setType((opt && opt.type) ? opt.type : SQL.Query.Table.types.outer_join);
    join.setCondition((opt && opt.cond) ? opt.cond : null);
    join.addFields();
    return join;
});


UI.ItemList.Column.define("removeJoin", function () {
    var join = this.getJoin();
    if (join) {
        join.deactivate();
    }
});


// Returns a join that belongs to this column e.g. rm_rsrc join from ts_tmsht.rsrc
// Should return a join if this column was used to add a join
UI.ItemList.Column.define("getJoin", function () {
    var sctn = this.owner.section;
    if (sctn.joins.indexOf(this.id) !== -1) {
        return sctn.joins.get(this.id);
    }
    return null;
});


// Returns the join this column belongs to e.g. ts_tmsht join from ts_tmsht.ts_start_dt
// Should return a join if this column was derived from a join
UI.ItemList.Column.define("getOwnerJoin", function () {
    var sctn = this.owner.section;
    if (this.join_id && sctn.joins.indexOf(this.join_id) !== -1) {
        return sctn.joins.get(this.join_id);
    }
    return null;
});
