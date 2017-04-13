"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


module.exports = UI.Section.clone({
    id: "ItemSet",
    items: null,                // array of item objects
    main_query: null,           // query object for dynamic use INSTEAD of items
    load_query: null,           // query object to use to populate items
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
    this.items = [];
    this.item_count = 0;
    this.itemset = 1;
    this.itemset_last = 1;
});


/**
* To setup this grid, by setting 'entity' to the entity specified by 'entity', then calling
*/
module.exports.define("setupEntity", function (entity_id) {
    this.entity = Data.entities.getThrowIfUnrecognized(entity_id).clone({
        id: entity_id,
        skip_registration: true,
    });
});


module.exports.defbind("initializeEntity", "cloneInstance", function () {
    if (typeof this.entity_id === "string") {
        this.setupEntity(this.entity_id);
    } else if (typeof this.entity === "string") {        // 'entity' as a string property is deprecated
        this.setupEntity(this.entity);
    }
});


module.exports.define("setupParentRecord", function (parent_record) {
    this.parent_record = parent_record;
});


module.exports.defbind("initializeParentRecord", "cloneInstance", function () {
    if (!this.parent_record && this.entity && this.link_field) {
        if (this.owner.page.page_key_entity && this.entity.getField(this.link_field).ref_entity
                === this.owner.page.page_key_entity.id) {
            this.setupParentRecord(this.owner.page.page_key_entity
                .getRow(this.owner.page.page_key));
        } else if (this.entity.getField(this.link_field).ref_entity === this.owner.page.entity.id) {
            this.setupParentRecord(this.owner.page.getPrimaryRow());
        }
    }
});


