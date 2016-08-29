大家在进行前端开发的时候，想必都经常会接触到 Promise 对象类型，这在使用或基于 jQuery、Node.js 和 ES6 等的开发过程中会经常见到。Promise 对象通常被用来设定延迟和异步的计算，例如，当一个 AJAX 请求提出后，返回一个 Promise 对象，我们可以在这个对象里追增接下来要做到事情，而这些事情其实会等到这个 AJAX 请求结束后才会被执行，而非立即。所以，Promise 通常在具有以下特性的场景中使用。

- 我们预期一个操作会有结果，但由于这个操作本身需要耗费一定的时间，因此该操作在当下可能并未完成。
- 当该操作完成并成功时，会有通知，并可能会附带有运算结果。
- 当该操作失败时，会有通知，并可能会附带有出错信息。
- 当操作完成后，无论成功与否，都不会再重新返回到原先的运行中或其它任何状态。

## 使用方式

在 ES6 中，我们可以按照以下方式使用。

```javascript
var promise = new Promise(  
    function (resolve, reject) {  
        // 主要业务逻辑。  
        setTimeout(function () {  
            // 主要业务逻辑里的回调。  
            var now = new Date();  
            if (now.getSeconds() % 2 === 0)  
                // 切换为成功状态，并触发回调。  
                resolve(now);  
            else  
                // 切换为失败状态，并触发回调。  
                reject(now);  
        }, 1000);  
    });  
   
// 注册回调。  
promise.then(  
    function (value) {  
        // 成功时的回调。  
        console.debug("Success", value);  
    },  
    function (reasone) {  
        // 失败时的回调。  
        console.debug("Error", reasone);  
    });
```

这段代码，会创建一个 `Promise` 对象，并注册了一组回调（可以注册多组），以分别在其成功和失败时会触发指定的事件。而在 Promise 对象内注册的业务逻辑，则只是简单地制定在一秒钟后根据当前时间状况，确定是进入成功或失败的逻辑分支，并将结果或出错信息做为参数返回，触发刚才提及的那些回调。具体说来，当运行这段代码时，会按照以下步骤进行。

1. 首先，创建了一个 `Promise` 对象，里面的传入参数是一个函数，做为该 `Promise` 的主要业务逻辑。
2. 执行该传入函数，并为该函数传入两个参数，分别是成功和失败时的触发器。
3. 对 `Promise` 执行结束后的事件注册。可以注册多组事件，每组包括一个成功和一个失败，也可以是成功或失败的一个。这些事件组将按照先后顺序执行。
4. 主要业务逻辑的异步回调此时可能被执行到。
5. 主要业务逻辑可能会将当前状态切换为成功或失败，由此会自动调用该类注册的事件。
6. 在调用成功或失败的事件时，会按照注册的顺序来执行。如果在执行成功事件时发生错误，会调用对应的失败事件（如果有）。
7. 如果成功或失败时间中有返回值，则会自动创建下一个 `Promise` 对象，以便将延迟异步过程和对应的结果逐个传递下去。

说了这么多，我要开始研究如何实现该类了。

## 如何实现

既然说到这是一个类，那么，考虑到前面说的需求，我们先来看看其应该具备哪些方法和属性，以及看看构造函数是怎样的。

- 首先，需要一个构造函数，我们需要传入一个函数，即所需的主要业务逻辑，该函数可能是个运算量较大或等待时间较长的函数。该函数需要支持两个参数，分别是成功和失败时的触发器。每个触发器其实又是一个函数，并可接受可选的运算结果或出错信息。
- 其次，还需要一个成员方法，用于注册成功和失败的回调。该方法需要提供两个参数，即成功后的回调，和失败后的回调。这些回调当然也都是方法啦，并支持传入可选的参数，这些参数其实就是成功时的运算结果或失败时的出错信息。同时，这些回调也可以返回结果，这个结果将被用于自动生成下一个 `Promise` 对象，供之后继续传递。

于是乎，我们得到以下代码。为了便于从基本说明，以下代码均使用 ES5 书写。

