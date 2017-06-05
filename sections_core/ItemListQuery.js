"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ItemList.clone({
    id: "ItemListQuery",
    query_mode: "dynamic",
    allow_add_items: false,
    allow_delete_items: false,
    output_row_url: true,
    sortable: true,
    show_item_control: true,
});

