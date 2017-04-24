"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ItemSet.clone({
    id: "ItemSetTile",
    main_tag: "div",
    query_mode: "dynamic",
    show_footer: false,
    allow_add_items: false,
    allow_delete_items: false,
});


module.exports.override("renderItem", function (parent_elmt, render_opts, item) {
    item.renderTile(parent_elmt, render_opts);
});
