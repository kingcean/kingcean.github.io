We can make our UWP apps to have lots of ways to communicate with users such as mouse, keyboard, touch, etc. And of course, voice is one of the most important interactive way.

As you known, a number of Windows version contain built-in voice command feature, especially in Windows 10 which contains Cortana as a personal assistance. For developers, we can add the features from our apps there easily. But in this article, we are talking about another thing that is to build a voice communication mechanism in our apps. It need support voice command, voice input and voice feedback.

## Get ready

Firstly, we need creata a UWP app in Visual Studio 2015 Update 3 (or higher). And open Package.appxmainfest configuration panel to select Microphone in Capabilities tab. Or you can insert following code in Capabilities node in that file directly.

```xml
<DeviceCapability Name="microphone" />
```

Then open MainPage.xaml.cs file, add following namespaces for speech recognition, speech synthesizer and file access.

```csharp
using Windows.Media.SpeechRecognition;
using Windows.Media.SpeechSynthesis;
using Windows.Storage;
```

## Speech recognition

Now, we need implement a new member method in the `MainPage` class for speech recognition and returning the result. To do so, we need add a field for storing an instance of the `SpeechRecognition` class which is the key of speech recognition. So in that method, we need initialize that field when it is called by the first time. The instance can be added one or more constraints for specific scenarios so that we need compile them before using to recognize. The method to compile and recognize are async methods so that the method we will write will be an async one, too.

```csharp
private SpeechRecognizer _speechRecognizer;

private async Task<SpeechRecognitionResult> SpeechRecognizeAsync() {
    if (_speechRecognizer == null)
    {
        // Create an instance of SpeechRecognizer.
        _speechRecognizer = new SpeechRecognizer();

        // Compile the dictation grammar by default.
        await _commandSpeechRecognizer.CompileConstraintsAsync();
    }

    // Start recognition and return the result.
    return await _speechRecognizer.RecognizeAsync();
}
```

In this method, we can also add something to configure `_speechRecognizer` field before compiling such as to add event to `RecognitionQualityDegrading` for listening the recognition quality degrading.

For a simple demo, we add a button in the page to bind an event for test.

```xaml
<Button x:Name="SpeechButton" Content="Speech" Click="Speech_Click" />
```

In the event handler, we need call the method `SpeechRecognizeAsync()` to get the result. And we pop up a dialog to show the result for testing. In production environment, we should use the result to fill the input field or to analyze for next business logic.

```csharp
private async void Speech_Click(object sender, RoutedEventArgs e)
{
    // Get the recognition result.
    var speechRecognitionResult = await SpeechRecognizeAsync();

    // Pops up a dialog to show the result.
    var messageDialog = new Windows.UI.Popups.MessageDialog(speechRecognitionResult.Text, "Text spoken");
    await messageDialog.ShowAsync();
}
```

Press F5 to debug. We can find the button Speech in the window. Click or press that button and say something. After a while, a dialog will be popped up and it shows what you spoke.

## UI for listening

There is a UX problem that there is no any user interactive after clicking the button although the app works as what we expect. We need add something to notify users that we are listening at least. So we need design the UI for it.

A good news is that there is a simple built-in UI we can use. It will pops up a Listening dialog and make a notification tone to let user know that he/she can speak now. After user speak, the dialog will show what the user said and read back. And it will show and speak the error information if failed to recognize.

We just need replace `speechRecognizer.RecognizeAsync()` to `speechRecognizer.RecognizeWithUIAsync()` in the last step of `SpeechRecognizeAsync()` member method to use this built-in UI,

```csharp
// Start recognition and show default UI.
return await _speechRecognizer.RecognizeWithUIAsync();
```

If you want to customize the content of the dialog, you can update `_speechRecognizer.UIOptions` member property before compiling (`await _speechRecognizer.CompileConstraintsAsync();`).

