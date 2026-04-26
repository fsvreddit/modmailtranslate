A translation app for Modmail.

This app supports two commands to translate text in Modmail, with the intention being to translate foreign communication from a user to and from a language that the mod team can work with.

Note: You need to set up an OpenAI API key to use this app, although ten free translations are being funded by the developer for new installs before a key is required.

### Translating a user's message

Use the command `!translate` **on its own** in a modmail. The app will find the last message from the user and translate it to the language you have configured in the app's settings. It will tell you the language that was detected, too.

The app will translate the text of the previous message and respond as a private moderator note. Please remember to use a private mod note when issuing the command.

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

## Fetch Domains

This app uses the OpenAI API to translate text.
