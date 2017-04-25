"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");


module.exports = Core.Base.clone({
    id: "sections.Hierarchy.Level",
    visible: true,
});


module.exports.override("clone", function (spec) {
    var obj = Core.Base.clone.call(this, spec);
    if (!obj.record) {
        if (!obj.entity_id) {
            this.throwError("Neither record nor entity_id supplied");
        }
        obj.record = Data.entities.getThrowIfUnrecognized(obj.entity_id)
            .getRecord({ modifiable: false, });
    }
    return obj;
});


module.exports.define("addChild", function (spec) {
    var level = module.exports.clone(spec);
    level.parent = this;
    if (!this.children) {
        this.children = Core.OrderedMap.clone({ id: spec.id, });
    }
    this.children.add(level);
    return level;
});


module.exports.define("render", function (element, render_opts, parent_key, level) {
    var query = this.getQuery(parent_key);
    var ul_elem;
    var li_elem;

    while (query.next()) {
        this.record.populate(query.resultset);
        if (!ul_elem) {
            ul_elem = element.makeElement("ul");
        }
        li_elem = this.renderItem(ul_elem, render_opts, level);
        if (this.homogen_link_field && level <= render_opts.max_depth) {
            this.render(li_elem, render_opts, query.getColumn("A._key").get(), level + 1);
        }
    }
    query.reset();
});


module.exports.define("getQuery", function (parent_key) {
    var query = this.record.getQuery();
    if (this.homogen_link_field) {
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


module.exports.define("renderItem", function (ul_elem, render_opts, level) {
    var li_elem = ul_elem.makeElement("li");
    li_elem.attr("class", (level <= this.owner.max_init_visible_depth ? "css_expanded" : "css_contracted"));
    li_elem.makeElement("a", "css_hier_ctrl css_uni_icon_lrg");
    this.record.renderLineItem(li_elem, render_opts);
    return li_elem;
});
