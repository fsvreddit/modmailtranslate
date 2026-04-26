import { TriggerResponse } from "@devvit/web/shared";
import { getAPIKey, getLanguageForConversation, incrementFreeTrialUses, ModmailMessage, setLanguageForConversation } from ".";
import { reddit, settings } from "@devvit/web/server";
import OpenAI from "openai";
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

export async function handleTranslateModMessage (message: ModmailMessage): Promise<TriggerResponse> {
    const regex = /!translate( .+)?\n/;
    const matches = regex.exec(message.messageBody);
    if (!matches || matches.length < 2) {
        console.error("Modmail: Invalid !translate command format");
        return { message: "invalid command format" };
    }

    let language = matches[1]?.trim();
    language ??= await getLanguageForConversation(message.conversationId);

    if (!language) {
        await reddit.modMail.reply({
            conversationId: message.conversationId,
            body: "Could not determine target language for translation. Please specify a language using `!translate [language]` followed by the text to translate.",
            isInternal: true,
        });
        return { message: `language not specified for ${message.conversationId}` };
    }

    const remainingMessage = message.messageBody.split("\n").slice(1).join("\n").trim();
    if (!remainingMessage) {
        await reddit.modMail.reply({
            conversationId: message.conversationId,
            body: "No message body found to translate. Please provide a message to translate.",
            isInternal: true,
        });
        return { message: `no message body found to translate for ${message.conversationId}` };
    }

    const apiKeyResponse = await getAPIKey();
    if (!apiKeyResponse.apiKey) {
        await reddit.modMail.reply({
            conversationId: message.conversationId,
            body: "API key is not configured and you are out of free translations. Please set up your API key to use the translation feature.",
            isInternal: true,
        });
        return { message: `API key not configured for ${message.conversationId}` };
    }

    await setLanguageForConversation(message.conversationId, language);
    const model = await settings.get<string>("openAIModel") ?? "gpt-5.4-mini";

    const openAi = new OpenAI({ apiKey: apiKeyResponse.apiKey });
    let response;
    try {
        response = await openAi.responses.create({
            model,
            input: [
                {
                    role: "system",
                    content: `You are a helpful assistant that translates messages on Reddit to ${language}. Translate the attached message to ${language}, preserving the original markdown format if any.`,
                },
                {
                    role: "user",
                    content: remainingMessage,
                },
            ],
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

    if (!response.output_text) {
        const errorMessage = "OpenAI returned an empty translation response.";
        console.error(`${message.messageId}: Empty translation response from OpenAI for conversation ${message.conversationId}`);
        await replyWithTranslationError(message.conversationId, errorMessage);
        return { message: "invalid OpenAI response format" };
    }

    await reddit.modMail.reply({
        conversationId: message.conversationId,
        body: response.output_text,
        isAuthorHidden: true,
    });

    console.log(`${message.messageId}: Successfully translated message to ${language} and replied in modmail conversation ${message.conversationId}`);
    if (apiKeyResponse.type === "global") {
        await incrementFreeTrialUses();
    }

    return { message: `translation successful for ${message.conversationId}` };
}
