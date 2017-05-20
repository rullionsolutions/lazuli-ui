"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");

/**
* The root Archetype of a list or grid section
*/
module.exports = UI.Section.clone({
    id: "ListBase",
    columns: Core.OrderedMap.clone({ id: "ListBase.columns", }),
    recordset_size: 10,
    recordset_size_ext: 20,
    recordset_size_long_lists: 1000,
    recordset: 1,
    recordset_last: 1,
    allow_choose_cols: true,
    show_header: true,
    show_footer: true,
    right_align_numbers: true,
    hide_table_if_empty: true,
    repeat_form: false,
    text_no_rows: "no data",
    text_one_row: "1 row",
    text_multi_rows: "rows",
//    text_total_row: "Total"
    sort_arrow_asc_icon: "&#x25B2;",
    sort_arrow_desc_icon: "&#x25BC;",
    column_chooser_icon: "<i class='glyphicon glyphicon-wrench'></i>",
    frst_recordset_icon: "<i class='glyphicon glyphicon-fast-backward'></i>",
    prev_recordset_icon: "<i class='glyphicon glyphicon-backward'></i>",
    next_recordset_icon: "<i class='glyphicon glyphicon-forward'></i>",
    last_recordset_icon: "<i class='glyphicon glyphicon-fast-forward'></i>",
    extd_recordset_icon: "<i class='glyphicon glyphicon-arrow-down'></i>",
    prev_columnset_icon: "<i class='glyphicon glyphicon-chevron-left'></i>",
    next_columnset_icon: "<i class='glyphicon glyphicon-chevron-right'></i>",
});


/**
* Initialise the columns collection in this section object
*/
module.exports.defbind("cloneColumns", "clone", function () {
    this.columns = this.parent.columns.clone({
        id: "ListBase.columns",
        section: this,
    });
});


module.exports.defbind("cloneListBase", "cloneInstance", function () {
    this.row_count = 0;
    this.keys = [];
});


/**
* Set 'list_advanced_mode' property from session property, and 'row_select_col'
* if 'row_select' is given
*/
module.exports.defbind("setAdvancedMode", "setup", function () {
    this.list_advanced_mode = (this.owner.page.session.list_advanced_mode === true);
});


// ------------------------------------------------------------ Row Selection and Bulk Actions
module.exports.define("addBulkAction", function (id, button_label, target_page) {
    if (!this.bulk_actions) {
        this.bulk_actions = {};
    }
    if (this.bulk_actions[id]) {
        this.throwError("bulk action id already used: " + id);
    }
    this.bulk_actions[id] = {
        id: id,
        button_label: button_label,
        target_page: target_page,
        visible: true,
    };
    if (typeof this.multirow_selection !== "boolean") {
        this.multirow_selection = true;
    }
    if (this.multirow_selection && !this.selection_col) {
        this.addSelectionColumn();
    }
});

/*
module.exports.define("isRowSelected", function (key) {
    this.trace("isRowSelected() is " + key + " in array " + this.selected_keys);
    return (typeof key === "string" && this.selected_keys && this.selected_keys.indexOf(key) > -1);
});


module.exports.define("setRowSelected", function (key, bool) {
    this.selected_keys = this.selected_keys || [];
    if (!this.isRowSelected(key) && bool) {
        this.selected_keys.push(key);
    } else if (!bool) {
        this.selected_keys.splice(this.selected_keys.indexOf(key), 1);
    }
});


module.exports.define("clearRowSelections", function () {
    this.debug("clearRowSelections");
    this.selected_keys = [];
});
*/

