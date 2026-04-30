A translation app for Modmail.

This app supports a `!translate` command to translate text in Modmail, with the intention being to translate foreign communication from a user to and from a language that the mod team can work with.

Note: You need to set up an OpenAI API key to use this app, although 50 free translations per subreddit per month are being funded by the developer before a key is required. If you want to support the developer, please consider using your own key anyway. The 50 free translations quota may change in the future.

API keys can be set using the subreddit-level menu option "Set Modmail Translator OpenAI Key".

Modmail Translator uses the gpt-5.4-mini model to handle requests.

### Translating a user's message

Use the command `!translate` **on its own** in a modmail. The app will find the last message from the user and translate it to the language you have configured in the app's settings. It will tell you the language that was detected, too.

The app will translate the text of the previous message and respond as a private moderator note. Please remember to use a private mod note when issuing the command.

If you turn the "Continuous translation mode" option on in settings, subsequent messages from the user will be automatically translated without having to issue a `!translate` command, but only after you have triggered it once.

Example:

![Screenshot showing !translate command in isolation](https://raw.githubusercontent.com/fsvreddit/modmailtranslate/refs/heads/main/readme_images/translatecommand.png)

### Translating a message to a user

Use the command `!translate` or `!translate French` or similar along with the message you wish to translate on subsequent lines. If you have already translated a message from the user, it will assume you want to translate to the language the user used. For example:

> !translate
>
> You were banned because you broke our rules on hate speech

or if you want to specify the language:

> !translate Russian
>
> All posts on r/Rateme must include a verification image showing you holding a paper sign with the words "Rate me" on it

The app will translate the text to the language specified and respond to the user as the mod team. Please remember to use a private mod note when issuing the command.

Example:

![Screenshot showing !translate command for a reply](https://raw.githubusercontent.com/fsvreddit/modmailtranslate/refs/heads/main/readme_images/translatereply.png)

## FAQs

### Why aren't all initial messages translated?

The cost of OpenAI API calls would be substantially higher if all inbound messages were checked to see if they needed translation. Instead, to manage costs, initial translations are only done on demand. Using Continuous Mode you can decide to auto-translate subsequent messages from users when you know that users are likely to converse in a language your mod team does not understand.

### Why do I have to provide an API key after a monthly quota is provided?

OpenAI API calls for this app are individually very cheap, but costs could add up if this app becomes popular.

It would be greatly appreciated if you can provide your own key if you are a heavy user. I expect that the current quota of 50 translations per month will be sufficient for most subreddits.

### A language my mod team uses isn't supported to translate to. Can it be added?

Absolutely! Get in touch and I'll add it to the next version.

## Change History

### v1.1

* If a user has written multiple messages in quick succession, the whole sequence of messages gets translated rather than just the most recent message
* Removed lifetime "free trial" model and move to a monthly free translations quota model
* Prevent Dev Platform issues from causing issues by doing duplicate translations for the same message
* Add option to show remaining free quota when translating messages

## Source code

Modmail Translator is open source under the BSD three-clause license. [You can find the source code on Github](https://github.com/fsvreddit/modmailtranslate).

## Fetch Domains

This app uses the OpenAI API to translate text.
