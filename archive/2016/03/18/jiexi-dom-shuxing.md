在设计一些设计页面应用时，特别是涉及到数据视图绑定或 Web Component 开发时，我们可能需要在 DOM 元素里设置一些，以存储一些信息。然而，这些存储在 DOM 属性里的值，可能形式较为复杂。一个常见的内置属性是 style，当然，浏览器会自动识别这个属性并作为样式的设定依据来进行处理。然而，如果我们也想自定义一些类似这样的 DOM 属性，我们通过常规的 DOM 访问所获取的值，却是一个字符串。但更多的情况下，我们更希望是一个 JSON 对象。

下面是一个可能的示例。

```html
<sample-input data-config="type: 'select', label: 'Gender', require: true, dropdown: [ 'Male', 'Female' ]">  
</sample-input>
```

我们想读取其中的 data-config 属性。

## 读取内容

假设我们给定一个传入的 DOM 和属性名，我们可以这么实现。

```javascript
function attr(element, name) {  
    var ele = !!element && typeof element === "string" ? document.getElementById(element) : element;  
    if (!ele || !ele.tagName || !name) return undefined;  
    var attrStr = ele.getAttribute(name);  
    return eval("({" + attrStr + "})");  
}
```

看似很轻松，如此就搞定了。最终函数返回的结果自然就如下所示了。

```javascript
{  
    type: 'select',  
    label: 'Gender',  
    require: true,  
    dropdown: ['Male', 'Female']  
}
```

可是，人们并非始终循规蹈矩。我们还希望能处理下面这种情况。

```html
<sample-input data-config="function () { return null; }">  
</sample-input>
```

我可能希望获得的是一个函数，显然上面的做法就挂了。因为外面多了一对大括号。同样，除了函数，里面直接是一个 JSON 对象也是不行的。

```html
<sample-input data-config="{ type: 'select', label: 'Gender', require: true, dropdown: [ 'Male', 'Female' ] }">  
</sample-input>
```

或者就直接是一个字符串、数字、布尔值、数组等等也都不行。那怎么办呢？把那个大括号去掉？不要这么简单粗暴，其实我们可以这么改。

1. 先进行为空判断。
2. 去掉左右的空格。
3. 检查是否存在大括号和冒号是否出现在某些位置上，以确定是否要保留那对最外面的大括号。

于是我们得到以下代码。

```javascript
if (!attrStr) return null;  
attrStr = attrStr.replace(/(^\s*)|(\s*$)/g, "");  
var indexA = attrStr.indexOf(":");  
var indexB = attrStr.indexOf("{");  
attrStr = indexA > 0 && (indexB < 0 || indexA < indexB) ? eval("({" + attrStr + "})") : eval("(" + attrStr + ")");
```

那简单的一组数据呢？

```html
<sample-input data-config="a;b;c">  
</sample-input>
```

好吧，我们还要做更多的判断和处理。

```javascript
if (indexA < 0 && indexB < 0 && attrStr.indexOf("=") < 0 && attrStr.indexOf("'") < 0 &&  
    attrStr.indexOf("\"") < 0 && attrStr.indexOf("(") < 0 && attrStr.indexOf(")") < 0 && attrStr.indexOf(" ") > 0) {  
    attrStr = attrStr.indexOf(";") >= 0 ? attrStr.split(";") : attrStr;  
}
```

嗯，貌似大功告成。等等，说好的绑定类型的呢？

```html
<sample-input data-config="{{dataConfig}}">  
</sample-input>
```

啊哈，你的要求还真多！一并满足你。

```javascript
if (attrStr.indexOf("{{") === 0 && attrStr.lastIndexOf("}}") === attrStr.length - 2 && attrStr.length > 4) {  
    attrStr = eval("(" + attrStr.substring(2, attrStr.length - 2) + ")");  
}
```

这下总该搞定了吧？嗯，是的，解决了各种情况。好了，我们回顾一下刚才写的，总结在一起，于是就变成了下面这样的一个函数。传入 DOM 元素和需要绑定的属性，我们就能解析其中的内容。

