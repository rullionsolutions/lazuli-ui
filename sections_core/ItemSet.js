"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


module.exports = UI.Section.clone({
    id: "ItemSet",
    items: null,            // array of item objects
    query_mode: null,       // "preload" to load items in setup, "dynamic" to reload in eachItem()
    query: null,            // query object for dynamic use INSTEAD of items OR to populate items
    allow_add_items: true,
    allow_delete_items: true,
    add_item_icon: "<i class='glyphicon glyphicon-plus'></i>",         // ordinary plus ; "&#x2795;" heavy plus sign
    delete_item_icon: "<i class='glyphicon glyphicon-remove'></i>",    // ordinary cross; "&#x274C;" heavy cross mark
    add_item_label: "Add a new item",
    delete_item_label: "Remove this item",
    text_no_items: "no items",
    text_one_items: "1 item",
    text_many_items: "items",
    itemset_size: 10,
    itemset_size_ext: 20,
    itemset_size_long_lists: 1000,
    itemset: null,
    itemset_last: null,
    frst_itemset_icon: "<i class='glyphicon glyphicon-fast-backward'></i>",
    prev_itemset_icon: "<i class='glyphicon glyphicon-backward'></i>",
    next_itemset_icon: "<i class='glyphicon glyphicon-forward'></i>",
    last_itemset_icon: "<i class='glyphicon glyphicon-fast-forward'></i>",
    extd_itemset_icon: "<i class='glyphicon glyphicon-arrow-down'></i>",
});


module.exports.register("addItem");
module.exports.register("deleteItem");
module.exports.register("renderBeforeItems");
module.exports.register("renderAfterItems");


module.exports.defbind("initializeItemSet", "cloneInstance", function () {
    this.items = [];            // deleted items remain in array but eachItem() ignores them
    this.item_count = 0;
    this.itemset = 1;
    this.itemset_last = 1;
});


/**
* To setup this grid, by setting 'entity' to the entity specified by 'entity', then calling
*/
module.exports.define("setupRecord", function (entity_id) {
    var spec = {
        id: entity_id,
        skip_registration: true,
    };
    if (this.query_mode === "dynamic") {
        spec.page = this.owner.page;
        spec.instance = true;
        spec.id_prefix = "list_" + this.id;
    }
    // this.record = Data.entities.getThrowIfUnrecognized(entity_id).clone({
    //     id: entity_id,
    //     skip_registration: true,
    // });
    // if query_mode === "dynamic" then record object is used to store actual field values,
    // so is an instance, otherwise it is used as the template for transaction records
    this.record = Data.entities.getThrowIfUnrecognized(entity_id).clone(spec);
});


module.exports.defbind("initializeEntity", "setup", function () {
    if (typeof this.entity_id === "string") {
        this.setupRecord(this.entity_id);
    } else if (typeof this.entity === "string") {        // 'entity' as a string property is deprecated
        this.setupRecord(this.entity);
    }
});


module.exports.define("setupParentRecord", function (parent_record) {
    this.parent_record = parent_record;
});


module.exports.defbind("initializeParentRecord", "setup", function () {
    if (!this.parent_record && this.record && this.link_field) {
        if (this.owner.page.page_key_entity && this.record.getField(this.link_field).ref_entity
                === this.owner.page.page_key_entity.id) {
            this.setupParentRecord(this.owner.page.page_key_entity
                .getRow(this.owner.page.page_key));
        } else if (this.record.getField(this.link_field).ref_entity === this.owner.page.entity.id) {
            this.setupParentRecord(this.owner.page.getPrimaryRow());
        }
    }
});


