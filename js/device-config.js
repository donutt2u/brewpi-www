/*jslint browser: true*/
/*global console, alert, Spinner*/

var deviceListTimeout = 0;
var deviceListTimeoutCounter = 0;
var deviceListSpinner;
var deviceList = {};
var pinList = {};
var deviceListMaxRequests = 20;
var deviceListRequestTime = 1000;

function findPinInList(pinList, pinNr) {
    "use strict";
    var i;
    for (i = 0; i < pinList.length; i += 1) {
        if (pinList[i].val === pinNr) {
            return pinList[i];
        }
    }
    return -1;
}

function pinTypeToFunctionList(pinType, hwType) {
    "use strict";
    var functionList, actFunctions;
    functionList = [];
    actFunctions = [2, 3, 4, 7];

    switch (pinType) {
    case 'act':
        functionList = actFunctions; // all actuator functions
        break;
    case 'free':
        functionList = [1, 2, 3, 4, 7]; // all actuator functions + door
        break;
    case 'onewire':
        if (hwType === 3) {
            functionList = actFunctions;    // ds2413 actuator
        } else {
            functionList = [5, 6, 9];
        }
        break;
    case 'door':
        functionList = [1, 2, 3, 4, 7]; // all actuator functions + door
        break;
    default:
        console.warn("Unknown pinType passed to pinTypeToFunctionList");
        break;
    }
    return functionList;
}

function functionToPinTypes(functionType) {
    "use strict";
    var pinTypes;
    switch (functionType) {
    case 0: // none
        pinTypes = ['free', 'act', 'onewire', 'door'];
        break;
    case 1: // door
        pinTypes = ['free', 'door'];
        break;
    case 2: // heat
    case 3: // cool
    case 4: // light
    case 7: // fan
        pinTypes = ['free', 'door', 'act'];
        break;
    case 5: // chamber temp
    case 6: // room temp
    case 9: // beer temp
        pinTypes = ['onewire'];
        break;
    default: // unknown function
        pinTypes = [];
        break;
    }
    return pinTypes;
}

function getDeviceFunctionList() {
    "use strict";
    // currently unsupported/unused devices commented out
    return [
        {val: 0, text: 'None'},
        {val: 1, text: 'Chamber Door'},
        {val: 2, text: 'Chamber Heater'},
        {val: 3, text: 'Chamber Cooler'},
        {val: 4, text: 'Chamber Light'},
        {val: 5, text: 'Chamber Temp'},
        {val: 6, text: 'Room Temp'},
        {val: 7, text: 'Chamber Fan'},
        /*{val : 8, text: 'Chamber Reserved 1'},*/
        {val: 9, text: 'Beer Temp'}/*,
         {val : 10, text: 'Beer Temperature 2'},
         {val : 11, text: 'Beer Heater'},
         {val : 12, text: 'Beer Cooler'},
         {val : 13, text: 'Beer S.G.'},
         {val : 14, text: 'Beer Reserved 1'},
         {val : 15, text: 'Beer Reserved 2'}  */
    ];
}

function getLimitedFunctionList(pinType, hwType) {
    "use strict";
    var i, list, fullFunctionList, limitedFunctionList;
    fullFunctionList = getDeviceFunctionList();
    limitedFunctionList = pinTypeToFunctionList(pinType, hwType);
    list = [fullFunctionList[0]]; // always add 'None'
    for (i = 0; i < fullFunctionList.length; i += 1) {
        if (-1 !== $.inArray(fullFunctionList[i].val, limitedFunctionList)) {
            list.push(fullFunctionList[i]);
        }
    }
    return list;
}

function getDeviceHwTypeList() {
    "use strict";
    // currently unsupported/unused devices commented out
    return [
        {val: 0, text: 'None'},
        {val: 1, text: 'Digital Pin'},
        {val: 2, text: 'Temp Sensor'},
        {val: 3, text: 'DS2413'}
    ];
}

function getDeviceTypeList() {
    "use strict";
    // currently unsupported/unused devices commented out
    return [
        {val: 0, text: 'None'},
        {val: 1, text: 'Temp Sensor'},
        {val: 2, text: 'Switch Sensor'},
        {val: 3, text: 'Switch Actuator'}
    ];
}

