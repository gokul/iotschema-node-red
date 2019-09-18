'use strict'

const fs = require('fs');
const sep = require('path').sep;
let dir = 'shapes' + sep;
let ids = [];
let shapes = [];
let capObject = {};
var file = process.argv[2];
var tddata = {};
var name;
var uri;
var security;
var auth;
var id;
let ipconfig = {};
var td = {};
td["@type"] = [];
//td["interaction"] = [];
td["properties"] = {};
td["actions"] = {};
td["events"] ={};
var iphrefs = {};
let aggreagatedThingDescription;

module.exports = function (RED) {
    function TDGeneratorNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        name = config.name;
        uri = config.uri;
        //auth = config.authorization;
        node.on('input', function (msg) {
            var json = "";
            initialize();
            generateTDTemplate();
            json = msg["payload"];
            if (json["@type"] == undefined) {
                for (var i = 0, j = 0; i < (json["@graph"]).length; i++, j++) {
                    shapes[j] = json["@graph"][i];
                    ids[j] = shapes[j].id;
                }
                tddata = {};
                tddata = getInteractionPatternNode(shapes);
                generateInteractions(tddata);
                tddata = {};
            } else if (json["@type"].indexOf("Thing") > -1) {
                 console.log("TD - HERE");
                name = json["name"];
                uri = json["base"];
                id = json["id"];
                // console.log(json["id"]);
                security = json["security"];
                if (json["properties"]) {
                    var p = json["properties"];
                    for (var x in p) {
                        var paname = x;
                        iphrefs[x] = {};
                        iphrefs[x]["href"] = p[x]["forms"][0]["href"];
                        iphrefs[x]["mediaType"] = p[x]["forms"][0]["mediaType"];
                    }
                }
                if (json["actions"]) {
                    var a = json["actions"];
                    for (var y in a) {
                        iphrefs[y] = {};
                        iphrefs[y]["href"] = a[y]["forms"][0]["href"];
                        iphrefs[y]["mediaType"] = a[y]["forms"][0]["mediaType"];
                    }
                }
                if (json["events"]) {
                    var e = json["events"];
                    for (var z in e) {
                        iphrefs[z] = {};
                        iphrefs[z]["href"] = a[z]["forms"][0]["href"];
                        iphrefs[z]["mediaType"] = a[z]["forms"][0]["mediaType"];
                    }
                }
                generateTDTemplate();
            }
            if (json == null) {
                console.log("Please provide a SHACL shape as input parameter");
            }
            //console.log(JSON.stringify(td));
            postprocessTD(td, iphrefs);
            var temp = JSON.stringify(td);
            /* var q1 = temp.indexOf("\'");
             var td1 = temp.substring(1,temp.length-1);
             td1 = "{"+td1+"}";
             td1 = td1.replace(/\s/g, '');
             var tdjson = JSON.parse(td1);*/
//fs.writeFileSync('..' + sep +"GeneratedTDs"+sep+name+".jsonld", temp, { encoding: 'utf-8' });

            //store the generated content in (scope)node level variable
            //this content is exposed via admin http endpoint
            aggreagatedThingDescription = temp
            console.log(aggreagatedThingDescription.length)
           // node.send({payload: temp});
		   node.send({payload: aggreagatedThingDescription});
            initialize();
        });
    }
    RED.nodes.registerType("ThingDescriptionGenerator", TDGeneratorNode);
    
    //admin http endpoint to expose generated thing desciptions
    RED.httpAdmin.get('/TDGenerator/generatedContent', RED.auth.needsPermission('ThingDescriptionGenerator.read'), function (req, res) {
        res.json(aggreagatedThingDescription);
		
    });
}

