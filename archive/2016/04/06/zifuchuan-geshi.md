在 .Net 开发过程中，我们经常使用 [`String.Format`](https://msdn.microsoft.com/zh-cn/library/system.string.format.aspx) 静态方法来格式化文本模板，该文本中包含一些占位符，并会被依次由给定的一组对象的文本形式所替换。同时，还有许多地方也提供类似方法，以支持这个类型的文本模板及替换方案。我们通常将这项技术称为[复合格式设置](https://msdn.microsoft.com/zh-cn/library/txafckwd.aspx)。其通常需要一个文本模板、一组对象和一个可选的市场选项作为输入。

文本模板需要包含一组具有索引号的占位符，这些占位符用于被替换为制定的对象。占位符的语法为`{索引号[,长度][:格式化选项字符串]}`。最终，将会输出一个经过替换后的字符串。

不过，其原理是什么呢？

## 使用方式

`String.Format` 静态方法有多种重载，其中一个如下。

```csharp
public static string Format(
    IFormatProvider provider,
    string format,
    params object[] args
) { }
```

这其中包含这些参数。

- `provider`：一个用于指定语言的信息，用于提供更为本地化的格式化依据。
- `format`：文本模板，其中包含占位符。
- `args`: 一组对象，按照从0开始排序，依次替换文本模板中的占位符。

该方法会返回一个新的字符串，其中包括将占位符替换为该组对象后的格式化内容。

然后，我们可以按照下述方式使用。

```csharp
var name = "Kingcean";
var str = string.Format(CultureInfo.CurrentUICulture, "你好{0}，现在是上午{1:hh}点钟。", name, DateTime.Now);
```

变量`str`将为如下内容，假设现在是上午十一点整。

```
你好Kingcean，现在是上午11点钟。
```

在 .Net 中，许多其它方法也在使用诸如 `String.Format` 静态方法的复合格式设置功能，当然，我们也可以在自己的代码中应用。

## String Builder

事实上，.Net Framework 中的 `String.Format` 静态方法，是通过使用 `System.Text` 命名空间下的 [`StringBuilder`](https://msdn.microsoft.com/en-us/library/system.text.stringbuilder.aspx) 类来实现的。

1. 创建 `StringBuilder` 类的实例；
2. 插入格式化后的字符串到该实例中。
3. 将其转换为字符串类型，并释放该实例。

`StringBuilder` 类用于维护一段在某一时间段内可能会经常变更的字符串，例如，需要拼接或填充一个字符串，然而过程较为繁琐，如果直接使用 `string` 来进行处理，由于 `string` 在处理上的特殊原因，可能会导致占用系统内存等，这时，该类可以很好的处理这种情况，并最终提供一个将最后结果输出为普通的 `string` 类型的方法。`StringBuilder` 为此也提供了许多方法来支持这些功能，以下是部分关于追增内容的方法。

```csharp
public StringBuilder Append(char value, int repeatCount = 1); 
public StringBuilder Append(string value);
```

当然，该成员方法也包含一些重载，以提供其它类型的插入。当然，也可以直接插入一个 `object` 类型，其会被转换为 `string` 并被插入，当其为 `null` 时则什么也不会发生/

```csharp
public StringBuilder Append(object value);
```

这个类也提供一个成员方法来插入复合格式设置的文本，例如下面这个。

```csharp
public StringBuilder AppendFormat(IFormatProvider provider, string format, params object[] args);
```

于是，我们也可以直接像下面这样使用。

```csharp
var name = "Kingcean";
var sb = new StringBuilder();
sb.AppendFormat(CultureInfo.CurrentUICulture, "你好{0}，现在是{1:hh}点钟。", name, DateTime.Now);
var str = sb.ToString();
```

其结果和前面的例子一样。

但是这是如何实现的呢？下面我将开始来介绍，代码将使用 C# 语言来书写。

## 开始实现

首先，我们需要验证参数，`format` 和 `args` 都不能为空。

```csharp
if (format == null)
    throw new ArgumentNullException("format");
 
if (args == null)
    throw new ArgumentNullException("args");
```

然后我们需要准备一些信息，用于遍历整个字符串，这些信息包括当下读取的字符位置、测试字符串的长度等。

```csharp
var pos = 0;
var len = format.Length;
var ch = '\x0';
```

并获取语言格式化选项。

```csharp
var cf = provider != null ? (ICustomFormatter)provider.GetFormat(typeof(ICustomFormatter)) : null;
```

然后我们便可以开始遍历了，并最终返回自己。

```csharp
while (pos < len)
{
    // ToDo: Append characters.

    pos++;
}
 
return this;
```

接下来，我们要开始实现这个循环。

## 追加普通字符

因为字符串可能包含占位符，我们需要找到它们，并先把普通字符串进行插入。于是，我们将前面代码中 To-Do 的部分改写如下，这将是另一个循环，并放在 `pos++` 之前。

```csharp
while (pos < len)
{
    ch = format[pos];
    pos++;
    if (ch == '}')
    {
        // ToDo: For '}'.
    }
 
    if (ch == '{')
    {
        // ToDo: For '{'.
    }
 
    Append(ch);
}
```

这将逐个获取单个字符，并检测其是否为大括号（“{”或“}”），如果不是地话，则将其插入。

对于左大括号（“{”），我们认为这可能将开始一个占位符，因此我们需要退出当前循环，以便在后面进行识别和处理。由于之后还会对 `pos++`，因此我们先自减一次以抵消。

```csharp
pos--;
break;
```

然而，如果是两个左大括号连在一起（“{{”），那我们认为这只是一个普通文本的左大括号而已，而非占位符。因此需要把上述代码改写如下。

```csharp
if (pos < len && format[pos] == '{')
    pos++;
else
{
    pos--;
    break;
}
```

同理，针对右大括号（“}”），我们也需要进行识别，同时将双右大括号转为普通文本。若识别到了，显然这并不符合预期，因为肯定要先有做大括号，才会有右大括号。

```csharp
if (pos < len && format[pos] == '}')
    pos++;
else
    throw new FormatException();
```

至此，其实我们将所有普通文本都插入进了 `StringBuild` 类的实例当中去了，并识别了占位符的起始位置。

## 解析占位符

若前面的第二层循环跳出了，说明当前是一个占位符，因此我们需要进行识别和映射。

占位符的语法为 `index[,length][:formatString]`，并放在大括号（“{”和“}”）内.

- `index`：一个从索引数值，从 0 开始，用于指示该占位符对应其后对象数组中的第几个对象，并格式化输出；如果该对应的对象为空（`null`），则被替换为空字符串；如果没有对应的对象映射，则抛 `FormatException` 异常。
- `length`：最少显示多个个字符，不够的从左边开始填充空格；如果非负数，则从右边开始填充空格。
- `formatString`: 一个标准或自定义格式化选项字符串。

首先我们需要获取索引值。在外层循环的末尾，`pos++` 的后面，加入以下代码。由于当下我们正处于左大括号后面，因此我们要求必须为数字。

```csharp
if (pos == len || (ch = format[pos]) < '0' || ch > '9')
    throw new FormatException();
```

然后开始对其后每个字符进行逐个检查，直至为为非数字。每获取一个字符，则和前面的结果进行运算，以得到索引号。索引号不能超过过一个最大值，如 999,999。

```csharp
int index = 0;
do
{
    index = index * 10 + ch - '0';
    pos++;
    if (pos == len) throw new FormatException();
    ch = format[pos];
}
while (ch >= '0' && ch <= '9' && index < 1000000);
```

因此，我们可以轻松映射了。

```csharp
var arg = args[index];
```

这个就是对应的要格式化的对象了。

## 获取最小长度

接着，我们需要移除数字后面可能存在的空格，之后还有多处也需要去除多余空格。

```csharp
if (index >= args.Length) throw new FormatException();
while (pos < len && (ch = format[pos]) == ' ') pos++;
```

然后我们可以根据可能存在的逗号后面的内容，来开始获取指定的最小长度了。最小长度是可选的，其前面可能也会存在空格，因此也需要去除。

```csharp
bool leftJustify = false;
int width = 0;
if (ch == ',')
{
    pos++;
    while (pos < len && format[pos] == ' ') pos++;
 
    if (pos == len) throw new FormatException();
    ch = format[pos];
    
    // ToDo: Get the length.
}
```

这个长度可以是正数也可以是负数。因此我们需要做一个判断，看看前面是否会有一个负号。

```csharp
if (ch == '-')
{
    leftJustify = true;
    pos++;
    if (pos == len) throw new FormatException();
    ch = format[pos];
}
```

然后在剩余字符串中提取紧挨着的数字，方式如同获取索引值。

```csharp
if (ch < '0' || ch > '9')
    throw new FormatException();
do
{
    width = width * 10 + ch - '0';
    pos++;
    if (pos == len) throw new FormatException();
    ch = format[pos];
}
while (ch >= '0' && ch <= '9' && width < 1000000);
```

好了，我们实现完了这个 `if (ch == ',') { ... }` 了。我们继续在其后面继续处理，当然，要先去除多余的空格。

```csharp
while (pos < len && (ch = format[pos]) == ' ') pos++;
```

现在我们已经获得了所需的最小长度。

## 格式化参数

然后我们需要对可能存在的 `formatString` 进行类似的处理。其位于冒号后面。我们需要创建另一个 `StringBuilder` 对象来储存该值。

```csharp
StringBuilder fmt = null;
if (ch == ':')
{
    pos++;
    while (true)
    {
        if (pos == len) throw new FormatException();
        ch = format[pos];
        pos++;
        if (ch == '{')
        {
            if (pos < len && format[pos] == '{')
                pos++;
            else
                throw new FormatException();
        }
        else if (ch == '}')
        {
            if (pos < len && format[pos] == '}')
                pos++;
            else
            {
                pos--;
                break;
            }
        }
 
        if (fmt == null)
        {
            fmt = new StringBuilder();
        }
        fmt.Append(ch);
    }
}
```

一切搞定后，还需要验证其结尾是否有一个右大括号。如果是的，我们就需要将之前的 `pos` 自增，以便进行后续的处理。

```csharp
if (ch != '}') throw new FormatException();
pos++;
```

然后，我们需要根据已有的格式化信息，对该占位符所对应的对象进行格式化。

```csharp
string fmtStr = null;
string s = null;
if (cf != null)
{
    if (fmt != null)
    {
        fmtStr = fmt.ToString();
    }

    s = cf.Format(fmtStr, arg, provider);
}
 
if (s == null)
{
    var formattableArg = arg as IFormattable;
    if (formattableArg != null)
    {
        if (fmtStr == null && fmt != null)
        {
            fmtStr = fmt.ToString();
        }
 
        s = formattableArg.ToString(fmtStr, provider);
    }
    else if (arg != null)
    {
        s = arg.ToString();
    }
}
```

变量 `s` 即为格式化之后的对象。

## 追加参数

然后我们还是需要判断一下该参数是否为空，是的话，就要用空字符串来替换该占位符。

```csharp
if (s == null) s = string.Empty;
```

否则的话，我们需要检查其是否超过了最小宽度。

```csharp
var pad = width - s.Length;
```

并根据情况，决定是否和如何填充空格。

```csharp
if (!leftJustify && pad > 0) Append(' ', pad);
Append(s);
if (leftJustify && pad > 0) Append(' ', pad);
```

至此，全部搞定。
