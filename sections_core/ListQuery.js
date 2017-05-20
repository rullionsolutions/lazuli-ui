"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


/**
* To represent a list of database records belonging to some parent record
*/
module.exports = UI.ListBase.clone({
    id: "ListQuery",
    show_row_control: true,
    group_level_0_icon: "0",
    group_level_1_icon: "1",
    group_level_2_icon: "2",
    group_level_3_icon: "3",
    level_break_depth: 0,
});


/**
* To set-up this List with the given entity by calling setupEntity(), calling setLinkField()
* if a link_field property is supplied
*/
module.exports.defbind("setupSequence", "setup", function () {
    if (typeof this.entity !== "object") {
        this.throwError("entity must be defined");
    }
    // if (typeof this.entity_id === "string" || typeof this.entity === "string") {
    // 'entity' as a string property is deprecated
    //     this.entity = Data.entities.getThrowIfUnrecognized(this.entity_id || this.entity);
    // }
    if (!this.record) {
        this.setupRecord();
    }
    if (!this.query) {
        this.setupQuery();
    }
    if (this.link_field && this.owner.page.page_key) {
        this.setLinkField(this.link_field, this.owner.page.page_key);
    }
    if (typeof this.sortable !== "boolean") {
        this.sortable = true;
    }
});


/**
* To create a 'record' object as a clone of the entity for containing row field values;
* to add a row control column
* @param entity_id string
*/
module.exports.define("setupRecord", function () {
    this.record = this.entity.getRecord({
        modifiable: false,
        page: this.owner.page,
        id_prefix: this.id,
        connection: this.connection,
    });
    this.generated_title = this.record.getPluralLabel();
    if (typeof this.show_row_control !== "boolean") {
        this.show_row_control = !!this.record.getDisplayPage();
    }
});


module.exports.define("setupQuery", function () {
    var that = this;
    this.query = this.record.getQuery(true);        // default sort
    this.query.get_found_rows = !this.open_ended_recordset;
    this.record.each(function (field) {
        if (field.accessible !== false) {
            that.addColumn(field);
        }
    });

    if (this.show_row_control) {
        this.addRowControlColumn();
    }

    if (this.record.addSecurityCondition) {
        this.record.addSecurityCondition(this.query, this.owner.page.session);
    }
});


/**
* To add a row control columns as the first column in the table, which is based on a Reference
* field to the entity, which is set
* @param entity_id as string
*/
module.exports.define("addRowControlColumn", function () {
    this.row_control_col = this.columns.add({
        id: "_row_control",
        dynamic_only: true,
        sortable: false,
        sticky: true,
        field: Data.Reference.clone({
            id: "_row_control",
            label: "",
            ref_entity: this.entity.id,
            list_column: true,
            session: this.owner.page.session,
            dropdown_label: "Action",
            dropdown_button: true,
            dropdown_css_class: "btn-default btn-xs",
            dropdown_right_align: true,
        }),
    });
    this.row_control_col.override("renderHeader", function (row_elmt, render_opts) {
        row_elmt.makeElement("th", "css_row_control css_sticky_col");
    });
    this.row_control_col.override("renderCell", function (row_elem, render_opts, ignore, row_obj) {
        if (this.dynamic_only && render_opts.dynamic_page === false) {
            return;
        }
        if (this.visible) {
            this.field.set(row_obj.getKey());
            this.field.renderNavOptions(row_elem.addChild("td"), render_opts, row_obj);
        }
    });
    // hide col if no display page
    this.row_control_col.visible = !!this.entity.getDisplayPage();
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

    if (this.row_control_col) {
        this.columns.moveTo("_row_control", (this.columns.length() - 1));
    }

    this.debug("Adding function as column: " + field.id + " to section " + this.id + ", query_column: " + query_column);
    return col;
});


