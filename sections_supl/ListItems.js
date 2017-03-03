"use strict";

var UI = require("lazuli-ui/index.js");

/**
* Show the transaction history of this record
*/
module.exports = UI.Section.clone({
    id: "ListItems",
    recordset_size: 10,
});

module.exports.define("setup", function () {
    x.sections.Section.setup.call(this);
    this.record = x.entities[this.entity].clone({
        id: this.entity,
        modifiable: false,
        page: this.owner.page,
        id_prefix: this.id,
    });
    this.query = this.record.getQuery(null, true);
});


module.exports.override("render", function (element, render_opts) {
    x.sections.Section.render.call(this, element, render_opts);
    this.query.limit_row_count = this.recordset_size;
    this.rows = {};
    while (this.query.next()) {
        this.record.populate(this.query.resultset);
        this.renderItem(render_opts);
    }
    this.query.reset();
});
