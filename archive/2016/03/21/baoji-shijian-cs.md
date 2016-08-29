在许多场景中，我们可能会遇到需要处理一种快速多次触发某事件，并处于某种阈值时，执行某一指定操作。例如，双击（即快速按鼠标左键两次）或更多击、连按键盘某键、某方法被执行数次等。其中，双击有对应的事件可以注册；然而，更多的情况是没有的类似事件方便我们注册使用的。那么，现在只能依靠我们勤劳的双手，来创造一个支持该功能的任务，并且该任务需要具有以下功能。

- 可以在任务中绑定一个方法，以便在暴击后被调用。
- 该任务可以被多次执行，包括也可以在已知事件中触发。
- 只有当任务在短时间内执行到指定次数后，所注册的方法才会被调用。
- 当短时间内执行了过多的次数，所注册的方法将不再被调用。
- 短时间的界定方式是，通过指定一个连续两次任务执行间隔的最长时间，来进行控制。

那么，这该如何实现呢？

我们需要先实现一个类，这里面会提供一个方法，允许被多次调用，并返回当下是否达到暴击标准。这个方法如果在某一定义的时间范围内，被调用达到制定数量范围内，将触发这个类中的一个事件，用以通知暴击处于激活状态。这个类还需要提供一些属性，用于定义相邻两次触发过程的时间间隔最长为多少，以及暴击的最小和最大次数。当然，为了方便了解当前状况，可以提供一些属性用以获得最近一次暴击触发的时间和连续次数。因此，以下是我们定义的类。

```csharp
public class MultipleHitTask
{
    public int Start
    { get; set; }
 
    public int End
    { get; set; }
 
    public TimeSpan Timeout
    { get; private set; }
 
    public DateTime LatestProcess
    { get; private set; }
 
    public int HitCount
    { get; private set; }
 
    public event EventHandler Processed;
 
    public bool Process()
    {
        throw new NotImplementedException();
    }
}
```

在这个类中，`Processed` 事件用于通知当前暴击的状况，因此我们需要对事件参数进行调整，至少让提供当前连续触发次数这一信息。

```csharp
/// <summary>
/// The event arguments with counting.
/// </summary>
public class IndexEventArgs: EventArgs
{
    /// <summary>
    /// Gets the index.
    /// </summary>
    public int Index { get; private set; }
 
    /// <summary>
    /// Initializes a new instance
    /// of the IndexEventArgs class.
    /// </summary>
    /// <param name="index">The index.</param>
    public IndexEventArgs(int index)
    {
        Index = index;
    }
}
```

于是，前面那个 `MultipleHitTask` 类中的 `Processed` 事件的声明，就应该改成下方这样。

```csharp
public event EventHandler<IndexEventArgs> Processed;
```

于是，在 `Process` 方法中，我们需要触发该事件。

```csharp
var args = new IndexEventArgs(HitCount - 1);
Processed(this, args);
return true;
```

当然，在触发事件之前，我们还要做一些判断，用以检测是否应当激活暴击状态。

```csharp
var now = DateTime.Now;
if (LatestProcess == null || now - LatestProcess > Timeout)
{
    HitCount = 0;
}
 
HitCount++;
if (HitCount <= Start || HitCount > End)
{
    return false;
}
```
于是，我们便完成了以下代码。

```csharp
/// <summary>
/// Multiple hit task.
/// </summary>
public class MultipleHitTask
{
    /// <summary>
    /// Gets or sets the start index of hit to process.
    /// </summary>
    public int Start { get; set; }
 
    /// <summary>
    /// Gets or sets the end index of hit to process.
    /// </summary>
    public int End { get; set; }
 
    /// <summary>
    /// Gets the timeout.
    /// </summary>
    public TimeSpan Timeout { get; private set; }
 
    /// <summary>
    /// Gets the time of latest processing.
    /// </summary>
    public DateTime LatestProcess { get; private set; }
 
    /// <summary>
    /// Gets the hit count.
    /// </summary>
    public int HitCount { get; private set; }
 
    /// <summary>
    /// Adds or removes the event handler occured
    /// after processing
    /// </summary>
    public event EventHandler<IndexEventArgs> Processed;
 
    /// <summary>
    /// Processes the task.
    /// </summary>
    /// <returns>true if match the condition to execute;
    /// otherwise, false.</returns>
    public bool Process()
    {
        var now = DateTime.Now;
        if (LatestProcess == null
            || now - LatestProcess > Timeout)
        {
            HitCount = 0;
        }
 
        HitCount++;
        if (HitCount <= Start || HitCount > End)
            return false;
        var args = new IndexEventArgs(HitCount - 1);
        Processed(this, args);
        return true;
    }
}
```

现在，我们可以在需要的地方，初始化一个这个类的对象，并绑定暴击触发时所需执行的事件，并在诸如点击、被遥测处或其它地方，调用这个对象的 Process 方法即可。
