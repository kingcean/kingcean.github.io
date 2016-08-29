在 HTML 的世界里，我们经常需要对文档或是其中的 DOM 的大小进行了解和控制，比如说以下这些场景。

- 获取或设置某个 DOM 的尺寸。
- 获取窗口内容的尺寸。
- 获取整个文档的尺寸。
- 将某个 DOM 的宽度，与窗口内容或是其它 DOM 进行可定义的关联绑定。
- 将某个 DOM 的高度，与窗口内容或是其它 DOM 进行可定义的关联绑定。

那么，如果说需要一套完整的工具，来支持这些场景，该如何是好呢？好吧，我们先从获取尺寸开始。

## 获取大小

为了方便起见，我们定义返回值为一个 JSON 对象，其中包含 width 和 height 两个属性，均为数字型，以表示宽度和高度。接下来，我们需要实现以下函数，并返回刚才定义的类型。

```javascript
function getSize(element) {  
    if (!element) return null;  
   
    // ToDo: Implement it.  
    return null;  
}
```

在这个函数里，传入参数 element 我们认为可能会是以下任意一种情形。

- 字符串，表示某一 DOM 的 ID。
- 网页文档元素。
- 窗口元素（即 window 对象）。
- 某一 body 内的 DOM 元素。

为此，我们开始逐一实现。针对字符串，我们先尝试着获取一下它对应的 DOM。

```javascript
if (typeof element === "string")  
    element = document.getElementById(element);  
if (!element) return null; 
```

当然，你也可以把这个改成 query 而非 ID 的方式来获取。然后，针对文档，可以考虑测试以下属性。

- 如果有 body 属性，则可能为 HTML 文档对象。
- 如果有 documentElement 属性，则可能为 XML 文档对象。

然后再尝试获取其尺寸。

```javascript
if (element.body || element.documentElement) {  
    var bodyWidth = !!document.body ? document.body.scrollWidth : 0;  
    var documentWidth = !!document.documentElement ? document.documentElement.scrollWidth : 0;  
    var bodyHeight = !!document.body ? document.body.scrollHeight : 0;  
    var documentHeight = !!document.documentElement ? document.documentElement.scrollHeight : 0;  
    return {  
        width: bodyWidth > documentWidth ? bodyWidth : documentWidth,  
        height: bodyHeight > documentHeight ? bodyHeight : documentHeight  
    }  
}
```

而对于窗口元素（即 window 对象），其实只要判断有没有 parent 属性就好了。不过在获取宽度和高度的时候，需要进行一些兼容性处理。

```javascript
if (element.parent) {  
    return {  
        width: document.compatMode == "CSS1Compat" ? document.documentElement.clientWidth : document.body.clientWidth,  
        height: document.compatMode == "CSS1Compat" ? document.documentElement.clientHeight : document.body.clientHeight  
    };  
}
```

那么剩下的，我们就认为应该是 body 内的 DOM 元素对象了。

```javascript
return {  
    width: element.offsetWidth,  
    height: element.offsetHeight  
};
```

由此，获取部分就搞定了！接下来是对 DOM 元素的宽度和高度的设置了。

## 设置大小

我们预计会实现一个函数，允许传入3个参数，即该 DOM 元素、宽度和高度。其中，宽度或高度若为空，我们就认为不对其设置，否则的话，我们支持数字和字符串两种形式。因此有了一下初始化代码。

```javascript
function setSize(element, width, height) {  
    if (!element) return null;  
   
    // ToDo: Implement it.  
    return null;  
}
```

同样，对于参数 element 为字符串的情形，我们先做一个处理。

```
var ele = typeof element === "string" ? document.getElementById(element) : element;  
if (!ele) return null;
```

然后，我们开始实现对宽度的设置。我们可以简单的通过对内联样式的设置来实现。

```javascript
if (width != null) ele.style.width = typeof width === "string" ? width : (width.toString() + "px");
```

同理，高度设置也是如此。

```javascript
if (height != null) ele.style.height = typeof height === "string" ? height : (height.toString() + "px");
```

最后返回设置后的尺寸。

```javascript
return {  
    width: ele.offsetWidth,  
    height: ele.offsetHeight  
};
```

如此就完成了。

## 绑定宽度

我们已经拥有了获取和设置大小的通用方法了，接下来，我们还想提供一项服务，即绑定大小。先以宽度来说吧，如果我们需要把宽度，和窗口的宽度或另一 DOM 元素的宽度进行绑定，我们需要一个函数，允许传入这两个元素，外加一个可选的计算函数，方便自定义控制，然后这个我们即将实现的函数，还需要返回一个对象，里面包含 dispose 方法，用于随时解除这个绑定关系。那么，这个函数可能长成下面这个样子。

```javascript
function adaptWidth(element, target, compute) {  
   
    // ToDo: Implement it. 下一行即将被删除并被重写。  
    return null;  
}
```

现在我们开始实现之。先做个参数为空的校验吧！

```javascript
if (!element || !target) return {  
    dispose: function () { }  
};
```

接下来，我们需要实现一个匿名函数，用于设置宽度。

1. 检查 target 是 window 对象还是 body 内的某一 DOM 对象。
2. 获取 target 当下的宽度。
3. 如果 compute 函数存在的话，使用它进行数值转化。
4. 对 element 设置宽度。

代码如下。

```javascript
var setWidth = function () {  
    var width = target.parent ? (window.innerWidth ? window.innerWidth : document.body.clientWidth) : target.offsetWidth;  
    if (!!compute) width = compute(width);  
    setSize(element, width, null);  
};
```

然后我们立即调用这个匿名函数。

```javascript
setWidth();
```

然而，这只是在调用我们写的这个函数时才会执行一次，对于在此之后的页面变化，并不会重新触发。因此，我们还需要针对这种情况，进行后续跟进，即，当 target 的尺寸发生变化时，我们也需要重新调用这个匿名函数，故需要增加一个事件。

```javascript
target.addEventListener("resize", setWidth, false);
```

并返回接触绑定的令牌对象。

```javascript
return {  
    dispose: function () {  
        target.removeEventListener("resize", setWidth, false);  
    }  
};
```

如此，宽度的绑定即完成了。

## 绑定高度

同理，绑定高度也是如此。

```javascript
function adaptHeight(element, target, compute) {  
   
    // 参数为空检查。  
    if (!element || !target) return {  
        dispose: function () { }  
    };  
   
    // 高度设定的匿名函数。  
    var setHeight = function () {  
        var height = target.parent ? (window.innerHeight ? window.innerHeight : document.body.clientHeight) : target.offsetHeight;  
        if (!!compute) height = compute(height);  
        setSize(element, null, height);  
    };  
   
    // 调用高度设定。  
    setHeight();  
   
    // 添加一个事件，用于监听变动，并重新设定高度。  
    target.addEventListener("resize", setHeight, false);  
   
    // 返回一个能够取消绑定的对象。  
    return {  
        dispose: function () {  
            target.removeEventListener("resize", setHeight, false);  
        }  
    };  
}
```

啊哈，一切都搞定了！
