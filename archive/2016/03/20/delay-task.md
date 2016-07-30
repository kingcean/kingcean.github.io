In some of textbox, it will render a dropdown list to show the suggestion when we are typing. Maybe you will think it imposes additional cost for network and server computing if the data is resolved from web service because perhaps user will ignore the information before complete a series characters typing of what the user want. A better way is to merge the requests to send the last one and ignore the ones when user are typing.

But how to implement it?

We will design a delay task with following goals to handle this.

- Generates a task to control when to run a given handler.
- Process the handler after a specific time span when the task starts.
- The task can be run by several times.
- Auto merge and ignore the previous ones if the task runs again after a short while.

In fact, the above is one of scenarios for usage. We can use this for lots of things. I will introduce this implementation in both of [Type Script](#type-script) and [C#](#c-sharp).

## Type Script

Let's define the options interface for customizing the delay task.

```typescript
/**
  * Options to set the delay task.
  */
export interface DelayOptionsContract {
 
    /**
      * The business handler to process.
      * @param modelArg  An optional argument.
      */
    process(modelArg?: any): void;
 
    /**
      * The timespan in millisecond for waiting.
      */
    delay?: number;
 
    /**
      * The object to be used as the current object
      * for handler processing.
      */
    thisArg?: any;
}
```

Then we need add a function to generates the task delegate. The function can pass an argument which will be passed to the handler registered later automatically.

```typescript
export function delay(options: DelayOptionsContract)
    : (modelArg?: any) => void {
    // ToDo: Implement it.
    return null;
}
```

We can set a timeout callback to process the handler. This delegate will be returned as the task delegate to provide delay processing.

```typescript
return (modelArg?: any) => {
    setTimeout(() => {
        options.process(modelArg);
    }, options.delay);
};
```

However, it will process twice or more when the user runs the task several times. So we need update it to ignore previous ones when the task run again after a short while. We need add a token bound to the task. The token will renew when the task runs and pass to a callback. The callback will check the if the token passed equals to the one bound in task to determine whether need continue to process the handler registered.

```typescript
var token = 0;
var handler = (modelArg: any, testToken: number) => {
    if (testToken !== token) return;
    options.process.call(options.thisArg, modelArg);
};
```

We can just use an increasable number as the token for checking. And the timeout callback in the delegate should be replaced by the new one above.

```typescript
return (modelArg?: any) => {
    token++;
    setTimeout(handler, options.delay, modelArg, token);
};
```

Currently, the callback will be still run even if the token is changed although it will stop to process the handler. To improve this, we can abort it before it runs. So we need add a timeout identifier to record current one and clear the previous one during the task runs. So we update the returned delegate as following.

```typescript
var timeout: number;
return (modelArg?: any) => {
    token++;
    if (!!timeout)
        clearTimeout(timeout);
    timeout = setTimeout(handler, options.delay, modelArg, token);
};
```

Then we can add the empty arguments checking and it will look like this.

```typescript
/**
  * Generates a delay task.
  * @param options  The options to load.
  */
export function delay(options: DelayOptionsContract)
    : (modelArg?: any) => void {
    if (!options || !options.process)
        return null;
    var token = 0;
    var timeout: number;
    var handler = (modelArg: any, testToken: number) => {
        timeout = null;
        if (testToken !== token)
            return;
        options.process.call(options.thisArg, modelArg);
    };
    return (modelArg?: any) => {
        token++;
        if (!!timeout)
            clearTimeout(timeout);
        timeout = setTimeout(handler, options.delay != null ? options.delay : 0, modelArg, token);
    };
}
```

Now we can have a test.

```typescript
var task = delay({
    delay: 300,
    process: function (model) {
        console.debug(model);
    }
});
document.body.addEventListener(
    "click",
    function (ev) {
        task(new Date().toLocaleTimeString());
    },
    false);
```

Run the test and you can click or tap the page quickly. It will record the latest one in console as debug info. But it will record the previous one if you click or tap after 0.3s in this example

And of course, you can continue to add promise support.

## C Sharp

Firstly, we need add some references for using.

```csharp
using System;
using System.Threading;
using System.Threading.Tasks;
```

Then we can define a class with a property to set the timeout span and an event for registering the one which will be occurred after the task processing. An async method is provided to call to process the task after the specific time span.

```csharp
public class DelayTask
{
    public TimeSpan Span { get; set; }
 
    public event EventHandler Processed;
 
    public async Task<bool> Process()
    {
        throw new NotImplementedException();
    }
}
```

In process method, we need delay to execute and raise the event. To ignore the processing of the ones raised before the previous one finished, we need add a token to check.

```csharp
private Guid _token = Guid.Empty;
```

The token should be generated, checked and cleared during processing. The result is a status indicating whether it executes.

```csharp
public async Task<bool> Process()
{
    var token = Guid.NewGuid();
    _token = token;
    await Task.Delay(Span);
    if (token != _token) return false;
    _token = Guid.Empty;
    Processed(this, new EventArgs());
    return true;
}
```

And add a cancellable process method. Now we get the following task.

```csharp
/// <summary>
/// The delay task.
/// </summary>
public class DelayTask
{
    private Guid _token = Guid.Empty;
 
    /// <summary>
    /// Gets or sets the delay time span.
    /// </summary>
    public TimeSpan Span { get; set; }
 
    /// <summary>
    /// Adds or removes the event handler occurred
    /// after processed.
    /// </summary>
    public event EventHandler Processed;
 
    /// <summary>
    /// Processes the delay task.
    /// </summary>
    /// <returns>
    /// A task with a value indicating whether it executes.
    /// </returns>
    public async Task<bool> Process()
    {
        return await Process(CancellationToken.None);
    }
 
    /// <summary>
    /// Processes the delay task.
    /// </summary>
    /// <param name="cancellationToken">
    /// The cancellation token that will be checked prior
    /// to completing the returned task.
    /// </param>
    /// <returns>
    /// A task with a value indicating whether it executes.
    /// </returns>
    public async Task<bool> Process(
        CancellationToken cancellationToken)
    {
        var token = Guid.NewGuid();
        _token = token;
        await Task.Delay(Span, cancellationToken);
        if (token != _token) return false;
        _token = Guid.Empty;
        if (cancellationToken.IsCancellationRequested)
            return false;
        Processed(this, new EventArgs());
        return true;
    }
}
```

To use it, you just need create an instance of this class with delay time span and call its process member method where you need execute the task. You can also register the event handler for processing.