/**
* To setup this section to use an 'item adder field', i.e. a field in entity
* (usually of Option type)
* @return the field in entity specified by 'add_item_field'
*/
module.exports.define("setupItemAdder", function (spec) {
    var type = Data.fields.getThrowIfUnrecognized(spec.type);
    spec.id = "list_" + this.id + "_item_adder";
    spec.label = this.add_item_label;
    spec.instance = true;
    spec.btn_label = this.add_item_icon;
    this.add_item_field = type.clone(spec);
    this.add_item_field.override("getFormGroupCSSClass", function (form_type, editable) {
        return type.getFormGroupCSSClass.call(this, form_type, editable) + " css_list_add";
    });
});


module.exports.define("copyItemAdderFromExistingField", function (add_item_field_id, add_item_unique) {
    var orig_add_item_field = this.record.getField(add_item_field_id);
    var spec = {
        type: orig_add_item_field.type,
        // tb_input: "input-sm",
        skip_full_load: false,        // make sure we have full lov here..
        input_group_size: "input-group-sm",
        editable: true,
        css_reload: true,
        render_radio: false,
        input_group_addon_before: this.add_item_label,
        list: orig_add_item_field.list,
        ref_entity: orig_add_item_field.ref_entity,
        selection_filter: this.selection_filter,
        collection_id: orig_add_item_field.collection_id,
        config_item: orig_add_item_field.config_item,
        label_prop: orig_add_item_field.label_prop,
        active_prop: orig_add_item_field.active_prop,
    };
    if (spec.type === "Reference") {
        spec.type = "Option";           // Autocompleter doesn't work here yet
    }
    this.setupItemAdder(spec);

    this.add_item_unique = (typeof add_item_unique === "boolean") ?
        add_item_unique :
        this.record.isKey(add_item_field_id);

    this.debug("setupItemAdder(): " + this.add_item_field.lov);
    // prevent original field from being shown as a column - assumes entity is a private copy...
    orig_add_item_field.list_column = false;
    // this.columns.get(this.add_item_field_id).editable = false;
    return orig_add_item_field;
});


module.exports.define("getAdderItem", function (val) {
    var item;
    if (!this.add_item_field) {
        this.throwError("no add_item_field defined");
    }
    this.debug("getAdderItem(): " + val + ", from " + this.add_item_field.lov);
    item = this.add_item_field.lov.getItem(val);
    if (!item) {
        this.throwError("unrecognized item: " + val);
    }
    return item;
});


module.exports.defbind("initializeItemAdder", "setup", function () {
    if (this.add_item_field_id && this.record) {
        this.copyItemAdderFromExistingField(this.add_item_field_id, this.add_item_unique);
    } else if (this.add_item_field && this.record) {            // deprecated and replaced...
        this.add_item_field_id = this.add_item_field;
        this.copyItemAdderFromExistingField(this.add_item_field, this.add_item_unique);
    } else {
        this.setupItemAdder({
            type: "ContextButton",
            css_cmd: true,
        });
    }
});

    // this.setupColumns();


module.exports.define("setupItemDeleterField", function () {
    this.delete_item_field = this.record.addField({
        id: "_item_deleter",
        type: "ContextButton",
        // label: " ",
        btn_label: this.delete_item_label,
        visible: this.allow_delete_items,
        list_column: this.allow_delete_items,
        btn_css_class: "css_col_control",
        css_cmd: true,
    });
    this.record.moveTo("_item_deleter", 0);
});


module.exports.defbind("initializeItemDeleter", "setup", function () {
    if (this.allow_delete_items) {
        this.setupItemDeleterField();
    }
});


/**
* To add a row control columns as the first column in the table, which is based on a Reference
* field to the entity, which is set
* @param entity_id as string
*/
module.exports.define("setupItemControlField", function () {
    var that = this;
    var visible = !!this.entity.getDisplayPage();
    this.item_control_field = this.record.addField({
        id: "_item_control",
        type: "Reference",
        label: "",
        ref_entity: this.entity.id,
        sql_function: "A._key",
        visible: visible,
        list_column: visible,
        dynamic_only: true,
        sortable: false,
        sticky_column: true,
        css_class_col_header: "css_row_control",
        dropdown_label: "Action",
        dropdown_button: true,
        dropdown_css_class: "btn-default btn-xs",
        dropdown_right_align: true,
    });
    this.item_control_field.override("renderCell", function (row_elem, render_opts) {
        if (this.dynamic_only && render_opts.dynamic_page === false) {
            return;
        }
        if (this.visible) {
            // this.field.set(row_obj.getKey());
            this.renderNavOptions(row_elem.makeElement("td"), render_opts, that.record);
        }
    });
});