```javascript
var Promise = function (executor) {  
    // ToDo: Implement it.  
};  
Promise.prototype.then = function (onfulfilled, onrejected) {  
    return Promise(function (resolve, reject) {  
        // ToDo: Implement it.  
    });  
};  
Promise.prototype.catch(onrejected) {  
    return this.then(null, onrejected);  
}
```

显然，我们还需要一些变量或字段来存储一些的信息。

- 状态信息，如进行中、成功、失败。
- 成功时的运算结果或失败时的出错信息。

因此，我们需要现在构造函数中初始化状态信息。

```javascript
this._state = null;
```

该值为布尔值，当为 `true` 时表示成功，`false` 时为失败，默认为 `null` 表示运行中。而成功或失败后的结果，我们后面预计使用 `this._value` 来存储。
我们已经大致拟定好了一个接口，现在要开始具体实现这些待实现的代码了。

## 具体实现

由于在构造函数中，传入的主要业务逻辑函数中，需要传入两个参数，即成功和失败的触发器，因此，我们先实现这两个触发器。那么，成功触发器里需要做一些什么呢？

1. 检查状态。如果当前不处于等待状态，则不做任何事情。
2. 检查传入的参数是不是该 Promise 自己，是的话是不支持的。
3. 将状态设置为执行成功，同时保存运算结果。
4. 唤起所有注册的成功事件。
5. 我们需要通过 try-catch 方式，将此时出错的情形，引导至失败的处理方式中去。

```javascript
Promise.prototype._resolve = function (value) {  
    if (this._state !== null) return;  
    if (value === this) throw new TypeError('A promise cannot be resolved with itself.');  
   
    this._state = true;  
    this._value = value as T;  
   
    // ToDo: 唤起所有回调。  
}
```

当然，刚才说过，需要一个 try-catch 将里面的代码包起来。

```javascript
Promise.prototype._resolve(value) {  
    try {  
        // 刚才里面的代码。  
    } catch (e) {  
        // ToDo: 失败响应。  
    }  
}
```

可是，你可能会意识到，如果传入的参数，其实是一个其它的 `Promise` 对象怎么办？显然我们也计划支持这种场景，即此时应当自动将下一个返回的 `Promise` 对象用传入的代替，因此我们先需要有一个参数将这种情形记录下来，以便之后检查。我们需要在构造函数里再加入一个属性。

```javascript
this._delegating = false;
```

然后，在刚才的 `_resolve` 方法里，在设置状态之前，以及校验传入参数是否自己之后，加上以下代码。

```javascript
if (value && (typeof value === 'object' || typeof value === 'function') && typeof (value.then === "function") {  
    this._delegating = true;  
    value.then(this._resolve, this._reject);  
    return;  
}
```

由此，成功状态的判断和前置处理就完成了。那么，我们继续实现失败响应。其实和成功响应差不多，无非就是先判断当前状态是否为等待中，如果是的话，则将状态更新为失败，并记录出错信息，然后唤起所有回调。

```javascript
Promise.prototype._reject = function (reason) {  
    if (this._state !== null) return  
    this._state = false;  
    this._value = reason;  
   
    // ToDo: 唤起所有回调。  
}
```

在这里，我们都预留了唤起所有回调没有实现。要实现这个，我们需要先找个地方记录这些回调及相关信息。由于每组回调都可以包含成功和失败之后的处理，并且都可以有返回值做为下一个 Promise 的结果，因此，针对每组回调，我们都需要保存以下信息。

- 成功时的回调。
- 失败时的回调。
- 成功时，下一个 Promise 对象的处理过程。
- 失败时，下一个 Promise 对象的处理过程。

我们需要在构造函数里放一个数组来存储所有的这些信息。

```javascript
this._deferreds = [];
```

然后，针对每一组这个信息，我们需要一个通用处理方法，能够在当下不同状态进行不同的处理：主要业务逻辑结束前进行记录；以及，在结束后进行执行，但考虑到这时延迟执行的，因此结束后需要等待当前线程正在运作的事务执行完后，才开始执行，故需要使用一个回调。