```csharp
// Get or set the heading text that is displayed on the Listening screen.
_speechRecognizer.UIOptions.AudiblePrompt = "请问你打算要我做什么？";

// Get or set the string of speeking hint shown on the Listening screen.
_speechRecognizer.UIOptions.ExampleText = "请尝试说：开灯、关灯。";

// Get or set a value indicating whether the recognized text is spoken back to the user on the Heard you say screen.
_speechRecognizer.UIOptions.IsReadBackEnabled = false;

// Get or set whether a Heard you say screen is shown to the user after speech recognition is completed.
_speechRecognizer.UIOptions.ShowConfirmation = false;
```

And you can also set the properties in `_speechRecognizer.Timeouts` member property for its timeout values.

## Recognition constraints

To optimize the recognition, as we mentioned above, `SpeechRecognizer` supports constraints. Speech recognition requires at least one constraint to define a recognizable vocabulary. If no constraint is specified, the predefined dictation grammar of UWP apps is used.

The constraint should implement `ISpeechRecognitionConstraint` interface and be added into `SpeechRecognizer.Constraints` member property by calling its `Add` member method. A `SpeechRecognizer` instacne can add one or more constraints but some of them may be in conflict.

There are three kinds of useful built-in speech recognition constraints used from within an app.

- `SpeechRecognitionTopicConstraint` - A constraint based on a predefined grammar.
- `SpeechRecognitionListConstraint` - A constraint based on a list of words or phrases.
- `SpeechRecognitionGrammarFileConstraint` - A constraint defined in a Speech Recognition Grammar Specification (SRGS) file.

Adding these constraints should before compiling. In the above sample, these codes should be before calling `await _commandSpeechRecognizer.CompileConstraintsAsync();` in `SpeechRecognizeAsync()` member method.

语音识别约束中有一个 `Tag` 成员属性，用于作为该约束的 ID，设置后，在之后的语音识别结束时，可以用于判断时基于哪个约束进行识别的。例如，可能添加了多个识别约束，每个约束都有不同的预期以及对应的处理方式，当语音识别结束时，我们需要知道当前用户所说的内容，是符合哪一个约束所对应的预期的，这样我们才知道接下来应该如何处理其语音输入的内容，这时，可以根据 ID 来进行简单的判断，因为语音识别结果 `SpeechRecognitionResult` 类中，会包含 `Constraint` 属性，这个属性即是之前所实际采用的约束。当然，也可以直接判断约束实例本身，而非通过这个 ID 来区分。不过需要注意的是，结果中的这个属性可能为空，所以可能要处理为空的可能。

## Specify a pre-defined grammar

The `SpeechRecognitionTopicConstraint` class is used for web search, dictation and form field filling.

```csharp
var webGrammar = new SpeechRecognitionTopicConstraint(SpeechRecognitionScenario.WebSearch, "webSearch", "web");
_speechRecognizer.Constraints.Add(webGrammar);
```

We can pass 2 or 3 parameters (the last one is optional) to the constructor.

- The 1st parameter is an enum for scenario type.
  - Web search（`SpeechRecognitionScenario.WebSearch = 0`）。
  - Dictation（`SpeechRecognitionScenario.Dictation = 1`）。
  - Form field filling（`SpeechRecognitionScenario.FormFilling = 2`）。
