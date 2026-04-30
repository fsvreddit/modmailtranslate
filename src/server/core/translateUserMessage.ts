import { reddit, settings } from "@devvit/web/server";
import { TriggerResponse } from "@devvit/web/shared";
import { AppSetting, deleteLanguageForConversation, getAPIKey, getLanguage, incrementTranslationsThisMonth, ModmailMessage, setLanguageForConversation } from ".";
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

export function getTextToTranslate (message: ModmailMessage): string | undefined {
    const messages: string[] = [];
    const accountsToSkip = new Set([
        "bot-bouncer",
        "modmail-userinfo",
    ]);

    let foundMessageFromUser = false;
    for (const msg of message.messagesInConversation) {
        if (msg.author?.name && accountsToSkip.has(msg.author.name)) {
            continue;
        }

        if (msg.author?.name !== message.participant) {
            if (foundMessageFromUser) {
                break;
            } else {
                continue;
            }
        }
        if (!msg.bodyMarkdown) {
            continue;
        }
        messages.unshift(msg.bodyMarkdown.trim());
        foundMessageFromUser = true;
    }

    return messages.length > 0 ? messages.join("\n\n") : undefined;
}

export async function handleTranslateUserMessage (message: ModmailMessage, isAuto = false): Promise<TriggerResponse> {
    const messageFromUser = getTextToTranslate(message);
    if (!messageFromUser) {
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
        if (!isAuto) {
            await reddit.modMail.reply({
                conversationId: message.conversationId,
                body: "API key is not configured and you are out of free translations for this month. Please set up your API key to use the translation feature.",
                isInternal: true,
            });
        }
        console.error(`API key not configured for conversation ${message.conversationId}`);
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
                    content: messageFromUser,
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
        await deleteLanguageForConversation(message.conversationId);
        return { message: "detected language is the same as target language in auto-translate mode, skipping translation" };
    }

    const modmailOutput: json2md.DataObject[] = [
        { p: `Detected Language: ${output.detectedLanguage}. Translation:` },
        { blockquote: output.translatedText },
    ];

    if (appSettings[AppSetting.ShowQuotaLevels] && apiKeyResponse.type === "global") {
        const freeTranslationsLeft = Math.max((apiKeyResponse.freeTranslationsLeft ?? 0) - 1, 0);
        modmailOutput.push({ p: `Free translations left for this month: ${freeTranslationsLeft}` });
    }

    await reddit.modMail.reply({
        conversationId: message.conversationId,
        body: json2md(modmailOutput),
        isInternal: true,
    });

    await setLanguageForConversation(message.conversationId, output.detectedLanguage);

    console.log(`${message.messageId}: Successfully translated message from ${output.detectedLanguage} to ${targetLanguage} and replied in modmail conversation ${message.conversationId}`);
    if (apiKeyResponse.type === "global") {
        await incrementTranslationsThisMonth();
    }

    return { message: `translation successful for ${message.conversationId}` };
}
