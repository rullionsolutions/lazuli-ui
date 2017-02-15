"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");


module.exports = Core.Base.clone({
    id: "DotGraph.Level",
});


module.exports.defbind("cloneInstance", "cloneInstance", function () {
    if (!this.record) {
        if (!this.entity_id) {
            this.throwError("Neither record nor entity_id supplied");
        }
        this.record = Data.Entity.getEntityThrowIfUnrecognized(this.entity_id)
            .getRecord({ modifiable: false, });
    }
    this.children = [];
});


module.exports.define("addChild", function (spec) {
    var child = this.clone(spec);
    child.seq = this.children.length;
    this.children.push(child);
    return child;
});


module.exports.define("getDotGraph", function (render_opts, level, this_key, parent_key) {
    var query = this.getQuery(this_key, parent_key);
    var out = "";

    while (query.next()) {
        this.record.populate(query.resultset);
        out += this.getDotGraphNode(render_opts);
        out += this.getDotGraphEdge(render_opts, parent_key);
        if (this.nextLevel(render_opts, level)) {
            out += this.getDotGraph(render_opts, level + 1, null, query.getColumn("A._key").get());
        }
    }
    query.reset();
    return out;
});


module.exports.define("getQuery", function (this_key, parent_key) {
    var query = this.record.getQuery();
    if (this_key) {
        query.addCondition({
            column: "A._key",
            operator: "=",
            value: this_key,
        });
    } else if (this.homogen_link_field) {
        if (parent_key) {
            query.addCondition({
                column: this.homogen_link_field,
                operator: "=",
                value: parent_key,
            });
        } else {
            query.addCondition({
                column: this.homogen_link_field,
                operator: "NU",
                value: "",
            });
        }
    }
    return query;
});


module.exports.define("nextLevel", function (render_opts, level) {
    return this.homogen_link_field && (level < render_opts.max_depth) &&
        (!this.context_key || level !== 1 || this.context_key === this.record.getKey());
});


module.exports.define("getDotGraphNode", function (render_opts) {
    var highlight = (this.context_key && (this.context_key === this.record.getKey()));
    return this.record.getDotGraphNode(render_opts, highlight);
});


module.exports.define("getDotGraphEdge", function (render_opts, parent_key) {
    return this.record.getDotGraphEdge(render_opts, parent_key);
});
