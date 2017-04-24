"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ItemList.clone({
    id: "ItemListUpdate",
    query_mode: "preload",
    allow_add_items: true,
    allow_delete_items: true,
});