module.exports.defbind("initializeItemControl", "setup", function () {
    if (this.show_item_control) {
        this.setupItemControlField();
    }
});


/**
* To create a new x.sql.Query object, stored to 'query' to be used to load initial items
* into the grid;
*/
module.exports.define("setupQuery", function (entity) {
    this.query = entity.getQuery(true);      // getQuery(true) - default sort
    if (this.load_link_field && this.load_link_value) {
        this.setLinkCondition(this.query, this.load_link_field, this.load_link_value);
    } else if (this.link_field && this.parent_record) {
        this.setLinkCondition(this.query, this.link_field, this.parent_record.getKey());
    }
});


/**
* Set up link field relationship (requires this.query to be present)
* @param link_field: string column id, value: string value to use in filter condition, condition
* is false if not supplied
*/
module.exports.define("setLinkField", function (link_field, value) {
    this.setLinkCondition(this.query, link_field, value);
});


module.exports.define("setLinkCondition", function (query, link_field, value) {
    if (this.key_condition) {
        this.key_condition.remove();
    }
    if (value) {
        this.key_condition = query.addCondition({
            column: "A." + link_field,
            operator: "=",
            value: value,
        });
    } else {
        this.key_condition = query.addCondition({ full_condition: "false", });        // prevent load if no value supplied
    }
    // prevent link field from being shown as a column - assumes entity is a private copy...
    this.record.getField(link_field).list_column = false;
    this.record.getField(link_field).visible = false;
    // if (this.columns.get(link_field)) {
    //     this.columns.get(link_field).visible = false;
    // }
});


/**
* To load initial items into this grid by looping over this.query, calling addExistingRow()
* on each item's key
*/
module.exports.define("load", function () {
    while (this.query.next()) {
        this.addItemInternal({ key: this.query.getColumn("A._key").get(), });
    }
    this.query.reset();
});


module.exports.defbind("initializeLoad", "setup", function () {
    if (this.query_mode === "preload" || this.query_mode === "manual" || this.query_mode === "dynamic") {
        if (!this.query) {
            if (this.load_entity_id) {
                this.setupQuery(Data.entities.get(this.load_entity_id));
            } else {
                this.setupQuery(this.record);
            }
        }
    }
    if (this.query_mode === "preload") {
        this.load();
    }
});


module.exports.define("addItem", function (spec) {
    if (!this.allow_add_items || this.query_mode === "dynamic") {
        this.throwError("items cannot be added to this ItemSet");
    }
    return this.addItemInternal(spec);
});


module.exports.define("addItemInternal", function (spec) {
    var item = this.makeItemFromSpec(spec);
    this.items.push(item);
    this.item_count += 1;
    this.happen("addItem", item);
    return item;
});


module.exports.define("deleteItem", function (item) {
    var i = this.items.indexOf(item);
    if (i < 0) {
        this.throwError("item not in this ItemSet: " + item.id);
    }
    if (!this.allow_delete_items || this.query_mode === "dynamic") {
        this.throwError("items cannot be deleted from this ItemSet");
    }
    if (item.allow_delete === false) {
        this.throwError("this item cannot be deleted");
    }
    item.setDelete(true);
    // this.items.splice(i, 1);
    this.item_count -= 1;
    this.happen("deleteItem", item);
});


module.exports.define("getItemCount", function () {
    return this.item_count;
});


module.exports.define("resetToStart", function () {
    this.itemset = 1;
});


