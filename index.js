"use strict";

var Core = require("lapis-core/index.js");


exports.Page = require("lazuli-ui/Page.js");
exports.Page.Tab = require("lazuli-ui/Page.Tab.js");
exports.Page.Link = require("lazuli-ui/Page.Link.js");
exports.Page.Button = require("lazuli-ui/Page.Button.js");

exports.pages = Core.Collection.clone({
    id: "pages",
    item_type: exports.Page,
});

require("lazuli-ui/MessageManager.js");

exports.Section = require("lazuli-ui/sections_core/Section.js");

exports.sections = Core.Collection.clone({
    id: "sections",
    item_type: exports.Section,
});

exports.sections.add(exports.Section);
exports.sections.add(exports.FormBase = require("lazuli-ui/sections_core/FormBase.js"));
exports.sections.add(exports.FormParams = require("lazuli-ui/sections_core/FormParams.js"));
exports.sections.add(exports.Create = require("lazuli-ui/sections_core/Create.js"));
exports.sections.add(exports.Delete = require("lazuli-ui/sections_core/Delete.js"));
exports.sections.add(exports.Display = require("lazuli-ui/sections_core/Display.js"));
exports.sections.add(exports.Update = require("lazuli-ui/sections_core/Update.js"));

exports.sections.add(exports.ItemSet = require("lazuli-ui/sections_core/ItemSet.js"));
exports.sections.add(exports.ListBase = require("lazuli-ui/sections_core/ListBase.js"));
exports.ListBase.Column = require("lazuli-ui/sections_core/ListBase.Column.js");
exports.sections.add(exports.ListQuery = require("lazuli-ui/sections_core/ListQuery.js"));
exports.sections.add(exports.ListUpdate = require("lazuli-ui/sections_core/ListUpdate.js"));

exports.sections.add(exports.Search = require("lazuli-ui/sections_core/Search.js"));
exports.Search.Criterion = require("lazuli-ui/sections_core/Search.Criterion.js");
exports.Search.Filter = require("lazuli-ui/sections_core/Search.Filter.js");
exports.Search.MultiFilter = require("lazuli-ui/sections_core/Search.MultiFilter.js");
exports.Search.RadiusFilter = require("lazuli-ui/sections_core/Search.RadiusFilter.js");
exports.Search.ScalarFilter = require("lazuli-ui/sections_core/Search.ScalarFilter.js");

exports.sections.add(exports.DotGraph = require("lazuli-ui/sections_supl/DotGraph.js"));
exports.DotGraph.Level = require("lazuli-ui/sections_supl/DotGraph.Level.js");

exports.sections.add(exports.Hierarchy = require("lazuli-ui/sections_supl/Hierarchy.js"));
exports.Hierarchy.Level = require("lazuli-ui/sections_supl/Hierarchy.Level.js");

exports.sections.add(exports.Tree = require("lazuli-ui/sections_supl/Tree.js"));
exports.Tree.Node = require("lazuli-ui/sections_supl/Tree.Node.js");

exports.sections.add(exports.ChangeHistory = require("lazuli-ui/sections_supl/ChangeHistory.js"));
exports.sections.add(exports.Chart = require("lazuli-ui/sections_supl/Chart.js"));
exports.sections.add(exports.FormRepeat = require("lazuli-ui/sections_supl/FormRepeat.js"));
exports.sections.add(exports.HomePageSection = require("lazuli-ui/sections_supl/HomePageSection.js"));
exports.sections.add(exports.SideBySide = require("lazuli-ui/sections_supl/SideBySide.js"));
// exports.sections.add(exports.ListForm = require("lazuli-ui/sections_supl/ListForm.js"));
exports.sections.add(exports.ListObjects = require("lazuli-ui/sections_supl/ListObjects.js"));
exports.sections.add(exports.TemplateUpdate = require("lazuli-ui/sections_supl/TemplateUpdate.js"));
exports.sections.add(exports.TileGrid = require("lazuli-ui/sections_supl/TileGrid.js"));
exports.sections.add(exports.Tiles = require("lazuli-ui/sections_supl/Tiles.js"));

exports.sections.add(exports.ExportHistory = require("lazuli-ui/sections_supl/ExportHistory.js"));
exports.sections.add(exports.FlexUpdate = require("lazuli-ui/sections_supl/FlexUpdate.js"));
exports.sections.add(exports.ListForm = require("lazuli-ui/sections_supl/ListForm.js"));
exports.sections.add(exports.ListItems = require("lazuli-ui/sections_supl/ListItems.js"));


// Derived Pages
exports.BatchPage = require("lazuli-ui/BatchPage.js");
exports.ContextPage = require("lazuli-ui/ContextPage.js");
exports.ConfirmPage = require("lazuli-ui/ConfirmPage.js");
exports.BulkActionPage = require("lazuli-ui/BulkActionPage.js");
exports.sy_bulk_action = exports.BulkActionPage;        // backward compatibility
