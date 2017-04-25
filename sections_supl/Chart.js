"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");
var SQL = require("lazuli-sql/index.js");

/**
* The root Archetype of a chart",
*/
module.exports = UI.Section.clone({
    id: "Chart",
    library: "highcharts",            // alternatives are 'google' or 'flot'
});


module.exports.defbind("setup", "setup", function () {
    if (!this.chart_json) {
        this.chart_json = {
            library: this.library,
            options: this.options || {},
        };
    }
    if (!this.chart_json.options.credits) {
        // hide "highcharts.com" in bottom-right corner
        this.chart_json.options.credits = { enabled: false, };
    }
});


module.exports.override("render", function (element, render_opts) {
    var sctn_elem;
    if (render_opts.test) {
        this.test_data = {};
        this.render_test = true;
    }
    UI.Section.render.call(this, element, render_opts);
    sctn_elem = this.getSectionElement(render_opts);
    this.renderChart(sctn_elem.makeElement("div", "css_chart", "css_chart_" + this.id), render_opts);
    sctn_elem.makeElement("span", "css_hide").text(JSON.stringify(this.chart_json));
});


module.exports.define("renderChart", function (element, render_opts) {
    var i;
    var chart_json_series;
    this.chart_json.series = [];
    for (i = 0; i < this.series.length; i += 1) {
        if (this.series[i].sql && this.series[i].visible !== false) {
            chart_json_series = {};
            Core.Base.addProperties.call(chart_json_series, this.series[i]);
            delete chart_json_series.sql;
            this.renderSeries(element, render_opts, chart_json_series, this.series[i].sql);
            this.chart_json.series.push(chart_json_series);
        }
    }
});


module.exports.define("renderSeries", function (element, render_opts, series, sql) {
    var conn = this.connection || SQL.Connection.getQueryConnection("renderSeries");
    var resultset;
    var properties = { xaxis_labels: false, };
    var count = 0;

    series.data = [];
    series.distrib = {};
    if (this.render_test === true) {
        this.test_data[series.name] = {};
    }
    try {
        resultset = conn.executeQuery(this.detokenize(sql));
        while (resultset.next()) {
            if (count === 0) {
                this.getPropertiesFromFirstLine(resultset, series, properties);
            }
            this.renderPoint(series, resultset, count, properties);
            count += 1;
        }
        if (series.xaxis) {
            series.xaxis.max = (count - 1);
        }
    } catch (e) {
        this.owner.page.session.messages.report(e);
        this.report(e);
    }
    conn.finishedWithResultSet(resultset);

    if (series.y_type === "distrib") {
        this.addDistributionInfo(series);
    }
});


module.exports.define("getPropertiesFromFirstLine", function (resultset, series, properties) {
    try {
        SQL.Connection.getColumnString(resultset, "x_str");
        series.xaxis = {
            ticks: [],
            min: 0.5,
            tickSize: 1,
        };
        properties.xaxis_labels = true;
    } catch (e1) {
        this.debug(e1.toString());
    }
    try {
        SQL.Connection.getColumnString(resultset, "url");
        properties.url = true;
    } catch (e2) {
        this.debug(e2.toString());
    }
    try {
        SQL.Connection.getColumnString(resultset, "name");
        properties.name = true;
    } catch (e3) {
        this.debug(e3.toString());
    }
});


