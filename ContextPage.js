"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Page.clone({
    id: "ContextPage",
    title: "Generic Context Page",
    skin: "modal",
    requires_key: true,
    main_navigation: false,
});
