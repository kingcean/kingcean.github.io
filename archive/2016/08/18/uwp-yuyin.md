在 UWP 的开发过程中，我们可能需要提供多种交互方式，例如鼠标、键盘、触摸、游戏手柄等，当然，语音也是一项很重要的功能。

众所周知，在 Windows 中的许多个版本都包含有语音功能，特别是在 Windows 10 上，Cortana（小娜）更是非常智能。同时，对于开发者而言，我们也能非常方便的在其中融入我们的功能，不过本文并不是想说这个。这里将介绍如何开发我们自己的 UWP 应用的语音交互，即，在我们的 UWP 内部，支持用户的语音命令和语音输入，并提供语音反馈。

## 语音识别

首先，在 Visual Studio 2015 Update 3 或更高版本中，创建一个 UWP 项目。打开 MainPage.xaml.cs 文件，我们需要先在其中加入以下命名空间，这些将分别用于处理语音识别、语音合成和文件访问。

```csharp
using Windows.Media.SpeechRecognition;
using Windows.Media.SpeechSynthesis;
using Windows.Storage;
```

现在，我们需要实现一个方法，在 MainPage 类里创建一个字段，用于存储用于语音识别的对象。

```csharp
private SpeechRecognizer _speechRecognizer;
```

首先，我们需要在 MainPage 类里实现一个方法，用于执行语音识别，并返回结果。在处理语音识别的过程当中，需要用到一个名为 `SpeechRecognizer` 的类所创建的实例，该实例可被复用，以便多次处理语音识别任务。因此，我们还需要一个字段来存储这个实例，并在该方法首次调用时，初始化这个实例。另外，由于该实例可以添加一些限定条件，用于描述场景，所以在使用前，需要先对这些限定进行编译，即使并没有添加任何限定。该编译过程和语音识别都是异步的，因此我们需要将这个方法也声明为异步方法。

```csharp
public async Task<SpeechRecognitionResult> SpeechRecognizeAsync() {
    if (_speechRecognizer)
    {
        // Create an instance of SpeechRecognizer.
        _speechRecognizer = new SpeechRecognizer();

        // Compile the dictation grammar by default.
        await _commandSpeechRecognizer.CompileConstraintsAsync();
    }

    // Start recognition.
    return await _speechRecognizer.RecognizeAsync();
}
```

另外，也可以在这个方法里初始化 `_speechRecognizer` 字段的地方，对该实例的一些行为和状态做一些控制，例如使用其 `RecognitionQualityDegrading` 事件监听语音输入的质量等。

现在，我们可以在界面中添加一个按钮，绑定一个点击事件，用以测试语音录入功能。

```xaml
<Button x:Name="SpeechButton" Content="Speech" Click="Speech_Click" />
```

在绑定的点击事件中，需要先调用前面写的 `SpeechRecognizeAsync()` 成员方法获取到识别后的结果，然后在识别后，出于测试目的，我们弹出一个对话框，显示所识别的文本内容。在实际使用场景中，这个结果应该是被输入到文本框，或者是用在其它场合。

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

现在，按下 F5 运行，可以发现，界面上有一个按钮，点击后，说出一句话，稍等片刻，即会弹出一个标题为“Text spoken”的对话框，里面包含了刚才所说的内容。

## 使用图形输入界面

在刚才的场景中，点一下按钮后，其实界面看似并没有任何反应，但其实已经开始进入聆听我们说话的过程中了，这样的用户体验并不好，可能需要加入一些提示，例如提示用户开始聆听等。

不过，其实系统也有提供默认的通用界面可供调用。这些界面虽然较为简单，但在许多场景下也的确满足需求。系统默认的界面会在开始聆听时弹出一个对话框，显示“正在聆听”并发出提示音；当聆听结束时，会在该弹出框中显示所聆听到的内容，并同时用合成语音进行反馈；而失败时，也会在该弹出框中显示出错信息，并提供合成语音反馈。

使用系统默认的语音识别界面，仅需把 `SpeechRecognizeAsync()` 成员方法中最后一步的 `speechRecognizer.RecognizeAsync()` 调用，替换成 `speechRecognizer.RecognizeWithUIAsync()` 即可。

```csharp
// Start recognition.
return await _speechRecognizer.RecognizeWithUIAsync();
```

如果需要调整系统默认的界面中的内容，例如“正在聆听”的显示文案、示例提示等信息等信息，也可以在初始化 `_speechRecognizer` 字段时，在执行编译过程之前，即调用 `await _speechRecognizer.CompileConstraintsAsync();` 方法之前，通过对该字段的 `UIOptions` 属性进行设置来控制。

```csharp
// 可以设置“正在聆听”期间的文案。
_speechRecognizer.UIOptions.AudiblePrompt = "请问你打算要我做什么？";

// 可以设置“正在聆听”期间显示的示例提示，用于提示用户可以说什么。
_speechRecognizer.UIOptions.ExampleText = "请尝试说：播放、暂停。";

// 当聆听结束后，可以设置是否要通过合成语音读出听到的结果。
_speechRecognizer.UIOptions.IsReadBackEnabled = false;

// 可以设置是否要显示聆听成功后的确认消息框。
_speechRecognizer.UIOptions.ShowConfirmation = false;
```

除此之外，也可以对该字段的 `Timeouts` 成员属性里的属性进行设置，以控制各类时长。

## 语音合成

```csharp
<MediaElement x:Name="mediaElement" HorizontalAlignment="Left" Height="100" Margin="0,95,0,0" VerticalAlignment="Top" Width="100" Grid.Column="1" Grid.Row="2"/>
```