```javascript
Promise.prototype._handle = function (deferred) {  
    if (this._state === null) {  
        this._deferreds.push(deferred);  
        return;  
    }  
   
    setTimeout(() => {  
        // ToDo: 结束后执行的回调。  
    }, 0);  
}
```

对于此处的结束后执行的回调，我们需要做这些事情。

1. 检查状态，以确定到底是执行成功的回调还是失败的回调。
2. 如果没有对应的回调，则直接执行当前的成功或失败的路由。
3. 在 try-catch 包内，触发对应的回调，若失败，则转入失败处理。

代码如下。

```javascript
// 根据状态获取对应的回调。  
var cb = this._state ? deferred.onFulfilled : deferred.onRejected;  
if (cb === null) {  
    // 如果并无对应的回调，则使用当前默认的回调。  
    (this._state ? deferred.resolve : deferred.reject)(this._value as any);  
    return;  
}  
   
// 唤起注册的回调。  
var ret: TResult | PromiseLike<TResult>;  
try {  
    ret = cb(this._value) as any;  
}  
catch (e) {  
    deferred.reject(e);  
    return  
}  
   
// 成功执行。  
deferred.resolve(ret);
```

现在，我们已经能够处理单组注册事件了。在前面声明的 then 方法中，我们也需要调用这个方法。如下代码。

```javascript
Promise.prototype.then = function (onfulfilled, onrejected) {  
    return Promise(function (resolve, reject) {  
        this._handle<TResult>({  
            onFulfilled: onfulfilled,  
            onRejected: onrejected,  
            resolve: resolve,  
            reject: reject  
        });  
    });  
};
```

好。现在回到刚才我们还没实现的唤起所有回调。我们只需写一个函数，里面放一个循环，就能轻松搞定。

```javascript
Promise.prototype._finale = function () {  
    for (var i = 0, len = this._deferreds.length; i < len; i++)  
        this._handle(this._deferreds[i]);  
    this._deferreds = null;  
}
```

于是，刚才那些唤起所有回调的部分，只需调用上面这个函数即可。剩下的事情就是把构造函数完成了。

```javascript
try {  
    executor((value) => {  
        if (!this._delegating) this._resolve(value)  
    }, (reason) => {  
        if (!this._delegating) this._reject(reason)  
    });  
} catch (e) {  
    if (!this._delegating) this._reject(e)  
}
```

现在，Promise 初步完成了。当然，由于这里是为了说清楚原理，大量使用 Prototype 来定义一些方法；但，或许你想隐藏一些私有的成员属性和方法，那么你可以依此进行一些改造，例如把许多东西都放入构造函数内实现，这里就不再继续介绍了。

## 辅助函数

前面我们介绍了 JavaScript 中的 Promise 的简单使用方式和实现原理，但 Promise 除了作为可实例化的类来使用，其本身也包含了许多静态方法，用于处理与之相关的多任务事务。例如，利用 Promise.all 函数，可以传入多个 Promise 对象，当这些对象全部成功完成。那么，这些是如何实现的呢？我们继续以 Promise.all 函数为例，其本质是通过计数器等方式来记录结果，并与输入进行比较，以来判断结果。如下代码，此处就不再过多讲解了。

```javascript
Promise.all(values) {  
    var args = Array.prototype.slice.call(arguments.length === 1 && Array.isArray(arguments[0]) ? arguments[0] : arguments);  
    return new Promise(function = (resolve, reject) {  
        if (args.length === 0) return resolve([]);  
        var remaining = args.length;  
        var res = function (i, value) {  
            try {  
                // 检查 value 是否为 Promise 对象。  
                if (value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === "function") {  
                    value.then(function (val) { res(i, val); }, reject);  
                    return;  
                }  
   
                // 非 Promise 对象时，即简单赋值。  
                args[i] = value;  
   
                // 计数器，以及结束时的处理。  
                if (--remaining === 0) {  
                    resolve(args);  
                }  
            } catch (ex) {  
                reject(ex);  
            }  
        };  
        for (var i = 0; i < args.length; i++) {  
            res(i, args[i]);  
        }  
    });  
}  
```

除此之外，还有诸如 Promise.race 这样的函数，相信此处不多说，大家也已明白其实现原理。