/**
* To response to params passed in, moving the recordset forwards or backwards,
* changing the break level
* @param params object
*/
module.exports.defbind("updateRowSelector", "update", function (params) {
    var regex = new RegExp("list_(\\w+)_" + this.id + "(\\w*)");
    var match = regex.exec(params.page_button);
    var column;

    this.trace("params.page_button: " + params.page_button + ", this.subsequent_recordset:" + this.subsequent_recordset);
    if (match && match.length > 1) {
        if (match[1] === "set_frst") {
            this.recordset = 1;
        } else if (match[1] === "set_prev" && this.recordset > 1) {
            this.recordset -= 1;
        } else if (match[1] === "set_next" && this.subsequent_recordset) {
            this.recordset += 1;
        } else if (match[1] === "set_last" && this.subsequent_recordset && !this.open_ended_recordset) {
            this.recordset = this.recordset_last;
        } else if (match[1] === "show_detail_rows") {
            this.hide_detail_rows = false;
        } else if (match[1] === "hide_detail_rows") {
            this.hide_detail_rows = true;
        } else if (match[1] === "level_break" && match.length > 2) {
            this.level_break_depth = parseInt(match[2].substr(1), 10);
            if (this.level_break_depth === 0) {
                // if user hid detail rows then switched off level-breaking
                this.hide_detail_rows = false;
            }
        } else if (match[1] === "sort_asc" && match.length > 2) {
            column = this.columns.get(match[2].substr(1));
            if (this.sortable && column && column.sortable !== false) {
                column.query_column.sortTop();
                column.query_column.sortAsc();
            }
        } else if (match[1] === "sort_desc" && match.length > 2) {
            column = this.columns.get(match[2].substr(1));
            if (this.sortable && column && column.sortable !== false) {
                column.query_column.sortTop();
                column.query_column.sortDesc();
            }
        }
    }
    this.trace("this.recordset: " + this.recordset + ", this.query.limit_offset:" + this.query.limit_offset);
});


/**
* To render the list body, first determining the recordset_size, the calling
* resetAggregations() and renderInitialise();
* @param render_opts
*/
module.exports.override("renderBody", function (render_opts) {
    var recordset_size = this.recordset_size;
    if (!this.query) {
        this.throwError("no query object");
    }
    if (render_opts.long_lists && recordset_size < this.recordset_size_long_lists) {
        recordset_size = this.recordset_size_long_lists;
    }
//    this.resetAggregations(render_opts);
//    this.renderInitialize();

    this.trace("renderBody() this.recordset: " + this.recordset + ", this.query.limit_offset:" + this.query.limit_offset);
    if (this.hide_detail_rows) {
        this.renderBodyHiddenDetail(render_opts);
    } else if (this.level_break_depth === 0) {
        this.renderBodyLimitedResultSet(render_opts, recordset_size);
    } else {
        this.renderBodyFullResultSet(render_opts, recordset_size);
    }
    this.frst_record_in_set = ((this.recordset - 1) * recordset_size) + 1;
    this.last_record_in_set = (this.frst_record_in_set + this.row_count) - 1;
    if (!this.open_ended_recordset) {
        this.found_rows = this.query.found_rows;
        this.recordset_last = (recordset_size === 0) ? 1 :
            Math.floor((this.query.found_rows - 1) / recordset_size) + 1;
    }
});


module.exports.override("renderInitialize", function (render_opts) {
    UI.ListBase.renderInitialize.call(this, render_opts);
    this.keys = [];
    this.prev_recordset_last_key = null;
    this.next_recordset_frst_key = null;
});

// The following doesn't work when getComputed() requires other column values -
// would need a way to include specific fields that are not visible in the list
//    this.columns.each(function (col) {
//        if (col.query_column) {
//            this.trace("setting query_column " + col.query_column.id +
// " .active to " + col.visible);
//            col.query_column.active = col.visible || col.query_column.sort_seq;
//            if (col.field) {
//                col.field.query_column = (col.visible ? col.query_column.id : null);
//            }
//        }
//    });


/**
* To set the limit_offset and limit_row_count properties of the query object that
* belongs to this ListQuery
* @param current recordset - index number of current recordset (starting at 1)
*/
module.exports.define("setQueryLimits", function (recordset, recordset_size, before_row, after_row, render_opts) {
    if (this.hide_detail_rows) {
        this.recordset = 1;
        this.query.limit_offset = 0;
        this.query.limit_row_count = 0;
    } else if (render_opts && render_opts.long_lists) {
        this.recordset = 1;
        this.query.limit_offset = 0;
        this.query.limit_row_count = recordset_size;
    } else {
        before_row = before_row && recordset > 1;     // don't want before-row if first recordset
        this.query.limit_offset = ((recordset - 1) * recordset_size) - (before_row ? 1 : 0);
        this.query.limit_row_count = recordset_size + (before_row ? 1 : 0) + (after_row ? 1 : 0);
    }
});


