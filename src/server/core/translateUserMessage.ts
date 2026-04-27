import { reddit, settings } from "@devvit/web/server";
import { TriggerResponse } from "@devvit/web/shared";
import { AppSetting, getAPIKey, getLanguage, incrementFreeTrialUses, ModmailMessage, setLanguageForConversation } from ".";
import z from "zod";
import { OpenAI } from "openai/index.js";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import json2md from "json2md";

async function replyWithTranslationError (conversationId: string, errorMessage: string) {
    await reddit.modMail.reply({
        conversationId,
        body: json2md([
            { p: "An error occurred while trying to translate the message. Error from OpenAI:" },
            { blockquote: errorMessage },
        ]),
        isInternal: true,
    });
}

function getErrorMessage (error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
}

export async function handleTranslateUserMessage (message: ModmailMessage, isAuto = false): Promise<TriggerResponse> {
    const lastMessageFromUser = message.messagesInConversation.find(msg => msg.author?.name === message.participant);
    if (!lastMessageFromUser?.bodyMarkdown) {
        console.error("Modmail: Last message from user not found");
        await reddit.modMail.reply({
            conversationId: message.conversationId,
            body: `Could not find a message to translate from u/${message.participant}.`,
            isInternal: true,
        });
        return { message: "last message from user not found" };
    }

    const responseFormat = z.object({
        detectedLanguage: z.string(),
        translatedText: z.string(),
    });

    const apiKeyResponse = await getAPIKey();
    if (!apiKeyResponse.apiKey) {
        await reddit.modMail.reply({
            conversationId: message.conversationId,
            body: "API key is not configured and you are out of free translations. Please set up your API key to use the translation feature.",
            isInternal: true,
        });
        return { message: `API key not configured for ${message.conversationId}` };
    }

    const appSettings = await settings.getAll();

    const openAi = new OpenAI({ apiKey: apiKeyResponse.apiKey });
    const model = appSettings[AppSetting.OpenAIModel] as string | undefined ?? "gpt-5.4-mini";
    const [targetLanguageValue] = appSettings[AppSetting.Language] as string[] | undefined ?? ["en"];
    const targetLanguage = getLanguage(targetLanguageValue) ?? "English";

    let response;
    try {
        response = await openAi.responses.create({
            model,
            input: [
                {
                    role: "system",
                    content: `You are a helpful assistant that detects the language of the provided message on Reddit and translates it to ${targetLanguage}. Detect the language of the attached message and translate it to ${targetLanguage}, preserving the original markdown format if any, and separately return the language you detected in the message.`,
                },
                {
                    role: "user",
                    content: lastMessageFromUser.bodyMarkdown,
                },
            ],
            text: {
                format: zodTextFormat(responseFormat, "response"),
            },
        });
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error(`${message.messageId}: Error calling OpenAI for conversation ${message.conversationId}`, error);
        await replyWithTranslationError(message.conversationId, errorMessage);
        return { message: `error from OpenAI API: ${errorMessage}` };
    }

    if (response.error?.message) {
        console.error("Error from OpenAI API:", response.error.message);
        await replyWithTranslationError(message.conversationId, response.error.message);
        return { message: `error from OpenAI API: ${response.error.message}` };
    }

    let output;
    try {
        output = responseFormat.parse(JSON.parse(response.output_text));
    } catch (error) {
        const errorMessage = `Could not parse structured translation response: ${getErrorMessage(error)}`;
        console.error(`${message.messageId}: Invalid structured response from OpenAI for conversation ${message.conversationId}`, error);
        await replyWithTranslationError(message.conversationId, errorMessage);
        return { message: "invalid OpenAI response format" };
    }

    if (isAuto && output.detectedLanguage === targetLanguage) {
        console.log(`${message.messageId}: Detected language is the same as target language ${targetLanguage} in auto-translate mode. Skipping translation for conversation ${message.conversationId}`);
        return { message: "detected language is the same as target language in auto-translate mode, skipping translation" };
    }

    await reddit.modMail.reply({
        conversationId: message.conversationId,
        body: json2md([
            { p: `Detected Language: ${output.detectedLanguage}. Translation:` },
            { blockquote: output.translatedText },
        ]),
        isInternal: true,
    });

    await setLanguageForConversation(message.conversationId, output.detectedLanguage);

    console.log(`${message.messageId}: Successfully translated message from ${output.detectedLanguage} to ${targetLanguage} and replied in modmail conversation ${message.conversationId}`);
    if (apiKeyResponse.type === "global") {
        await incrementFreeTrialUses();
    }

    return { message: `translation successful for ${message.conversationId}` };
}
