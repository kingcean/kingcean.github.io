在许多场景中，我们可能会遇到需要处理一种快速多次触发某事件，并处于某种阈值时，执行某一指定操作。例如，双击（即快速按鼠标左键两次）或更多击、连按键盘某键、某方法被执行数次等。其中，双击有对应的事件可以注册；然而，更多的情况是没有的类似事件方便我们注册使用的。那么，现在只能依靠我们勤劳的双手，来创造一个支持该功能的任务，并且该任务需要具有以下功能。

- 可以在任务中绑定一个方法，以便在暴击后被调用。
- 该任务可以被多次执行，包括也可以在已知事件中触发。
- 只有当任务在短时间内执行到指定次数后，所注册的方法才会被调用。
- 当短时间内执行了过多的次数，所注册的方法将不再被调用。
- 短时间的界定方式是，通过指定一个连续两次任务执行间隔的最长时间，来进行控制。

那么，这该如何实现呢？

首先，我们需要定义一个函数，其接受一个用于设置选项的参数，该函数的作用是生成一个任务，该任务实际上应该也是一个函数，并接受一个可选的参数，用来传递额外的信息给绑定的方法，然后返回一个布尔值来指示当前的执行是否调用了绑定的方法。

```javascript
function multipleHit(options) {  
    // ToDo: Implement it.  
    return null;  
}
```

这个选项参数应当包含以下方法和属性。

- `process` 方法，即该任务所绑定的方法。
包含两个参数：第一个是整数型，表示第几次执行；第二个参数可选，任意类型，可用于接受在任务执行时，所传入的额外参数。
该方法无返回值。
- `start` 属性，可选，整数型，即短时间内第几次触发时调用任务中绑定的方法。
- `count` 属性，可选，整数型，即绑定的方法在一轮快速触发时最多可被调用多少次。
- `timeout` 属性，可选，整数型，即任意两次连续触发的最长时限，以微秒为单位。超出该时限后，几位另外一轮触发，计数器清零。
- `thisArg` 属性，可选，任意型，即所绑定方法在被调用时的 `this` 参数。
很明显，当 `start` 为被设置或被设置为0，并且 `count` 属性未被设置时，所绑定的任务不会被执行次数限制。于是我们可以在 `multipleHit` 函数中进行以下改写。

```javascript
if (!options.start && options.count == null) {  
    return function (modelArg) {  
        options.process.call(options.thisArg, 0, modelArg);  
        return true;  
    };  
}
```

而除此以外，我们至少需要加上计时器和最近一次执行的时间记录了。

```javascript
var count = 0;  
var time = null;
```

那么，理论上，由此该返回以下函数。

```javascript
return function (modelArg) {  
    options.process.call(options.thisArg, count - 1, modelArg);  
    return true;  
};
```

显然，在上述返回的函数中，在调用该绑定的方法前，我们应当先校检查上次执行的时间，以确定是否应该执行，同时记录本次执行的时间。

```javascript
var timespan = time != null ? new Date().getTime() - time.getTime() : null;  
time = new Date();  
if (timespan == null || timespan > options.timeout) {  
    count = 1;  
    return false;  
}
```

同理，对本轮执行的次数也需要检验和递增。

```javascript
count++;  
var start = !!options.start ? options.start : 0;  
if (count < start || (options.count != null && options.count <= count - start)) return false;
```

最后，别忘了在函数前加上为空判断。

```javascript
if (!options || !options.process || options.count === 0) return null;
```

于是，我们就得到了以下代码。

```javascript
/** 
  * Generates a multiple hit task. 
  * @param options  The options to load. 
  */  
function multipleHit(options) {  
    if (!options || !options.process || options.count === 0) return null;  
    if (!options.start && options.count == null) {  
        return function (modelArg) {  
            options.process.call(options.thisArg, 0, modelArg);  
            return true;  
        };  
    }  
   
    var count = 0;  
    var time = null;  
    return function (modelArg) {  
        var timespan = time != null ? new Date().getTime() - time.getTime() : null;  
        time = new Date();  
        if (timespan == null || timespan > options.timeout) {  
            count = 1;  
            return false;  
        }  
   
        count++;  
        var start = !!options.start ? options.start : 0;  
        if (count < start || (options.count != null && options.count <= count - start)) return false;  
        options.process.call(options.thisArg, count - 1, modelArg);  
        return true;  
    };  
}
```

现在我们来测试一下。把以下代码放到页面加载之后。

```javascript
var task = multipleHit({  
    timeout: 300,  
    start: 3,  
    count: 100,  
    process: function (index, model) {  
        console.debug(index.toString() + " at " + model);  
    }  
});  
document.body.addEventListener("click", function (ev) {  
    task(new Date().toLocaleDateString());  
}, false);
```

当你在页面中快速点击，你会在浏览器控制台中看到，只有快速连击3以上才会显示记录，当出现了100次之后，就不会再有了，除非停一会儿，那就又重新开始计算了。