module.exports.define("addSelectionColumn", function () {
    this.selection_col = this.columns.add({
        id: "_row_selection",
        dynamic_only: true,
        sortable: false,
        sticky: true,
        label: "",
    });
    this.columns.moveTo("_row_selection", 0);

    /* Override Start */
    this.selection_col.renderHeader = function (row_elmt, render_opts) {
        var elmt = row_elmt.makeElement("th", "css_mr_sel css_sticky_col");
        elmt.makeElement("span", "glyphicon glyphicon-ok");
    };
    this.selection_col.renderCell = function (row_elem, render_opts, i, row_obj) {
        var td = row_elem.makeElement("td", "css_mr_sel");
        td.makeElement("span", "glyphicon glyphicon-ok");
    };
    /* Override End */
    this.selection_col.visible = true;
});


/**
* Update section's state using the parameter map supplied
* @param params: object map of strings
*/
module.exports.defbind("updateColSelection", "update", function (params) {
    var i;
    var col;
    this.show_choose_cols = false;
    if (this.list_advanced_mode && this.allow_choose_cols && params.page_button) {
        for (i = 0; i < this.columns.length(); i += 1) {
            col = this.columns.get(i);
            if (col.visible && params.page_button === "list_" + this.id + "_col_" + col.id + "_hide") {
                col.visible = false;
                this.show_choose_cols = true;
            } else if (!col.visible && params.page_button === "list_" + this.id + "_col_" + col.id + "_show") {
                col.visible = true;
                this.show_choose_cols = true;
            }
        }
        this.cols_filter = (params["cols_filter_" + this.id] && params.page_button
            && params.page_button.indexOf("list_" + this.id + "_col_") !== -1) ? params["cols_filter_" + this.id] : "";
    }
    if (this.max_visible_columns) {
        if (params.page_button === "column_page_frst_" + this.id) {
            this.current_column_page = 0;
        } else if (params.page_button === "column_page_prev_" + this.id && this.current_column_page > 0) {
            this.current_column_page -= 1;
        } else if (params.page_button === "column_page_next_" + this.id && this.current_column_page < (this.total_column_pages - 1)) {
            this.current_column_page += 1;
        } else if (params.page_button === "column_page_last_" + this.id && this.current_column_page < (this.total_column_pages - 1)) {
            this.current_column_page = this.total_column_pages - 1;
        }
    }
});

module.exports.defbind("updateListExtend", "update", function (params) {
    if (params.page_button === "list_set_extend_" + this.id) {
        this.recordset = 1;
        this.recordset_size += this.recordset_size_ext;
    }
});


module.exports.define("resetToStart", function () {
    this.recordset = 1;
});

/*
module.exports.defbind("updateRowSelection", "update", function (params) {
    if (this.selection_col && typeof params["list_" + this.id + "_mr_selected"] === "string") {
        if (params["list_" + this.id + "_mr_selected"]) {
            this.selected_keys = JSON.parse(params["list_" + this.id +
                 "_mr_selected"].replace(/&quot;/gm, '"'));
        } else {
            this.selected_keys = [];
        }
    }
});
*/

/**
* Set up link field relationship (requires this.query to be present)
* @param link_field: string column id, value: string value to use in filter condition, condition
* is false if not supplied
*/
module.exports.define("setLinkField", function (link_field, value) {
    if (this.key_condition) {
        this.key_condition.remove();
    }
    if (value) {
        this.key_condition = this.query.addCondition({
            column: "A." + link_field,
            operator: "=",
            value: value,
        });
    } else {
        this.key_condition = this.query.addCondition({ full_condition: "false", });        // prevent load if no value supplied
    }
    if (this.columns.get(link_field)) {
        this.columns.get(link_field).visible = false;
    }
});


/**
* Generate HTML output for this section, given its current state; calls renderBody()
* if 'repeat_form' else renderList()
* @param xmlstream element object to be the parent of the section-level div element, render_opts
* @return xmlstream div element object for the section
*/
module.exports.override("render", function (element, render_opts) {
    UI.Section.render.call(this, element, render_opts);
    if (this.repeat_form) {
        this.renderInitialize(render_opts);
        return this.renderBody(render_opts);
    }
    this.renderList(render_opts);
    return null;
});


