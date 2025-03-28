import * as __WEBPACK_EXTERNAL_MODULE__minecraft_server_fb7572af__ from "@minecraft/server";
/******/ var __webpack_modules__ = ([
/* 0 */,
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Ipc: () => (/* binding */ Ipc)
/* harmony export */ });
/* harmony import */ var _minecraft_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);
/* harmony import */ var _lib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7);
/* harmony import */ var _util__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(9);
/* harmony import */ var _util_AsyncUtils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(11);




class Ipc {
    constructor(scriptEnv) {
        this.scriptEnv = scriptEnv;
    }
    static register(identifier, uuid) {
        return new Ipc({ identifier, uuid });
    }
    postByParamOptions(options) {
        const { id, message } = _util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.serialize(options);
        _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.sendScriptEvent(id, message);
    }
    post(mode, identifier, value, targetEnvId) {
        this.postByParamOptions({
            senderEnvId: this.scriptEnv.identifier, targetEnvId, value,
            metadata: {
                mode, identifier
            }
        });
    }
    postToAll(mode, identifier, value, targetEnvIdList) {
        _util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.serializeAll(targetEnvIdList, {
            senderEnvId: this.scriptEnv.identifier, value,
            metadata: {
                mode, identifier
            }
        }).forEach(({ id, message }) => _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.sendScriptEvent(id, message));
    }
    listenScriptEvent(listener) {
        const thisEnvId = this.scriptEnv.identifier;
        const scriptEvenCallback = _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.afterEvents.scriptEventReceive.subscribe((event) => {
            const { id, message } = event;
            if (!id)
                return;
            const { metadataStr, senderEnvId, targetEnvId } = _util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.deserializeScriptEventId(id);
            if (!senderEnvId)
                return;
            listener({ metadataStr, senderEnvId, targetEnvId, message });
        }, { namespaces: [thisEnvId, Ipc.BroadcastEnvId] });
        return () => {
            _minecraft_server__WEBPACK_IMPORTED_MODULE_0__.system.afterEvents.scriptEventReceive.unsubscribe(scriptEvenCallback);
        };
    }
    assertNotBroadcastEnvId(targetEnvId, errorMessage) {
        if (!targetEnvId)
            return;
        if (targetEnvId === Ipc.BroadcastEnvId) {
            throw new Error(`${errorMessage}! Env id can not be Broadcast Env Id`);
        }
    }
    assertNotIncludeBroadcastEnvId(targetEnvIds, errorMessage) {
        if (!targetEnvIds)
            return;
        if (targetEnvIds.includes(Ipc.BroadcastEnvId)) {
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
            this.post(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcMode.Message, identifier, value, targetEnvIds);
            return;
        }
        if (targetEnvIds.length === 0)
            return;
        this.postToAll(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcMode.Message, identifier, value, targetEnvIds);
    }
    broadcast(identifier, value) {
        this.post(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcMode.Message, identifier, value, Ipc.BroadcastEnvId);
    }
    on(identifier, listener) {
        return this.listenScriptEvent((event) => {
            const { senderEnvId, metadataStr, message } = event;
            // console.log(`on message: ${senderEnvId} ${metadataStr} ${message}`);
            const metadata = _util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.deserializeMetadata(metadataStr);
            if (metadata.mode !== _lib__WEBPACK_IMPORTED_MODULE_1__.IpcMode.Message)
                return;
            if (!metadata.identifier || metadata.identifier !== identifier)
                return;
            listener({
                identifier: metadata.identifier,
                value: _util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.deserializeData(message),
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
                const { metadataStr, senderEnvId } = _util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.deserializeScriptEventId(id);
                if (!senderEnvId)
                    return;
                const metadata = _util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.deserializeMetadata(metadataStr);
                if (metadata.mode !== _lib__WEBPACK_IMPORTED_MODULE_1__.IpcMode.InvokeResult)
                    return;
                if (!metadata.identifier || metadata.identifier !== identifier)
                    return;
                // if (senderEnvId === thisEnvId) {
                //   reject();
                //   return;
                // }
                const result = {
                    value: _util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.deserializeData(message),
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
            }, { namespaces: [thisEnvId, Ipc.BroadcastEnvId] });
        });
        if (typeof targetEnvIds === "string") {
            this.post(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcMode.Invoke, identifier, value, targetEnvIds);
        }
        else {
            this.postToAll(_lib__WEBPACK_IMPORTED_MODULE_1__.IpcMode.Invoke, identifier, value, targetEnvIds);
        }
        return result;
    }
    handle(identifier, listener, senderEnvFilter) {
        this.assertNotBeOrIncludeBroadcastEnvId(senderEnvFilter, "Handle method invoke failed");
        const thisEnvId = this.scriptEnv.identifier;
        return this.listenScriptEvent((event) => {
            const { senderEnvId, metadataStr, message } = event;
            if (senderEnvFilter && !senderEnvFilter.includes(senderEnvId))
                return;
            const metadata = _util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.deserializeMetadata(metadataStr);
            if (metadata.mode !== _lib__WEBPACK_IMPORTED_MODULE_1__.IpcMode.Invoke)
                return;
            if (!metadata.identifier || metadata.identifier !== identifier)
                return;
            const invokeRetPromise = _util_AsyncUtils__WEBPACK_IMPORTED_MODULE_3__.AsyncUtils.awaitIfAsync(listener(_util__WEBPACK_IMPORTED_MODULE_2__.SerializerUtils.deserializeData(message)));
            invokeRetPromise.then((retValue) => {
                this.postByParamOptions({
                    senderEnvId: thisEnvId, targetEnvId: senderEnvId, value: retValue,
                    metadata: {
                        mode: _lib__WEBPACK_IMPORTED_MODULE_1__.IpcMode.InvokeResult, identifier: identifier
                    }
                });
            });
        });
    }
    ;
}
Ipc.BroadcastEnvId = 'ipc_broadcast';


/***/ }),
/* 6 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var x = (y) => {
	var x = {}; __webpack_require__.d(x, y); return x
} 
var y = (x) => (() => (x))
module.exports = x({ ["system"]: () => (__WEBPACK_EXTERNAL_MODULE__minecraft_server_fb7572af__.system), ["world"]: () => (__WEBPACK_EXTERNAL_MODULE__minecraft_server_fb7572af__.world) });

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IpcMode: () => (/* reexport safe */ _IpcMode__WEBPACK_IMPORTED_MODULE_0__.IpcMode)
/* harmony export */ });
/* harmony import */ var _IpcMode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8);



