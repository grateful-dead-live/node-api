"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const n3_1 = require("n3");
;

const RDFS_URI = "http://www.w3.org/2000/01/rdf-schema#"
class FeatureLoader {
    constructor() {
        this.eventOntology = "http://purl.org/NET/c4dm/event.owl#";
        this.timelineOntology = "http://purl.org/NET/c4dm/timeline.owl#";
        this.featureOntology = "http://purl.org/ontology/af/";
        this.vampOntology = "http://purl.org/ontology/vamp/";
        this.dublincoreOntology = "http://purl.org/dc/elements/1.1/";
    }
    loadFeature(uriOrJson, labelCondition) {
        if (uriOrJson.constructor == Object) {
            //it's a json!
            return Promise.resolve(this.loadFeatureFromJson(uriOrJson, labelCondition));
        }
        else {
            //just a uri..
            var fileExtension = uriOrJson.split('.');
            fileExtension = fileExtension[fileExtension.length - 1];
            return this.loadFile(uriOrJson)
                .then(text => {
                if (fileExtension == 'n3') {
                    return this.loadFeatureFromRdf(text, labelCondition);
                }
                else if (fileExtension == 'json') {
                    return this.loadFeatureFromJson(JSON.parse(text), labelCondition);
                }
            });
        }
    }
    //////////// RDF //////////////
    loadFeatureFromRdf(rdf, labelCondition) {
        return this.parseN3(rdf).then(store => {
            let results = this.loadSegmentationFeatureFromRdf(store);
            if (results.data.length > 0) {
                results.data.sort((a, b) => a.time.value - b.time.value);
                if (labelCondition) {
                    results.data = results.data.filter(x => x.label.value == labelCondition);
                }
            }
            else {
                results = this.loadSignalFeatureFromRdf(store);
            }
            return results;
        });
    }
    parseN3(data) {
        var store = n3_1.Store(null, null);
        return new Promise((resolve, reject) => n3_1.Parser(null).parse(data, (error, triple, prefixes) => {
            if (triple) {
                store.addTriple(triple);
            }
            else {
                resolve(store);
            }
        }));
    }
    loadSegmentationFeatureFromRdf(store) {
        //for now looks at anything containing event times
        var times = [];
        var events = store.getTriples(null, this.eventOntology + 'time', null);
        for (var i = 0, l = events.length; i < l; i++) {
            var time = this.findObjectInStore(store, events[i].object, this.timelineOntology + 'at');
            if (!time) {
                time = this.findObjectInStore(store, events[i].object, this.timelineOntology + 'beginsAt');
            }
            var duration = this.findObjectInStore(store, events[i].object, this.timelineOntology + 'duration');
            var timeObject = {
                time: this.parseXsdNumber(time),
                label: this.parseXsdString(this.findObjectInStore(store, events[i].subject, RDFS_URI + 'label'))
            };
            if (duration) {
                timeObject["duration"] = this.parseXsdNumber(duration);
            }
            times.push(timeObject);
        }
        return {
            name: this.parseXsdString(this.findObjectInStore(store, null, this.dublincoreOntology + 'title')),
            data: times
        };
    }
    loadSignalFeatureFromRdf(store) {
        var name = this.parseXsdString(this.findObjectInStore(store, null, this.dublincoreOntology + 'title'));
        var signal = this.parseXsdString(this.findObjectInStore(store, null, this.featureOntology + 'value'));
        signal = signal.split(" ").map(v => parseFloat(v));
        var dimensions = this.parseXsdString(this.findObjectInStore(store, null, this.featureOntology + 'dimensions'));
        dimensions = dimensions.split(' ').map(d => Number.parseInt(d, 10));
        var transform = this.findObjectInStore(store, null, this.vampOntology + 'computed_by');
        var stepSize = this.parseXsdNumber(this.findObjectInStore(store, transform, this.vampOntology + 'step_size'));
        var sampleRate = this.parseXsdNumber(this.findObjectInStore(store, transform, this.vampOntology + 'sample_rate'));
        var values = [];
        var i = 0;
        while (i < signal.length) {
            var currentValue = [];
            for (var j = 0; j < dimensions[0]; j++) {
                currentValue[j] = signal[i + j];
            }
            //insert time/value pairs
            values.push({
                time: { value: i * stepSize / sampleRate },
                value: currentValue
            });
            i += dimensions[0];
        }
        return {
            name: name,
            data: values
        };
    }
    findObjectInStore(store, subject, predicate) {
        var result = store.getTriples(subject, predicate, null);
        if (result.length > 0) {
            return result[0].object;
        }
    }
    parseXsdString(string) {
        if (string) {
            return n3_1.Util.getLiteralValue(string);
        }
    }
    parseXsdNumber(string) {
        var value = n3_1.Util.getLiteralValue(string);
        if (value.charAt(0) == 'P') {
            //xsd duration!
            value = value.substring(2, value.length - 1);
        }
        return Number(value);
    }
    //////////// JSON //////////////
    loadFeatureFromJson(json, labelCondition) {
        if (Object.keys(json)[0] == "file_metadata") {
            return this.loadFeatureFromJams(json, labelCondition);
        }
        else {
            return this.loadFeatureFromJsonLd(json, labelCondition);
        }
    }
    loadFeatureFromJams(json, labelCondition) {
        var results = json[Object.keys(json)[1]][0];
        var outputId = results["annotation_metadata"]["annotator"]["output_id"];
        var data = results.data;
        if (outputId == "beats" || outputId == "onsets" || outputId == "segmentation") {
            if (labelCondition && data[0].label) {
                data = data.filter(x => x.label.value === labelCondition);
            }
        }
        return {
            name: outputId,
            data: data
        };
    }
    loadFeatureFromJsonLd(json, labelCondition) {
        var type = json["@type"];
        let values;
        if (type == "afv:BarandBeatTracker" || type == "afv:Onsets") {
            let values = json["afo:values"];
            if (labelCondition && values[0]["afo:value"]) {
                values = values.filter(x => x["afo:value"] == labelCondition);
            }
            values = this.convertJsonLdLabelEventsToJson(values);
        }
        else {
            values = this.convertJsonLdValueEventsToJson(json["afo:values"]);
        }
        return {
            name: type,
            data: values
        };
    }
    convertJsonLdLabelEventsToJson(events) {
        var times = [];
        for (var i = 0; i < events.length; i++) {
            //insert value/label pairs
            times.push({
                time: { value: events[i]["tl:at"] },
                label: { value: events[i]["afo:value"] }
            });
        }
        return times;
    }
    convertJsonLdValueEventsToJson(events) {
        var times = [];
        for (var i = 0; i < events.length; i++) {
            //insert value/label pairs
            times.push({
                time: { value: events[i]["tl:at"] },
                value: [events[i]["afo:value"]]
            });
        }
        return times;
    }
    loadFile(path) {
      return Promise.resolve(fs.readFileSync(path, 'utf8'));
    }
}
exports.FeatureLoader = FeatureLoader;