-  The 2nd parameter is the sub-type of scenario, e.g. spelling text input, data, name for form field filling. See [MSDN documentation](https://msdn.microsoft.com/zh-cn/library/windows/apps/dn653215)。
- The 3rd parameter is the tag which will be filled in `Tag` member property for mapping in result. We can use this to identity the constraint.

## Specify a programmatic list constraint

The `SpeechRecognitionListConstraint` class is used to define a collection of string which is what we expect user will say. We need programmatically specify an array of words as a list constraint and add it to the constraints collection of a speech recognizer.

For example, a feature is to play or pause a song. We can add 2 programmatic list constraints. And we need remove the predefined one used before to avoid conflict.

```csharp
// Resolves a song list.
// Hard code some names here for demo. It should be loaded from albums library in production environment.
var songs = new [] { "Track 1", "Another track", "Untitled track" };

// Generates the collection which we expect user will say one of.
var playCmds = songs.Select((item) => {
    return string.Format("{0}{1}", "Play ", item;
});

// Create an instance of the constraint.
// Pass the collection and an optional tag to identify.
var playConstraint = new SpeechRecognitionListConstraint(playCmds, "play");

// Add it into teh recognizer
_speechRecognizer.Constraints.Add(playConstraint);

// Then add the constraint for pausing and resuming.
var pauseConstraint = new SpeechRecognitionListConstraint(new [] { "Pause", "Resume" }, "pauseAndResume");
_speechRecognizer.Constraints.Add(pauseConstraint);
```

This is only a demo. We need make a decision by the real business logic and program design about how many constraints we need build and which strings we fill into the constraint. We just need 1 constraint in most cases.

## Specify an SRGS grammar constraint

The `SpeechRecognitionGrammarFileConstraint` class is used to load an SRGS file (.grxml) as constraint. The following sample is about to turn on or off a light. We pass the file and the tag to the class to initialize a new instance.

```csharp
// Get a file.
var grammarFile = await GetFileFromApplicationUriAsync(new Uri("ms-appx:///Assets/Light.grxml"));

// Create the constraint from the file.
var srgsConstraint = new SpeechRecognitionGrammarFileConstraint(grammarFile, "light");

// Add the constraint.
_speechRecognizer.Constraints.Add(srgsConstraint);
```

Then we need implement the Light.grxml file in Assets folder of the project.

## SRGS file

Create Light.grxml file in Assets folder of the proejct. In Properties window for the file, the Package Action is set to Content with Copy to Output Directory set to Copy always. Then content of the file should be under the SRGS grammar which is the industry-standard markup language for creating XML-format grammars for speech recognition. Let's add following XML nodes in the file.

```xml
<grammar xml:lang="en" root="Control" version="1.0"  tag-format="semantics/1.0" xmlns="http://www.w3.org/2001/06/grammar">
    <rule id="Control">
    </rule>
</gramma>
```

在这里，`grammar` 根节点里的 `xml:lang` 属性，用于定义这个 SRGS 文件所支持的语言，只有当当前语音识别的语音于这个值匹配的时候，该文件中描述的语音识别规则才有效；而 `root` 属性里需要定义一个规则的 ID，在 `grammar` 根节点里可以定义多套规则，但是入口只有1个，即此属性中定义的；其它属性可参考 [MSDN documentation](https://msdn.microsoft.com/zh-cn/library/hh361670)。在 `grammar` 根节点里面，必须至少有一个 `rule` 节点，并需要定义其 `id` 属性，用于检索。`id` 值和 `grammar` 根节点 `root` 属性定义的值相同的 `rule` 节点，即为此文件所指定的主规则；其它规则通常是被用于引用的。`rule` 节点中所支持的属性可参阅 [MSDN documentation](https://msdn.microsoft.com/zh-cn/library/hh361673)。

由于我们计划控制灯的开关，首先，需要一项规则是打开灯，因此，我们在 `grammar` 根节点中新建一个 `rule` 节点，并指定一个 ID `TurnOn`，然后在里面来实现这个规则。具体的实现方式是，在里面添加一个 `item` 节点，该节点的目的是指定预期可能说的话。

```xml
<rule id="TurnOn">
    <item>Turn on the light</item>
</rule>
```

However, we do not always say "Turn on the light" to turn on the light. Sometimes, we just say "Light on" or other sentence with the same meaning. We need use a node `one-of` to set a number of same-meaning-words to merge into the one. So we modify the node like following.

```xml
<rule id="TurnOn">
    <one-of>
        <item>Turn on the light</item>
        <item>Turn on light</item>
        <item>Light on</item>
    </one-of>
</rule>
```

Sometimes, people will add a word "please" before or after the sentence. So we need handle this. We can move `one-off` into a new node `item` with "please" and add another node `item` before it to declare something need say before it. But this is not necessary to say so that we need set it is optional. We need use an attribute `repeat` in `item` to do so. This attribute is used to mark how many times the item should be repeat. In this case, it should be 0 or 1 time. And the "please" after original words will be handled as this way, too. So we get following code.

```xml
<rule id="TurnOn">
    <item repeat="0-1">please</item>
    <item>
        <one-of>
            <item>turn on the light</item>
            <item>turn on light</item>
            <item>light on</item>
        </one-of>
    </item>
    <item repeat="0-1">please</item>
</rule>
```

Node `item` has other attributes, see [MSDN documentation](https://msdn.microsoft.com/en-us/library/hh361582)。

This is for turning on the light. And following is about turning off the light.

```xml
<rule id="TurnOff">
    <item repeat="0-1">please</item>
    <item>
        <one-of>
            <item>turn off the light</item>
            <item>turn off light</item>
            <item>light off</item>
        </one-of>
    </item>
    <item repeat="0-1">please</item>
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

## Rule path handling for SRGS

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

And we need update `Speech_Click()` member method to call the above method after the constraints are handled during recognizing.

```csharp
// Get the recognition result.
var speechRecognitionResult = await SpeechRecognizeAsync();

// Execute the next business logic by constraint.
if (speechRecognitionResult.Constraint == null) return;
switch (speechRecognitionResult.Constraint.Tag)
{
    case "light":
        Control(speechRecognitionResult.RulePath.ToList());
        break;
    case "play":
        // Play something.
        var songName = speechRecognitionResult.Text.Substring("Play ".Length).Trim();
        break;
    case "pauseAndResume":
        // Pause something.
        break;
}
```

## Text to speech

Speech recognition is a kind of input, and text to speech is a kind of output. Sometimes we need give the voice back after a user says something to simulate the natural communication.

One of the way to play the sound in UWP app is to add a `MediaElement` control. So we add it into MainPage.xaml file.

```xaml
<MediaElement x:Name="mediaElement"/>
```

Then we need synthesize the voice from a specific text to play so we add a new member method to do so by using the `MediaElement` control in the page.

```csharp
private SpeechSynthesizer _synth = new SpeechSynthesizer();

private async void Speak(string value)
{
    // Generate the audio stream from plain text.
    var stream = await _synth.SynthesizeTextToStreamAsync(value);

    // Send the stream to the media object.
    mediaElement.SetSource(stream, stream.ContentType);
    mediaElement.Play();
}
```

Then we need update `Control(IList<string> path)` member method to call it.

```csharp
private Control(IList<string> path)
{
    if （path.Count < 2) return;
    switch (path[1])
    {
        case "TurnOn":
            // Turn on.
            Speak("The light is on.");
            break;
        case "TurnOff":
            // Turn off.
            Speak("The light is off.");
            break;
    }
}
```

Now, press F5 to debug. You can click or tap the button Speech to have a test. It will say "the light is on" after you say "Turn on the light".

## Customize the speech synthesizer

To control the pronounciation in details, we can create an audio stream and output speech based on a Speech Synthesis Markup Language ([SSML](http://www.w3.org/TR/speech-synthesis/)) text string. Following is a sample.

```csharp
// The string to speak with SSML customizations.
string Ssml =
    @"<speak version='1.0' " +
    "xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
    "Hello <prosody contour='(0%,+80Hz) (10%,+80%) (40%,+80Hz)'>World</prosody> " + 
    "<break time='500ms'/>" +
    "Goodbye <prosody rate='slow' contour='(0%,+20Hz) (10%,+30%) (40%,+10Hz)'>World</prosody>" +
    "</speak>";

// The object for controlling the speech synthesis engine (voice).
var synth = new SpeechSynthesizer();

// Generate the audio stream from plain text.
var stream = await synth.synthesizeSsmlToStreamAsync(Ssml);

// Send the stream to the media object.
mediaElement.SetSource(stream, stream.ContentType);
mediaElement.Play();
```
