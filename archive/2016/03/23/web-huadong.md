有时候，我们希望在网页中添加一些滑动事件，以改善最终用户的体验，例如，手势翻页、幻灯片、滑条等。在前端开发中，或许我们可以找到一些事件或对应的脚本库来实现。然而，如果希望实现一个全功能型的通用滑动支持事件机制，该如何是好呢？为了理清思路，我们先约定好我们的目标，如下列表所述。

- 可以绑定到某一个 DOM 元素上。
- 支持向上、下、左、右四个方向的翻动事件定制。
- 可以设定触发上述事件的水平和垂直滑动时的最小距离。
- 任意移动操作的相关事件。

于是，我们将用 JavaScript 语言来实现这一切。

## 接口

很显然，我们可以定义一下函数，需要传入待绑定的 DOM 元素，以及一个选项设置参数，用于定义行为。该方法将返回一个对象，可以用于取消相关事件的注册。

```javascript
function addSlide(element, options) {
    // ToDo: Implement it.
    return null;
}
```

而关于这个选项设置参数，我们将提供如下定义支持。

- `minX`，可选，整数型。
最小水平移动距离，以像素为单位。只有超出这个值，才有可能会触发向左或向右的翻动事件。
- `minY`，可选，整数型。
最小垂直移动距离，以像素为单位。只有超出这个值，才有可能会触发向上或向下的翻动事件。
- `turnUp(ele, y)`，可选，函数，无返回值。
向上翻动的事件定义。
第一个参数为绑定的元素，第二个参数为向上滑动的距离。这两个参数会被自动传入。
- `turnRight(ele, x)`，可选，函数，无返回值。
向右翻动的事件定义。
第一个参数为绑定的元素，第二个参数为向右滑动的距离。这两个参数会被自动传入。
- `turnDown(ele, y)`，可选，函数，无返回值。
向下翻动的事件定义。
第一个参数为绑定的元素，第二个参数为向下滑动的距离。这两个参数会被自动传入。
- `turnLeft(ele, x)`，可选，函数，无返回值。
向做翻动的事件定义。
第一个参数为绑定的元素，第二个参数为向左滑动的距离。这两个参数会被自动传入。
- `moveStart(ele)`，可选，函数，无返回值。
当滑动操作开始时会自动触发。
其中的参数为绑定的元素。该参数会被自动传入。
- `moveEnd(ele, x, y)`，可选，函数，无返回值。
当滑动操作结束时会自动触发。
第一个参数为绑定的元素，第二个参数为水平滑动的距离，第三个参数为垂直滑动的距离。这三个参数会被自动传入。
- `moving(ele, x, y)`，可选，函数，无返回值。
当正在滑动时会自动触发。可用于放入滑动操作过程中的视觉变化效果。
第一个参数为绑定的元素，第二个参数为水平滑动的距离，第三个参数为垂直滑动的距离。这三个参数会被自动传入。

有了这些定义，我们便可以开始实现了。我们将之前写的那个方法进行修改，在方法体内的最前面，加入以下校验机制，以判断传入的参数是否不为空。然后，获取需要绑定的 DOM 元素。

```javascript
if (!options || !element)
    return {
        dispose: function () { }
    };
 
var ele = !!element && typeof element === "string" ? document.getElementById(element) : element;
if (!ele) return {
    dispose: function () { }
};
```

我们已经准备好了以下基本代码，现在要开始实现触控手势支持。

## 触控

触控包括通过使用手指、笔和其它类型的触控输入方式进行输入。添加触控手势支持，我们需要先了解浏览器对此的事件处理机制。

1. 当开始进行触碰时，会产生一个触控开始的事件。
2. 当触控进行中时，会由一系列连续不断的触控移动的事件被触发。
3. 当离开触屏时，会产生一个触控结束的事件。

因此，我们将会基于这些已有的基本事件开始我们的实现。对于触碰开始事件，我们需要记录下触碰点的坐标信息。

