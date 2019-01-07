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

    var extend = function () {
        var args = arguments, a = args[0];
        for (var i = 1, len = args.length; i < len; i++) {
            var b = args[i];
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
                    var data;
                    try {
                        data = window.JSON.parse(e.data);
                    } catch (ex) {
                        data = e.data;
                    }

                    if (data.type) {
                        pm.trigger({
                            data: data,
                            origin: e.origin,
                            source: e.source
                        });
                    }
                };

            self.send = function (target, data, origin) {
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

            setInterval(function () {
                if (window.opener && window.opener.postMessage) {
                    var pmData = window.opener.postMessage;
                    for (var i = 0; i < pmData.length;) {
                        if (pmData[i].target == window) {
                            dispatch(pmData.splice(i, 1)[0]);
                        } else i++;
                    }
                }
            }, 100);

            self.send = function (target, data, origin) {
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
            target: null,   /* target window (required) */
            type: null,     /* message type (required) */
            data: null,     /* message data (required) */
            callback: null, /* call callback (optional) */
            complete: null, /* complete callback (optional) */
            origin: "*"     /* postmessage origin (optional) */
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