function postprocessTD(td, iphrefs) {
    if (iphrefs != undefined) {
        td["name"] = name;
        td["base"] = uri;
        td["security"] = security;
        //td["id"] = id;
		    td["id"] = "urn:dev:wot:" + name;
 /*       for (var i in td["interaction"]) {
            if (JSON.stringify(td["interaction"][i]["iot:capability"]) === '{}') {
                // console.log("SPLICE");
                td["interaction"].splice(i, 1);
            }
        }*/
        if (td["properties"]) {
            var p = td["properties"];
            for (var x in p) {
                if (td["properties"][x]["@type"] === undefined || td["properties"][x]["@type"].length == 0) {
                    delete td["properties"][x];
                    break;
                }
                if (iphrefs[x] != undefined) {
                    td["properties"][x]["forms"][0]["href"] = iphrefs[x]["href"];
                    td["properties"][x]["forms"][0]["mediaType"] = iphrefs[x]["mediaType"];
                }
            }
        }
        if (td["actions"]) {
            var p = td["actions"];
            if(p.length === undefined){
                delete td["actions"];
            }
            else {
            for (var x in p) {
                if (td["actions"][x]["@type"] === undefined || td["actions"][x]["@type"].length == 0) {
                    delete td["actions"][x];
                    break;
                }
                if (iphrefs[x] != undefined) {
                    td["actions"][x]["forms"][0]["href"] = iphrefs[x]["href"];
                    td["actions"][x]["forms"][0]["mediaType"] = iphrefs[x]["mediaType"];
                }
            }
        }
    }
        if (td["events"]) {
            var p = td["events"];
            if(p.length === undefined){
                delete td["events"];
            }
            else {
            for (var x in p) {
                if (td["events"][x]["@type"] === undefined || td["events"][x]["@type"].length == 0) {
                    delete td["events"][x];
                    break;
                }
                if (iphrefs[x] != undefined) {
                    td["events"][x]["forms"][0]["href"] = iphrefs[x]["href"];
                    td["events"][x]["forms"][0]["mediaType"] = iphrefs[x]["mediaType"];
                }
            }
        }
    }
    }
}

function generateTDTemplate() {

    //TODO: In future should add also the capability here in td["@type"]
    //let path = require('path');
    //let context = fs.readFileSync(path.join(__dirname, "context.json"), 'utf8');
    //var json = JSON.parse(context);
   
   // var context = "https://www.w3.org/2019/wot/td/v1";
   var context = "http://www.w3.org/ns/td";
    td["@context"] = context;
    if (td["@type"].indexOf("Thing") == -1)
        td["@type"].push("Thing");
    //TODO:take uri as config parameter of the node and add it here
    td["base"] = uri;
    //TODO: take name as config parameter of the node and add it here
    td["name"] = name;
    td["id"] = "urn:dev:wot:" + name;
    /*td["security"] = [];
    var authorization = auth;
    td["security"].push(authorization);*/

}

