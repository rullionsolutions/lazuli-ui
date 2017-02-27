"use strict";

var UI = require("lazuli-ui/index.js");


/**
* To represent a set of items belonging to some parent record
*/
module.exports = UI.Section.clone({
    id: "Tiles",
    recordset_size: 100,
    recordset: 1,
    recordset_last: 1,
    show_footer: false,
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
    this.generated_title = this.record.title + " Records";
});


module.exports.define("setupRecord", function () {
    this.record = this.entity.getRecord({
        modifiable: false,
        page: this.owner.page,
    });
});


module.exports.define("setupQuery", function () {
    this.query = this.record.getQuery();
    this.query.get_found_rows = true;
    this.record.setDefaultSort(this.query);
});


/**
 * Set up link field relationship (requires this.query to be present)
 * @param link_field: string column id, value: string value to use in filter
 * condition, condition is false if not supplied
 */
module.exports.define("setLinkField", function (link_field, value) {
    if (this.key_condition) {
        this.key_condition.remove();
    }
    if (value) {
        this.key_condition = this.query.addCondition({
            column: link_field,
            operator: "=",
            value: value,
        });
    } else {
        this.key_condition = this.query.addCondition({ full_condition: "false", });        // prevent load if no value supplied
    }
});


module.exports.defbind("updateRecordSetPaging", "update", function (param) {
    if (param.page_button === "list_set_frst_" + this.id) {
        this.recordset = 1;
    } else if (param.page_button === "list_set_prev_" + this.id && this.recordset > 1) {
        this.recordset -= 1;
    } else if (param.page_button === "list_set_next_" + this.id && this.recordset < this.recordset_last) {
        this.recordset += 1;
    } else if (param.page_button === "list_set_last_" + this.id && this.recordset < this.recordset_last) {
        this.recordset = this.recordset_last;
    }

    this.query.limit_row_count = this.recordset_size;
    this.query.limit_offset = (this.recordset - 1) * this.recordset_size;
});


module.exports.override("render", function (element, render_opts) {
    if (!this.query) {
        this.throwError("No query object available");
    }
    UI.Section.render.call(this, element, render_opts);
    this.item_count = 0;
    this.keys = [];
    this.query.limit_offset = (this.recordset - 1) * this.recordset_size;
    this.query.limit_row_count = this.recordset_size;
    while (this.query.next()) {
        this.record.populate(this.query.resultset);
        this.addRowToKeyArray(this.record);
        this.record.renderTile(this.getSectionElement(render_opts), render_opts);
        this.item_count += 1;
    }
    this.query.reset();
    this.found_rows = this.query.found_rows;
    this.recordset_last = (this.recordset_size === 0) ? 1 :
        Math.floor((this.query.found_rows - 1) / this.recordset_size) + 1;
    this.frst_record_in_set = ((this.recordset - 1) * this.recordset_size) + 1;
    this.last_record_in_set = this.recordset * this.recordset_size;
    if (this.last_record_in_set > this.query.found_rows) {
        this.last_record_in_set = this.query.found_rows;
    }
    if (this.sctn_elem) {
        if (this.show_footer) {
            this.renderListPager(this.sctn_elem.addChild("div", null, "css_tiles_footer"), render_opts);
        } else if (this.item_count === 0) {
            this.sctn_elem.addChild("div", null, "css_tiles_footer", "no items");
        }
    }
});


module.exports.define("renderListPager", function (foot_elem, render_opts) {
    var ctrl_elem = foot_elem.addChild("span", null, "css_list_control");
    if (this.recordset > 1) {
        ctrl_elem.addChild("img", "list_set_frst_" + this.id, "css_cmd")
            .attribute("alt", "Go back to the First Recordset")
            .attribute("src", "../cdn/Axialis/Png/16x16/Player FastRev.png");
        ctrl_elem.addChild("img", "list_set_prev_" + this.id, "css_cmd")
            .attribute("alt", "Go back to the Previous Recordset")
            .attribute("src", "../cdn/Axialis/Png/16x16/Arrow3 Left.png");
    }
    ctrl_elem = foot_elem.addChild("span", null, "css_list_rowcount");
    if (this.frst_record_in_set && this.last_record_in_set && this.found_rows
            && this.last_record_in_set < this.found_rows) {
        ctrl_elem.addText("items " + this.frst_record_in_set + " - " +
            this.last_record_in_set + " of " + this.found_rows);
    } else if (this.item_count === 0) {
        ctrl_elem.addText("no items");
    } else if (this.item_count === 1) {
        ctrl_elem.addText("1 item");
    } else {
        ctrl_elem.addText(this.item_count + " items");
    }
    ctrl_elem = foot_elem.addChild("span", null, "css_list_control");
    if (this.recordset_last > 1 && this.recordset < this.recordset_last) {
        ctrl_elem.addChild("img", "list_set_next_" + this.id, "css_cmd")
            .attribute("alt", "Go forward to the Next Recordset")
            .attribute("src", "../cdn/Axialis/Png/16x16/Arrow3 Right.png");
        ctrl_elem.addChild("img", "list_set_last_" + this.id, "css_cmd")
            .attribute("alt", "Go forward to the Last Recordset")
            .attribute("src", "../cdn/Axialis/Png/16x16/Player FastFwd.png");
    }
});


module.exports.define("addRowToKeyArray", function (row_obj) {
    this.keys.push(this.query.columns["A._key"].value);
});