```
var start = null;
var touchStart = function (ev) {
    start = {
        x: ev.targetTouches[0].pageX,
        y: ev.targetTouches[0].pageY
    };
    if (!!options.moveStart)
        options.moveStart(ele);
};
ele.addEventListener("touchstart", touchStart, false);
```

当触控进行中时，我们可以通过不停地计算当前触碰点的坐标与开始时所记录的值的差值，得出移动的距离，从而执行注册的方法。

```javascript
var touchMove = !!options.moving
    ? function (ev) {
        var point = ev.touches ? ev.touches[0] : ev;
        if (!point) return;
        var coor = {
            x: point.pageX - start.x,
            y: point.pageY - start.y
        };
        options.moving(ele, coor.x, coor.y);
    }
    : null;
if (!!touchMove)
    ele.addEventListener("touchmove", touchMove, false);
```

在结束的时候，我们需要用同样方式获取最终位移了多远。与此同时，我们还要根据选项设置里的最小水平和垂直距离，已经实际操作过程中的水平与垂直平移的差值，来推算出是否触发了预定义的某个方向（上下左右中的一个）的翻动操作。

```javascript
var moved = function (x, y) {
    var isX = !y || (Math.abs(x) / Math.abs(y) > (minX + 0.01) / (minY + 0.01));
    if (isX) {
        if (x > minX && !!options.turnLeft)
            options.turnLeft(ele, x);
        else if (x < -minX && !!options.turnRight)
            options.turnRight(ele, -x);
    } else {
        if (y > minY && !!options.turnUp)
            options.turnUp(ele, y);
        else if (y < -minY && !!options.turnDown)
            options.turnDown(ele, -y);
    }
 
    if (!!options.moveEnd)
        options.moveEnd(ele, x, y);
};
```

现在，我们将这个注册到触控结束的事件中去。

```javascript
var touchEnd = function (ev) {
    if (start == null) return;
    var x = ev.changedTouches[0].pageX - start.x;
    var y = ev.changedTouches[0].pageY - start.y;
    start = null;
    moved(x, y);
};
ele.addEventListener("touchend", touchEnd, false);
```

除了触控手势支持，鼠标拖拽自然也不能少。

## 鼠标拖拽

针对鼠标拖拽的支持，我们还需要做一些准备工作。我们需要有一套方案来获得当前鼠标的位置，具体方案如下。

1. 先看看事件参数中是否包含了当前鼠标所处的坐标。如果有，那么好极了，我们直接用；否则继续下一步操作。
2. 获取当前页面滚动的位置，以及鼠标相对于页面可视区域的位置，然后相加。

另外，作为一个与本文主题无关的改进，你也可以增加获得触控时的位置，可通过获取事件参数来获得。
最终代码如下，我们将其封装成一个函数。

```javascript
/**
  * Gets the position of the mouse in document.
  */
function getMousePosition() {
    // Resolve mouse position.
    var x = event.pageX || (event.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft));
    var y = event.pageY || (event.clientY + (document.documentElement.scrollTop || document.body.scrollTop));
 
    // Resolve touch position.
    var evTouches = event.touches;
    if (!!evTouches && !!evTouches.length && evTouches.length > 0 && !!evTouches[0]) {
        if (isNaN(x) || x == null)
            x = evTouches[0].pageX;
        if (isNaN(y) || y == null)
            y = evTouches[0].pageX;
    } else {
        evTouches = event.changedTouches;
        if (!!evTouches && !!evTouches.length && evTouches.length > 0 && !!evTouches[0]) {
            if (isNaN(x) || x == null)
                x = evTouches[0].pageX;
            if (isNaN(y) || y == null)
                y = evTouches[0].pageX;
        }
    }
 
    // Return result as a coordinate.
    return { x: x, y: y };
}
```

好了，让我们回到一开始写的添加滑动事件的函数。

```javascript
function addSlide(element, options) {
    // Validate arguments...
    // Resolve element...
    // Touch supports...
 
    // ToDo: Implement it.
    return null;
}
```

我们需要继续实现鼠标拖拽支持。
首先，还是让我们了解一下浏览器对鼠标拖拽的事件响应机制。

