在 UWP 的开发过程中，我们可能需要提供多种交互方式，例如鼠标、键盘、触摸、游戏手柄等，当然，语音也是一项很重要的功能。

众所周知，在 Windows 中的许多个版本都包含有语音功能，特别是在 Windows 10 上，Cortana（小娜）更是非常智能。同时，对于开发者而言，我们也能非常方便的在其中融入我们的功能，不过本文并不是想说这个。这里将介绍如何开发我们自己的 UWP 应用的语音交互，即，在我们的 UWP 内部，支持用户的语音命令和语音输入，并提供语音反馈。

## 准备工作

首先，在 Visual Studio 2015 Update 3 或更高版本中，创建一个 UWP 项目。并在 Package.appxmainfest 中，在 Capabilities 中勾选“麦克风”，或者直接用文本编辑器打开该文件，在 `Capabilities` 节点中，插入以下代码。

```xml
<DeviceCapability Name="microphone" />
```

打开 MainPage.xaml.cs 文件，我们需要先在其中加入以下命名空间，这些将分别用于处理语音识别、语音合成和文件访问。

```csharp
using Windows.Media.SpeechRecognition;
using Windows.Media.SpeechSynthesis;
using Windows.Storage;
```

## 语音识别

现在，我们需要在 `MainPage` 类里实现一个方法，用于执行语音识别，并返回结果。在处理语音识别的过程当中，需要用到一个名为 `SpeechRecognizer` 的类所创建的实例，该实例可被复用，以便多次处理语音识别任务。因此，我们还需要一个字段来存储这个实例，并在该方法首次调用时，初始化这个实例。另外，由于该实例可以添加一些语音识别约束，用于描述场景，所以在使用前，需要先对这些约束进行编译，即使并没有添加任何约束。该编译过程和语音识别都是异步的，因此我们需要将这个方法也声明为异步方法。

```csharp
private SpeechRecognizer _speechRecognizer;

private async Task<SpeechRecognitionResult> SpeechRecognizeAsync() {
    if (_speechRecognizer == null)
    {
        // 创建一个 SpeechRecognizer 实例。
        _speechRecognizer = new SpeechRecognizer();

        // 编译听写约束。
        await _commandSpeechRecognizer.CompileConstraintsAsync();
    }

    // 开始语音识别，并返回结果对象。
    return await _speechRecognizer.RecognizeAsync();
}
```

另外，也可以在这个方法里初始化 `_speechRecognizer` 字段的地方，对该实例的一些行为和状态做一些控制，例如使用其 `RecognitionQualityDegrading` 事件监听语音输入的质量等。

现在，我们可以在界面中添加一个按钮，绑定一个点击事件，用以测试语音录入功能。

```xaml
<Button x:Name="SpeechButton" Content="语音" Click="Speech_Click" />
```

在绑定的点击事件中，需要先调用前面写的 `SpeechRecognizeAsync()` 成员方法获取到识别后的结果，然后在识别后，出于测试目的，我们弹出一个对话框，显示所识别的文本内容。在实际使用场景中，这个结果应该是被输入到文本框，或者是用在其它场合。

```csharp
private async void Speech_Click(object sender, RoutedEventArgs e)
{
    // 获取语音识别结果。
    var speechRecognitionResult = await SpeechRecognizeAsync();

    // 弹出一个对话框，用于展示识别出来的文本。
    var messageDialog = new Windows.UI.Popups.MessageDialog(speechRecognitionResult.Text, "你刚说了");
    await messageDialog.ShowAsync();
}
```

现在，按下 F5 运行，可以发现，界面上有一个按钮“语音”，点击后，说出一句话，稍等片刻，即会弹出一个标题为“你刚说了”的对话框，里面包含了刚才所说的内容。

## 使用图形输入界面

在刚才的场景中，点一下按钮后，其实界面看似并没有任何反应，但其实已经开始进入聆听我们说话的过程中了，这样的用户体验并不好，可能需要加入一些提示，例如提示用户开始聆听等。

