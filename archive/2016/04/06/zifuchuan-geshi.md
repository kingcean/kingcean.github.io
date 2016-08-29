_当前内容尚未翻译，暂时仅提供英文版。_

在 .Net 开发过程中，我们经常使用 [`String.Format`](https://msdn.microsoft.com/zh-cn/library/system.string.format.aspx) 静态方法来格式化文本模板，该文本中包含一些占位符，并会被依次由给定的一组对象的文本形式所替换。同时，还有许多地方也提供类似方法，以支持这个类型的文本模板及替换方案。我们通常将这项技术称为[复合格式设置](https://msdn.microsoft.com/zh-cn/library/txafckwd.aspx)。其通常需要一个文本模板、一组对象和一个可选的市场选项作为输入。

文本模板需要包含一组具有索引号的占位符，这些占位符用于被替换为制定的对象。占位符的语法为`{索引号[,长度][:格式化选项字符串]}`。最终，将会输出一个经过替换后的字符串。

不过，其原理是什么呢？

## 使用方式

There are many overloads of `String.Format` static method. One of syntax is like following.

```csharp
public static string Format(
    IFormatProvider provider,
    string format,
    params object[] args
) { }
```

Following are the arguments.
- provider

  An object that supplies culture-specific formatting information.
- format

  A composite format string.
- args

  An object array that contains zero or more objects to format.

It returns a copy of format in which the format items have been replaced by the string representation of the corresponding objects in args.

So we can use it like following.

```csharp
var name = "Kingcean";
var str = string.Format(CultureInfo.CurrentUICulture, "Hi {0}, it is at {1:hh} o'clock now.", name, DateTime.Now);
```

The str variable will be following string if it is at 11:00 am now.

```
Hi Kingcean, it is at 11 o'clock now.
```

Lots of other methods which support composite formatting are based on the `String.Format` static method.

## String Builder

In fact, dotNet implements `String.Format` static method by [`StringBuilder`](https://msdn.microsoft.com/en-us/library/system.text.stringbuilder.aspx) which is in System.Text namespace.

1. Acquire a `StringBuilder` instance.
2. Append format to the `StringBuilder` instance.
3. Converts to string and release the `StringBuilder` instance.

The StringBuilder class is used to represents a mutable string of characters. It provides some member methods to append object to current string with higher performance than combining strings directly. Following are some examples of its member methods to append something.

```csharp
public StringBuilder Append(char value, int repeatCount = 1); 
public StringBuilder Append(string value);
```
It also support other overloads for further type as argument. And of course, it provide to append an object. The object will be convert to string if it is not null; otherwise, do nothing.

```csharp
public StringBuilder Append(object value);
```

This class also contain a member method for appending composite format string. Such as following.

```csharp
public StringBuilder AppendFormat(IFormatProvider provider, string format, params object[] args);
```

People can call this method directly, too.

```csharp
var name = "Kingcean";
var sb = new StringBuilder();
sb.AppendFormat(CultureInfo.CurrentUICulture, "Hi {0}, it is at {1:hh} o'clock now.", name, DateTime.Now);
var str = sb.ToString();
```

The result is same as the above sample.

So we will introduce the implementation of this member method in C# here.

## 开始实现

Firstly, we need validate the arguments. Both format and args are required.

```csharp
if (format == null)
    throw new ArgumentNullException("format");
 
if (args == null)
    throw new ArgumentNullException("args");
```

Then we need iterate all characters to append. To do so, we need record the item and index we are iterating, and get the length of the string to test.

```csharp
var pos = 0;
var len = format.Length;
var ch = '\x0';
```

And get the formatter which provides formatting service for the specified type.

```csharp
var cf = provider != null ? (ICustomFormatter)provider.GetFormat(typeof(ICustomFormatter)) : null;
```

Then we can iterate all characters and return current instance.

```csharp
while (pos < len)
{
    // ToDo: Append characters.
    pos++;
}
 
return this;
```

Now we need implement the while loop.

## 追加普通字符

Because the string contains placeholder, we need check filter them and add normal ones. So we need update the To-Do in the above while loop as following. It needs another while loop before position increasing.

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

It get current character and check if it is a brace ("{" or "}"). Append the character if it is not.

For left brace ("{"), we need break this while loop to get the format item.

```csharp
pos--;
break;
```

However, we need convert to normal character left brace ("{") if it is 2 left braces ("{{"). So we need update it as following.

```csharp
if (pos < len && format[pos] == '{')
    pos++;
else
{
    pos--;
    break;
}
```

As same as right brace ("}"). We need convert to normal one for 2 right braces ("{{") and throw exception if there is only one.

```csharp
if (pos < len && format[pos] == '}')
    pos++;
else
    throw new FormatException();
```

So we have append all normal characters to the StringBuilder and get the format items.

## 获取参数

When the above while loop is break, it is in format items route. We need add logic after the position increasing in the outer while loop.

The syntax of format item is `index[,length][:formatString]` with outermost braces ("{" and "}").

- index

  The zero-based position in the parameter list of the object to be formatted. If the object specified by index is null, the format item is replaced by String.Empty. If there is no parameter in the index position, a FormatException is thrown.
- length 

  The minimum number of characters in the string representation of the parameter. If positive, the parameter is right-aligned; if negative, it is left-aligned.
- formatString

  A standard or custom format string that is supported by the parameter.

So we need get index firstly. After the position increases, we are in the position after the left brace ("{"). So that character should be a number.

```csharp
if (pos == len || (ch = format[pos]) < '0' || ch > '9')
    throw new FormatException();
```

Then need resolve the value of index by getting the character one by one for computing until it is not a number. The maximum value of index is 999,999.

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

So we can resolve the argument which the index correspond to.

```csharp
var arg = args[index];
```

This will be formatted to append later.

## 获取最小长度

Remove the white spaces after the index if has.

```csharp
if (index >= args.Length) throw new FormatException();
while (pos < len && (ch = format[pos]) == ' ') pos++;
```

Now, we need get its length. It may pad white spaces by left justify or right if the value is shorter than the minimum length so we need a flag indicating whether it is left justify. And then check if it is a comma. If so, a length is there. We need left trim it and begin to get the minimum length value.

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

The length can be positive or negative for right or left justify. So we need check if there is a negative sign.

```csharp
if (ch == '-')
{
    leftJustify = true;
    pos++;
    if (pos == len) throw new FormatException();
    ch = format[pos];
}
```

Then the rest characters should be numbers. We can get the minimum length just like to get the index.

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

Well, let's go outside of the if scope of character equaling comma, we need right trim it.

```csharp
while (pos < len && (ch = format[pos]) == ' ') pos++;
```

Now we have gotten the minimum length of argument to present.

## 格式化参数

And try to get its formatString by the same way. It is after a colon. We need another StringBuilder instance for saving it.

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

Validate if the end of the format item is a right brace ("}"). If so, continue to increase the position index.

```csharp
if (ch != '}') throw new FormatException();
pos++;
```

Then we need use the formatter to format the argument if has; otherwise, just convert it to string.

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

The s variable is the string formatted of the argument.

## 追加参数

If the argument string is null, we need use an empty string instead.

```csharp
if (s == null) s = string.Empty;
```

And get the length of padding to append.

```csharp
var pad = width - s.Length;
```

Then append the argument string and the white spaces if needed.

```csharp
if (!leftJustify && pad > 0) Append(' ', pad);
Append(s);
if (leftJustify && pad > 0) Append(' ', pad);
```

So that's all.
