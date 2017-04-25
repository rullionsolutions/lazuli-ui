"use strict";

var Core = require("lapis-core/index.js");

/**
* To represent a column in a table
*/
module.exports = Core.Base.clone({
    id: "ItemList.Column",
    visible: true,
    hover_text_icon: "&#x24D8;",
});


/**
* To indicate whether or not this column is visible (as a column, i.e. not a separate row),
* evaluated as:
* @param render_opts
* @return true if this column is a visible column, otherwise false
*/
module.exports.define("isVisibleColumn", function (render_opts) {
    var column_paging = true;
    if (typeof render_opts !== "object") {
        this.throwError("invalid argument");
    }
    if (this.owner.section.max_visible_columns && !this.sticky) {
        column_paging = this.non_sticky_col_seq >=
            (this.owner.section.current_column_page * this.owner.section.non_sticky_cols_per_page)
            && this.non_sticky_col_seq <
                ((this.owner.section.current_column_page + 1)
                * this.owner.section.non_sticky_cols_per_page);
    }
    return column_paging && this.isVisibleDisregardingColumnPaging(render_opts);
});


module.exports.define("isVisibleDisregardingColumnPaging", function (render_opts) {
    return this.visible && !this.separate_row
        && !(this.dynamic_only && render_opts.dynamic_page === false)
        && (typeof this.level_break !== "number");
});


/**
* To update running totals for this column, resetting totals if level is broken
* @param level broken (integer), 1 being the highest
*/
module.exports.define("updateAggregations", function (level_broken) {
    var i;
    for (i = 0; i < this.total.length; i += 1) {
        if (i >= level_broken) {
            this.total[i] = 0;
        }
        if (this.field) {
            if (this.field.getComputed && typeof this.field.getComputed === "function") {
                this.total[i] += parseFloat(this.field.getComputed(), 10);
            } else {
                this.total[i] += this.field.getNumber(0);
            }
        } else {
            this.total[i] += parseFloat(this.text, 10);
        }
    }
});


/**
* Generate HTML output for this column's heading, as a th element
* @param parent xmlstream element object, expected to be a tr, render_opts
*/
module.exports.define("renderHeader", function (row_elmt, render_opts) {
    var elmt;
    var css_class = this.css_class;

    if (this.field) {
        css_class += " " + this.field.getCellCSSClass();
    }
    if (this.freeze) {
        css_class += " css_col_freeze";
    }
    if (this.field && typeof this.field.renderListHeader === "function") {
        this.field.renderListHeader(row_elmt, render_opts, css_class);
        return;
    }
    elmt = row_elmt.makeElement("th", css_class);
    if (this.width) {
        elmt.attr("style", "width: " + this.width);
    }
    if (this.min_width) {
        elmt.attr("style", "min-width: " + this.min_width);
    }
    if (this.max_width) {
        elmt.attr("style", "max-width: " + this.max_width);
    }
    if (this.description && render_opts.dynamic_page !== false) {
        elmt.makeTooltip(this.hover_text_icon, this.description);
        elmt.text("&nbsp;", true);
    }
    if (this.owner.section.list_advanced_mode && this.owner.section.sortable
            && this.sortable !== false
            && render_opts.dynamic_page !== false && this.query_column) {
        elmt = this.renderSortLink(elmt);
    }
    elmt.text(this.label);
});


/**
* To render the heading content of a sortable column as an anchor with label text,
*   which when clicked brings
* @param th element (xmlstream) to put content into, label text string
* @return anchor element (xmlstream)
*/
module.exports.define("renderSortLink", function (elem) {
    var sort_seq_asc = 0;
    var sort_seq_desc = 0;
    var anchor_elem;
    var span_elem;
    var description;

    if (typeof this.query_column.sort_seq === "number" && this.query_column.sort_seq < 3) {
        if (this.query_column.sort_desc) {
            sort_seq_desc = this.query_column.sort_seq + 1;
        } else {
            sort_seq_asc = this.query_column.sort_seq + 1;
        }
    }
    anchor_elem = elem.makeElement("a", "css_cmd css_list_sort");
    if (sort_seq_asc === 1 || sort_seq_desc > 1) {
        description = "Sort descending at top level";
        anchor_elem.attr("id", "list_sort_desc_" + this.owner.section.id + "_" + this.id);
    } else {
        description = "Sort ascending at top level";
        anchor_elem.attr("id", "list_sort_asc_" + this.owner.section.id + "_" + this.id);
    }
    anchor_elem.attr("title", description);

    if (sort_seq_asc > 0) {
        span_elem = anchor_elem.makeElement("span", "css_uni_icon");
        span_elem.attr("style", "opacity: " + (0.3 * (4 - sort_seq_asc)).toFixed(1));
        span_elem.text(this.owner.section.sort_arrow_asc_icon, true);
    }
    if (sort_seq_desc > 0) {
        span_elem = anchor_elem.makeElement("span", "css_uni_icon");
        span_elem.attr("style", "opacity: " + (0.3 * (4 - sort_seq_desc)).toFixed(1));
        span_elem.text(this.owner.section.sort_arrow_desc_icon, true);
    }
    return anchor_elem;
});