1. 触发一个鼠标按下事件。
2. 触发一系列的鼠标移动事件。
3. 触发一个鼠标按键松开事件。

这整个流程会在最终用户按住鼠标直至松开时所触发的。因此，我们可以了解到，一切都是基于鼠标按下开始。所以，我们要实现的功能都在这里面。当然，这其中也包括，在按下鼠标按键时，要先记录下当前鼠标所在位置。

```javascript
var mouseDown = function (ev) {
    var mStartP = getMousePosition();
 
    // ToDo: Implement it.
};
ele.addEventListener("mousedown", mouseDown, false);
```

在获取位置后，我们要注册鼠标移动时的事件了。

```javascript
var mouseMove = function (ev) {
    var mCurP = getMousePosition();
    var x = mCurP.x - mStartP.x;
    var y = mCurP.y - mStartP.y;
    options.moving(ele, x, y);
};
document.body.addEventListener("mousemove", mouseMove, false);
```

在松开鼠标按键时，我们需要调用滑动结束和翻动的方法。同时，我们还需要注销这两个鼠标移动和鼠标按键松开的事件；否则，松开鼠标按键后依然还会触发这些事件，这就不是我们期待的了。为了能够实现这一点，我们需要一个事件列表，然后实现一个方法去执行这个列表，在执行前，把所有事件都放进去，包括注销。

```javascript
var mouseUpHandlers = [];
var mouseUp = function (ev) {
    mouseUpHandlers.forEach(function (h, hi, ha) {
        h(ev);
    });
};
mouseUpHandlers.push(
    function () {
        document.body.removeEventListener("mousemove", mouseMove, false);
    },
    function () {
        document.body.removeEventListener("mouseup", mouseUp, false);
    },
    function (ev) {
        var mCurP = getMousePosition();
        var x = mCurP.x - mStartP.x;
        var y = mCurP.y - mStartP.y;
        moved(x, y);
    }
);
document.body.addEventListener("mouseup", mouseUp, false);
```

鼠标的拖拽也完成了，我们接下来还要完成注销滑动事件的功能。

## 完成

现在我们来处理返回值，这将是一个包含能够注销滑动事件的方法的对象。

```javascript
return {
    dispose: function () {
        // Remove touch events.
        ele.removeEventListener("touchstart", touchStart, false);
        if (!!touchMove)
            ele.removeEventListener("touchmove", touchMove, false);
        ele.removeEventListener("touchend", touchEnd, false);
 
        // Remove mouse event.
        ele.removeEventListener("mousedown", mouseDown, false);
    }
};
```

至此，大功告成！我们来看一下最终代码。

