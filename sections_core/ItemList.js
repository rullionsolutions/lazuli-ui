"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");

/**
* The root Archetype of a list or grid section
*/
module.exports = UI.ItemSet.clone({
    id: "ItemList",
    columns: Core.OrderedMap.clone({ id: "List.columns", }),
    allow_choose_cols: true,
    show_header: true,
    show_footer: true,
    right_align_numbers: true,
    hide_table_if_empty: true,
//    text_total_row: "Total"
    sort_arrow_asc_icon: "&#x25B2;",
    sort_arrow_desc_icon: "&#x25BC;",
    column_chooser_icon: "<i class='glyphicon glyphicon-wrench'></i>",
    // prev_columnset_icon: "<i class='glyphicon glyphicon-chevron-left'></i>",
    // next_columnset_icon: "<i class='glyphicon glyphicon-chevron-right'></i>",
});


/**
* Initialise the columns collection in this section object
*/
module.exports.defbind("cloneColumns", "cloneInstance", function () {
    this.columns = this.parent.columns.clone({
        id: "ItemList.columns",
        section: this,
    });
});


/**
* Set 'list_advanced_mode' property from session property
*/
module.exports.defbind("setAdvancedMode", "setup", function () {
    this.list_advanced_mode = (this.owner.page.session.list_advanced_mode === true);
    if (this.allow_delete_items) {
        this.record.getField("_item_deleter").btn_label = this.delete_item_icon;
    }
});


module.exports.defbind("setupColumns", "setup", function () {
    var that = this;
    this.record.each(function (field) {
        if (field.accessible !== false) {
            that.addColumn(field);
        }
    });
});


/**
* To add the ith field of record as a column, setting the column's field property to the field,
* and query_column to the query column
* @param index number of the field
* @return new column object
*/
module.exports.define("addColumn", function (field) {
    var query_column = this.query.getColumn(field.query_column);
    var col;
    if (!query_column) {
        this.warn("No query_column: " + field);
    }
    col = this.columns.add({
        field: field,
        query_column: query_column,
    });
    this.trace("Adding field as column: " + field.id + " to section " + this.id + ", query_column: " + query_column);
    return col;
});


/**
* To add a function field to the record, and a corresponding column to this list
* @param spec object, specifying at least: id, type, label and sql_function
* @return new column object
*/
module.exports.define("addFunction", function (spec) {
    var field;
    var query_column;
    var col;

    spec.name = spec.id;
    if (typeof spec.list_column !== "boolean") {
        spec.list_column = true;            // visible unless overridden by visible property
    }
    field = this.record.addField(spec);
    query_column = field.addColumnToTable(this.query.main, spec);
    field.query_column = query_column.id;
    col = this.columns.add({
        field: field,
        query_column: query_column,
    });

    if (this.row_control_field) {
        this.columns.moveTo(this.row_control_field.id, (this.columns.length() - 1));
    }

    this.debug("Adding function as column: " + field.id + " to section " + this.id + ", query_column: " + query_column);
    return col;
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
    this.selection_col.override("renderHeader", function (row_elmt, render_opts) {
        var elmt = row_elmt.makeElement("th", "css_mr_sel css_sticky_col");
        elmt.makeElement("span", "glyphicon glyphicon-ok");
    });
    this.selection_col.override("renderCell", function (row_elem, render_opts) {
        var td = row_elem.makeElement("td", "css_mr_sel");
        td.makeElement("span", "glyphicon glyphicon-ok");
    });
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
});


/**
* To reset record_count property and call resetAggregations(), initializeColumnPaging(), etc
*/
module.exports.defbind("renderBeforeRecords", "renderBeforeItems", function (render_opts) {
    this.resetAggregations();
    this.table_elem = null;
    if (!this.hide_table_if_empty) {
        this.getTableElement(render_opts);
    }
});