/**
* To reset row_count property and call resetAggregations(), initializeColumnPaging(), etc
*/
module.exports.define("renderInitialize", function (render_opts) {
    this.row_count = 0;
    this.resetAggregations(render_opts);
    this.initializeColumnPaging(render_opts);
});


/**
* To set-up column paging if specified
* @param render_opts
*/
module.exports.define("initializeColumnPaging", function (render_opts) {
    var sticky_cols = 0;
    var non_sticky_cols = 0;
    if (this.max_visible_columns) {
        this.columns.each(function (col) {
            if (col.isVisibleDisregardingColumnPaging(render_opts)) {
                if (col.sticky) {
                    sticky_cols += 1;
                } else {
                    col.non_sticky_col_seq = non_sticky_cols;
                    non_sticky_cols += 1;
                }
            }
        });
        this.non_sticky_cols_per_page = this.max_visible_columns - sticky_cols;
        this.total_column_pages = Math.max(1, Math.ceil(non_sticky_cols
            / this.non_sticky_cols_per_page));
        if (typeof this.current_column_page !== "number") {
            this.current_column_page = 0;
        }
    }
});


/**
* Generate HTML table output, reset counters, call renderHeader, renderBody, and then renderFooter
* @param xmlstream element object to be the parent of the table element, render_opts
* @return xmlstream table element object
*/
module.exports.define("renderList", function (render_opts) {
    this.renderInitialize(render_opts);
    this.table_elem = null;
    if (!this.hide_table_if_empty) {
        this.getTableElement(render_opts);
    }
    this.renderBody(render_opts);
    if (this.sctn_elem) {
        if (!this.table_elem && this.row_count === 0) {
//            this.sctn_elem.addText(this.text_no_rows);
            this.renderNoRows(render_opts);
        } else if (this.table_elem && (this.show_footer || this.bulk_actions)) {
            this.renderFooter(this.table_elem, render_opts);
        }
    }
});


/**
* To return the 'table_elem' XmlStream object for the HTML table, creating it if it doesn't
* already exist
* @param render_opts
* @return table_elem XmlStream object for the HTML table
*/
module.exports.define("getTableElement", function (render_opts) {
    var css_class;

    if (!this.table_elem) {
        css_class = "css_list table table-condensed table-hover";
        if (this.selected_keys && this.selected_keys.length > 0) {
            css_class += " css_mr_selecting";
        }
        if (this.right_align_numbers) {
            css_class += " css_right_align_numbers";
        }
        // this.table_elem = this.getSectionElement().makeElement("div", "css_scroll")
        // .makeElement("table", css_class, this.id);
        this.table_elem = this.getSectionElement().makeElement("table", css_class, this.id);

        if (this.show_header) {
            this.renderHeader(this.table_elem, render_opts);
        }
    }
    return this.table_elem;
});


/**
* To return the number of actual shown HTML columns, being 'total_visible_columns' +
*   'level_break_depth', ONLY available after renderHeader() is called
* @return number of actual shown HTML columns
*/
module.exports.define("getActualColumns", function () {
    return (this.total_visible_columns || 0) + (this.level_break_depth || 0);
});


/**
* To generate the HTML thead element and its content, calling renderHeader() on each visible column
* @param xmlstream table element object, render_opts
* @return row_elem xmlstream object representing the th row
*/
module.exports.define("renderHeader", function (table_elem, render_opts) {
    var row_elem;
    var total_visible_columns = 0;
    var thead_elem = table_elem.addChild("thead");
    if (this.show_col_groups) {
        this.renderColumnGroupHeadings(thead_elem, render_opts);
    }
    row_elem = this.renderHeaderRow(thead_elem, render_opts);
    this.columns.each(function (col) {
        if (col.isVisibleColumn(render_opts)) {
            col.renderHeader(row_elem, render_opts);
            total_visible_columns += 1;
        }
    });
    this.total_visible_columns = total_visible_columns;
    return row_elem;
});