```javascript
/**
  * Adds gesture handlers.
  * @param element  the target element.
  * @param options  the options.
  */
function addSlide(element, options) {
    if (!options || !element) return {
        dispose: function () { }
    };
 
    // Get the element.
    var ele = !!element && typeof element === "string" ? document.getElementById(element) : element;
    if (!ele) return {
        dispose: function () { }
    };
 
    // Get the minimum moving distances.
    var minX = options.minX;
    var minY = options.minY;
    if (minX == null || minX < 0) minX = 1;
    minX = Math.abs(minX);
    if (minY == null || minY < 0) minY = 1;
    minY = Math.abs(minY);
 
    // The handler occured after moving.
    var moved = function (x, y) {
        var isX = !y || (Math.abs(x) / Math.abs(y)
            > (minX + 0.01) / (minY + 0.01));
        if (isX) {
            if (x > minX && !!options.turnLeft)
                options.turnLeft(ele, x);
            else if (x < -minX && !!options.turnRight)
                options.turnRight(ele, -x);
        } else {
            if (y > minY && !!options.turnUp)
                options.turnUp(ele, y);
            else if (y < -minY && !!options.turnDown)
                options.turnDown(ele, -y);
        }
 
        if (!!options.moveEnd)
            options.moveEnd(ele, x, y);
    };
 
    // Touch starting event handler.
    var start = null;
    var touchStart = function (ev) {
        start = {
            x: ev.targetTouches[0].pageX,
            y: ev.targetTouches[0].pageY
 
        };
        if (!!options.moveStart)
            options.moveStart(ele);
    };
    ele.addEventListener("touchstart", touchStart, false);
 
    // Touch moving event handler.
    var touchMove = !!options.moving
        ? function (ev) {
            var point = ev.touches ? ev.touches[0] : ev;
            if (!point) return;
            var coor = {
                x: point.pageX - start.x,
                y: point.pageY - start.y
            };
            options.moving(ele, coor.x, coor.y);
        }
        : null;
    if (!!touchMove)
        ele.addEventListener("touchmove", touchMove, false);
 
    // Touch ending event handler.
    var touchEnd = function (ev) {
        if (start == null) return;
        var x = ev.changedTouches[0].pageX - start.x;
        var y = ev.changedTouches[0].pageY - start.y;
        start = null;
        moved(x, y);
    };
    ele.addEventListener("touchend", touchEnd, false);
 
    // Mouse event handler.
    var mouseDown = function (ev) {
        // Record current mouse position
        // when mouse down.
        var mStartP = getMousePosition();
 
        // Mouse moving event handler.
        var mouseMove = function (ev) {
            var mCurP = getMousePosition();
            var x = mCurP.x - mStartP.x;
            var y = mCurP.y - mStartP.y;
            options.moving(ele, x, y);
        };
        document.body.addEventListener("mousemove", mouseMove, false);
 
        // Mouse up event handler.
        // Need remove all mouse event handlers.
        var mouseUpHandlers = [];
        var mouseUp = function (ev) {
            mouseUpHandlers.forEach(function (h, hi, ha) {
                h(ev);
            });
        };
        mouseUpHandlers.push(
            function () {
                document.body.removeEventListener("mousemove", mouseMove, false);
            },
            function () {
                document.body.removeEventListener("mouseup", mouseUp, false);
            },
            function (ev) {
                var mCurP = getMousePosition();
                var x = mCurP.x - mStartP.x;
                var y = mCurP.y - mStartP.y;
                moved(x, y);
            }
        );
        document.body.addEventListener("mouseup", mouseUp, false);
    };
    ele.addEventListener("mousedown", mouseDown, false);
 
    // Return a disposable object
    // for removing all event handlers.
    return {
        dispose: function () {
            // Remove touch events.
            ele.removeEventListener("touchstart", touchStart, false);
            if (!!touchMove)
                ele.removeEventListener("touchmove", touchMove, false);
            ele.removeEventListener("touchend", touchEnd, false);
 
            // Remove mouse event.
            ele.removeEventListener("mousedown", mouseDown, false);
        }
    };
}
```

## 测试

现在我们来进行一个测试。假设有这样一个 DOM 元素。

```html
<div id="demo_gesture">
    <div id="demo_gesture_fore">
         &nbsp;
    </div>
</div>
```

样式如下。

```css
#demo_gesture {
    max-width: 800px;
    height: 20px;
    background-color: #EEE;
    border: 1px solid #CCC;
    border-radius: 10px;
    position: relative;
    overflow: hidden;
}
#demo_gesture > #demo_gesture_fore {
    color: #CCC;
    text-align: center;
    width: 20px;
    height: 20px;
    background-color: #CCC;
    border-radius: 10px;
    position: absolute;
    top: 0;
    left: 0;
    overflow: hidden;
    cursor: pointer;
}
```

当文档元素加载完后，我们执行以下代码。

```javascript
var adjustPosition = function (ele, x) {
    x = (ele.position || 0) + x;
    if (x < 0)
        x = 0;
    else if (x > ele.parentElement.offsetWidth - ele.offsetWidth)
        x = ele.parentElement.offsetWidth - ele.offsetWidth;
    ele.style.left = x + "px";
    return x;
};
addSlide("demo_gesture_fore", {
    moving: function (ele, pos) {
        adjustPosition(ele, pos.x);
    },
    moveEnd: function (ele, pos) {
        ele.position = adjustPosition(ele, pos.x);
    }
});
```

这个测试页面创造一个水平的滑动模块。你也可以用这个创造更多滑动组件出来。