function generateInteractions(data) {

    var interaction = [];
    if (data["interaction"]) {
        if (data["interaction"]["writable"] == true || data["interaction"]["writable"] == false) {
            var tdproperty = {};
            var propertyName = data["interaction"]["name"];
            tdproperty["name"] = propertyName;
            //tdproperty["writable"] = {};
            //tdproperty["writable"] = data["interaction"]["writable"];
			if(data["interaction"]["writable"] == true)
            tdproperty["readOnly"] = false;
		
		    if(data["interaction"]["writable"] == false)
            tdproperty["readOnly"] = true;
		
            tdproperty["observable"] = true;
            tdproperty["@type"] = [];
            tdproperty["@type"].push(data["interaction"]["@type"]);
            tdproperty["@type"].push("Property");
            tdproperty["iot:capability"] = {};
            tdproperty["iot:capability"]["@id"] = data["interaction"]["capability"];
            tdproperty["iot:isPropertyOf"] = {};
            tdproperty["iot:isPropertyOf"]["@id"] = data["interaction"]["isPropertyOf"];
console.log(JSON.stringify(ip));
            if (ip["acceptsInputData"].length > -1 || ip["providesOutputData"].length > -1) {
				console.log(JSON.stringify(ip["acceptsInputData"]));
                if ( (ip["acceptsInputData"].indexOf("boolean") > -1) || (ip["providesOutputData"].indexOf("boolean") > -1)) {
                    //tdproperty["schema"] = {};
                    //tdproperty["schema"]["type"] = "boolean";
					tdproperty["type"] = "boolean";

                } else if ((ip["acceptsInputData"]).indexOf("string") > -1 || (ip["providesOutputData"]).indexOf("string") > -1) {
                    //tdproperty["schema"] = {};
                    //tdproperty["schema"]["type"] = "string";
					tdproperty["type"] = "string";

                } else {
                    /*tdproperty["schema"] = {};
                    tdproperty["schema"]["type"] = "object";
                    tdproperty["schema"]["field"] = [];
                    var result = processIPData(data["data"], tdproperty["schema"]["field"]);
                    tdproperty["schema"]["field"].push(result);*/
                    var result = processIPData(data["data"]);
					if((result["type"] == "boolean")){
						tdproperty["type"] = "boolean";
					}
					else if((result["type"] == "string")){
						tdproperty["type"] = "string";
					}
					else{
					tdproperty["type"] = "object";
					tdproperty["properties"] = {};	
                    tdproperty["properties"] = result;	
                    }					
                }
            }
            tdproperty["forms"] = [];
            tdproperty["forms"][0] = {};
            /*if(iphrefs!=undefined){
             for(var i in iphrefs){
             console.log(i);
             if(i.toUpperCase() === propertyName.toUpperCase()){
             tdproperty["form"][0]["href"] = iphrefs[i]["href"];
             tdproperty["form"][0]["mediaType"] = iphrefs[i]["mediaType"];
             }
             }
             }*/
            //else{
            tdproperty["forms"][0]["href"] = uri + "/" + propertyName;
            tdproperty["forms"][0]["mediaType"] = "application/json";
            //}

            //td["interaction"].push(tdproperty);
            td["properties"][propertyName] = tdproperty;

        } else if (data["interaction"]["observable"] == undefined) {
            var tdaction = {};
            var actionName = data["interaction"]["name"];
            tdaction["name"] = actionName;
            //tdaction[actionName] = {};
            tdaction["@type"] = [];
            tdaction["@type"].push(data["interaction"]["@type"]);
            tdaction["@type"].push("Action");
            tdaction["iot:capability"] = {};
            tdaction["iot:capability"]["@id"] = data["interaction"]["capability"];
            tdaction["iot:isActionOf"] = {};
            tdaction["iot:isActionOf"]["@id"] = data["interaction"]["isActionOf"];
            if (ip["acceptsInputData"].length > 0) {
                tdaction["input"] = {};
                if ((ip["acceptsInputData"]).indexOf("boolean") > -1) {
                    tdaction["input"]["type"] = "boolean";
                } else if ((ip["acceptsInputData"]).indexOf("string") > -1) {
                    tdaction["input"]["type"] = "string";
                } else {
                    tdaction["input"] = {};
                    tdaction["input"]["type"] = "object";
                    tdaction["input"]["properties"] = {};
                    var result = processIPData(data["data"]);
                    tdaction["input"]["properties"] = result;
                }
            }
            if (ip["providesOutputData"].length > 0) {
                tdaction["output"] = {};
                if ((ip["providesOutputData"]).indexOf("boolean") > -1) {
                    /*	var dataproperty = {};
                     dataproperty[actionName] = {};
                     var datatype = {};
                     datatype["type"] = "boolean";
                     dataproperty[actionName] = datatype;*/
                    tdaction["output"]["type"] = "boolean";
                } else if ((ip["providesOutputData"]).indexOf("string") > -1) {
                    /*	var dataproperty = {};
                     dataproperty[actionName] = {};
                     var datatype = {};
                     datatype["type"] = "boolean";
                     dataproperty[actionName] = datatype;*/
                    tdaction["output"]["type"] = "string";
                } else {
                    tdaction["output"]["type"] = "object";
                    tdaction["output"]["properties"] = {};
                    var result = processIPData(data["data"]);
                    tdaction["output"]["properties"] = result;
                }
            }
            tdaction["forms"] = [];
            tdaction["forms"][0] = {};
            tdaction["forms"][0]["href"] = uri + "/" + actionName;
            tdaction["forms"][0]["mediaType"] = "application/json";
            //td["interaction"].push(tdaction);
			td["actions"][actionName] = tdaction;
        }
    }
}

function processIPData(data, tdobject) {
    //data["data"];
    //var ipData = [];
    for (var i = 0; i < data.length; i++) {
        var result = {};
        result["type"] = {};
        result["type"] = generateJSONSchemaData(data[i]);
        //console.log(JSON.stringify(result));
        return result;

    }
}

