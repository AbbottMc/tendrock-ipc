import * as __WEBPACK_EXTERNAL_MODULE__minecraft_server_fb7572af__ from "@minecraft/server";
/******/ var __webpack_modules__ = ([
/* 0 */,
/* 1 */,
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IpcV1: () => (/* binding */ IpcV1)
/* harmony export */ });
/* harmony import */ var _minecraft_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _lib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var _util_AsyncUtils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(7);
/* harmony import */ var _ref__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(8);




class IpcV1 {
    constructor(scriptEnv) {
        this._serializer = _ref__WEBPACK_IMPORTED_MODULE_3__.Serializers.V1;
        this.scriptEnv = scriptEnv;
    }
    static register(identifier, uuid) {
        return new IpcV1({ identifier, uuid });
    }
    postByParamOptions(value, options) {
        const id = this._serializer.serializeToScriptEventId(options);
        const message = this._serializer.serializeData(value, options.metadata.encoding);
        _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.sendScriptEvent(id, message);
    }
    post(packetType, identifier, value, targetEnvId) {
        this.postByParamOptions(value, {
            senderEnvId: this.scriptEnv.identifier, targetEnvId,
            header: { version: _lib__WEBPACK_IMPORTED_MODULE_1__.IpcVersion.V1 },
            metadata: {
                packet_type: packetType, packet_id: identifier
            }
        });
    }
    postToAll(packetType, identifier, value, targetEnvIdList) {
        const message = this._serializer.serializeData(value, 'json');
        this._serializer.serializeAllToScriptEventId(targetEnvIdList, {
            senderEnvId: this.scriptEnv.identifier,
            header: { version: _lib__WEBPACK_IMPORTED_MODULE_1__.IpcVersion.V1 },
            metadata: {
                packet_type: packetType, packet_id: identifier
            }
        }).forEach((id) => _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.sendScriptEvent(id, message));
    }
    listenScriptEvent(listener) {
        const thisEnvId = this.scriptEnv.identifier;
        const scriptEvenCallback = _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.afterEvents.scriptEventReceive.subscribe((event) => {
            const { id, message } = event;
            if (!id)
                return;
            const { headerStr, metadataStr, senderEnvId, targetEnvId } = this._serializer.deserializeScriptEventId(id);
            if (!senderEnvId)
                return;
            listener({ headerStr, metadataStr, senderEnvId, targetEnvId, message });
        }, { namespaces: [thisEnvId, IpcV1.BroadcastEnvId] });
        return () => {
            _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
        };
    }
    assertNotBroadcastEnvId(targetEnvId, errorMessage) {
        if (!targetEnvId)
            return;
        if (targetEnvId === IpcV1.BroadcastEnvId) {
            throw new Error(`${errorMessage}! Env id can not be Broadcast Env Id`);
        }
    }
    assertNotIncludeBroadcastEnvId(targetEnvIds, errorMessage) {
        if (!targetEnvIds)
            return;
        if (targetEnvIds.includes(IpcV1.BroadcastEnvId)) {
            throw new Error(`${errorMessage}! Env id list can not include Broadcast Env Id`);
        }
    }
    assertNotBeOrIncludeBroadcastEnvId(targetEnvIds, errorMessage) {
        if (typeof targetEnvIds === "string") {
            this.assertNotBroadcastEnvId(targetEnvIds, errorMessage);
        }
        else {
            this.assertNotIncludeBroadcastEnvId(targetEnvIds, errorMessage);
        }
    }
    send(identifier, value, targetEnvIds) {
        this.assertNotBeOrIncludeBroadcastEnvId(targetEnvIds, "Send message failed");
        if (typeof targetEnvIds === "string") {
            this.post(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcPacketType.Message, identifier, value, targetEnvIds);
            return;
        }
        if (targetEnvIds.length === 0)
            return;
        this.postToAll(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcPacketType.Message, identifier, value, targetEnvIds);
    }
    broadcast(identifier, value) {
        this.post(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcPacketType.Message, identifier, value, IpcV1.BroadcastEnvId);
    }
    on(identifier, listener) {
        return this.listenScriptEvent((event) => {
            const { senderEnvId, headerStr, metadataStr, message } = event;
            // console.log(`on message: ${senderEnvId} ${metadataStr} ${message}`);
            const header = this._serializer.deserializeHeader(headerStr);
            if (header.version !== _lib__WEBPACK_IMPORTED_MODULE_1__.IpcVersion.V1)
                return;
            const metadata = this._serializer.deserializeMetadata(metadataStr);
            if (metadata.packet_type !== _lib__WEBPACK_IMPORTED_MODULE_1__.IpcPacketType.Message)
                return;
            if (!metadata.packet_id || metadata.packet_id !== identifier)
                return;
            listener({
                packetId: metadata.packet_id,
                value: this._serializer.deserializeData(message, metadata.encoding),
                senderEnvId
            });
        });
    }
    once(identifier, listener) {
        const dispose = this.on(identifier, (event) => {
            listener(event);
            dispose();
        });
        return dispose;
    }
    debounce(identifier, listener, options) {
        const { merge, leading = false, delayTicks } = options;
        let lastEvent;
        let timeoutId;
        const trigger = (event) => {
            listener(event);
            lastEvent = undefined;
        };
        this.on(identifier, (event) => {
            const currentEvent = merge(event, lastEvent);
            if (leading && !timeoutId) {
                trigger(currentEvent);
            }
            else {
                if (timeoutId) {
                    _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.clearRun(timeoutId);
                }
                timeoutId = _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.runTimeout(() => {
                    trigger(currentEvent);
                    timeoutId = undefined;
                }, delayTicks);
                lastEvent = currentEvent;
            }
        });
        return this;
    }
    invoke(identifier, value, targetEnvIds) {
        this.assertNotBeOrIncludeBroadcastEnvId(targetEnvIds, "Invoke method failed");
        const result = new Promise((resolve, reject) => {
            const thisEnvId = this.scriptEnv.identifier;
            let resolveTimes = 0;
            const invokeResults = [];
            const scriptEvenCallback = _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.afterEvents.scriptEventReceive.subscribe((event) => {
                const { id, message } = event;
                if (!id)
                    return;
                const { headerStr, metadataStr, senderEnvId } = this._serializer.deserializeScriptEventId(id);
                if (!senderEnvId)
                    return;
                const header = this._serializer.deserializeHeader(headerStr);
                if (header.version !== _lib__WEBPACK_IMPORTED_MODULE_1__.IpcVersion.V1)
                    return;
                const metadata = this._serializer.deserializeMetadata(metadataStr);
                if (metadata.packet_type !== _lib__WEBPACK_IMPORTED_MODULE_1__.IpcPacketType.InvokeResult)
                    return;
                if (!metadata.packet_id || metadata.packet_id !== identifier)
                    return;
                // if (senderEnvId === thisEnvId) {
                //   reject();
                //   return;
                // }
                const result = {
                    value: this._serializer.deserializeData(message, metadata.encoding),
                    envId: senderEnvId
                };
                if (typeof targetEnvIds === 'string') {
                    resolve(result);
                    _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
                }
                else {
                    invokeResults.push(result);
                }
                resolveTimes++;
                if (resolveTimes >= targetEnvIds.length) {
                    resolve(invokeResults);
                    _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
                }
            }, { namespaces: [thisEnvId, IpcV1.BroadcastEnvId] });
        });
        if (typeof targetEnvIds === "string") {
            this.post(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcPacketType.Invoke, identifier, value, targetEnvIds);
        }
        else {
            this.postToAll(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcPacketType.Invoke, identifier, value, targetEnvIds);
        }
        return result;
    }
    handle(identifier, listener, senderEnvFilter) {
        this.assertNotBeOrIncludeBroadcastEnvId(senderEnvFilter, "Handle method invoke failed");
        const thisEnvId = this.scriptEnv.identifier;
        return this.listenScriptEvent((event) => {
            const { senderEnvId, headerStr, metadataStr, message } = event;
            if (senderEnvFilter && !senderEnvFilter.includes(senderEnvId))
                return;
            const header = this._serializer.deserializeHeader(headerStr);
            if (header.version !== _lib__WEBPACK_IMPORTED_MODULE_1__.IpcVersion.V1)
                return;
            const metadata = this._serializer.deserializeMetadata(metadataStr);
            if (metadata.packet_type !== _lib__WEBPACK_IMPORTED_MODULE_1__.IpcPacketType.Invoke)
                return;
            if (!metadata.packet_id || metadata.packet_id !== identifier)
                return;
            const invokeRetPromise = _util_AsyncUtils__WEBPACK_IMPORTED_MODULE_2__.AsyncUtils.awaitIfAsync(listener(this._serializer.deserializeData(message, metadata.encoding)));
            invokeRetPromise.then((retValue) => {
                this.postByParamOptions(retValue, {
                    senderEnvId: thisEnvId, targetEnvId: senderEnvId,
                    header: { version: _lib__WEBPACK_IMPORTED_MODULE_1__.IpcVersion.V1 },
                    metadata: {
                        packet_type: _lib__WEBPACK_IMPORTED_MODULE_1__.IpcPacketType.InvokeResult, packet_id: identifier
                    }
                });
            });
        });
    }
    ;
}
IpcV1.BroadcastEnvId = 'ipc_broadcast';