module.exports.define("eachItem", function (funct) {
    if (this.query_mode === "dynamic") {
        while (this.query.next()) {
            this.populateRecordFromQuery();
            funct(this.record);
        }
        this.query.reset();
    } else {
        this.items.forEach(function (item) {
            if (!item.deleting) {
                funct(item);
            }
        });
    }
});


module.exports.define("populateRecordFromQuery", function () {
    this.record.populate(this.query.resultset);
});


module.exports.override("isValid", function () {
    var valid = true;
    this.eachItem(function (item) {
        valid = valid && item.isValid();
    });
    return valid;
});


module.exports.define("makeItemFromSpec", function (spec) {
    var record;
    if (spec.key) {
        record = this.createNewOrExistingRecordWithKey(spec.key);
    } else if (spec.field_id && spec.field_val) {
        record = this.createNewRecordWithField(spec.field_id, spec.field_val);
    } else if (spec.add_blank_item) {
        record = this.createNewRecord();
    } else {
        this.throwError("invalid spec: " + this.view.call(spec));
    }
    return record;
});


module.exports.define("createNewOrExistingRecordWithKey", function (key) {
    return this.owner.page.getTrans().getRow(this.record, key);
});


module.exports.define("createNewRecordWithField", function (field_id, field_val) {
    var row;
    if (this.add_item_field_id === field_id && this.add_item_unique
            && !this.getAddRowItem(field_val).active) {
        this.throwError("createNewRecordWithField() row already exists: " + field_val);
    }
    this.getParentRecord();         // ensure this.parent_record populated if can be
    if (this.record.getField(field_id).isKey() && this.parent_record
            && this.parent_record.isKeyComplete()) {
        row = this.getDeletedRecordIfExists(field_id, field_val);
    }
    if (!row) {
        row = this.owner.page.getTrans().createNewRow(this.record);
        row.getField(field_id).set(field_val);
    }
    return row;
});


module.exports.define("createNewRecord", function () {
    return this.owner.page.getTrans().createNewRow(this.record);
});


module.exports.define("getDeletedRecordIfExists", function (field_id, field_val) {
    var row;
    var key_values = {};
    key_values[this.link_field] = this.getParentRecord().getKey();
    key_values[field_id] = field_val;
    this.debug("getDeletedRowIfExists() " + this.view.call(key_values));
    row = this.record.getCachedRecordFromKeyValues(key_values, this.owner.page.getTrans());
    this.debug("getDeletedRowIfExists() got: " + row);
    if (row) {
        if (!row.deleting) {
            this.throwError("new record is already in cache and not being deleted");
        }
        row.setDelete(false);
    }
    return row;
});


module.exports.defbind("afterAddItem", "addItem", function (item) {
    var id;
    if (this.add_item_unique && this.add_item_field) {
        id = item.getField(this.add_item_field_id).get();
        this.debug("removing item from LoV: " + id);
        if (id) {
            this.getAddRowItem(id).active = false;
        }
    }
    item.id_prefix = this.id + "_" + this.items.length;
    if (this.parent_record) {
        item.linkToParent(this.parent_record, this.link_field);
    }
    if (item.page !== this.owner.page) {
        item.addToPage(this.owner.page);
    }
});


module.exports.defbind("afterDeleteItem", "deleteItem", function (item) {
    var id;
    if (this.add_item_unique && this.add_item_field) {
        id = item.getField(this.add_item_field_id).get();
        if (id) {
            this.getAddRowItem(id).active = true;
        }
    }
    item.removeFromPage(this.owner.page);
});