function generateJSONSchemaData(dataNode) {

    var jsonData = {};
    //console.log("Here: "+JSON.stringify(dataNode));
    var id = dataNode["@type"].slice(dataNode["@type"].lastIndexOf(":") + 1);
    if (dataNode["propertyValues"]) {
        var list = [];

        for (var j = 0, i = 0; j < dataNode["propertyValues"].length; i++, j++) {
            list[i] = dataNode["propertyValues"][j]["@id"];
        }
        jsonData = generateEnum(id, list);
    } else if (dataNode["propertyType"] && (dataNode["minValue"] || dataNode["maxValue"] || dataNode["units"])) {
        jsonData = generateNumericData(id, dataNode);
    } else if (dataNode["propertyType"] && (dataNode["minCount"] || dataNode["maxCount"])) {
        jsonData = generateArrayData(id, dataNode);
    } else if (dataNode["propertyType"] == "xsd:boolean") {
        jsonData = "boolean";
    }

    //console.log(JSON.stringify(jsonData));
    return(jsonData);

}

function getJSONSchemaDatatype(jsonData) {
    var jsondt = {};
    if (jsonData == "True") {
        jsondt = true
    } else if (jsonData == "xsd:false") {
        jsondt = false
    } else if (jsonData == "xsd:boolean") {
        jsondt = "boolean"
    } else if (jsonData == "xsd:integer") {
        jsondt = "integer"
    } else if (jsonData == "xsd:float") {
        jsondt = "number"
    } else if (jsonData == "xsd:string") {
        jsondt = "string"
    } else {
        jsondt = getConcept(jsonData);
    }
    return jsondt;
}

function generateEnum(id, list) {
    var jsonData = {};
    //jsonData["field"] = {};
    jsonData["type"] = "string";
    var values = [];
    for (var i = 0; i < list.length; i++) {
        values.push(list[i]);
    }
    jsonData["enum"] = values;

    return(jsonData);

}

function generateNumericData(id, dataNode) {
    var jsonData = {};
    jsonData[id] = {};
    if (dataNode["propertyType"] == "xsd:integer" || dataNode["propertyType"] == "xsd:float"
            || dataNode["propertyType"] == "xsd:decimal") {
        if (dataNode["propertyType"] == "xsd:integer") {
            jsonData[id]["type"] = "integer";
        } else if (dataNode["propertyType"] == "xsd:float" || dataNode["propertyType"] == "xsd:double"
                || dataNode["propertyType"] == "xsd:decimal") {
            jsonData[id]["type"] = "number";
        }
        if (dataNode["minValue"] != undefined) {
            jsonData[id]["minimum"] = dataNode["minValue"];
            //jsonData["minimum"] = parseFloat(dataNode["minValue"]);
            //jsonData["properties"][id]["exclusiveMinimum"] = "false" ;
        }
        if (dataNode["maxValue"] != undefined) {
            jsonData[id]["maximum"] = dataNode["maxValue"];
        }
        if (dataNode["units"] != undefined) {
            jsonData[id]["unit"] = dataNode["units"];

        }
    }
    return(jsonData);
}

function getConcept(concept) {
    if (concept != undefined)
        if (concept.includes("iotschema.org"))
        {
            var term = new String(concept.slice(concept.lastIndexOf("/") + 1));
            if (term != "Property" && term != "Event" && term != "Action")
                term = "iot:".concat(term);
        }
    return(term);
}

function generateArrayData(id, dataNode) {
    jsonData[id]["type"] = "array";
    jsonData[id]["minItems"] = dataNode["sh:minCount"]["@value"];
    if (shape.expression.max != -1)
        jsonData[id]["maxItems"] = dataNode["sh:maxCount"]["@value"];
    jsonData[id]["items"] = {};
    jsonData[id]["items"]["type"] = dataNode["sh:datatype"]["@id"];
    return(jsonData);
}

let context = [];
function createContext() {
    context.push("https://w3c.github.io/wot/w3c-wot-td-context.jsonld");
    context.push({"iot": "http://iotschema.org/"});
    //return context;
}



var ip = {};
ip["@type"] = [];
var units = [];
var configAttr = {};
var ipdata = [];
var output = {};

function initialize() {
    ip = {};
    ip["@type"] = [];
    units = [];
    configAttr = {};
    ipdata = [];
    output = {};
    ip["acceptsInputData"] = [];
    ip["providesOutputData"] = [];
    data = [];
    context = [];
}