/**
* To run the query only for the rows required for the current recordset (plus one either side)
* so doesn't support aggregation
* @param render_opts, recordset_size (integer)
*/
module.exports.define("renderBodyLimitedResultSet", function (render_opts, recordset_size) {
    this.setQueryLimits(this.recordset, recordset_size, true, true, render_opts);
    this.trace("renderBodyLimitedResultSet() this.recordset: " + this.recordset + ", this.query.limit_offset:" + this.query.limit_offset);
    if (this.skip_to_last_recordset) {
        this.query.next();
        this.recordset = (recordset_size === 0 || this.query.found_rows < 1) ? 1 :
            Math.floor((this.query.found_rows - 1) / recordset_size) + 1;
        this.query.reset();
        // reset query limits based on new recordset
        this.setQueryLimits(this.recordset, recordset_size, true, true);
        this.skip_to_last_recordset = false;
    }
    if (this.recordset > 1 && this.query.next()) {
        this.prev_recordset_last_key = this.query.getColumn("A._key").get();
        this.trace("renderBodyLimitedResultSet() setting prev_recordset_last_key to " + this.prev_recordset_last_key);
    }
    while (this.row_count < recordset_size && this.query.next()) {
        this.row_count += 1;
        this.record.populate(this.query.resultset);
        this.updateBreakAggregations();
        this.renderRow(render_opts, this.record);
    }
    this.subsequent_recordset = false;
    if (this.query.next()) {
        this.subsequent_recordset = true;
        this.next_recordset_frst_key = this.query.getColumn("A._key").get();
        this.trace("renderBodyLimitedResultSet() setting next_recordset_frst_key to " + this.next_recordset_frst_key);
        this.record.populate(this.query.resultset);
    }
    this.query.reset();
    if (this.first_aggregate_column > -1 && this.row_count > 0) {
        this.renderBreakEnd(render_opts, false, 0);
    }
});


/**
* To run the query through from the start to calculate aggregation totals and support level-breaking
* @param render_opts, recordset_size (integer)
*/
module.exports.define("renderBodyFullResultSet", function (render_opts, recordset_size) {
    var recordset = 1;
    var record_in_set = 0;

    this.query.limit_offset = 0;
    this.query.limit_row_count = (render_opts.dynamic_page === false) ? 0 :
        (recordset_size * this.recordset) + 1;
    this.subsequent_recordset = false;
    this.level_broken = 999;
    while (this.query.next()) {
        record_in_set += 1;
        if (render_opts.dynamic_page !== false && record_in_set > recordset_size) {
            recordset += 1;
            record_in_set = 1;
        }
        this.record.populate(this.query.resultset);
        this.getBrokenLevel();
        this.trace("renderBodyFullResultSet() loop, recordset: " + recordset + ", level_broken: " +
            this.level_broken + ", row_count: " + this.row_count);
        this.renderBreakEnd(render_opts, this.row_count === 0, this.level_broken);
        this.updateBreakAggregations();
        if (recordset === this.recordset) {
            this.row_count += 1;
            this.renderBreakStart(render_opts, this.row_count === 1);
            this.renderRow(render_opts, this.record);
        } else if (recordset < this.recordset) {
            this.prev_recordset_last_key = this.query.getColumn("A._key").get();
            this.trace("renderBodyLimitedResultSet() setting prev_recordset_last_key to " + this.prev_recordset_last_key);
        } else {
            this.subsequent_recordset = true;
            this.next_recordset_frst_key = this.query.getColumn("A._key").get();

            this.trace("renderBodyLimitedResultSet() setting next_recordset_frst_key to " + this.next_recordset_frst_key);
        }
    }
    this.query.reset();
    if (!this.subsequent_recordset && this.table_elem) {
        this.renderBreakEnd(render_opts, false, 0);
    }
});