module.exports.defbind("updateAddDeleteItems", "update", function (params) {
    var match;
    var that = this;
    if (params.page_button === "list_" + this.id + "_item_adder") {
        this.addItem({
            add_blank_item: true,
        });
    } else if (params.page_button === "list_set_extend_" + this.id) {
        this.extendItemSet();
    } else if (params.page_button === "add_item_field_" + this.id) {
        this.addItem({
            field_id: this.add_item_field_id,
            field_val: params["add_item_field_" + this.id],
        });
    } else if (typeof params.page_button === "string" && params.page_button.indexOf("list_" + this.id)) {
        match = params.page_button.match(new RegExp(this.id + "_([0-9]+)__item_deleter"));
        if (match && match.length > 1) {
            this.eachItem(function (item) {
                if (item.getField("_item_deleter").getControl() === match[0]) {
                    that.deleteItem(item);
                }
            });
        }
    }
});


module.exports.defbind("renderItemSet", "render", function (render_opts) {
    var that = this;
    this.happen("renderBeforeItems", render_opts);
    this.item_elmt = this.getItemSetElement(render_opts);
    this.foot_elmt = null;
    this.item_count = 0;
    this.eachItem(function (item) {
        if (render_opts.test === true) {
            that.setTestValues(item);
        }
        that.trace("renderItemSet(): " + item);
        that.renderItem(that.item_elmt, render_opts, item);
        that.item_count += 1;
    });
    this.happen("renderAfterItems", render_opts);
});


module.exports.define("getItemSetElement", function (render_opts) {
    return this.getSectionElement().makeElement(this.main_tag);
});


module.exports.define("getFootElement", function (render_opts) {
    if (!this.foot_elmt) {
        this.foot_elmt = this.getSectionElement().makeElement("div");
    }
    return this.foot_elmt;
});


module.exports.define("renderItem", function (parent_elmt, render_opts, item) {
    this.throwError("this function must be overridden");
});


module.exports.defbind("setQueryLimitsIfDynamic", "renderBeforeItems", function (render_opts) {
    if (this.query_mode === "dynamic") {
        this.setQueryLimits(render_opts);
    }
});


module.exports.define("setQueryLimits", function (render_opts) {
    var itemset_size = this.itemset_size;
    if (!this.query) {
        this.throwError("no query object");
    }
    if (render_opts.long_lists && itemset_size < this.itemset_size_long_lists) {
        itemset_size = this.itemset_size_long_lists;
    }
    if (this.hide_detail_rows) {
        this.itemset = 1;
        this.query.limit_offset = 0;
        this.query.limit_row_count = 0;
    } else if (render_opts && render_opts.long_lists) {
        this.recordset = 1;
        this.query.limit_offset = 0;
        this.query.limit_row_count = itemset_size;
    } else {
        this.query.limit_offset = ((this.itemset - 1) * itemset_size);
        this.query.limit_row_count = itemset_size;
        if (this.include_query_row_before_itemset && (this.itemset > 1)) {
            this.query.limit_offset -= 1;
            this.query.limit_row_count += 1;
        }
        if (this.include_query_row_after_itemset) {
            this.query.limit_row_count += 1;
        }
    }
});


module.exports.define("setTestValues", function (item) {
    var obj = {};           // this capture of values for test will be REMOVED!!
    item.each(function (f) {
        obj[f.id] = f.get();
    });
    if (!this.test_values) {
        this.test_values = [];
    }
    this.test_values.push(obj);
});


/**
* To render elements displayed in the event that the list thas no items. By default this will
* be the text_no_items but can be overridden to display addition elements.
*/
module.exports.define("renderNoItems", function () {
    this.getSectionElement().text(this.text_no_items);
});


module.exports.define("extendItemSet", function () {
    this.resetToStart();
    this.itemset_size += this.itemset_size_ext;
});


module.exports.defbind("renderItemAdder", "renderAfterItems", function (render_opts) {
    var foot_elmt = this.getFootElement();
    if (render_opts.dynamic_page === false || !this.allow_add_items) {
        return;
    }
    if (this.add_item_field) {
        this.debug("renderItemAdder(): " + this.add_item_field.lov);
        this.add_item_field.renderFormGroup(foot_elmt, render_opts, "table-cell");
    // } else {
    //     foot_elmt.makeElement("span", "css_list_add")
    //         .makeElement("a", "css_cmd btn btn-default btn-xs", "list_add_" + this.id)
    //         .attr("title", this.add_item_label)
    //         .text(this.add_item_icon, true);
    }
});