function clearArray(array) {
    while (array.length) {
        array.pop();
    }
}
var processedNodes = [];
function getInteractionPatternNode(shapes) {
    //var data = {};
    //console.log("getInteractionPatternNode");
    //ip["@type"]

    for (var i = 0; i < shapes.length; i++) {
        if (shapes[i]["sh:targetClass"]) {
            if (!shapes[i]["@id"].includes("Data") && processedNodes.indexOf(shapes[i]["name"]) <= -1) {
                //console.log(shapes[i]["sh:targetClass"]["@id"]);					
                var ipType = shapes[i]["sh:targetClass"]["@id"];
                ip["@type"] = ipType;
                ip["name"] = shapes[i]["name"];
                processedNodes.push(ip["name"]);
                //ToDo: Add capability context to the interaction pattern
                //ip["iot:capability"] = .. ;
                //ip["name"] = ipType.slice(ipType.lastIndexOf(":")+1);

                var shape = checkNodeType(shapes[i]["@id"]);
                //console.log(ip);
            } else if (shapes[i]["@id"].includes("Data")) {
                configAttr = {};
                configAttr["@type"] = shapes[i]["sh:targetClass"]["@id"];
                var shape = checkNodeType(shapes[i]["@id"]);
                ipdata.push(configAttr);
            }
            /*	if(!ip["writable"]){
             ip["@type"].push("iot:Action");
             console.log(JSON.stringify(ip["@type"]));
             }*/
            //  break;
        }
    }
    output["interaction"] = ip;
    output["data"] = ipdata;
    //console.log("IP: "+JSON.stringify(output));
    //console.log("Configuration Attributes for the given shape: "+JSON.stringify(configAttr));

    return output;

}

function parseNotNode(shape) {
    var resultNodeId = shape["sh:not"]["@id"];
    return resultNodeId;
}

function parseAndNode(shape) {
    var listNodes = [];
    if (shape["sh:and"]["@list"]) {
        listNodes = parseListNode(shape["sh:and"]["@list"]);
    }
    return listNodes;
}

function parseInNode(shape) {
    var listNodes = [];
    //console.log("parseInNode");
    if (shape["sh:in"]["@list"]) {
        listNodes = parseListNode(shape["sh:in"]["@list"]);
    }
    return listNodes;
}

function parseListNode(node) {
    //console.log("parseListNode");
    var listNodes = [];
    for (var k = 0; k < node.length; k++) {
        listNodes.push(node[k]["@id"]);
        //console.log(node[k]["@id"]);
    }
    return listNodes;
}

function parsePropertyNode(shape) {
    var resultNodeId;
    if (shape["sh:property"]) {
        //console.log("HERE: "+JSON.stringify(shape));
        resultNodeId = shape["sh:property"]["@id"];
    }
    //check result node type here or return it to checkNodeType and check it recursively in that function??
    return resultNodeId;
}

function getShape(shapes, nodeId) {
    var shape;
    for (var i = 0; i < shapes.length; i++) {
        if (shapes[i]["@id"] == nodeId) {
            shape = shapes[i];
            break;
        }
    }
    return shape;
}

