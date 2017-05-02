"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Page.clone({
    id: "ReportPage",
    title: "Generic Report Page",
    // the new UI allows the sidebar to be minimized, so let's stick with index.html...
    // skin: "report.html",
    keep_after_nav_away: true,
});