/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IpcMode: () => (/* binding */ IpcMode)
/* harmony export */ });
var IpcMode;
(function (IpcMode) {
    IpcMode["Message"] = "message";
    IpcMode["Invoke"] = "invoke";
    IpcMode["InvokeResult"] = "invoke_result";
})(IpcMode || (IpcMode = {}));


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SerializerUtils: () => (/* reexport safe */ _SerializerUtils__WEBPACK_IMPORTED_MODULE_0__.SerializerUtils)
/* harmony export */ });
/* harmony import */ var _SerializerUtils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10);



/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SerializerUtils: () => (/* binding */ SerializerUtils)
/* harmony export */ });
class SerializerUtils {
    static serializeData(data) {
        return JSON.stringify(data);
    }
    static deserializeData(data) {
        return JSON.parse(data);
    }
    /**
     * Serialize metadata to string
     * @param metadata
     */
    static serializeMetadata(metadata) {
        const escapedStr = JSON.stringify(metadata).replaceAll(':', '$[tc]');
        return JSON.stringify(escapedStr).slice(1, -1);
    }
    /**
     * Deserialize metadata from string
     * @param metadataStr
     */
    static deserializeMetadata(metadataStr) {
        return JSON.parse(metadataStr.replaceAll('$[tc]', ':'));
    }
    static serialize(options) {
        const { senderEnvId, targetEnvId, metadata, value } = options;
        const id = `${targetEnvId}:${senderEnvId}-${this.serializeMetadata(metadata)}`;
        const message = value ? this.serializeData(value) : '';
        // scriptevent <targetEnvId>:<senderEnvId>-<metadata> <dataMessage>
        // scriptevent "ic2:ntrs-{\"mode\"$[tc]\"<IpcMode>\",\"identifier\"$[tc]\"<NamespacedIdentifier>\"}" "Hello Tendrock!"
        return { id, message };
    }
    static serializeAll(targetEnvIdList, options) {
        const { senderEnvId, metadata, value } = options;
        const metadataStr = this.serializeMetadata(metadata);
        const message = value ? this.serializeData(value) : '';
        return targetEnvIdList.map(targetEnvId => {
            const id = `${targetEnvId}:${senderEnvId}-${metadataStr}`;
            return { id, message };
        });
    }
    static deserializeScriptEventId(scriptEventId) {
        const envIdPair = scriptEventId.split('-')[0];
        const metadataStr = scriptEventId.substring(envIdPair.length + 1);
        const [targetEnvId, senderEnvId] = envIdPair.split(':');
        return {
            senderEnvId,
            targetEnvId,
            metadataStr
        };
    }
}


/***/ }),
/* 11 */
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
/* harmony import */ var _ipc_Ipc__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5);
/* harmony import */ var _minecraft_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);


const ipc = _ipc_Ipc__WEBPACK_IMPORTED_MODULE_0__.Ipc.register('child', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
ipc.on('test:test_message', (event) => {
    _minecraft_server__WEBPACK_IMPORTED_MODULE_1__.world.sendMessage(`Received message: "${event.value}" from "${event.senderEnvId}"`);
});
ipc.handle('test:test_invoke', (testData) => {
    _minecraft_server__WEBPACK_IMPORTED_MODULE_1__.world.sendMessage(`Invoke function output: "${testData.message}"`);
    return testData.num1 + testData.num2;
});

