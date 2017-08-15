(function (root, window, factory) {
    var name = 'pm';

    if (typeof exports === 'object' && typeof module === 'object')
        module.exports = factory(window);
    else if (typeof define === 'function' && define.amd)
        define([], factory);
    else if (typeof exports === 'object')
        exports[name] = factory(window);
    else
        root[name] = factory(window);
})(this, window, function (window) {
    'use strict';

    //@see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
    if (!window.JSON) {
        window.JSON = {
            parse: function (sJSON) {
                return eval("(" + sJSON + ")");
            },
            stringify: function (str) {
                var strLine = function (str) {
                    return str.replace(/"/g, "\\$&").replace(/\n/g, "\\n");
                }
                if (str instanceof Object) {
                    var sOutput = "";
                    if (str.constructor === Array) {
                        for (var nId = 0; nId < str.length; sOutput += this.stringify(str[nId]) + ",", nId++) {
                        }
                        return "[" + sOutput.substr(0, sOutput.length - 1) + "]";
                    }
                    if (str.toString !== Object.prototype.toString) {
                        return "\"" + strLine(str.toString()) + "\"";
                    }
                    for (var sProp in str) {
                        sOutput += "\"" + strLine(sProp) + "\":" + this.stringify(str[sProp]) + ",";
                    }
                    return "{" + sOutput.substr(0, sOutput.length - 1) + "}";
                }
                // console.log(typeof str);
                if (typeof str === "unknown") {
                    return "\"[unknown]\"";
                }
                if (typeof str === "string") {
                    return "\"" + strLine(str) + "\"";
                } else {
                    try {
                        //Fix [object]
                        this.parse(String(str));

                        return String(str);
                    } catch (e) {
                        if (!str.toString) {
                            return "\"["+typeof(str)+"]\"";
                        } else {
                            return "\""+String(str)+"\"";
                        }
                    }
                }
            }
        };
    }

    var extend = function () {
        var a = arguments[0];
        for (var i = 1, len = arguments.length; i < len; i++) {
            var b = arguments[i];
            for (var prop in b) {
                a[prop] = b[prop];
            }
        }
        return a;
    };

    var handlers = {
        postMessage: function () {
            var self = this,
                dispatch = function (e) {
                    var data = window.JSON.parse(e.data);

                    if (data.type) {
                        pm.trigger({
                            data: data,
                            origin: e.origin,
                            source: e.source
                        });
                    }
                };

            this.send = function (target, data, origin) {
                data = window.JSON.stringify(data);
                target.postMessage(data, origin);
            };

            if (window.addEventListener) {
                window.addEventListener("message", dispatch, false);
            } else if (window.attachEvent) {
                window.attachEvent("onmessage", dispatch);
            }
        },
        opener: function () {
            var self = this;
            var curOrigin = window.location.protocol + '//' + window.location.host;
            var postMessage = [];
            var dispatch = function (params) {
                //real document
                try {
                    if (params.source.window.document && params.source.window.document != document) {
                        params.source.window.document.domain = 'unknownhost';
                        console.warn('Error document, not real.');
                    }
                    return;
                } catch (e) {
                }

                if (params.origin != '*' && params.origin.replace(/\//g, '') != curOrigin.replace(/\//g, '')) {
                    return;
                }

                pm.trigger({
                    data: window.JSON.parse(params.data),
                    origin: params.source.origin,
                    source: params.source.window
                });
            };

            var c = setInterval(function () {
                if (window.opener && window.opener.postMessage) {
                    var pmData = window.opener.postMessage;
                    for (var i = 0; i < pmData.length;) {
                        if (pmData[i].target == window) {
                            dispatch(pmData.splice(i, 1)[0]);
                        } else i++;
                    }
                }
            }, 100);

            this.send = function (target, data, origin) {
                postMessage.push({
                    source: {
                        window: window,
                        origin: curOrigin
                    },
                    data: window.JSON.stringify(data),
                    origin: origin,
                    target: target
                });
                try {
                    target.opener = {postMessage: postMessage};
                } catch (e) {
                    console.warn("Target not support \"opener.postMessage\";" + e.message);
                }
            };
        },
        hash: function () {
            //todo hash hack
        }
    };

    var handler = new handlers[window.postMessage ? 'postMessage' : 'opener']();

    var events = {}, eventTick = 0;
    var pm = {
        handler: handler,
        defaults: {
            target: null, /* target window (required) */
            type: null, /* message type (required) */
            data: null, /* message data (required) */
            callback: null, /* call callback (optional) */
            complete: null, /* complete callback (optional) */
            origin: "*"    /* postmessage origin (optional) */
        },
        send: function (argType, argTarget, argData, argOptions) {

            var options = {};
            if (typeof argType == 'object') {
                options = argType;
            } else {
                options = extend({
                    type: argType,
                    target: argTarget,
                    data: argData
                }, argOptions);
            }
            var o = extend({}, pm.defaults, options),
                target = o.target, id = ++eventTick;
            if (!o.target || !o.type) {
                throw new Error("Arguments [target,type] required");
            }

            o.callback && this.bind('postMessage.callback.' + id, function (e) {
                if (e.source == o.target) {
                    o.callback.apply(e, e.data);
                }
            }, true);
            o.complete && this.bind('postMessage.complete.' + id, function (e) {
                if (e.source == o.target) {
                    o.complete.call(e, e.data);
                }
            }, true);

            handler.send(target, {
                data: o.data,
                type: o.type,
                callback: o.callback ? true : false,
                complete: o.complete ? true : false,
                id: id
            }, o.origin || '*');
            return id;
        },

        bind: function (type, fn, once) {
            events[type] = events[type] || [];
            events[type].push([function (msg) {
                var data = msg.data,
                    callback = function () {
                        msg.callback && handler.send(msg.source, {
                            data: Array.prototype.slice.call(arguments),
                            type: 'postMessage.callback.' + msg.id
                        }, msg.origin);
                    },
                    rs = fn.call(this, {
                        data: data,
                        source: msg.source,
                        origin: msg.origin,
                        callback: callback
                    });

                msg.complete && handler.send(msg.source, {
                    data: rs,
                    type: 'postMessage.complete.' + msg.id
                }, msg.origin);
            }, once]);
        },
        one: function (type, fn) {
            this.bind(type, fn, true);
        },
        trigger: function (e) {
            e.data.origin = e.origin;
            e.data.source = e.source;
            if (events[e.data.type]) {
                for (var i = 0; i < events[e.data.type].length; i++) {
                    events[e.data.type][i][0](e.data);
                    if (events[e.data.type][i][1]) {
                        events[e.data.type].splice(i, 1);
                    }
                }
            }
        }
    };

    return pm;
});
