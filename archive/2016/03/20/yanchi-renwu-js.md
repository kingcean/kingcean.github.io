我们经常会遇到一种情况，在带有智能提示的文本框，在输入内容时，会实时或准实时弹出提示下拉框，里面包含系统猜测你可能要输入的内容。当这些搜索建议来自服务器的时候，有时你会觉得这种智能提示对服务器的负载有点大，毕竟但用户输入完一定内容之前，会产生多余的流量和服务器运算，在此过程中所产生的结果甚至用户根本不会留意，因此还不如忽略掉这期间的过程。

那么，如何做到这一点呢？

延迟合并处理任务应运而生。其实，不光前面所说的这个场景，还有许多情况也会需要应用到这种类型的任务。该任务满足一下几点功能条件。

- 可以创建一个任务方法，里面会包含注册的业务方法。任务方法用于在需要延迟调用业务方法的地方调用，后续的延迟与合并操作会由任务方法自动处理。
- 在任务方法执行时，会在延迟一段时间后才执行所注册的业务方法。
- 任务方法可以在不同地方分别调用多次。
- 当上一个任务方法的延迟时限还没到时，如果下一个任务方法被调用，那么上一个任务方法会被终止，也即此时只会在最后一个任务方法中经过延迟一段时间后调用业务方法。此乃置后合并是也，用于过滤掉前面的多余执行。

好了，我们要开始实现了。出于让使用者感觉简单的目的，我们把方法设计成以下这样。

```javascript
function delay(options) {  
    // ToDo: Implement it.  
    return null;  
}
```

返回一个方法，即任务方法，方法允许传入一个可选的参数，该参数会传入业务方法。而在上面这段代码中，其函数签名里的 options 参数用于指定一些自定义选项，必填，是一个 JSON 对象，可以包含以下几个属性和方法。

- `process` 方法，即业务方法本身，必填，无返回值，可包含一个入口参数，该参数会被自动填写，来自于前面所述的任务方法中传入参数。
- `delay` 属性，整数型，可选，用于指定延迟时间，以毫秒做单位。
- `thisArg` 属性，对象型，可选，用于指定当业务方法调用时，`this` 指向谁。

好了，有了这些就好办了，于是我们可以像下面这样实现刚才那个方法。

```javascript
return function (modelArg) {  
    setTimeout(function () {  
        options.process.call(options.thisArg, modelArg);  
    }, options.delay != null ? options.delay : 0);  
};
```

可是，这样只起到了延时，而没有做到自动合并多余项，并只保留最后一个延时请求。为了解决这个问题，我们需要引入一种新的机制，即在执行延时操作之前，先约定一个唯一编号，存储在两份地方：一份记录在任务里面，该绑定记录在该任务的多次执行过程中是共享的；另一份跟随该次任务方法执行，被带到延时回调中去。而等到延时操作执行时，先检测任务里绑定的这个编号与之前约定的是否相符，如果是一致的，那么久继续执行，否则说明有一个新的任务方法被调用了，如下代码所示，我们先加了一个绑定到任务的编号，以及一个回调方法，支持将约定的变量传递过来，当然，还有前面说的 modelArg 也要带上。

```javascript
var token = 0;  
var handler = function (modelArg, testToken) {  
    if (testToken !== token) return;  
    options.process.call(options.thisArg, modelArg);  
};
```

然后我们在此后执行编号的生成，如通过自增数字的形式，保证唯一。而前面描述的返回的任务方法，也改成调用上面的那个回调函数。

```javascript
return function (modelArg) {  
    token++;  
    setTimeout(handler, options.delay != null ? options.delay : 0, modelArg, token);  
};
```

如此一来，我们就搞定了这个需求。不过这样还不是很好，因为无论是否该阻止当前这次的业务方法执行，这个回调都会被执行到，虽然执行时会先检查状态，但如果我们在其为执行到之前，就把它干掉岂不更好？于是我们又做了如下改进，把上面的这个返回部分改成如下。

```javascript
var timeout;  
return function (modelArg) {  
    token++;  
    if (!!timeout)  
        clearTimeout(timeout);  
    timeout = setTimeout(  
        handler,  
        options.delay,  
        modelArg,  
        token);  
};
```

然后再加上为空校验，便形成了如下最终代码。

```javascript
/** 
  * Generates a delay task. 
  * @param options  The options to load. 
  */  
function delay(options) {  
    if (!options || !options.process)  
        return null;  
    var token = 0;  
    var timeout;  
    var handler = function (modelArg, testToken) {  
        timeout = null;  
        if (testToken !== token)  
            return;  
        options.process.call(options.thisArg, modelArg);  
    };  
    return function (modelArg) {  
        token++;  
        if (!!timeout)  
            clearTimeout(timeout);  
        timeout = setTimeout(handler, options.delay != null ? options.delay : 0, modelArg, token);  
    };  
}
```

现在，我们来测试一下。

```javascript
function delayTest() {  
    var task = OpenSamples.delay({  
        delay: 300,  
        process: function (model) {  
            console.debug(model);  
        }  
    });  
  
    // 间隔一小段时间执行一次，以进行测试。  
    setTimeout(function () {  
        task(new Date().toLocaleTimeString());  
        setTimeout(function () {  
            task(new Date().toLocaleTimeString());  
            setTimeout(function () {  
                task(new Date().toLocaleTimeString());  
            }, 200);  
        }, 200);  
    }, 200);  
  
    // 添加到点击事件中来进行测试。  
    document.body.addEventListener("click", function (ev) {  
        task(new Date().toLocaleTimeString());  
    }, false);  
}
```

你会发现，前面的时间间隔测试中，虽然执行了三次，但实际只会执行最后的那一次；而后面的点击测试中，如果你多次快速点击，只有这一批次中的最后一下会被记录，除非你某两次的点击间隔时常超过0.3秒，那么前面的那次也会被记录，因为这是两个批次。这说明一切运转如预期。
