"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Page.clone({
    id: "ReportPage",
    title: "Generic Report Page",
    skin: "report.html",
    keep_after_nav_away: true,
});
