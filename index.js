"use strict";


exports.Page = require("lazuli-ui/Page.js");
exports.Page.Tab = require("lazuli-ui/Page.Tab.js");
exports.Page.Link = require("lazuli-ui/Page.Link.js");
exports.Page.Button = require("lazuli-ui/Page.Button.js");

exports.ContextPage = require("lazuli-ui/ContextPage.js");

exports.Section = require("lazuli-ui/Section.js");
exports.Section.registerSectionType(exports.FormBase = require("lazuli-ui/FormBase.js"));
exports.Section.registerSectionType(exports.FormParams = require("lazuli-ui/FormParams.js"));
exports.Section.registerSectionType(exports.Create = require("lazuli-ui/Create.js"));
exports.Section.registerSectionType(exports.Delete = require("lazuli-ui/Delete.js"));
exports.Section.registerSectionType(exports.Display = require("lazuli-ui/Display.js"));
exports.Section.registerSectionType(exports.Update = require("lazuli-ui/Update.js"));

exports.Section.registerSectionType(exports.ListBase = require("lazuli-ui/ListBase.js"));
exports.ListBase.Column = require("lazuli-ui/ListBase.Column.js");
exports.Section.registerSectionType(exports.ListQuery = require("lazuli-ui/ListQuery.js"));
exports.Section.registerSectionType(exports.ListUpdate = require("lazuli-ui/ListUpdate.js"));

exports.Section.registerSectionType(exports.Search = require("lazuli-ui/Search.js"));
exports.Search.Criterion = require("lazuli-ui/Search.Criterion.js");
exports.Search.Filter = require("lazuli-ui/Search.Filter.js");
exports.Search.MultiFilter = require("lazuli-ui/Search.MultiFilter.js");
exports.Search.RadiusFilter = require("lazuli-ui/Search.RadiusFilter.js");
exports.Search.ScalarFilter = require("lazuli-ui/Search.ScalarFilter.js");

exports.Section.registerSectionType(exports.DotGraph = require("lazuli-ui/DotGraph.js"));
exports.DotGraph.Level = require("lazuli-ui/DotGraph.Level.js");

exports.Section.registerSectionType(exports.Hierarchy = require("lazuli-ui/Hierarchy.js"));
exports.Hierarchy.Level = require("lazuli-ui/Hierarchy.Level.js");

exports.Section.registerSectionType(exports.Tree = require("lazuli-ui/Tree.js"));
exports.Tree.Node = require("lazuli-ui/Tree.Node.js");

exports.Section.registerSectionType(exports.ChangeHistory = require("lazuli-ui/ChangeHistory.js"));
exports.Section.registerSectionType(exports.Chart = require("lazuli-ui/Chart.js"));
exports.Section.registerSectionType(exports.HomePageSection = require("lazuli-ui/HomePageSection.js"));
exports.Section.registerSectionType(exports.SideBySide = require("lazuli-ui/SideBySide.js"));
exports.Section.registerSectionType(exports.ListObjects = require("lazuli-ui/ListObjects.js"));
exports.Section.registerSectionType(exports.Tiles = require("lazuli-ui/Tiles.js"));