module.exports.define("renderBodyHiddenDetail", function (render_opts) {
    this.setQueryLimits();
    this.subsequent_recordset = false;
    while (this.query.next()) {
        this.record.populate(this.query.resultset);
        this.getBrokenLevel();
        this.trace("renderBodyHiddenDetail() loop, level_broken: " + this.level_broken + ", row_count: " + this.row_count);
        this.renderBreakEnd(render_opts, this.row_count === 0, this.level_broken);
        this.updateBreakAggregations();
        this.row_count += 1;
        this.renderBreakStart(render_opts, this.row_count === 1);
    }
    this.query.reset();
    this.renderBreakEnd(render_opts, false, 0);
});


/**
* Move to the nth recordset
* @param Index of recordset to move to
*/
module.exports.override("moveToRecordset", function (new_recordset) {
    if (new_recordset < 1 || new_recordset > this.recordset_last) {
        this.throwError("invalid recordset index");
    }
//    this.renderInitialize();           // do we need to avoid resetAggregations() here?
    this.recordset = new_recordset;
    this.row_count = 0;
    this.setQueryLimits(this.recordset, this.recordset_size, true, true);
    this.trace("this.recordset: " + this.recordset + ", this.query.limit_offset:" + this.query.limit_offset);
    if (this.recordset > 1 && this.query.next()) {
        this.prev_recordset_last_key = this.query.getColumn("A._key").get();
        this.debug("moveToRecordset() setting prev_recordset_last_key to " + this.prev_recordset_last_key);
    }
    while (this.row_count < this.recordset_size && this.query.next()) {
        this.row_count += 1;
        this.record.populate(this.query.resultset);
        this.addRowToKeyArray(this.record);
    }
    this.subsequent_recordset = false;
    if (this.query.next()) {
        this.subsequent_recordset = true;
        this.next_recordset_frst_key = this.query.getColumn("A._key").get();
        this.debug("moveToRecordset() setting next_recordset_frst_key to " + this.next_recordset_frst_key);
    }
    this.query.reset();
});


/**
* To add a url attribute to the row element if the entity has a display page to link to
* @param row_elem (xmlstream), row_obj (usually a fieldset)
*/
module.exports.override("rowURL", function (row_elem, row_obj) {
    var display_page;
    var key = row_obj.getKey();
    row_elem.attribute("data-key", key);
    display_page = this.record.getDisplayPage();                    // §vani.core.7.5.1.3
    if (!this.suppress_row_url && display_page
            && display_page.allowed(this.owner.page.session, key, row_obj).access) {
        row_elem.attribute("url", display_page.getSimpleURL(key));
    }
});


/**
* To add the value of the current row's key to the keys array
* @param row object (usually a fieldset)
*/
module.exports.override("addRowToKeyArray", function (row_obj) {
    if (this.query.columns["A._key"]) {
        this.keys.push(this.query.columns["A._key"].get());
    }
});


/**
* To set up the levels structure, identifying the column associated with each level from the sort
* sequence; to calculate
* @param render_opts
*/
module.exports.override("resetAggregations", function (render_opts) {
    var level_break_depth = this.level_break_depth;
    var levels = [];
    var i;
    var column;

    UI.ListBase.resetAggregations.call(this, render_opts);
    this.levels = levels;
    for (i = 0; i <= level_break_depth; i += 1) {
        this.levels[i] = {
            rows: 0,
            index: i,
        };
    }

    this.columns.each(function (col) {
        var sort_seq;
        var j;

        delete col.level_break;
        if (col.query_column) {
            sort_seq = col.query_column.sort_seq;
        }
        if (typeof sort_seq === "number" && sort_seq < level_break_depth) {
            levels[sort_seq + 1].column = col;          // 1 is the highest level break column index
            col.level_break = sort_seq + 1;
        }
        col.total = [];
        for (j = 0; j <= level_break_depth; j += 1) {
            col.total[j] = 0;
        }
    });

    this.first_aggregate_column = -1;
    this.pre_aggregate_colspan = 0;

    for (i = 0; i < this.columns.length(); i += 1) {
        column = this.columns.get(i);
        delete column.prev_row_val;
        if (column.isVisibleColumn(render_opts)) {
            if (column.aggregation && column.aggregation !== "N") {
                this.first_aggregate_column = i;
                break;
            }
            this.pre_aggregate_colspan += 1;
        }
    }
});