/**
* Generate HTML output for this column's cell in a table body row
* @param parent xmlstream element object for the row, render_opts, column index number, generic
* object representing the row (e.g. a x.sql.Query or x.Entity object)
* @return xmlstream element object for the cell, a td
*/
module.exports.define("renderCell", function (row_elem, render_opts) {
    var cell_elem;
    if (this.field) {
        cell_elem = this.field.renderCell(row_elem, render_opts);
    } else {
        cell_elem = row_elem.makeElement("td", this.css_class);
        if (this.text) {
            cell_elem.text(this.text);
        }
    }
    return cell_elem;
});


/**
* Generate HTML output for this column's cell in a table body row
* @param table_elem: parent xmlstream element object, render_opts, i: column index number,
* row_obj: row object
* @return xmlstream element object for the cell, a td
*/
module.exports.define("renderAdditionalRow", function (table_elem, render_opts, item, css_class) {
    var row_elem;
    var cell_elem;
    var css_type;

    if (this.visible && this.separate_row && ((this.field
            && (this.field.getText() || this.field.isEditable())) || (!this.field && this.text))) {
        row_elem = table_elem.makeElement("tr", css_class);
        this.owner.section.rowURL(row_elem, item);
        if (this.owner.section.allow_delete_rows) {
            row_elem.makeElement("td", "css_col_control");
        }
        row_elem.makeElement("td", "css_align_right")
            .makeTooltip(this.hover_text_icon, this.label, "css_uni_icon");
        css_type = (this.css_type || (this.field && this.field.css_type));
        cell_elem = row_elem.makeElement("td");
        if (css_type) {
            cell_elem.attr("class", "css_type_" + css_type);
        }
        cell_elem.attr("colspan", (this.owner.section.getActualColumns() - 1).toFixed(0));

        // cell_elem.addChild("i", null, null, );
        // cell_elem.addText(":");
        if (this.field) {
            this.field.renderFormGroup(cell_elem, render_opts, "table-cell");
        } else if (this.text) {
            cell_elem.text(this.text);
        }
    }
    return cell_elem;
});


/**
* Generate HTML output for this column's cell in a total row
* @param parent xmlstream element object for the row, render_opts
* @return xmlstream element object for the cell, a td
*/
module.exports.define("renderAggregation", function (row_elem, render_opts, level, rows) {
    var cell_elem;
    var css_class = this.css_class;
    var number_val;

    if (this.visible && !this.separate_row) {
        if (this.field) {
            css_class += " " + this.field.getCellCSSClass();
        }
        if (this.freeze) {
            css_class += " css_col_freeze";
        }
        cell_elem = row_elem.makeElement("td", css_class);
        cell_elem.attr("id", this.id);
        number_val = null;
        if (this.aggregation === "C") {
            number_val = rows;
        } else if (this.aggregation === "S") {
            number_val = this.total[level];
        } else if (this.aggregation === "A") {
            number_val = (this.total[level] / rows);
        }
        if (typeof number_val === "number") {
            if (isNaN(number_val)) {
                cell_elem.text("n/a");
            } else if (this.field && typeof this.field.format === "function") {
                cell_elem.text(this.field.format(number_val));
            } else {
                cell_elem.text(number_val.toFixed(this.decimal_digits || 0));
            }
        }
    }
    return cell_elem;
});


module.exports.define("renderColumnChooser", function (ctrl_elem, render_opts, list_id) {
    if (!Core.Format.trim(this.label)) {
        return;
    }
    ctrl_elem.makeElement("button", "btn btn-default btn-xs css_cmd " + (this.visible ? "active" : ""),
            "list_" + list_id + "_col_" + this.id + (this.visible ? "_hide" : "_show"))        /* TB3 btn-xs */
        .attr("type", "button")
        .attr("data-toggle", "button")
        .text(this.label);
});

