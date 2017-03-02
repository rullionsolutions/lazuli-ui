"use strict";

var UI = require("lazuli-ui/index.js");

module.exports = UI.ListQuery.clone({
    id: "ExportHistory",
    sortable: true,
    open_ended_recordset: true,             // for performance reasons
    show_row_control: false,
    key_condition: null,                 // Condition selecting the appropriate transactions, x.sql.Condition, use methods only
    extra_cond_sql: null,                 // Extra query condition SQL to filter the list, string
    extra_condition: null,                  // Extra query condition produced if extra_cond_sql is supplied, use methods only
});

module.exports.define("setup", function () {
    x.sections.ListBase.setup.call(this);        // deliberately DON'T call ListQuery.setup()

    if (!this.key) {
        this.key = this.deduceKey();
    }

    this.setupEntity("ac_export");
    this.generated_title = "Message History";
    this.query.addCondition({
        column: "A.subtype",
        operator: "=",
        value: this.subtype,
    });
    if (this.action) {
        this.query.addCondition({
            column: "A.action",
            operator: "=",
            value: this.action,
        });
    }
    this.key_condition = this.query.addCondition({
        full_condition: "LOCATE('ref_entity\":\"vr_rqmt_splr', A.base_record)"
                       + " AND LOCATE('val\":\"" + this.key + "', A.base_record)",
    });

    if (typeof this.extra_cond_sql === "string") {
        this.extra_condition = this.query.addCondition({ full_condition: this.extra_cond_sql, });
    }
});
