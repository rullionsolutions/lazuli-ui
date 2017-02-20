"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ListBase.clone({
    id: "ListObjects",
    show_header: true,
});


module.exports.defbind("setupColumns", "setup", function () {
    var that = this;
    this.column_ids.forEach(function (column_id) {
        that.info("Adding column: " + column_id);
        that.columns.add({
            id: column_id,
            label: column_id,
        });
    });
});


module.exports.override("renderBody", function (render_opts) {
    var that = this;
    this.row_count = 0;
    this.container.forOwn(function (item_id, item) {
        that.row_count += 1;
        // that.columns.each(clearColumnText);
        that.columns.each(function (col) {
            col.text = that.objectToString(item[col.id] || "");
        });
        that.renderRow(render_opts, item);
    });
});


module.exports.define("objectToString", function (obj) {
    var str;
    if (typeof obj === "string") {
        str = obj;
    } else if (typeof obj === "boolean" || typeof obj === "number") {
        str = String(obj);
    } else if (typeof obj === "object" && obj && obj.toString) {
        str = obj.toString();
    } else {
        str = typeof obj;
    }
    return str;
});