module.exports.define("renderHeaderRow", function (thead_elem, render_opts) {
    var row_elem = thead_elem.addChild("tr");
    var i;
    for (i = 0; i < this.level_break_depth; i += 1) {
        row_elem.addChild("th", null, "css_level_break_header");
    }
    return row_elem;
});


module.exports.define("renderColumnGroupHeadings", function (thead_elem, render_opts) {
    var row_elem = this.renderHeaderRow(thead_elem, render_opts);
    var group_label = "";
    var colspan = 0;

    function outputColGroup() {
        var th_elem;
        if (colspan > 0) {
            th_elem = row_elem.addChild("th", null, "css_col_group_header");
            th_elem.attribute("colspan", String(colspan));
            th_elem.addText(group_label);
        }
    }
    this.columns.each(function (col) {
        if (col.isVisibleColumn(render_opts)) {
            if (typeof col.group_label === "string" && col.group_label !== group_label) {
                outputColGroup();
                group_label = col.group_label;
                colspan = 0;
            }
            colspan += 1;
        }
    });
    outputColGroup();
});


/**
* To generate a repeating-block view of the data (not implemented yet)
* @param render opts
*/
module.exports.define("renderBody", function (render_opts) {
    return undefined;
});


/**
* To render an object (usually a fieldset) as a row in the table by calling renderListRow(),
* or as a form by
* @param render_opts, row_obj object (usually a fieldset) used by renderListRow() or
* renderRepeatForm()
*/
module.exports.define("renderRow", function (render_opts, row_obj) {
    var table_elem;
    var obj = {};

    if (render_opts.test === true) {
        row_obj.each(function (f) {
            obj[f.id] = f.get();
        });
        this.test_values.push(obj);
    }
    table_elem = this.getTableElement(render_opts);
    if (this.repeat_form) {
        return this.renderRepeatForm(table_elem, render_opts, row_obj);    // element is div
    }
    return this.renderListRow(table_elem, render_opts, row_obj);        // element is table
});


/**
* To render an object (usually a fieldset) as an HTML tr element, calling getRowCSSClass(), rowURL()
* @param table_elem (xmlstream), render_opts, row_obj
* @return row_elem (xmlstream)
*/
module.exports.define("renderListRow", function (table_elem, render_opts, row_obj) {
    var i;
    var css_class = this.getRowCSSClass(row_obj);
    var row_elem = table_elem.addChild("tr", null, css_class);
    this.rowURL(row_elem, row_obj);
    this.addRowToKeyArray(row_obj);
    for (i = 0; i < this.level_break_depth; i += 1) {
        row_elem.addChild("td");
    }
    for (i = 0; i < this.columns.length(); i += 1) {
        if (this.columns.get(i).isVisibleColumn(render_opts)) {
            this.columns.get(i).renderCell(row_elem, render_opts, i, row_obj);
        }
    }
    for (i = 0; i < this.columns.length(); i += 1) {
        this.columns.get(i).renderAdditionalRow(table_elem, render_opts, i, row_obj, css_class);
    }
    return row_elem;
});


/**
* To render elements displayed in the event that the list thas no rows. By default this will be
* the text_no_rows but can be overridden to display addition elements.
* @param render_opts
*/
module.exports.define("renderNoRows", function (render_opts) {
    this.sctn_elem.addText(this.text_no_rows);
});


/**
* To return the CSS class string for the tr object - 'css_row_even' or 'css_row_odd' for row
* striping
* @param row_obj
* @return CSS class string
*/
module.exports.define("getRowCSSClass", function (row_obj) {
    var str = (this.row_count % 2 === 0) ? "css_row_even" : "css_row_odd";
    // if (row_obj && typeof row_obj.getKey === "function") {
    //     if (this.isRowSelected(row_obj.getKey())) {
    //         str += " css_mr_selected";
    //     }
    // }
    return str;
});


