import { reddit, settings } from "@devvit/web/server";
import { TriggerResponse } from "@devvit/web/shared";
import { AppSetting, getAPIKey, incrementFreeTrialUses, languages, ModmailMessage, setLanguageForMessage } from ".";
import z from "zod";
import { OpenAI } from "openai/index.js";
import { zodTextFormat } from "openai/helpers/zod.mjs";

export async function handleTranslateThat (message: ModmailMessage): Promise<TriggerResponse> {
    if (!message.messageBody.startsWith("!translatethat")) {
        console.error("Modmail: Invalid !translatethat command format");
        return { message: "invalid command format" };
    }

    const lastMessageFromUser = message.messagesInConversation.find(msg => msg.author?.name === message.participant);
    if (!lastMessageFromUser?.body) {
        console.error("Modmail: Last message from user not found");
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

    const openAi = new OpenAI({ apiKey: apiKeyResponse.apiKey });
    const model = await settings.get<string>("openAIModel") ?? "gpt-5.4-mini";
    const targetLanguageValue = await settings.get<string>(AppSetting.Language) ?? "en";
    const targetLanguage = languages[targetLanguageValue] ?? "English";

    const response = await openAi.responses.create({
        model,
        input: [
            {
                role: "system",
                content: `You are a helpful assistant that detects the language of the provided message and translates it to ${targetLanguage}. Detect the language of the attached message and translate it to ${targetLanguage}, preserving the original markdown format if any, and separately return the language you detected in the message.`,
            },
            {
                role: "user",
                content: lastMessageFromUser.body,
            },
        ],
        text: {
            format: zodTextFormat(responseFormat, "response"),
        },
    });

    const output = JSON.parse(response.output_text) as z.infer<typeof responseFormat>;

    await reddit.modMail.reply({
        conversationId: message.conversationId,
        body: `**Detected Language:** ${output.detectedLanguage}. **Translation:**\n\n${output.translatedText}`,
        isInternal: true,
    });

    await setLanguageForMessage(message.conversationId, output.detectedLanguage);

    console.log(`${message.messageId}: Successfully translated message from ${output.detectedLanguage} to English and replied in modmail conversation ${message.conversationId}`);
    if (apiKeyResponse.type === "global") {
        await incrementFreeTrialUses();
    }

    return { message: `translation successful for ${message.conversationId}` };
}