/**
* To return the 'table_elem' XmlStream object for the HTML table, creating it if it doesn't
* already exist
* @param
* @return table_elem XmlStream object for the HTML table
*/
module.exports.define("getTableElement", function (render_opts) {
    var css_class;

    if (!this.table_elem) {
        css_class = "css_list table table-condensed table-hover form-inline";
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
* 'level_break_depth', ONLY available after renderHeader() is called
* @return number of actual shown HTML columns
*/
module.exports.define("getActualColumns", function () {
    return (this.total_visible_columns || 0) + (this.level_break_depth || 0);
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
    if (this.list_advanced_mode && this.allow_choose_cols && params["cols_filter_" + this.id + "_list"]) {
        columns = params["cols_filter_" + this.id + "_list"].split("|");
        this.columns.each(function (col) {
            col.visible = columns.indexOf(col.id) > -1;
        });
    }
});


/**
* To generate the HTML thead element and its content, calling renderHeader() on each visible column
* @param xmlstream table element object,
* @return row_elem xmlstream object representing the th row
*/
module.exports.define("renderHeader", function (table_elem, render_opts) {
    var thead_elem = table_elem.makeElement("thead");
    var row_elem;
    var total_visible_columns = 0;

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
    var row_elem = thead_elem.makeElement("tr");
    var i;

    for (i = 0; i < this.level_break_depth; i += 1) {
        row_elem.makeElement("th", "css_level_break_header");
    }
    return row_elem;
});


module.exports.define("renderColumnGroupHeadings", function (thead_elem, render_opts) {
    var row_elem = this.renderHeaderRow(thead_elem);
    var group_label = "";
    var colspan = 0;

    function outputColGroup() {
        var th_elem;
        if (colspan > 0) {
            th_elem = row_elem.makeElement("th", "css_col_group_header");
            th_elem.attr("colspan", String(colspan));
            th_elem.text(group_label);
        }
    }
    this.columns.each(function (col) {
        if (col.isVisibleColumn()) {
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


module.exports.override("getItemSetElement", function (render_opts) {
    return this.getTableElement(render_opts).makeElement("tbody");
});


module.exports.override("renderItem", function (tbody_elmt, render_opts, item) {
    // var table_elem = this.getTableElement(render_opts);
    return this.renderListRow(tbody_elmt, render_opts, item);        // element is table
});


/**
* To render an object (usually a fieldset) as an HTML tr element, calling getRowCSSClass(), rowURL()
* @param table_elem (xmlstream), render_opts, row_obj
* @return row_elem (xmlstream)
*/
module.exports.define("renderListRow", function (tbody_elmt, render_opts, item) {
    var i;
    var css_class = this.getRowCSSClass(item);
    var row_elem = tbody_elmt.makeElement("tr", css_class);
    this.trace("renderListRow(): " + css_class);
    this.rowURL(row_elem, item);
    for (i = 0; i < this.level_break_depth; i += 1) {
        row_elem.makeElement("td");
    }
    this.columns.each(function (col) {
        col.trace("Setting field to: " + item.getField(col.id));
        col.field = item.getField(col.id);
        if (col.isVisibleColumn(render_opts)) {
            col.renderCell(row_elem, render_opts);
        }
    });
    this.columns.each(function (col) {
        col.renderAdditionalRow(tbody_elmt, render_opts, item, css_class);
    });
    return row_elem;
});


/**
* To return the CSS class string for the tr object - 'css_row_even' or 'css_row_odd' for row
* striping
* @param row_obj
* @return CSS class string
*/
module.exports.define("getRowCSSClass", function (row_obj) {
    return (this.item_count % 2 === 0) ? "css_row_even" : "css_row_odd";
});


/**
* To return a string URL for the row, if appropriate
* @param row_elem (xmlstream), row_obj (usually a fieldset)
* @return string URL or null or undefined
*/
module.exports.define("rowURL", function (row_elem, row_obj) {
    var display_page;
    var row_key = row_obj.getKey();
    if (row_obj && typeof row_obj.getKey === "function") {
        row_key = row_obj.getKey();
        row_elem.attr("data-key", row_key);
        display_page = this.record.getDisplayPage();
        if (this.output_row_url && display_page
                && display_page.allowed(this.owner.page.session, row_key, row_obj).access) {
            row_elem.attr("url", display_page.getSimpleURL(row_key));
        }
    }
});


module.exports.override("getFootElement", function (render_opts) {
    var tfoot_elem;
    if (!this.foot_elmt) {
        tfoot_elem = this.getTableElement(render_opts).makeElement("tfoot");
        if (this.bulk_actions && Object.keys(this.bulk_actions).length > 0) {
            this.renderBulk(tfoot_elem);
        }
        this.foot_elmt = tfoot_elem.makeElement("tr").makeElement("td");
        this.foot_elmt.attr("colspan", String(this.getActualColumns()));
    }
    return this.foot_elmt;
});


module.exports.define("renderBulk", function (tfoot_elem, render_opts) {
    var that = this;
    var cell_elem = tfoot_elem.makeElement("tr", "css_mr_actions").makeElement("td");
    cell_elem.attr("colspan", String(this.getActualColumns()));
    cell_elem.makeHidden("list_" + this.id + "_mr_selected", JSON.stringify(this.selected_keys || []));
    // cell_elem.makeElement("input")
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
* To render a column-chooser control (a set of push-state buttons represents all available
*columns, with the
* @param foot_elem (xmlstream), render_opts
*/
module.exports.defbind("renderColumnChooser", "renderAfterItems", function (render_opts) {
    var foot_elmt = this.getFootElement();
    var ctrl_elmt;
    var that = this;

    if (this.allow_choose_cols && this.list_advanced_mode) {
        ctrl_elmt = foot_elmt.makeElement("span", "css_list_col_chooser");
        ctrl_elmt.attr("onclick", "x.ui.listColumnChooser(this)");
        ctrl_elmt.makeElement("a", "btn btn-default btn-xs", "list_choose_cols_" + this.id)
            .attr("title", "Choose Columns to View")
            .text(this.column_chooser_icon, true);
        ctrl_elmt = foot_elmt.makeElement("div", "css_list_choose_cols" + (this.show_choose_cols ? "" : " css_hide"));
        ctrl_elmt.makeElement("span", "css_list_cols_filter")
            .makeInput("text", "cols_filter_" + this.id, this.cols_filter,
            "css_list_cols_filter form-control input-xs", "Filter Columns");

        this.columns.each(function (col) {
            col.renderColumnChooser(ctrl_elmt, render_opts, that.id);
        });
    }
});


/**
* Reset column aggregation counters
*/
module.exports.define("resetAggregations", function () {
    var text_total_record = "";
    var delim = "";

    function updateTextTotalRow(col_aggregation, aggr_id, aggr_label) {
        if (col_aggregation === aggr_id && text_total_record.indexOf(aggr_label) === -1) {
            text_total_record += delim + aggr_label;
            delim = " / ";
        }
    }
    this.columns.each(function (col) {
        col.total = [0,
        ];
        if (col.aggregation && col.aggregation !== "N") {
            updateTextTotalRow(col.aggregation, "S", "totals");
            updateTextTotalRow(col.aggregation, "A", "averages");
            updateTextTotalRow(col.aggregation, "C", "counts");
        }
    });
    if (!this.text_total_record) {
        this.text_total_record = text_total_record;
    }
});


/**
* Update column aggregation counters with this record's values
* @param Record obj representing current record
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
        if (col.isVisibleColumn()) {
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
    row_elem = this.getTableElement(render_opts).makeElement("tr", "css_record_total");
    if (pre_aggr_colspan > 0) {
        row_elem.makeElement("td").attr("colspan", pre_aggr_colspan.toFixed(0)).text(this.text_total_record);
    }
    for (i = first_aggr_col; i < this.columns.length(); i += 1) {
        this.columns.get(i).renderAggregation(row_elem, 0, this.getRecordCount());
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
        col_spec.sticky = col_spec.sticky || col_spec.field.sticky_column;
        col_spec.css_class_col_header = col_spec.css_class_col_header || col_spec.field.css_class_col_header;
        col_spec.css_class_col_cell = col_spec.css_class_col_cell || col_spec.field.css_class_col_cell;
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
    column = module.exports.Column.clone(col_spec);
    Core.OrderedMap.add.call(this, column);
    return column;
});