/**
* To return a string URL for the row, if appropriate
* @param row_elem (xmlstream), row_obj (usually a fieldset)
* @return string URL or null or undefined
*/
module.exports.define("rowURL", function (row_elem, row_obj) {
    if (row_obj && typeof row_obj.getKey === "function") {
        row_elem.attribute("data-key", row_obj.getKey());
    }
});


/**
* To add a key string to the internal array of shown row keys
* @param row_obj (usually a fieldset)
*/
module.exports.define("addRowToKeyArray", function (row_obj) {
    return undefined;
});


module.exports.define("getColumnVisibility", function () {
    var columns = "";
    var col_separator = "";
    if (this.list_advanced_mode && this.allow_choose_cols) {
        this.columns.each(function (col) {
            if (col.visible) {
                columns += col_separator + col.id;
                col_separator = "|";
            }
        });
        columns = "&cols_filter_" + this.id + "_list=" + columns;
    }
    return columns;
});


module.exports.define("setColumnVisibility", function (params) {
    var columns;
    if (this.list_advanced_mode && this.allow_choose_cols) {
        if (params.hasOwnProperty("cols_filter_" + this.id + "_list")) {
            columns = params["cols_filter_" + this.id + "_list"].split("|");
            this.columns.each(function (col) {
                col.visible = columns.indexOf(col.id) > -1;
            });
        }
    }
});


module.exports.define("renderBulk", function (foot_elem, render_opts) {
    var that = this;
    var cell_elem = foot_elem.addChild("tr", null, "css_mr_actions").addChild("td");
    cell_elem.attribute("colspan", String(this.getActualColumns()));
    cell_elem.makeHidden("list_" + this.id + "_mr_selected", JSON.stringify(this.selected_keys || []));
    // cell_elem.addChild("input")
    //     .attribute("name" , "list_" + this.id + "_mr_selected")
    //     .attribute("type" , "hidden")
    //     .attribute("value", JSON.stringify(this.selected_keys || []));

    Object.keys(this.bulk_actions).forEach(function (key) {
        var target_page = UI.pages.get(that.bulk_actions[key].target_page);
        if (that.bulk_actions[key].visible && target_page) {
            cell_elem.makeAnchor(that.bulk_actions[key].button_label,
                target_page.getSimpleURL(that.owner.page.page_key),
                "btn btn-default btn-xs css_bulk disabled");
        }
    });
    return cell_elem;
});


/**
* To render the table footer, as a containing div, calling renderRowAdder(), render the
*column-chooser icon,
* @param sctn_elem (xmlstream), render_opts
* @return foot_elem (xmlstream) if dynamic
*/
module.exports.define("renderFooter", function (table_elem, render_opts) {
    var foot_elem;
    var cell_elem;
    var ctrl_elem;

//    foot_elem = sctn_elem.addChild("div", null, "css_list_footer");
    if (this.bulk_actions && Object.keys(this.bulk_actions).length > 0) {
        foot_elem = table_elem.addChild("tfoot");
        this.renderBulk(foot_elem, render_opts);
    }
    if (this.show_footer) {
        if (!foot_elem) {
            foot_elem = table_elem.addChild("tfoot");
        }
        cell_elem = foot_elem.addChild("tr").addChild("td");
        cell_elem.attribute("colspan", String(this.getActualColumns()));
        if (render_opts.dynamic_page !== false) {
            this.renderRowAdder(cell_elem, render_opts);
            this.renderListPager(cell_elem, render_opts);
            this.renderColumnPager(cell_elem, render_opts);
            if (this.list_advanced_mode && this.allow_choose_cols) {
                ctrl_elem = cell_elem.makeElement("span", "css_list_col_chooser");
                ctrl_elem.attribute("onclick", "x.ui.listColumnChooser(this)");
                ctrl_elem.addChild("a", "list_choose_cols_" + this.id, "btn btn-default btn-xs")
                    .attribute("title", "Choose Columns to View")
                    .addText(this.column_chooser_icon, true);
                this.renderColumnChooser(cell_elem, render_opts);
            }
        } else {
            this.renderRowCount(cell_elem, render_opts);
        }
    }
    return foot_elem;
});


