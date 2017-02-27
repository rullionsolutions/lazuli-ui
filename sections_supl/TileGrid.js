"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Section.clone({
    id: "TileGrid",
});


module.exports.defbind("setup", "setup", function () {
    if (!this.record) {
        this.setupRecord();
    }
    if (!this.query) {
        this.setupQuery();
    }
    if (this.link_field && this.owner.page.page_key) {
        this.setLinkField(this.link_field, this.owner.page.page_key);
    }
    this.generated_title = this.record.getPluralLabel();
});


module.exports.define("setupRecord", function () {
    // if (!entity_id || !Entity.getEntity(entity_id)) {
    //     this.throwError("entity not found: " + entity_id);
    // }
    this.record = this.entity.getRecord({
        modifiable: false,
        page: this.owner.page,
        id_prefix: this.id,
        connection: this.connection,
    });
    if (!this.record.getField(this.column_field)) {
        this.throwError("invalid configuration");
    }
    if (this.row_field && !this.record.getField(this.row_field)) {
        this.throwError("invalid configuration");
    }
    if (this.record.getField(this.column_field).type === "Option") {
        this.column_lov = this.record.getField(this.column_field).getOwnLoV();
    }
});


module.exports.define("setupQuery", function () {
    this.query = this.record.getQuery(true);            // default sort
    if (this.record.addSecurityCondition) {
        this.record.addSecurityCondition(this.query, this.owner.page.session);
    }
});


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
        this.key_condition = this.query.addCondition({
            full_condition: "false",
        });        // prevent load if no value supplied
    }
});


module.exports.override("render", function (element, render_opts) {
    UI.Section.render.call(this, element, render_opts);
    this.prepareColumns();
    this.renderGrid(render_opts);
});


module.exports.define("renderGrid", function (render_opts) {
    this.table_elem = null;
    if (!this.hide_table_if_empty) {
        this.getTableElement(render_opts);
    }
    this.renderBody(render_opts);
});


module.exports.define("getTableElement", function (render_opts) {
    var css_class;
    if (!this.table_elem) {
        css_class = "css_list table table-bordered table-condensed";
        this.table_elem = this.getSectionElement().addChild("table", this.id, css_class);
        this.renderHeader(this.table_elem, render_opts);
    }
    return this.table_elem;
});

module.exports.define("prepareColumns", function () {
    var that = this;
    var prev_col_val;
    var col_val;
    var col;

    this.columns = [];
    this.column_labels = [];

    if (this.column_lov) {
        this.column_lov.each(function (item) {
            if (item.active) {
                that.addColumn(item.id, item.label);
            }
        });
    } else {
        col = this.query.getColumn("A." + this.column_field);
        col.sortTop();
        while (this.query.next()) {
            col_val = col.get();
            if (col_val !== prev_col_val) {
                this.record.populate(this.query.resultset);
                this.addColumn(col_val, this.record.getField(this.column_field).getText());
                prev_col_val = col_val;
            }
        }
        this.query.reset();
    }
});

module.exports.define("addColumn", function (id, label) {
    this.columns.push(id);
    this.column_labels.push(label);
});

module.exports.define("renderHeader", function (table_elem, render_opts) {
    var thead_elem = table_elem.addChild("thead");
    var row_elem = thead_elem.addChild("tr");
    var th_elem;
    var i;

    if (this.row_field) {
        row_elem.addChild("th").addText(this.record.getField(this.row_field).label);
    }
    for (i = 0; i < this.columns.length; i += 1) {
        th_elem = row_elem.addChild("th", null, this.columns[i]);
        if (this.equalize_column_widths) {
            th_elem.attribute("style", "width: " + (100 / this.columns.length).toFixed(2) + "%");
        }
        th_elem.addText(this.column_labels[i]);
    }
    return row_elem;
});

module.exports.define("renderBody", function (render_opts) {
    var tbody_elem = this.getTableElement(render_opts).addChild("tbody");
    var prev_row_val;
    var row_val;

    if (this.row_field) {
        this.query.getColumn("A." + this.row_field).sortTop();
    }
    while (this.query.next()) {
        this.record.populate(this.query.resultset);
        row_val = (this.row_field && this.record.getField(this.row_field).get()) || "X";
        if (row_val !== prev_row_val) {
//            if (prev_row_val) {
            this.completeRow();
//            }
            this.row_elem = tbody_elem.addChild("tr");
            prev_row_val = row_val;
            this.curr_col = 0;
            if (this.row_field) {
                this.cell_elem = this.row_elem.addChild("td").addText(this.record.getField(this.row_field).getText());
            }
            this.cell_elem = this.row_elem.addChild("td");
        }
        this.renderRow(render_opts);
    }
    this.completeRow();
    this.query.reset();
});

module.exports.define("renderRow", function (render_opts) {
    var col_val = this.record.getField(this.column_field).get();
    if (this.columns.indexOf(col_val) === -1) {
        return;
    }
    this.fillInCells(col_val);
    this.record.renderTile(this.cell_elem, render_opts);
});

module.exports.define("fillInCells", function (col_val) {
    while (this.columns[this.curr_col] !== col_val) {
        if (this.curr_col >= this.columns.length) {
            this.throwError("assumption failure");
        }
        this.cell_elem = this.row_elem.addChild("td");
        this.curr_col += 1;
    }
});

module.exports.define("completeRow", function () {
    while (this.row_elem && this.curr_col < (this.columns.length - 1)) {
        this.row_elem.addChild("td");
        this.curr_col += 1;
    }
    this.row_elem = null;
});