function getLimitedPinList(pinList, pinTypes) {
    "use strict";
    var i, list;
    list = [
        {val: 0, text: 'Unassigned'}
    ];
    for (i = 0; i < pinList.length; i += 1) {
        if (-1 !== $.inArray(pinList[i].type, pinTypes)) {
            list.push({val: pinList[i].val, text: pinList[i].text.toString()});
        }
    }
    return list;
}

function getDeviceSlotList() {
    "use strict";
    var i, maxDevices, list;
    maxDevices = 15;
    list = [
        {val: -1, text: 'Unassigned'}
    ];
    for (i = 0; i <= maxDevices; i += 1) {
        list.push({val: i, text: i.toString()});
    }
    return list;
}

function getUsedDeviceSlotList() {
    "use strict";
    var j, usedSlotList = [];
    for (j = 0; j < deviceList.installed.length; j += 1) {
        usedSlotList.push(deviceList.installed[j].i);
    }
    return usedSlotList;
}

function getFreeDeviceSlotList() {
    "use strict";
    var listFull, listUsed, listFree, j;
    listFull = getDeviceSlotList();
    listUsed = getUsedDeviceSlotList();
    listFree = [];
    for (j = 0; j < listFull.length; j += 1) {
        if (listUsed.indexOf(listFull[j].val) === -1) {
            // slot is not found in used slots
            listFree.push(listFull[j]); // add free slot to list
        }
    }
    return listFree;
}

function getDeviceChamberList() {
    "use strict";
    var i, maxChambers, list;
    maxChambers = 1;
    list = [
        {val: 0, text: 'Unassigned'}
    ];
    for (i = 1; i <= maxChambers; i += 1) {
        list.push({val: i, text: "Chamber " + i.toString()});
    }
    return list;
}

function getDeviceBeerList() {
    "use strict";
    var i, list, maxBeers;
    maxBeers = 1;
    list = [
        {val: 0, text: 'Chamber device'}
    ];
    for (i = 1; i <= maxBeers; i += 1) {
        list.push({val: i, text: "Beer " + i.toString()});
    }
    return list;
}
/*
 function getDeviceCalibrateList(){
 "use strict";
 var minCalibrate = 1;
 var list = [ {val: 0, text: 'Chamber device'}];
 for(var i = 1; i <= maxBeers; i++){
 list.push({val: i, text: i.toString()});
 }
 return list;
 } */

function generateSelect(list, selected, disableOthers) {
    "use strict";
    var sel = $('<select>');
    $(list).each(function () {
        sel.append($("<option>").attr('value', this.val).text(this.text));
    });
    sel.val(selected);
    if (disableOthers === "all") {
        sel.find("option:not(:selected)").attr("disabled", "disabled");
    } else if ($.isArray(disableOthers)) {
        $.each(disableOthers, function (index, value) {
            sel.find('option[value="' + value.toString() + '"]').attr("disabled", "disabled");
        });
    }
    return sel;
}

function spanFromListVal(list, val, className) {
    "use strict";
    var i, spanText;
    spanText = "undefined";
    for (i = 0; i < list.length; i += 1) {
        if (list[i].val === val) {
            spanText = list[i].text;
        }
    }
    return $("<span class='" + className + " device-setting'>" + spanText + "</span>");
}

function valFromListText(list, text) {
    "use strict";
    var i, val;
    val = -1;
    for (i = 0; i < list.length; i += 1) {
        if (list[i].text === text) {
            val = list[i].val;
        }
    }
    return val;
}

function generateDeviceSettingContainer(name, className, content) {
    "use strict";
    var $settingContainer = $("<div class='device-setting-container'></div>");
    $settingContainer.append("<span class='setting-name'>" + name + "</span>");
    $settingContainer.append(content);
    $settingContainer.addClass(className);
    return $settingContainer;
}

function addToConfigString(configString, key, value) {
    "use strict";
    var newConfigString = configString;
    if (value !== undefined && value !== "") {
        if (newConfigString !== "{") {
            newConfigString += ",";
        }

        newConfigString += "\"" + key + "\"" + ":" + "\"" + value + "\"";
    }
    return newConfigString;
}

