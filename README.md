postmessage
===========

Simple `window.postMessage`, Support IE 6/7/8 (iframe)

`window.postMessage` 封装, 支持所有浏览器(包括 IE 6/7/8 (限 iframe))

Installation / 安装
-------------------

Using npm to install this package.

你可以使用 npm 安装

```bash
npm install @moln/postmessage --save
```

Or `yarn`(Recommend)

或者`yarn`(推荐)

```bash
yarn add @moln/postmessage -S
```

Methods / 方法列表
------------------

###  `pm.bind` 绑定事件

`pm.bind(string type, callback fn, bool once)`

类似 `jQuery.fn.bind()`

### `pm.one` 绑定一个一次性事件

`pm.one(string type, callback fn)` 绑定一个一次性事件

类似 `jQuery.fn.one()`

### `pm.send` 发送消息

`pm.send(string type, Window/HTMLIFrameElement target, any postData, object options)`

向目标窗口或frame对象发送消息 

#### `options` 选项列表

```javascript
options = {
    callback: function () {}, //触发对象执行的回调
    complete: function () {}, //触发对象执行完成后的回调
    origin: '*'               //限制发送对象窗口的origin
};
```

Usage / 使用
--------------

见示例 [a.html](a.html) 和 [b.html](b.html)

访问方式 apache/nginx 指向 postmessage 目录

URL访问: http://127.0.0.2/postmessage/b.html

控制台中可看到结果. 