/**
* To work out which level has broken and set level_broken property accordingly, and to increment
* the level row count
*/
module.exports.define("getBrokenLevel", function () {
    var i;
    var column;
    var val;

    this.level_broken = 999;
    for (i = 1; i <= this.level_break_depth && i < this.level_broken; i += 1) {
        column = this.levels[i].column;
        if (column) {
            val = column.field ? column.field.get() : column.text;
            if (val !== column.prev_row_val) {
                this.level_broken = i;
            }
            column.prev_row_val = val;
        }
    }

    this.trace("getBrokenLevel() row_count: " + this.row_count + ", level_broken: " + this.level_broken);
});


/**
* To update column aggregations by calling updateAggregations() on each column, and then set the
* text property on each level
*/
module.exports.define("updateBreakAggregations", function () {
    var level_broken = this.level_broken;
    var i;

    this.columns.each(function (col) {
        col.updateAggregations(level_broken);
    });
    for (i = this.level_break_depth; i >= level_broken; i -= 1) {
        this.levels[i].rows = 0;
        this.levels[i].text = null;
        if (this.levels[i].column) {
            if (this.levels[i].column.field) {
                this.levels[i].text = this.levels[i].column.field.getText();
            } else {
                this.levels[i].text = this.levels[i].column.text;
            }
        }
        if (!this.levels[i].text) {
            this.levels[i].text = "[blank]";
        }
    }
    for (i = 0; i <= this.level_break_depth; i += 1) {
        this.levels[i].rows += 1;
    }
});


/**
* To render level-break footer rows by calling renderBreakEndLevel() on each broken level
* @param render_opts, first_row_in_resultset (boolean), level_broken (integer)
*/
module.exports.define("renderBreakEnd", function (render_opts, first_row_in_resultset, level_broken) {
    var i;
    var table_elem = this.getTableElement(render_opts);

    if (!first_row_in_resultset && !this.hide_break_ends) {
        for (i = this.level_break_depth; i >= level_broken; i -= 1) {
            this.renderBreakEndLevel(table_elem, render_opts, this.levels[i]);
        }
    }
});


/**
* To render a level-break footer row for the given broken level, reporting aggregations as specified
* @param table_elem (xmlstream), render_opts, level (integer)
*/
module.exports.define("renderBreakEndLevel", function (table_elem, render_opts, level) {
    var tr_elem;
    var td_elem;
    var i;
    var colspan;

    this.debug("renderLevelBreakEnd() pre_aggregate_colspan: " + this.pre_aggregate_colspan + ", first_aggregate_column: " + this.first_aggregate_column);
    tr_elem = table_elem.addChild("tr", null, "css_row_total");
    if (this.level_break_depth === 0) {
        if (this.pre_aggregate_colspan > 0) {
            td_elem = tr_elem.addChild("td", null, "css_align_right");
            td_elem.attribute("colspan", this.pre_aggregate_colspan.toFixed(0));
            td_elem.addText(this.text_total_row + " (for rows shown)");
            level.rows = this.row_count;            // this isn't set otherwise
        }
    } else if (this.pre_aggregate_colspan === 0) {
        td_elem = tr_elem.addChild("td");
        td_elem.addText(this.text_total_row);
    } else {
        for (i = 1; i < level.index; i += 1) {
            tr_elem.addChild("td");
        }
        colspan = (this.pre_aggregate_colspan + this.level_break_depth)
            - level.index - (level.index === 0 ? 1 : 0);
        tr_elem.addChild("td", null, "css_type_number", String(level.rows));
        td_elem = tr_elem.addChild("td");
        td_elem.attribute("colspan", colspan.toFixed(0));
        td_elem.addText("row" + (level.rows === 1 ? "" : "s"));
        if (level.column) {
            td_elem.addText("&nbsp;for " + level.column.label);
        }
        if (level.text) {
            td_elem.addText(": " + level.text);
        }
        if (this.text_total_row) {
            td_elem.addText(", " + this.text_total_row);
        }
    }
    for (i = this.first_aggregate_column; i > -1 && i < this.columns.length(); i += 1) {
        if (this.columns.get(i).isVisibleColumn(render_opts)) {
            this.columns.get(i).renderAggregation(tr_elem, render_opts, level.index, level.rows);
        }
    }
});