function getDeviceConfigString(deviceNr) {
    "use strict";
    var $pinSelect, $pinSpan, deviceSlot, configString, $deviceContainer, deviceFunction;
    configString = "{";
    $deviceContainer = $("#device-" + deviceNr.toString());

    deviceSlot = $deviceContainer.find(".device-slot select").val();
    if (deviceSlot === undefined) {
        // did not find select, must be span
        deviceSlot = $deviceContainer.find(".device-slot span.device-slot").text();
    }
    configString = addToConfigString(configString, "i", deviceSlot);
    deviceFunction = $deviceContainer.find(".function select").val();
    configString = addToConfigString(configString, "f", deviceFunction);

    // assign chamber 1 automatically until we support multi-chamber
    // configString = addToConfigString(configString, "c", $deviceContainer.find(".chamber select").val());
    configString = addToConfigString(configString, "c", 1);

    // assign beer automatically to chamber device or beer 1 until we support multi-beer
    // configString = addToConfigString(configString, "b", $deviceContainer.find(".beer select").val());
    if (deviceFunction >= 1 && deviceFunction <= 8) {
        // chamber function, set as chamber device automatically
        configString = addToConfigString(configString, "b", 0);
    } else if (deviceFunction >= 9 && deviceFunction <= 15) {
        // beer function, assign beer 1 automatically until we support multi-beer
        configString = addToConfigString(configString, "b", 1);
    }

    configString = addToConfigString(configString, "h", valFromListText(getDeviceHwTypeList(), $deviceContainer.find("span.hardware-type").text()));

    $pinSpan = $deviceContainer.find("span.arduino-pin"); // pre-defined devices have a span
    $pinSelect = $deviceContainer.find(".arduino-pin select"); // new devices have a select
    if ($pinSpan.length) {
        configString = addToConfigString(configString, "p", valFromListText(pinList, $pinSpan.text()));
    } else if ($pinSelect.length) {
        configString = addToConfigString(configString, "p", $pinSelect.val());
    }
    configString = addToConfigString(configString, "x", $deviceContainer.find(".pin-type select").val());
    configString = addToConfigString(configString, "a", $deviceContainer.find("span.onewire-address").text());
    configString = addToConfigString(configString, "n", $deviceContainer.find(".ds2413-pin select").val());

    configString = addToConfigString(configString, "d", 0); // hardwire deactivate for now
    configString = addToConfigString(configString, "j", 0); // hardwire calibration for now

    configString += "}";
    return configString;
}

function applyDeviceSettings(deviceNr) {
    "use strict";
    var configString = getDeviceConfigString(deviceNr);

    $.post('socketmessage.php', {messageType: "applyDevice", message: configString});

    $("#device-console").find("span").append("Device config command sent, U:" + configString + "<br>");
}