不过，其实系统也有提供默认的通用界面可供调用。这些界面虽然较为简单，但在许多场景下也的确满足需求。系统默认的界面会在开始聆听时弹出一个对话框，显示“正在聆听”并发出提示音；当聆听结束时，会在该弹出框中显示所聆听到的内容，并同时用合成语音进行反馈；而失败时，也会在该弹出框中显示出错信息，并提供合成语音反馈。

使用系统默认的语音识别界面，仅需把 `SpeechRecognizeAsync()` 成员方法中最后一步的 `speechRecognizer.RecognizeAsync()` 调用，替换成 `speechRecognizer.RecognizeWithUIAsync()` 即可。

```csharp
// 开始识别，并呈现系统默认界面。
return await _speechRecognizer.RecognizeWithUIAsync();
```

如果需要调整系统默认的界面中的内容，例如“正在聆听”的显示文案、示例提示等信息等信息，也可以在初始化 `_speechRecognizer` 字段时，在执行编译过程之前，即调用 `await _speechRecognizer.CompileConstraintsAsync();` 方法之前，通过对该字段的 `UIOptions` 属性进行设置来控制。

```csharp
// 可以设置“正在聆听”期间的文案。
_speechRecognizer.UIOptions.AudiblePrompt = "请问你打算要我做什么？";

// 可以设置“正在聆听”期间显示的示例提示，用于提示用户可以说什么。
_speechRecognizer.UIOptions.ExampleText = "请尝试说：开灯、关灯。";

// 当聆听结束后，可以设置是否要通过合成语音读出听到的结果。
_speechRecognizer.UIOptions.IsReadBackEnabled = false;

// 可以设置是否要显示聆听成功后的确认消息框。
_speechRecognizer.UIOptions.ShowConfirmation = false;
```

除此之外，也可以对该字段的 `Timeouts` 成员属性里的属性进行设置，以控制各类时长。

## 语音输入场景

为了更精准的识别所期待的内容，如前面所说，`SpeechRecognizer` 类支持添加语音识别约束。语音识别至少需要一个约束，才能定义可识别的词汇。如果未指定任何约束，将使用通用 Windows 应用的预定义听写语法。

语音识别约束必须实现 `ISpeechRecognitionConstraint` 接口，然后在 `SpeechRecognizer` 类的 `Constraints` 成员属性中调用 `Add` 成员方法添加至约束列表中。可以添加多项语音识别约束，但是有的可能会有冲突。

通常情况下，可能会应用到以下这些内置约束。

- `SpeechRecognitionTopicConstraint` - 基于预定义语法的约束。
- `SpeechRecognitionListConstraint` - 基于字词或短语列表的约束。
- `SpeechRecognitionGrammarFileConstraint` - 在语音识别语法规范（SRGS）文件中定义的约束。

添加这些约束必须在编译约束之前，即必须放置于上方示例代码中的 `SpeechRecognizeAsync()` 成员方法里 `await _commandSpeechRecognizer.CompileConstraintsAsync();` 调用之前。

语音识别约束中有一个 `Tag` 成员属性，用于作为该约束的 ID，设置后，在之后的语音识别结束时，可以用于判断时基于哪个约束进行识别的。例如，可能添加了多个识别约束，每个约束都有不同的预期以及对应的处理方式，当语音识别结束时，我们需要知道当前用户所说的内容，是符合哪一个约束所对应的预期的，这样我们才知道接下来应该如何处理其语音输入的内容，这时，可以根据 ID 来进行简单的判断，因为语音识别结果 `SpeechRecognitionResult` 类中，会包含 `Constraint` 属性，这个属性即是之前所实际采用的约束。当然，也可以直接判断约束实例本身，而非通过这个 ID 来区分。不过需要注意的是，结果中的这个属性可能为空，所以可能要处理为空的可能。

## 指定预定义语法的约束

`SpeechRecognitionTopicConstraint` 类用于预期为 Web 搜索、听写或表单输入类型，使用方式如下。

```csharp
var webGrammar = new SpeechRecognitionTopicConstraint(SpeechRecognitionScenario.WebSearch, "webSearch", "web");
_speechRecognizer.Constraints.Add(webGrammar);
```

这个类的构造函数支持输入3个参数，其中最后一个为选填。