/***/ }),
/* 3 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var x = (y) => {
	var x = {}; __webpack_require__.d(x, y); return x
} 
var y = (x) => (() => (x))
module.exports = x({ ["system"]: () => (__WEBPACK_EXTERNAL_MODULE__minecraft_server_fb7572af__.system), ["world"]: () => (__WEBPACK_EXTERNAL_MODULE__minecraft_server_fb7572af__.world) });

/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IpcPacketType: () => (/* reexport safe */ _IpcPacketType__WEBPACK_IMPORTED_MODULE_0__.IpcPacketType),
/* harmony export */   IpcVersion: () => (/* reexport safe */ _IpcVersion__WEBPACK_IMPORTED_MODULE_1__.IpcVersion)
/* harmony export */ });
/* harmony import */ var _IpcPacketType__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5);
/* harmony import */ var _IpcVersion__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);




/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IpcPacketType: () => (/* binding */ IpcPacketType)
/* harmony export */ });
var IpcPacketType;
(function (IpcPacketType) {
    IpcPacketType["Message"] = "message";
    IpcPacketType["Invoke"] = "invoke";
    IpcPacketType["InvokeResult"] = "invoke_result";
})(IpcPacketType || (IpcPacketType = {}));


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IpcVersion: () => (/* binding */ IpcVersion)
/* harmony export */ });
var IpcVersion;
(function (IpcVersion) {
    IpcVersion["V1"] = "v1";
})(IpcVersion || (IpcVersion = {}));