```javascript
/** 
  * Parses the specific attribute object of an element. 
  * @param element  the element to get attribute. 
  * @param name  the attribute name. 
  */  
function attr(element, name) {  
    var ele = !!element && typeof element === "string" ? document.getElementById(element) : element;  
    if (!ele || !ele.tagName || !name)  
        return undefined;  
    var attrStr = ele.getAttribute(name);  
    if (!attrStr)  
        return null;  
    attrStr = attrStr.replace(/(^\s*)|(\s*$)/g, "");  
    if (attrStr === "")  
        return null;  
    if (attrStr.indexOf("{{") === 0 && attrStr.lastIndexOf("}}") === attrStr.length - 2 && attrStr.length > 4) {  
        return eval("(" + attrStr.substring(2, attrStr.length - 2) + ")");  
    }  
    var indexA = attrStr.indexOf(":");  
    var indexB = attrStr.indexOf("{");  
    if (indexA > 0 && (indexB < 0 || indexA < indexB))  
        return eval("({" + attrStr + "})");  
    if (indexA < 0 && indexB < 0 && attrStr.indexOf("=") < 0 && attrStr.indexOf("'") < 0 &&  
        attrStr.indexOf("\"") < 0 && attrStr.indexOf("(") < 0 && attrStr.indexOf(")") < 0 && attrStr.indexOf(" ") > 0) {  
        return attrStr.indexOf(";") >= 0 ? attrStr.split(";") : attrStr;  
    }  
    return eval("(" + attrStr + ")");  
}
```

不过话说，人类难以获得100%的满足。虽然我们拥有一个这么强大的 DOM 属性解析器，但并不意味着我就停止于此。我还想有个更强大的东西，那就是能快速获取一些指定 DOM 属性值，甚至能在这些 DOM 属性值变更后，相关绑定的变量也被自动更新。这可怎么办呢？

## 映射属性

我们可以提供一个方法，提供一个 DOM 和一些想要获取的属性的名称，然后输出一个对象，这个对象包含一些属性，这些属性刚好就是那个 DOM 上的属性，当 DOM 上的那些属性更新后，对象上的属性也可以支持更新。由此，我们可以拥有一个更面向前端友好的方式去动态获取某个 DOM 节点上所关心的属性内容了。

听起来很棒，但怎么实现呢？废话不多说，我们赶快开始搞定这件事吧！

我们需要提供一个函数，输入的是一个 DOM 元素，以及一个字符串数组，数组里面放的是需要获取的 DOM 属性名称。在这个函数里面，我们需要先遍历所有想要获得的节点，并解析出来，然后做为属性绑定到输出对象上。

```javascript
function bindAttr(element, names) {  
    var ele = !!element && typeof element === "string" ? document.getElementById(element) : element as HTMLElement;  
    if (!ele || !ele.tagName || !names) return undefined;  
   
    var obj: any = {};  
    names.forEach(function (attrName, i, arr) {  
        var attr = attr(element, attrName);  
        obj[attrName] = attr;  
    });  
   
    return obj;  
}  
```

接下来，我们要开始实现监听事件，并且其本身所需处理的事情与上面的有一些类似，由此一来，当 DOM 中的属性值变化后，会实时反应到返回对象上对应的属性的。

```javascript
var listener = function (ev) {  
    var attrName = ev.attrName || ev.propertyName;  
    if (!attrName || !names || !names.some(function (name, ni, narr) {  
        return name === attrName;  
    })) return;  
    var attrObj = attr(element, attrName);  
    obj[attrName] = attrObj;  
};  
ele.addEventListener("DOMAttrModified", listener, false);
```

当然，这么做了之后，如果需要取消监听怎么办？于是我们想到可以在返回对象上加一个 dispose 方法来搞定；当然，你也可以取别的名字，但最好避免和 DOM 里可能会用到的属性名重名，也就是说前面加个下划线或者搞生僻一些；甚至是你可以把返回属性再包一层。但不管了，这里就用 dispose 方法来演示了。

```javascript
obj.dispose = function () {  
    ele.removeEventListener("DOMAttrModified", listener, false);  
};
```

好了，现在大功告成啦！或许你还可以再优化一下，比如我们加一个参数来控制是否需要监听变动什么的。最终，我们写好了如下完整函数。

```javascript
/** 
  * Binds the objects parsed from specific attributes of an element to an object as its properties. 
  * @param element  the element to get attribute. 
  * @param names  the attribute name list. 
  * @param loadOnce  true if just load once without attribute listening; otherwise, false. 
  */  
function bindAttr(element: HTMLElement | string, names: string[], loadOnce = false) {  
    var ele = !!element && typeof element === "string" ? document.getElementById(element) : element as HTMLElement;  
    if (!ele || !ele.tagName || !names) return undefined;  
   
    var obj: any = {};  
    names.forEach(function (attrName, i, arr) {  
        var attr = attr(element, attrName);  
        obj[attrName] = attr;  
    });  
   
    if (!loadOnce) {  
        var listener = function (ev) {  
            var attrName = ev.attrName || ev.propertyName;  
            if (!attrName || !names || !names.some(function (name, ni, narr) {  
                return name === attrName;  
            })) return;  
            var attrObj = attr(element, attrName);  
            obj[attrName] = attrObj;  
        };  
        ele.addEventListener("DOMAttrModified", listener, false);  
        obj.dispose = function () {  
            ele.removeEventListener("DOMAttrModified", listener, false);  
        };  
    }  
   
    return obj;  
}
```

有没有觉得特别棒？