/**
* To render the control for adding rows (either a 'plus' type button or a drop-down of keys)
* if appropriate
* @param foot_elem (xmlstream), render_opts
*/
module.exports.define("renderRowAdder", function (foot_elem, render_opts) {
    return undefined;
});


/**
* To render the player-style control for pages back and forth through recordsets of data,
* if appropriate
* @param foot_elem (xmlstream), render_opts
*/
module.exports.define("renderListPager", function (foot_elem, render_opts) {
    var ctrl_elem = foot_elem.addChild("span", null, "css_row_pager btn-group");
    if (this.recordset > 1) {
        ctrl_elem.addChild("a", "list_set_frst_" + this.id, "css_cmd btn btn-default btn-xs")
            .attribute("title", "first recordset")
            .addText(this.frst_recordset_icon, true);
        ctrl_elem.addChild("a", "list_set_prev_" + this.id, "css_cmd btn btn-default btn-xs")
            .attribute("title", "previous recordset")
            .addText(this.prev_recordset_icon, true);
    }
    this.renderRowCount(ctrl_elem.addChild("a", null, "btn btn-default btn-xs disabled css_list_rowcount"), render_opts);
    // ctrl_elem = pagr_elem.addChild("span", null, "css_list_control");

    if (this.subsequent_recordset || this.recordset > 1) {
        ctrl_elem.addChild("a", "list_set_extend_" + this.id, "css_cmd btn btn-default btn-xs")
            .attribute("title", "expand this recordset by " + this.recordset_size_ext + " rows")
            .addText(this.extd_recordset_icon, true);
    }
    if (this.subsequent_recordset) {
        ctrl_elem.addChild("a", "list_set_next_" + this.id, "css_cmd btn btn-default btn-xs")
            .attribute("title", "next recordset")
            .addText(this.next_recordset_icon, true);
    }
    if (this.subsequent_recordset && !this.open_ended_recordset) {
        ctrl_elem.addChild("a", "list_set_last_" + this.id, "css_cmd btn btn-default btn-xs")
            .attribute("title", "last recordset")
            .addText(this.last_recordset_icon, true);
    }
});


/**
* To render the player-style control for column pages back and forth through groups of non-sticky
* visible columns, if appropriate
* @param foot_elem (xmlstream), render_opts
*/
module.exports.define("renderColumnPager", function (foot_elem, render_opts) {
    var ctrl_elem;
    if (!this.max_visible_columns) {
        return;
    }
    ctrl_elem = foot_elem.addChild("span", null, "css_column_pager btn-group");
    if (this.current_column_page > 0) {
        ctrl_elem.addChild("a", "column_page_prev_" + this.id, "css_cmd btn btn-default btn-xs")
            .attribute("title", "previous column page")
            .addText(this.prev_columnset_icon, true);
    }
    ctrl_elem.addChild("a", null, "btn btn-default btn-xs disabled css_list_colcount",
        "column page " + (this.current_column_page + 1) + " of " + this.total_column_pages);

    if ((this.current_column_page + 1) < this.total_column_pages) {
        ctrl_elem.addChild("a", "column_page_next_" + this.id, "css_cmd btn btn-default btn-xs")
            .attribute("title", "next column page")
            .addText(this.next_columnset_icon, true);
    }
});