/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AsyncUtils: () => (/* binding */ AsyncUtils)
/* harmony export */ });
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class AsyncUtils {
    static awaitIfAsync(target) {
        return __awaiter(this, void 0, void 0, function* () {
            if (target instanceof Promise) {
                return yield target;
            }
            else {
                return target;
            }
        });
    }
}


/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Serializers: () => (/* reexport safe */ _Serializers__WEBPACK_IMPORTED_MODULE_0__.Serializers)
/* harmony export */ });
/* harmony import */ var _Serializers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9);



/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Serializers: () => (/* binding */ Serializers)
/* harmony export */ });
/* harmony import */ var _serializer_SerializerV1__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10);

class Serializers {
}
Serializers.V1 = new _serializer_SerializerV1__WEBPACK_IMPORTED_MODULE_0__.SerializerV1();


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SerializerV1: () => (/* binding */ SerializerV1)
/* harmony export */ });
class SerializerV1 {
    assertV1Encoding(encoding) {
        if (encoding && encoding !== 'json') {
            throw new Error(`Invalid encoding type: ${encoding} for V1 serializer`);
        }
    }
    serializeData(data, encoding) {
        this.assertV1Encoding(encoding);
        return JSON.stringify(data);
    }
    deserializeData(data, encoding) {
        this.assertV1Encoding(encoding);
        return JSON.parse(data);
    }
    serializeHeader(header) {
        return JSON.stringify(header).replaceAll(':', '$[tc]');
    }
    deserializeHeader(headerStr) {
        return JSON.parse(headerStr.replaceAll('$[tc]', ':'));
    }
    serializeMetadata(metadata) {
        return JSON.stringify(metadata).replaceAll(':', '$[tc]');
    }
    deserializeMetadata(metadataStr) {
        return JSON.parse(metadataStr.replaceAll('$[tc]', ':'));
    }
    serializeToScriptEventId(options) {
        const { senderEnvId, targetEnvId, header, metadata } = options;
        const headerStr = this.serializeHeader(header);
        const metadataStr = this.serializeMetadata(metadata);
        return `${targetEnvId}:${senderEnvId}-${headerStr}-${metadataStr}`;
    }
    serializeAllToScriptEventId(targetEnvIdList, options) {
        const { senderEnvId, metadata, header } = options;
        const headerStr = this.serializeHeader(header);
        const metadataStr = this.serializeMetadata(metadata);
        return targetEnvIdList.map(targetEnvId => {
            return `${targetEnvId}:${senderEnvId}-${headerStr}-${metadataStr}`;
        });
    }
    deserializeScriptEventId(scriptEventId) {
        const envIdPair = scriptEventId.split('-')[0];
        const headerAndMetadataStr = scriptEventId.substring(envIdPair.length + 1);
        const headerStr = headerAndMetadataStr.split('-')[0];
        const metadataStr = headerAndMetadataStr.substring(headerStr.length + 1);
        const [targetEnvId, senderEnvId] = envIdPair.split(':');
        return {
            senderEnvId,
            targetEnvId,
            headerStr,
            metadataStr
        };
    }
}


/***/ })
/******/ ]);
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
/* harmony import */ var _ipc_IpcV1__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var _minecraft_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);


const ipc = _ipc_IpcV1__WEBPACK_IMPORTED_MODULE_0__.IpcV1.register('child', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
ipc.on('test:test_message', (event) => {
    _minecraft_server__WEBPACK_IMPORTED_MODULE_1__.world.sendMessage(`Received message: "${event.value}" from "${event.senderEnvId}"`);
});
ipc.handle('test:test_invoke', (testData) => {
    _minecraft_server__WEBPACK_IMPORTED_MODULE_1__.world.sendMessage(`Invoke function output: "${testData.message}"`);
    return testData.num1 + testData.num2;
});