function addDeviceToDeviceList(device, pinList, installed, fullPinList) {
    "use strict";
    // fullPinList is an optional argument that makes pin and function fully selectable (except onewire)
    var $settings, $applyButton, $newDevice, $nameAndApply, address, pinSpec, value, $deviceSlot;

    $newDevice = $("<div class='device-container' id='device-" + device.nr.toString() + "'></div>");
    // add the device to the device list div
    $newDevice.appendTo(".device-list");

    $nameAndApply = $("<div class= device-name-and-apply></div>");
    $nameAndApply.appendTo($newDevice);

    // add device name
    $("<span class='device-name'>Device " + device.nr.toString() + "</span>").appendTo($nameAndApply);

    // add apply button
    $applyButton = $("<button class='apply'>Apply</button>");
    $applyButton.appendTo($nameAndApply);
    $applyButton.button({icons: {primary: "ui-icon-check" } });
    $applyButton.click(function () {
        applyDeviceSettings(device.nr);
    });

    $settings = $("<div class='device-all-settings'><div>");
    $settings.appendTo($newDevice);

    if ((device.i !== undefined)) {
        if (installed) {
            // display span
            $deviceSlot = spanFromListVal(getDeviceSlotList(), device.i, 'device-slot');
        } else {
            // display select, disable used slots
            $deviceSlot = generateSelect(getDeviceSlotList(), device.i, getUsedDeviceSlotList());
        }

        $settings.append(generateDeviceSettingContainer(
            "Device slot",
            "device-slot",
            $deviceSlot
        ));
    }
    /* remove option for chamber and beer assignment until we support multi-beer / multi-chamber

    if ((device.c !== undefined)) {
        $settings.append(generateDeviceSettingContainer(
            "Assigned to",
            "chamber",
            generateSelect(getDeviceChamberList(), device.c)
        ));
    }
    if ((device.b !== undefined)) {
        $settings.append(generateDeviceSettingContainer(
            "Assigned to",
            "beer",
            generateSelect(getDeviceBeerList(), device.b)
        ));
    }

    */

    if ((device.h !== undefined)) {
        $settings.append(generateDeviceSettingContainer(
            "Hardware type",
            "hardware-type",
            spanFromListVal(getDeviceHwTypeList(), device.h, 'hardware-type')
        ));
    }
    if ((device.t !== undefined)) {
        $settings.append(generateDeviceSettingContainer(
            "Device type",
            "device-type",
            spanFromListVal(getDeviceTypeList(), device.t, 'device-type')
        ));
    }
    if ((device.x !== undefined)) {
        $settings.append(generateDeviceSettingContainer(
            "Pin type",
            "pin-type",
            generateSelect([
                { val: 0, text: 'not inverted'},
                {val: 1, text: 'inverted'}
            ], device.x)
        ));
    }

    if ((device.a !== undefined)) {
        address = device.a;
        if (parseInt(address, 10) === 0) {
            // device is configured as first device on bus. Address is 16 zeros.
            address = "First on bus";
        }
        $settings.append(generateDeviceSettingContainer(
            "OneWire Address",
            "onewire-address",
            "<span class='onewire-address device-setting'>" + address + "</span>"
        ));
    }

    if (fullPinList) {
        pinSpec = {'val': -1, 'type': 'free'};
        $settings.append(generateDeviceSettingContainer(
            "Arduino Pin",
            "arduino-pin",
            generateSelect(getLimitedPinList(pinList, ['free']))
        ));
    } else {
        if (device.p !== undefined) {
            pinSpec = findPinInList(pinList, device.p);
            if (pinSpec !== -1) { // if pin exists in pin list
                $settings.append(generateDeviceSettingContainer(
                    "Arduino Pin",
                    "arduino-pin",
                    spanFromListVal(pinList, device.p, 'arduino-pin')
                ));
            }
        } else {
            $settings.append(generateDeviceSettingContainer(
                "Arduino Pin",
                "arduino-pin",
                $("<span>Unknown pin" + device.p + "</span>")
            ));
        }
    }

    if ((device.f !== undefined)) {
        $settings.append(generateDeviceSettingContainer(
            "Function",
            "function",
            generateSelect(getLimitedFunctionList(pinSpec.type, device.h), device.f)
        ));
    }

    if ((device.n !== undefined)) {
        $settings.append(generateDeviceSettingContainer(
            "DS2413 pin",
            "ds2413-pin",
            generateSelect([
                { val: 0, text: 'pin 0'},
                {val: 1, text: 'pin 1'}
            ], device.n)
        ));
    }
    if ((device.v !== undefined)) {
        value = device.v;
        if (parseInt(device.t, 10) === 3) {
            // Device type is switch actuator
            if (value === 0) {
                value = "Inactive";
            } else if (value === 1) {
                value = "Active";
            }
        }
        if (value === null) {
            value = "Disconnected";
        }
        $settings.append(generateDeviceSettingContainer(
            "Value",
            "device-value",
            "<span class='device-value device-setting'>" + value + "</span>"
        ));
    }
}

function parseDeviceList(deviceList, pinList, installed) {
    "use strict";
    // output is just for testing now
    var i, device, output, devicesInListAlready;
    output = "";
    devicesInListAlready = $("div.device-list div.device-container").length;
    for (i = 0; i < deviceList.length; i += 1) {
        device = deviceList[i];
        device.nr = i + devicesInListAlready;
        output += "Parsing device: ";
        output += JSON.stringify(device);
        output += '<br>';
        addDeviceToDeviceList(device, pinList, installed);
    }
    return output;
}

function addNewDevice() {
    "use strict";
    var device = {'c': 0, 'b': 0, 'd': 0, 'f': 0, 'i': -1, 'h': 1, 'p': -1, 't': 0, 'x': 0, 'nr': $("div.device-list div.device-container").length};
    addDeviceToDeviceList(device, pinList, false, true);
    //refreshDeviceList();
    console.log(deviceList);
}