- 第1个参数是场景类型，为一个枚举。
  - Web 搜索（`SpeechRecognitionScenario.WebSearch = 0`）。
  - 听写（`SpeechRecognitionScenario.Dictation = 1`）。
  - 表单输入（`SpeechRecognitionScenario.FormFilling = 2`）。
-  第2个参数为具体子类型，例如，针对表单输入，可以定义为支持拼写检查的文本类型、日期类型、姓名类型等，详见 [MSDN 文档](https://msdn.microsoft.com/zh-cn/library/windows/apps/dn653215)。
- 第3个参数是该约束项的 ID，会被填入 `Tag` 成员属性当中去，用于之后在判断用户所说的内容是在哪个约束中识别的作为依据。

## 指定编程列表约束

`SpeechRecognitionListConstraint` 类用于字词或短语列表的语音识别约束，可以通过程序输出一个字符串列表，然后添加至约束列表。

例如，假设我们需要添加一项功能，提供播放音乐和暂停的功能，我们可以至少添加2个这类约束，并删除前面注册预定义语法约束的代码，以防止冲突。

```csharp
// 获取歌曲列表。
// 此处硬编码了一些歌曲，实际应该通过程序去歌曲库中读取。
var songs = new [] { "曲目一", "另一首歌", "未命名歌曲" };

// 生成接受的语音列表。
var playCmds = songs.Select((item) => {
    return string.Format("{0}{1}", "播放", item;
});

// 创建约束，并将预期的语音列表作为构造函数的参数传入。
// 同时，可以选填其 Tag。
var playConstraint = new SpeechRecognitionListConstraint(playCmds, "play");

// 添加约束。
_speechRecognizer.Constraints.Add(playConstraint);

// 接下来，创建暂停和继续播放所对应的功能，并添加该约束。
var pauseConstraint = new SpeechRecognitionListConstraint(new [] { "暂停", "继续播放" }, "pauseAndResume");
_speechRecognizer.Constraints.Add(pauseConstraint);
```

至于应该根据何种情况来设定预期的语音指令，这需要根据现实的使用场景和整体的程序设计来进行规划，许多情况下，并不需要像这个示例一样使用2个约束实例，仅用1个也可以。此处示例仅为说明这个约束的使用方式。

## 指定 SRGS 语法约束

`SpeechRecognitionGrammarFileConstraint` 类用于引入一个 SRGS 文件作为语音识别约束。例如下方这样，我们假设我们需要控制一个灯的开关，我们需要先读取一个 SRGS 类型的文件（.grxml），然后作为该类的第1个参数传入，第2个参数为可选的 Tag（即 ID）。

```csharp
// 获取文件。
var grammarFile = await GetFileFromApplicationUriAsync(new Uri("ms-appx:///Assets/Light.grxml"));

// 创建 SRGS 文件约束。
var srgsConstraint = new SpeechRecognitionGrammarFileConstraint(grammarFile, "light");

// 添加约束。
_speechRecognizer.Constraints.Add(srgsConstraint);
```

接下来，需要去实现那个位于项目中 Assets 目录下的 Light.grxml 文件。

## SRGS 语法

在项目的 Assets 目录下新建一个名为 Light.grxml 的文件，并在文件属性中，将“数据包操作”设置为“内容”，以及将“复制到输出目录”则设置为“始终复制”。该文件里的内容需要符合 SRGS 语法。SRGS 是一套为语音识别创建 XML 格式语法的行业标准标记语言，可以处理较复杂的语音识别。该文件需要包含类似下方的 XML 节点。

```xml
<grammar xml:lang="zh-Hans" root="Control" version="1.0"  tag-format="semantics/1.0" xmlns="http://www.w3.org/2001/06/grammar">
    <rule id="Control">
    </rule>
</gramma>
```

在这里，`grammar` 根节点里的 `xml:lang` 属性，用于定义这个 SRGS 文件所支持的语言，只有当当前语音识别的语音于这个值匹配的时候，该文件中描述的语音识别规则才有效；而 `root` 属性里需要定义一个规则的 ID，在 `grammar` 根节点里可以定义多套规则，但是入口只有1个，即此属性中定义的；其它属性可参考 [MSDN 文档](https://msdn.microsoft.com/zh-cn/library/hh361670)。在 `grammar` 根节点里面，必须至少有一个 `rule` 节点，并需要定义其 `id` 属性，用于检索。`id` 值和 `grammar` 根节点 `root` 属性定义的值相同的 `rule` 节点，即为此文件所指定的主规则；其它规则通常是被用于引用的。`rule` 节点中所支持的属性可参阅 [MSDN 文档](https://msdn.microsoft.com/zh-cn/library/hh361673)。

由于我们计划控制灯的开关，首先，需要一项规则是打开灯，因此，我们在 `grammar` 根节点中新建一个 `rule` 节点，并指定一个 ID `TurnOn`，然后在里面来实现这个规则。具体的实现方式是，在里面添加一个 `item` 节点，该节点的目的是指定预期可能说的话。

```xml
<rule id="TurnOn">
    <item>开灯</item>
</rule>
```

然而，日常生活中，打开灯可能又多种说法，除了“开灯”外，可能还有“打开灯”、“把灯打开”等，像这一类属于多种可能都通向一个结果的，可以采用 `one-of` 节点将其包起来。于是我们把这个节点修改为如下。

```xml
<rule id="TurnOn">
    <one-of>
        <item>打开</item>
        <item>开灯</item>
        <item>亮灯</item>
        <item>打开灯</item>
        <item>把灯打开</item>
        <item>快开灯</item>
    </one-of>
</rule>
```

事实上，有些人很礼貌，即使和计算机说话，也可能会带上“请”之类的敬词，因此，我们还需要对其进行改造以下，在这个多选一的预期的前面，添加可能会说的内容。由于不确定是否会说，因此我们可以通过添加一个 `item` 节点，并通过其 `repeat` 属性来设置可能的重复次数来做到，由于最多可能只会说一个“请”字，那么重复次数的范围应该是0到1之间。经过优化，最后该节点可能如下所示。

```xml
<rule id="TurnOn">
    <item repeat="0-1">请</item>
    <item repeat="0-1">帮我</item>
    <item>
        <one-of>
            <item>打开</item>
            <item>开灯</item>
            <item>亮灯</item>
            <item>打开灯</item>
            <item>把灯打开</item>
            <item>快开灯</item>
        </one-of>
    </item>
</rule>
```

`item` 节点中还有一些其它属性，可参阅 [MSDN 文档](https://msdn.microsoft.com/zh-cn/library/hh361582)。

完成了开灯，那么还有关灯。同理，如下。

```xml
<rule id="TurnOff">
    <item repeat="0-1">请</item>
    <item repeat="0-1">帮我</item>
    <item>
        <one-of>
            <item>关闭</item>
            <item>关灯</item>
            <item>关上</item>
            <item>把灯关了</item>
            <item>把灯关上</item>
            <item>快关灯</item>
        </one-of>
    </item>
</rule>
```

不过，写到这里，这些规则并未能被调用，因为刚才说到，只有 `root` 指定的规则才是入口规则，所以我们需要改写前面的 `Control` 规则。改写的内容其实很简单，也是一个多选一的情况，只要说出开灯或关灯的任一命令，那么就执行。但如何指定执行哪个已定义的规则呢？可以使用 `ruleref` 节点，其 `uri` 属性用于指定是引用哪个规则，其中的值采用类似 CSS 中的选择器的语法方式，例如，用 # 开头即表示后面跟着的是对应的 ID。

```xml
<rule id="Control">
    <one-of>
        <item>
            <ruleref uri="#TurnOn"/>
        </item>
        <item>
            <ruleref uri="#TurnOff"/>
        </item>
    </one-of>
</rule>
```

现在，写完了 SRGS 文件。

## 识别 SRGS 语法约束的识别结果

当语音识别进入 SRGS 后，并得出结果，我们需要知道在执行结束后识别最后走进了哪一个规则，因为只有如此，才能决定接下来执行什么实际的操作。与前面两个约束不同，前面的两个约束可以通过所执行到的约束类型和简单分析识别到的语句来进行判断；这个 SRGS 的结果显得更为复杂。首先，我们需要根据结果返回的约束类型来判断，是否识别出的结果为这个约束下的；然后，我们可以获取其所执行的规则路径，来明白其所识别的逻辑结果。

规则路径其实是个字符串列表，即我们之前在 `rule` 中定义的 ID 的顺序执行列表，例如，当我们说出“开灯”时，其返回的时 `["Control", "TurnOff"]`。我们来新写一个方法来处理这个结果。由于第1个规则肯定时根节点，因此我们在这个示例中，只需要简单判断第2个路径是什么即可。

```csharp
private Control(IList<string> path)
{
    if （path.Count < 2) return;
    switch (path[1])
    {
        case "TurnOn":
            // Turn on.
            break;
        case "TurnOff":
            // Turn off.
            break;
    }
}
```

然后，我们还需要改写前面所写的 `Speech_Click()` 方法，以在该 SRGS 约束被执行到时调用上述方法。

```csharp
// 获取语音识别结果。
var speechRecognitionResult = await SpeechRecognizeAsync();

// 根据所执行到的约束来决定执行的内容。
if (speechRecognitionResult.Constraint == null) return;
switch (speechRecognitionResult.Constraint.Tag)
{
    case "light":
        Control(speechRecognitionResult.RulePath.ToList());
        break;
    case "play":
        // 播放某首歌。
        var songName = speechRecognitionResult.Text.Substring("播放".Length).Trim();
        break;
    case "pauseAndResume":
        // 暂停或继续播放。
        break;
}
```

## 语音合成

语音识别是将用户说的话识别为文本或指令，同时，有的时候，我们又需要反过来，通过语音合成，将指定的内容通过声音的形式反馈给用户。例如，当用户通过语音发出了某项指令后，计算机通过语音进行回复，以模拟一个语音对话的模式。

在 UWP 中，如果希望播放出某一段声音，其中一种做法是，在界面中先嵌入一个 `MediaElement` 控件，然后在通过控制这个对象来播放声音。例如，在 MainPage.xaml 文件中插入该控件。

```xaml
<MediaElement x:Name="mediaElement"/>
```

接下来，我们需要通过语音合成，来将一段指定的文本，以音频的形式让计算机朗读出来。我们新写一个方法，用于将一段文本转为语音，并通过刚才新建的 `MediaElement` 控件播放出来。

```csharp
private SpeechSynthesizer _synth = new SpeechSynthesizer();

private async void Speak(string value)
{
    // 创建一个文本转语音的流。
    var stream = await synth.SynthesizeTextToStreamAsync(value);

    // 将流发送到 MediaElement 控件并播放。
    mediaElement.SetSource(stream, stream.ContentType);
    mediaElement.Play();
}
```

然后我们可以对前面所写的 `Control(IList<string> path)` 成员方法中的内容进行改写。

```csharp
private Control(IList<string> path)
{
    if （path.Count < 2) return;
    switch (path[1])
    {
        case "TurnOn":
            // Turn on.
            Speak("灯已打开。");
            break;
        case "TurnOff":
            // Turn off.
            Speak("灯已关上。");
            break;
    }
}
```

现在，当你点击界面上的“语音”按钮后，在提示聆听后，说出“开灯”，稍后便会听到“灯已打开”的提示。

## 定制语音合成

刚刚的语音播放其实采用的是正常模式，但有时可能需要对内容的语音播放进行细节上的控制，例如调整音调、重读、语速等，甚至字或词的发音。这时候，我们需要用到语音合成标记语言 [SSML](http://www.w3.org/TR/speech-synthesis/) 来进行处理。例如以下示例。

```csharp
// 创建一个字符串，包含 SSML 描述内容，用于朗读。
string Ssml =
    @"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
    "<prosody rate='slow'>你好吗？</prosody> " + 
    "<break time='500ms'/>" +
    "</speak>";

// 用合成器根据文本创建音频流。
var stream = await _synth.synthesizeSsmlToStreamAsync(Ssml);

// 将音频播放出来。
mediaElement.SetSource(stream, stream.ContentType);
mediaElement.Play();
```

节点 `prosody` 用于控制朗读的语速、音调、音量等，详见 [MSDN 文档](https://msdn.microsoft.com/zh-cn/library/windows/apps/hh378462.aspx)。
