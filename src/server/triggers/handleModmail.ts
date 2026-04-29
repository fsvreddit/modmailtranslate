import { OnModMailRequest, TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { context, GetConversationResponse, reddit, redis, settings } from "@devvit/web/server";
import { AppSetting, getLanguageForConversation, handleTranslateUserMessage, handleTranslateModMessage, ModmailMessage } from "../core";
import { addMonths } from "date-fns";

export const handleModmail = async (c: Context) => {
    const modmailRequest = await c.req.json<OnModMailRequest>();

    if (modmailRequest.messageAuthor?.name === context.appSlug) {
        return c.json<TriggerResponse>({ message: "ignoring message sent by the app itself" }, 200);
    }

    if (modmailRequest.conversationType !== "sr_user") {
        console.log(`${modmailRequest.messageId}: Conversation ${modmailRequest.conversationId} is not a user conversation. Ignoring modmail request.`);
        return c.json<TriggerResponse>({ message: "conversation is not a user conversation" }, 200);
    }

    console.log(`Received modmail request from ${modmailRequest.messageAuthorType}: ${modmailRequest.messageAuthor?.name}`);

    console.log(`${modmailRequest.messageId}: Received modmail message from moderator ${modmailRequest.messageAuthor?.name}`);

    let conversation: GetConversationResponse;
    try {
        conversation = await reddit.modMail.getConversation({ conversationId: modmailRequest.conversationId });
        if (!conversation.conversation) {
            console.error(`${modmailRequest.messageId}: Conversation ${modmailRequest.conversationId} not found`);
            return c.json<TriggerResponse>({ message: "conversation not found" }, 404);
        }
    } catch (error) {
        console.error(`${modmailRequest.messageId}: Error fetching conversation ${modmailRequest.conversationId}`, error);
        console.log(JSON.stringify(modmailRequest, null, 2));
        return c.json<TriggerResponse>({ message: "error fetching conversation" }, 500);
    }

    if (conversation.conversation.conversationType !== "sr_user") {
        console.log(`${modmailRequest.messageId}: Conversation ${modmailRequest.conversationId} is not a user conversation. Ignoring modmail request.`);
        return c.json<TriggerResponse>({ message: "conversation is not a user conversation" }, 200);
    }

    if (!conversation.conversation.participant?.name) {
        console.log(`${modmailRequest.messageId}: Conversation participant not found for conversation ${modmailRequest.conversationId}`);
        return c.json<TriggerResponse>({ message: "conversation participant not found" }, 200);
    }

    const messagesInConversation = Object.values(conversation.conversation.messages).reverse();
    const currentMessage = messagesInConversation.find(message => message.id && modmailRequest.messageId.includes(message.id));
    if (!currentMessage?.bodyMarkdown) {
        console.error(`${modmailRequest.messageId}: Current message not found`);
        return c.json<TriggerResponse>({ message: "current message not found" }, 400);
    }

    const modmailMessage: ModmailMessage = {
        conversationId: modmailRequest.conversationId,
        participant: conversation.conversation.participant.name,
        messageId: modmailRequest.messageId,
        messageBody: currentMessage.bodyMarkdown.trim(),
        messagesInConversation,
    };

    if (modmailRequest.messageAuthorType !== "ParticipatingAs_MODERATOR") {
        const continuousMode = await settings.get<boolean>(AppSetting.ContinuousTranslation);
        if (!continuousMode) {
            console.log(`${modmailRequest.messageId}: Message author is not a moderator and continuous translation mode is disabled. Ignoring modmail request.`);
            return c.json<TriggerResponse>({ message: "message author is not a moderator and continuous translation mode is disabled" }, 200);
        }
        const languageForConversation = await getLanguageForConversation(modmailRequest.conversationId);
        if (languageForConversation) {
            return c.json<TriggerResponse>(await handleTranslateUserMessage(modmailMessage, true), 200);
        } else {
            console.log(`${modmailRequest.messageId}: Message author is not a moderator and no language set for conversation. Ignoring modmail request.`);
            return c.json<TriggerResponse>({ message: "message author is not a moderator and no language set for conversation" }, 200);
        }
    }

    if (!modmailMessage.messageBody.startsWith("!translate")) {
        console.log(`${modmailRequest.messageId}: No translation command found in message. Ignoring modmail request.`);
        return c.json<TriggerResponse>({ message: "no translation command found for this message" }, 200);
    }

    const handledKey = `handled:${modmailRequest.messageId}`;
    if (await redis.exists(handledKey)) {
        console.log(`${modmailRequest.messageId}: Duplicate trigger, ignoring.`);
        return c.json<TriggerResponse>({ message: "modmail message has already been handled" }, 200);
    }
    await redis.set(handledKey, "true", { expiration: addMonths(new Date(), 1) });

    const lineCount = modmailMessage.messageBody.split("\n").map(line => line.trim()).filter(line => line.length > 0).length;

    if (lineCount === 1) {
        return c.json<TriggerResponse>(await handleTranslateUserMessage(modmailMessage), 200);
    } else {
        return c.json<TriggerResponse>(await handleTranslateModMessage(modmailMessage), 200);
    }
};
