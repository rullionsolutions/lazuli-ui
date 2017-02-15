"use strict";

var UI = require("lazuli-ui/index.js");
var SQL = require("lazuli-sql/index.js");
var Data = require("lazuli-data/index.js");


/**
* Show the transaction history of this record
*/
module.exports = UI.ListQuery.clone({
    id: "ChangeHistory",
    sortable: true,
    open_ended_recordset: true,           // for performance reasons
});


module.exports.override("setEntity", function () {
// backward-compatibility - use entity_id instead of entity to specify string going forwards
    if (typeof this.entity === "string" && !this.entity_id) {
        this.entity_id = this.entity;
    }
    this.entity = Data.Entity.getEntityThrowIfUnrecognized("ac_tx");
});


module.exports.defbind("addJoinCond", "setup", function () {
    this.columns.get("id").visible = false;
    this.columns.get("start_point").visible = false;
    this.columns.get("tx_stat").visible = false;
    this.generated_title = "Change History";
    this.query.addCondition({
        column: "A.tx_stat",
        operator: "=",
        value: "A",         // active only
    });
    this.query.addTable({
        table: "ac_tx_sub",
        type: this.query.main.types.inner_join,
        join_cond: "?.tx = A._key" +
            " AND ?.entity = " + SQL.Connection.escape(this.entity_id) +
            " AND ?.key_string = " + SQL.Connection.escape(this.owner.page.page_key),
    });
});