/**
* To render the level-break header rows by calling renderBreakStartLevel() on continuation
* levels and then each broken level
* @param render_opts, first_row_in_resultset (boolean)
*/
module.exports.define("renderBreakStart", function (render_opts, first_row_in_resultset) {
    var i;
    var table_elem = this.getTableElement(render_opts);

    if (first_row_in_resultset && this.recordset > 1 && !this.hide_break_starts) {
        for (i = 1; i <= this.level_break_depth && i < this.level_broken; i += 1) {
            this.renderBreakStartLevel(table_elem, render_opts, this.levels[i], "&nbsp;(continued)");
        }
    }
    for (i = this.level_broken; i <= this.level_break_depth; i += 1) {
        if (this.hide_detail_rows && i === this.level_break_depth) {
            break;          // skip lowest-level start line if hiding detail rows
        }
        this.renderBreakStartLevel(table_elem, render_opts, this.levels[i]);
    }
});


/**
* To render a level-break header row for the given broken level
* @param table_elem (xmlstream), render_opts, level (integer), suffix (string) - e.g. '(continued)'
*/
module.exports.define("renderBreakStartLevel", function (table_elem, render_opts, level, suffix) {
    var tr_elem;
    var td_elem;
    var i;

    if (!level.column) {
        return;
    }
    tr_elem = table_elem.addChild("tr", null, "css_row_start");
    for (i = 1; i < level.index; i += 1) {
        tr_elem.addChild("td");
    }
    td_elem = tr_elem.addChild("td");
    td_elem.attribute("colspan", "99");
//  td_elem.addText("renderLevelBreakStart index: " + index + ", column: "
//      + this.level_break_cols[index]);
    if (this.list_advanced_mode && this.sortable && level.column.sortable !== false
            && render_opts.dynamic_page !== false) {
        level.column.renderSortLink(td_elem);
    }
    if (level.column.label) {
        td_elem.addText(level.column.label + ":&nbsp;");
    }
    if (level.column.field && !level.column.field.isBlank()) {
        level.column.field.renderUneditable(td_elem.addChild("b"), render_opts);
    // column property 'text' is for manually setting cell content, not header / level-break label
    // } else if (typeof level.column.text === "string") {
    //     td_elem.addText(level.column.text);
    }
    if (suffix) {
        td_elem.addText(suffix);
    }
});


/**
* To display level break buttons if list_advanced_mode, befaore calling ListBase.renderListPage()
* @param foot_elem (xmlstream), render_opts
*/
module.exports.override("renderListPager", function (foot_elem, render_opts) {
    var ctrl_elem;
    if (this.list_advanced_mode) {
        ctrl_elem = foot_elem.addChild("span", null, "css_list_level_break_chooser btn-group");

        ctrl_elem.addChild("a", "list_level_break_" + this.id + "_0", "css_cmd btn btn-default btn-xs" +
            (this.level_break_depth === 0 ? " active" : ""))
            .attribute("title", "No Grouping")
            .addText(this.group_level_0_icon, true);

        ctrl_elem.addChild("a", "list_level_break_" + this.id + "_1", "css_cmd btn btn-default btn-xs" +
            (this.level_break_depth === 1 ? " active" : ""))
            .attribute("title", "Group on first Sort Column")
            .addText(this.group_level_1_icon, true);

        ctrl_elem.addChild("a", "list_level_break_" + this.id + "_2", "css_cmd btn btn-default btn-xs" +
            (this.level_break_depth === 2 ? " active" : ""))
            .attribute("title", "Group on first 2 Sort Columns")
            .addText(this.group_level_2_icon, true);

        ctrl_elem.addChild("a", "list_level_break_" + this.id + "_3", "css_cmd btn btn-default btn-xs" +
            (this.level_break_depth === 3 ? " active" : ""))
            .attribute("title", "Group on first 3 Sort Columns")
            .addText(this.group_level_3_icon, true);

        if (this.level_break_depth > 0) {
            if (this.hide_detail_rows) {
                ctrl_elem
                    .addChild("a", "list_show_detail_rows_" + this.id, "css_cmd btn btn-default btn-xs")
                    .addChild("i", null, "glyphicon glyphicon-eye-open");
            } else {
                ctrl_elem
                    .addChild("a", "list_hide_detail_rows_" + this.id, "css_cmd btn btn-default btn-xs")
                    .addChild("i", null, "glyphicon glyphicon-eye-close");
            }
        }
    }
    UI.ListBase.renderListPager.call(this, foot_elem, render_opts);
});
