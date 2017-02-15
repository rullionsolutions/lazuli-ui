"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");

/**
* To represent a tree structure
*/

module.exports = UI.Section.clone({
    id: "Hierarchy",
    max_depth: 4,
    max_init_visible_depth: 3,
});


module.exports.defbind("setupLogic", "setup", function () {
    Data.Enttity.entities.getThrowIfUnrecognized(this.entity);
    this.top_level = this.Level.clone({
        id: "_top",
        entity_id: this.entity,
        owner: this,
        include_children: true,
    });
    this.top_level.homogen_link_field = this.homogen_link_field;
});


module.exports.override("render", function (element, render_opts) {
    UI.Section.render.call(this, element, render_opts);
    render_opts.max_depth = render_opts.max_depth || this.max_depth;
    this.top_level.render(this.getSectionElement(render_opts), render_opts, null, 1);
});