function getDeviceList() {
    "use strict";
    /*global deviceList:true, pinList:true */

    $.ajax({
        type: 'POST',
        url: 'socketmessage.php',
        data: {messageType: "getDeviceList", message: ""},
        success: function (response) {
            var $deviceConsole, deviceAndPinList, $deviceList, jsonParsed, strippedResponse;
            strippedResponse = response.replace(/\s/g, ''); //strip all whitespace, including newline.
            $deviceList = $(".device-list");
            $deviceConsole = $("#device-console").find("span");

            if (strippedResponse !== "device-list-not-up-to-date") {
                $deviceConsole.find("span").append("<br>Updated device list received<br>");
                jsonParsed = false;
                try {
                    deviceAndPinList = JSON.parse(strippedResponse);
                    deviceList = deviceAndPinList.deviceList;
                    pinList = deviceAndPinList.pinList;
                    jsonParsed = true;
                } catch (e) {
                    $("#device-console").find("span").append("Error while receiving device configuration: " + e + "<br>");
                }
                if (jsonParsed) {
                    $deviceList.empty();
                    $deviceList.append("<span class='device-list-header'>Installed devices</span>");
                    if (deviceList.installed.length === 0) {
                        $deviceConsole.append("No installed devices found<br>");
                        $deviceList.append("<span class='device-list-empty-text'>None</span>");
                    } else {
                        $deviceConsole.append("Parsing installed devices<br>");
                        console.log("Parsing installed devices: " + parseDeviceList(deviceList.installed, pinList, true));
                    }
                    $deviceList.append("<span class='device-list-header'>Detected devices</span>");
                    if (deviceList.available.length === 0) {
                        $deviceConsole.append("No available devices found<br>");
                        $('.device-list').append("<span class='device-list-empty-text'>No additional devices found</span>");
                    } else {
                        $deviceConsole.append("Parsing available devices<br>");
                        console.log("Parsing available devices: " + parseDeviceList(deviceList.available, pinList, false));
                    }
                    // add new device button to device list container if it does not exist already
                    if ($("button.add-new-device").length < 1) {
                        $('.device-list-container').append("<button class='add-new-device'>Add new device</button>");
                        $("button.add-new-device").button({    icons: {primary: "ui-icon-refresh" } })
                            .click(addNewDevice);
                    }

                    $deviceConsole.append("Device list updated for Arduino " +
                        deviceAndPinList.board + " with a " +
                        deviceAndPinList.shield + " shield<br>");
                }
                deviceListTimeoutCounter = 0; // stop requesting on success
                if (deviceListTimeout) {
                    clearTimeout(deviceListTimeout);
                }
                if (deviceListSpinner !== undefined) {
                    deviceListSpinner.stop();
                }
            } else {
                if (deviceListTimeoutCounter > 0) {
                    deviceListTimeoutCounter -= 1;
                    deviceListTimeout = setTimeout(getDeviceList, deviceListRequestTime);
                }
            }
            // scroll box down
            $deviceConsole.scrollTop($deviceConsole.height());
        },
        async: true
    });
}

function refreshDeviceList() {
    "use strict";
    var parameters, spinnerOpts;
    if (deviceListTimeout) {
        clearTimeout(deviceListTimeout); // clear old timeout
    }
    if (deviceListSpinner !== undefined) {
        deviceListSpinner.stop();
    }

    parameters = "";
    if ($('#read-values').is(":checked")) {
        parameters = "readValues";
    }
    spinnerOpts = {};
    deviceListSpinner = new Spinner(spinnerOpts).spin();
    $(".device-list-container .spinner-position").append(deviceListSpinner.el);

    $.post('socketmessage.php', {messageType: "refreshDeviceList", message: parameters});

    // try max 10 times, 5000ms apart to see if it the Arduino has responded with an updated list
    deviceListTimeoutCounter = deviceListMaxRequests;
    deviceListTimeout = setTimeout(getDeviceList, deviceListRequestTime);
}

function initDeviceConfiguration() {
    "use strict";
    $(".refresh-device-list").button({icons: {primary: "ui-icon-refresh" } }).click(refreshDeviceList);
}

$(document).ready(function () {
    "use strict";

    initDeviceConfiguration();
});