function checkNodeType(nodeId) {
    //console.log("checkNodeType");
    var shape = getShape(shapes, nodeId);
    var nodeType = "";
    var resultNodeId = "";
    if (shape) {
        if (shape["sh:path"]) {
            //console.log("path: "+JSON.stringify(shape));
            var path = shape["sh:path"]["@id"];
            if (!shape["sh:node"]) {
                if (path.includes("providesOutputData") || path.includes("acceptsInputData") ||
                        path.includes("writable") || path.includes("observable") || path.includes("capability") || path.includes("isPropertyOf") || path.includes("isActionOf") || path.includes("isEventOf")) {
                    checkIProperties(shape);
                } else
                    checkDataProperties(shape);
                return shape;
            } else {
                if (path.includes("providesOutputData") || path.includes("acceptsInputData") ||
                        path.includes("writable") || path.includes("observable") || path.includes("capability") || path.includes("isPropertyOf") || path.includes("isActionOf") || path.includes("isEventOf")) {
                    checkIProperties(shape);
                }
                checkDataProperties(shape);
                checkNodeType(shape["sh:node"]["@id"]);
            }
        } else if (shape["sh:property"]) {
            //console.log("PropertyNode");
            nodeType = "PropertyNode";
            resultNodeId = parsePropertyNode(shape);
            checkNodeType(resultNodeId);
        } else if (shape["sh:and"]) {
            //console.log("AndNode");
            nodeType = "AndNode";
            var listNodes = parseAndNode(shape);
            for (var i = 0; i < listNodes.length; i++) {
                checkNodeType(listNodes[i]);
            }
        } else if (shape["sh:in"]) {
            //console.log("InNode: "+JSON.stringify(shape));
            nodeType = "InNode";
            var listNodes = parseInNode(shape);
            for (var i = 0; i < listNodes.length; i++) {
                checkNodeType(listNodes[i]);
            }
        } else if (shape["sh:not"]) {
            //console.log("NotNode");
            nodeType = "NotNode";
            resultNodeId = parseNotNode(shape);
            checkNodeType(resultNodeId);
        }
    }
    //callback();
    //return shape;
}
var data = [];
ip["acceptsInputData"] = [];
ip["providesOutputData"] = [];
function checkIProperties(shape) {
    //console.log("checkIProperties");
    if (shape["sh:path"]["@id"] == "iot:providesOutputData") {
        if (shape["sh:node"]) {
            var outputData = shape["sh:node"]["@id"];
            if (outputData == "schema:Boolean") {
                outputData = "boolean";
            } else if (outputData == "schema:Text") {
                outputData = "string";
            }
            ip["providesOutputData"].push(outputData);
        }
    } else if (shape["sh:path"]["@id"] == "iot:acceptsInputData") {
        if (shape["sh:node"]) {
            var inputData = shape["sh:node"]["@id"];
            if (inputData == "schema:Boolean") {
                inputData = "boolean";
            } else if (inputData == "schema:Text") {
                inputData = "string";
            }
            ip["acceptsInputData"].push(inputData);
        }
    } else if (shape["sh:path"]["@id"] == "iot:writable") {
        var writable = shape["sh:hasValue"];
        ip["writable"] = writable;
        //ip["@type"].push("iot:Property");
    } else if (shape["sh:path"]["@id"] == "iot:observable") {
        var observable = shape["sh:hasValue"];
        ip["observable"] = observable;
    } else if (shape["sh:path"]["@id"] == "iot:capability") {
        var capability = shape["sh:hasValue"];
        ip["capability"] = capability;
    } else if (shape["sh:path"]["@id"] == "iot:isPropertyOf") {
        var foi = shape["sh:hasValue"];
        ip["isPropertyOf"] = foi;
    } else if (shape["sh:path"]["@id"] == "iot:isActionOf") {
        var foi = shape["sh:hasValue"];
        ip["isActionOf"] = foi;
    }
    /*else if((shape["sh:path"]["@id"] != "iot:writable")){
     ip["@type"].push("iot:Action");
     }*/
    //console.log("ip properties: "+JSON.stringify(ip));
}

function checkDataProperties(shape) {
    //console.log("checkDataProperties");
    if (shape["sh:path"]["@id"] == "schema:propertyType") {
        //configAttr = {};
        if (shape["sh:datatype"]) {
            var propertyType = shape["sh:datatype"]["@id"];
            configAttr["propertyType"] = propertyType;
            configAttr["minValue"] = parseInt(shape["sh:minInclusive"]);
            configAttr["maxValue"] = parseInt(shape["sh:maxInclusive"]);
        } else if (shape["sh:in"]) {
            var propertyValues = [];
            var temp = shape["sh:in"];
            for (var i = 0; i < temp["@list"].length; i++) {
                propertyValues.push(temp["@list"][i]);
            }
            configAttr["propertyValues"] = propertyValues;
            data.push(configAttr);
        }
    }
    /*else if(shape["sh:path"]["@id"] == "schema:minValue"){
     configAttr["minValue"] = ipconfig["minimum"];
     }
     else if(shape["sh:path"]["@id"] == "schema:maxValue"){
     configAttr["maxValue"] =ipconfig["maximum"];
     }*/
    else if (shape["sh:path"]["@id"] == "schema:unitCode") {
        /*units = [];
         var temp = shape["sh:in"];
         for(var i=0; i < temp["@list"].length; i++){
         units.push(temp["@list"][i]);
         }*/
        configAttr["units"] = shape["sh:hasValue"];
        data.push(configAttr);
    }
}