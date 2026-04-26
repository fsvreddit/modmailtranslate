import { TriggerResponse } from "@devvit/web/shared";
import { getAPIKey, getLanguageForConversation, incrementFreeTrialUses, ModmailMessage, setLanguageForConversation } from ".";
import { reddit, settings } from "@devvit/web/server";
import OpenAI from "openai";

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
    const response = await openAi.responses.create({
        model,
        input: [
            {
                role: "system",
                content: `You are a helpful assistant that translates messages to ${language}. Translate the attached message to ${language}, preserving the original markdown format if any.`,
            },
            {
                role: "user",
                content: remainingMessage,
            },
        ],
    });

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