/**
* To render a simple span showing the number of rows, and the sub-set shown, if appropriate
* @param foot_elem (xmlstream), render_opts
*/
module.exports.define("renderRowCount", function (foot_elem, render_opts) {
    var text;
    if (this.recordset === 1 && !this.subsequent_recordset) {
        if (this.row_count === 0) {
            text = this.text_no_rows;
        } else if (this.row_count === 1) {
            text = this.text_one_row;
        } else {
            text = this.row_count + " " + this.text_multi_rows;
        }
    } else if (this.frst_record_in_set && this.last_record_in_set) {
        text = "rows " + this.frst_record_in_set + " - " + this.last_record_in_set;
        if (!this.open_ended_recordset && this.found_rows
                && this.recordset_size < this.found_rows) {
            text += " of " + this.found_rows;
        }
    } else {
        text = this.row_count + " rows";
    }
    return foot_elem.addText(text);
});


/**
* To render a column-chooser control (a set of push-state buttons represents all available
*columns, with the
* @param foot_elem (xmlstream), render_opts
*/
module.exports.define("renderColumnChooser", function (foot_elem, render_opts) {
    var ctrl_elem;
    var filter_elem;
    var i;

    if (this.allow_choose_cols) {
        ctrl_elem = foot_elem.makeElement("div", "css_list_choose_cols" + (this.show_choose_cols ? "" : " css_hide"));
        filter_elem = ctrl_elem.makeElement("span", "css_list_cols_filter");
        filter_elem.makeInput("text", "cols_filter_" + this.id, this.cols_filter,
            "css_list_cols_filter form-control input-xs", "Filter Columns");

        for (i = 0; i < this.columns.length(); i += 1) {
            this.renderColumnChooserColumn(ctrl_elem, render_opts, this.columns.get(i));
        }
    }
});


module.exports.define("renderColumnChooserColumn", function (ctrl_elem, render_opts, col) {
    if (!Core.Format.trim(col.label)) {
        return;
    }
    ctrl_elem.addChild("button", "list_" + this.id + "_col_" + col.id + (col.visible ? "_hide" : "_show"),
            "btn btn-default btn-xs css_cmd " + (col.visible ? "active" : ""))        /* TB3 btn-xs */
        .attribute("type", "button")
        .attribute("data-toggle", "button")
        .addText(col.label);
});


module.exports.define("outputNavLinks", function (page_key, details_elmt) {
    var index;
    this.trace("outputNavLinks() with page_key: " + page_key + " keys: " + this.keys + ", " + this.keys.length);
    if (this.keys && this.keys.length > 0) {
        this.debug("outputNavLinks() with page_key: " + page_key + " gives index: " + index);
        if (this.prev_recordset_last_key === page_key && this.recordset > 1) {
            this.moveToRecordset(this.recordset - 1);            // prev recordset
        } else if (this.next_recordset_frst_key === page_key && this.subsequent_recordset) {
            this.moveToRecordset(this.recordset + 1);            // next recordset
        }
        index = this.keys.indexOf(page_key);
        if (index > 0) {
            details_elmt.attr("data-prev-key", this.keys[index - 1]);
            // obj.nav_prev_key = this.keys[index - 1];
        } else if (index === 0 && this.prev_recordset_last_key) {
            details_elmt.attr("data-prev-key", this.prev_recordset_last_key);
            // obj.nav_prev_key = this.prev_recordset_last_key;
        }
        if (index < this.keys.length - 1) {
            details_elmt.attr("data-next-key", this.keys[index + 1]);
            // obj.nav_next_key = this.keys[index + 1];
        } else if (index === this.keys.length - 1 && this.next_recordset_frst_key) {
            details_elmt.attr("data-next-key", this.next_recordset_frst_key);
            // obj.nav_next_key = this.next_recordset_frst_key;
        }
    }
});


/**
* Move to the nth recordset
* @param Index of recordset to move to
*/
module.exports.define("moveToRecordset", function (new_recordset) {
    return undefined;
});