/**
* To setup this section to use an 'item adder field', i.e. a field in entity
* (usually of Option type)
* @return the field in entity specified by 'add_item_field'
*/
module.exports.define("setupItemAdder", function (add_item_field_id, add_item_unique) {
    var orig_add_item_field = this.entity.getField(add_item_field_id);
    var spec = {
        id: "add_item_field_" + this.id,
        type: orig_add_item_field.type,
        label: this.add_item_label,
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
    this.add_item_field = this.createItemAdderField(spec);

    this.add_item_unique = (typeof add_item_unique === "boolean") ?
        add_item_unique :
        this.entity.isKey(add_item_field_id);

    this.debug("setupItemAdder(): " + this.add_item_field.lov);
    // this.columns.get(this.add_item_field_id).editable = false;
    return orig_add_item_field;
});


module.exports.define("createItemAdderField", function (spec) {
    var type = Data.fields.getThrowIfUnrecognized(spec.type);
    var field = type.clone(spec);
    field.override("getFormGroupCSSClass", function (form_type, editable) {
        return type.getFormGroupCSSClass.call(this, form_type, editable) + " css_list_add";
    });
    return field;
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


module.exports.defbind("initializeItemAdder", "cloneInstance", function () {
    if (this.add_item_field_id && this.entity) {
        this.setupItemAdder(this.add_item_field_id, this.add_item_unique);
    } else if (this.add_item_field && this.entity) {            // deprecated and replaced...
        this.add_item_field_id = this.add_item_field;
        this.setupItemAdder(this.add_item_field, this.add_item_unique);
    }
});

    // this.setupColumns();


module.exports.define("setupItemDeleterField", function () {
    this.entity.addField({
        id: "_delete",
        type: "ContextButton",
        // label: " ",
        btn_label: this.delete_item_label,
        visible: this.allow_delete_items,
        list_column: this.allow_delete_items,
        btn_css_class: "css_col_control",
        css_cmd: true,
    });
    this.entity.moveTo("_delete", 0);
});


module.exports.defbind("initializeItemDeleter", "cloneInstance", function () {
    this.setupItemDeleterField();
});


/**
* To create a new x.sql.Query object, stored to 'query' to be used to load initial items
* into the grid;
*/
module.exports.define("setupLoadQuery", function (entity) {
    this.load_query = entity.getQuery(true);      // getQuery(true) - default sort
    if (this.load_link_field && this.load_link_value) {
        this.setLinkCondition(this.load_query, this.load_link_field, this.load_link_value);
    } else if (this.link_field && this.parent_record) {
        this.setLinkCondition(this.load_query, this.link_field, this.parent_record.getKey());
    }
});


/**
* Set up link field relationship (requires this.query to be present)
* @param link_field: string column id, value: string value to use in filter condition, condition
* is false if not supplied
*/
module.exports.define("setLinkField", function (link_field, value) {
    this.setLinkCondition(this.main_query, link_field, value);
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
    this.entity.getField(link_field).list_column = false;
    this.entity.getField(link_field).visible = false;
    // if (this.columns.get(link_field)) {
    //     this.columns.get(link_field).visible = false;
    // }
});


/**
* To load initial items into this grid by looping over this.query, calling addExistingRow()
* on each item's key
*/
module.exports.define("load", function () {
    while (this.load_query.next()) {
        this.addItem({ key: this.load_query.getColumn("A._key").get(), });
    }
    this.load_query.reset();
});


module.exports.defbind("initializeLoad", "cloneInstance", function () {
    if (this.auto_fill !== false && !this.load_query) {
        if (this.load_entity_id) {
            this.setupLoadQuery(Data.entities.get(this.load_entity_id));
        } else {
            this.setupLoadQuery(this.entity);
        }
    }
    if (this.load_query) {
        this.load();
    }
});


module.exports.define("addItem", function (spec) {
    var item;
    if (!this.allow_add_items || this.main_query) {
        this.throwError("items cannot be added to this ItemSet");
    }
    item = this.makeItemFromSpec(spec);
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
    if (!this.allow_delete_items || this.main_query) {
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


module.exports.define("eachItem", function (funct) {
    this.items.forEach(function (item) {
        if (!item.deleting) {
            funct(item);
        }
    });
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
        record = this.createNewOrExistingRecordWithKey(spec.record_key);
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
    return this.owner.page.getTrans().getRow(this.entity, key);
});


module.exports.define("createNewRecordWithField", function (field_id, field_val) {
    var row;
    if (this.add_item_field_id === field_id && this.add_item_unique
            && !this.getAddRowItem(field_val).active) {
        this.throwError("createNewRecordWithField() row already exists: " + field_val);
    }
    this.getParentRecord();         // ensure this.parent_record populated if can be
    if (this.entity.getField(field_id).isKey() && this.parent_record
            && this.parent_record.isKeyComplete()) {
        row = this.getDeletedRecordIfExists(field_id, field_val);
    }
    if (!row) {
        row = this.owner.page.getTrans().createNewRow(this.entity);
        row.getField(field_id).set(field_val);
    }
    return row;
});


module.exports.define("createNewRecord", function () {
    return this.owner.page.getTrans().createNewRow(this.entity);
});


module.exports.define("getDeletedRecordIfExists", function (field_id, field_val) {
    var row;
    var key_values = {};
    key_values[this.link_field] = this.getParentRecord().getKey();
    key_values[field_id] = field_val;
    this.debug("getDeletedRowIfExists() " + this.view.call(key_values));
    row = this.entity.getCachedRecordFromKeyValues(key_values, this.owner.page.getTrans());
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
    item.linkToParent(this.parent_record, this.link_field);
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


module.exports.defbind("updateAddDeleteItems", "update", function (param) {
    var match;
    var that = this;
    if (param.page_button === "list_add_" + this.id) {
        this.addItem({
            add_blank_item: true,
        });
    } else if (param.page_button === "add_item_field_" + this.id) {
        this.addItem({
            field_id: this.add_item_field_id,
            field_val: param["add_item_field_" + this.id],
        });
    } else if (typeof param.page_button === "string") {
        match = param.page_button.match(new RegExp(this.id + "_([0-9]+)__delete"));
        if (match && match.length > 1) {
            this.eachItem(function (item) {
                if (item.getField("_delete").getControl() === match[0]) {
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
    item.renderTile(parent_elmt, render_opts);
});


/**
* To render elements displayed in the event that the list thas no items. By default this will
* be the text_no_items but can be overridden to display addition elements.
* @param
*/
module.exports.define("renderNoItems", function () {
    this.getSectionElement().text(this.text_no_items);
});


module.exports.define("extendItemSet", function () {
    this.itemset = 1;
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
    } else {
        foot_elmt.makeElement("span", "css_list_add")
            .makeElement("a", "css_cmd btn btn-xs", "list_add_" + this.id)
            .attr("title", this.add_item_label)
            .text(this.add_item_icon, true);
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
        ctrl_elem.makeElement("a", "css_cmd btn btn-mini", "list_set_frst_" + this.id)
            .attr("title", "first itemset")
            .text(this.frst_itemset_icon, true);
        ctrl_elem.makeElement("a", "css_cmd btn btn-mini", "list_set_prev_" + this.id)
            .attr("title", "previous itemset")
            .text(this.prev_itemset_icon, true);
    }

    ctrl_elem.text(this.getItemCountText());

//    if (this.open_ended_itemset || (this.itemset_last > 1 &&
// this.itemset < this.itemset_last)) {
    if (this.subsequent_itemset || this.itemset > 1) {
        ctrl_elem
            .makeElement("span", "css_list_itemcount")
            .makeElement("a", "css_cmd btn btn-mini", "list_set_extend_" + this.id)
            .attr("title", "expand this itemset by " + this.itemset_size_ext + " items")
            .text(this.extd_itemset_icon, true);
    }
    if (this.subsequent_itemset) {
        ctrl_elem
            .makeElement("a", "css_cmd btn btn-mini", "list_set_next_" + this.id)
            .attr("title", "next itemset")
            .text(this.next_itemset_icon, true);
    }
    if (this.subsequent_itemset && !this.open_ended_itemset) {
        ctrl_elem
            .makeElement("a", "css_cmd btn btn-mini", "list_set_last_" + this.id)
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