module.exports.define("addDistributionInfo", function (series) {
    var count;
    var stats = { sum: 0, };
    var cumul;

    delete series.distrib;
    for (count = 1; count <= series.data.length; count += 1) {
        cumul = (count * 100) / series.data.length;
        series.data[count - 1].ordinal = count + " of " + series.data.length + ": " + cumul.toFixed(0) + "%";
        stats.sum += series.data[count - 1].x;
        if (!stats.decile_1 && cumul >= 10) {
            stats.decile_1 = series.data[count - 1].x;
        }
        if (!stats.decile_9 && cumul >= 90) {
            stats.decile_9 = series.data[count - 1].x;
        }
        if (!stats.median && cumul >= 50) {
            stats.median = series.data[count - 1].x;
        }
    }
    stats.average = stats.sum / series.data.length;
    stats.SLA = 100;
    this.addPlotLine({
        label: "10%",
        value: stats.decile_1,
    });
    this.addPlotLine({
        label: "90%",
        value: stats.decile_9,
    });
    this.addPlotLine({
        label: "50% - median",
        value: stats.median,
    });
    this.addPlotLine({
        label: "average",
        value: stats.average,
    });
    this.addPlotLine({
        label: "SLA",
        value: stats.SLA,
        color: "red",
        width: 2,
    });
});


module.exports.define("addPlotLine", function (settings, axis) {
    axis = axis || "x";
    settings.color = settings.color || "#ddd";
    settings.width = settings.width || 1;
    if (typeof settings.label === "string") {
        settings.label = { text: settings.label, };
    }
    this.chart_json.options[axis + "Axis"] = this.chart_json.options[axis + "Axis"] || {};
    this.chart_json.options[axis + "Axis"].plotLines = this.chart_json.options[axis + "Axis"].plotLines || [];
    this.chart_json.options[axis + "Axis"].plotLines.push(settings);
});


module.exports.define("renderPoint", function (series, resultset, count, properties) {
    var term = {};
    var date;

    if (properties.xaxis_labels) {
        term.x = count;
        series.xaxis.ticks.push([
            count,
            SQL.Connection.getColumnString(resultset, "x_str"),
        ]);
    } else {
        try {
            if (series.x_type === "number") {
                term.x = resultset.getInt("x_val");
                if (series.x_decimal_digits) {
                    term.x /= Math.pow(10, series.x_decimal_digits);
                }
            } else if (series.x_type === "date" || series.x_type === "datetime") {
                date = Date.parse(SQL.Connection.getColumnString(resultset, "x_val"));
                if (date) {
                    term.x = date.getTime();
                }
            } else if (series.x_type &&
                    (!this.chart_json.options.xAxis || this.chart_json.options.xAxis.type !== "category")) {
                term.x = SQL.Connection.getColumnString(resultset, "x_val");
            // in case of category type (ex: sv_tmpl Survey Response Summary charts)
            } else if (this.chart_json.options.xAxis) {
                if (!this.chart_json.options.xAxis.categories) {
                    this.chart_json.options.xAxis.categories = [];
                }
                this.chart_json.options.xAxis.categories.push(SQL.Connection.getColumnString(resultset, "x_val"));
            }
        } catch (e0) {
            this.warn(e0.toString());
        }   // case we don't need an x val
    }
    if (properties.url) {
        term.url = SQL.Connection.getColumnString(resultset, "url");
    }
    if (properties.name) {
        term.name = SQL.Connection.getColumnString(resultset, "name");
    }
    try {
        if (series.y_type === "number") {
            term.y = resultset.getInt("y_val");
            if (series.y_decimal_digits) {
                term.y /= Math.pow(10, series.y_decimal_digits);
            }
        } else if (series.y_type === "date" || series.y_type === "datetime") {          // string yyyy-MM-dd
            date = Date.parse(SQL.Connection.getColumnString(resultset, "y_val"));
            if (date) {
                term.y = date.getTime();
            }
        } else if (series.y_type === "distrib") {
            term.y = series.distrib[term.x] = (series.distrib[term.x] || 0) + 1;
        } else if (series.y_type) {
            term.y = SQL.Connection.getColumnString(resultset, "y_val");
        }

        series.data.push(term);

// if (this.render_test === true) {
//     if (term.x && term.y) {
//         this.test_data[series.name][term.x || term.name] = term.y;
//     } else {
//         this.test_data[series.name][SQL.Connection.getColumnString(resultset, "x_val")] = term.y;
//     }
// }
    } catch (e3) {
        this.report(e3);
    }
});