/**
* Reset column aggregation counters
*/
module.exports.define("resetAggregations", function (render_opts) {
    var text_total_row = "";
    var delim = "";

    function updateTextTotalRow(col_aggregation, aggr_id, aggr_label) {
        if (col_aggregation === aggr_id && text_total_row.indexOf(aggr_label) === -1) {
            text_total_row += delim + aggr_label;
            delim = " / ";
        }
    }
    this.columns.each(function (col) {
        col.total = [
            0,
        ];
        if (col.aggregation && col.aggregation !== "N") {
            updateTextTotalRow(col.aggregation, "S", "totals");
            updateTextTotalRow(col.aggregation, "A", "averages");
            updateTextTotalRow(col.aggregation, "C", "counts");
        }
    });
    if (!this.text_total_row) {
        this.text_total_row = text_total_row;
    }
});


/**
* Update column aggregation counters with this record's values
* @param Record obj representing current row
*/
module.exports.define("updateAggregations", function () {
    this.columns.each(function (col) {
        var i;
        if (col.field) {
            for (i = 0; i < col.total.length; i += 1) {
                col.total[i] += col.field.getNumber(0);
            }
        }
    });
});


/**
* Show a total row at bottom of table if any visible column is set to aggregate
* @param xmlstream element object for the table, render_opts
*/
module.exports.define("renderAggregations", function (render_opts) {
    var first_aggr_col = -1;
    var pre_aggr_colspan = 0;
    var row_elem;
    var i;
    var col;

    for (i = 0; i < this.columns.length(); i += 1) {
        col = this.columns.get(i);
        if (col.isVisibleColumn(render_opts)) {
            if (col.aggregation && col.aggregation !== "N") {
                first_aggr_col = i;
                break;
            }
            pre_aggr_colspan += 1;
        }
    }
    if (first_aggr_col === -1) {        // no aggregation
        return;
    }
    row_elem = this.getTableElement(render_opts).addChild("tr", null, "css_row_total");
    if (pre_aggr_colspan > 0) {
        row_elem.addChild("td").attribute("colspan", pre_aggr_colspan.toFixed(0)).addText(this.text_total_row);
    }
    for (i = first_aggr_col; i < this.columns.length(); i += 1) {
        this.columns.get(i).renderAggregation(row_elem, render_opts, 0, this.row_count);
    }
});


/**
* Create a new column object, using the spec properties supplied
* @param Spec object whose properties will be given to the newly-created column
* @return Newly-created column object
*/
module.exports.columns.override("add", function (col_spec) {
    var column;
    if (col_spec.field) {
        if (col_spec.field.accessible === false) {
            return null;
        }
        col_spec.id = col_spec.id || col_spec.field.id;
        col_spec.label = col_spec.label || col_spec.field.label;
        col_spec.css_class = col_spec.css_class || "";
        col_spec.width = col_spec.width || col_spec.field.col_width;
        col_spec.min_width = col_spec.min_width || col_spec.field.min_col_width;
        col_spec.max_width = col_spec.max_width || col_spec.field.max_col_width;
        col_spec.description = col_spec.description || col_spec.field.description;
        col_spec.aggregation = col_spec.aggregation || col_spec.field.aggregation;
        col_spec.separate_row = col_spec.separate_row || col_spec.field.separate_row;
        col_spec.decimal_digits = col_spec.decimal_digits || col_spec.field.decimal_digits || 0;
        col_spec.sortable = col_spec.sortable || col_spec.field.sortable;
        col_spec.tb_input = col_spec.tb_input || col_spec.field.tb_input_list;
        col_spec.group_label = col_spec.group_label || col_spec.field.col_group_label;

        if (typeof col_spec.visible !== "boolean") {
            col_spec.visible = col_spec.field.list_column;
        }
        col_spec.field.visible = true;              // show field content is column is visible
    }
    if (typeof col_spec.label !== "string") {
        this.throwError("label not specified");
    }
    if (col_spec.group_label && typeof this.section.show_col_groups !== "boolean") {
        this.section.show_col_groups = true;
    }
//    column = module.exports.Column.clone(col_spec);
    // Allows section specific column overrides to have an affect
    column = UI.ListBase.Column.clone(col_spec);
    Core.OrderedMap.add.call(this, column);
    return column;
});