/**
* To render the player-style control for pages back and forth through itemsets of data, if
* appropriate
* @param foot_elmt (xmlstream)
*/
module.exports.defbind("renderListPager", "renderAfterItems", function (render_opts) {
    var foot_elmt = this.getFootElement();
    var ctrl_elem;
    if (render_opts.dynamic_page === false) {
        return;
    }
    ctrl_elem = foot_elmt.makeElement("span", "btn-group css_item_pager");
    if (this.itemset > 1) {
        ctrl_elem.makeElement("a", "css_cmd btn btn-default btn-xs", "list_set_frst_" + this.id)
            .attr("title", "first itemset")
            .text(this.frst_itemset_icon, true);
        ctrl_elem.makeElement("a", "css_cmd btn btn-default btn-xs", "list_set_prev_" + this.id)
            .attr("title", "previous itemset")
            .text(this.prev_itemset_icon, true);
    }

    ctrl_elem.text(this.getItemCountText());

//    if (this.open_ended_itemset || (this.itemset_last > 1 &&
// this.itemset < this.itemset_last)) {
    if (this.subsequent_itemset || this.itemset > 1) {
        ctrl_elem
            .makeElement("span", "css_list_itemcount")
            .makeElement("a", "css_cmd btn btn-default btn-xs", "list_set_extend_" + this.id)
            .attr("title", "expand this itemset by " + this.itemset_size_ext + " items")
            .text(this.extd_itemset_icon, true);
    }
    if (this.subsequent_itemset) {
        ctrl_elem
            .makeElement("a", "css_cmd btn btn-default btn-xs", "list_set_next_" + this.id)
            .attr("title", "next itemset")
            .text(this.next_itemset_icon, true);
    }
    if (this.subsequent_itemset && !this.open_ended_itemset) {
        ctrl_elem
            .makeElement("a", "css_cmd btn btn-default btn-xs", "list_set_last_" + this.id)
            .attr("title", "last itemset")
            .text(this.last_itemset_icon, true);
    }
});


module.exports.define("getItemCountText", function () {
    var text;
    var item_count = this.getItemCount();
    if (this.itemset === 1 && !this.subsequent_itemset) {
        if (item_count === 0) {
            text = this.text_no_items;
        } else if (item_count === 1) {
            text = this.text_one_items;
        } else {
            text = item_count + " " + this.text_many_items;
        }
    } else if (this.frst_item_in_set && this.last_item_in_set) {
        text = "items " + this.frst_item_in_set + " - " + this.last_item_in_set;
        if (!this.open_ended_itemset && this.found_items &&
                this.itemset_size < this.found_items) {
            text += " of " + this.found_items;
        }
    } else {
        text = item_count + " " + this.text_many_items;
    }
    return text;
});


module.exports.define("outputNavLinks", function (page_key, details_elmt) {
    var found_key = false;
    var prev_key;
    var next_key;
    this.trace("outputNavLinks() with page_key: " + page_key);
    this.items.forEach(function (item) {
        if (item.deleting || typeof item.getKey !== "function") {
            return;
        }
        if (!found_key) {
            prev_key = item.getKey();
        }
        if (found_key && !next_key) {
            next_key = item.getKey();
        }
        if (item.getKey() === page_key) {
            found_key = true;
        }
    });
    this.debug("outputNavLinks(): " + page_key + ", " + found_key + ", " + prev_key + ", " + next_key);
    if (found_key && prev_key) {
        details_elmt.attr("data-prev-key", prev_key);
    }
    if (found_key && next_key) {
        details_elmt.attr("data-next-key", next_key);
    }
});
