import { OnModMailRequest } from "@devvit/web/shared";
import { Context } from "hono";
import { context, GetConversationResponse, reddit } from "@devvit/web/server";
import { handleTranslateThat, handleTranslateThis, ModmailMessage } from "../core";

export const handleModmail = async (c: Context) => {
    const modmailRequest = await c.req.json<OnModMailRequest>();

    console.log(`Received modmail request from ${modmailRequest.messageAuthorType}: ${modmailRequest.messageAuthor?.name}`);

    if (modmailRequest.messageAuthorType !== "ParticipatingAs_MODERATOR") {
        console.log(`${modmailRequest.messageId}: Message author is not a moderator. Ignoring modmail request.`);
        return c.json({ message: "message author is not a moderator" }, 200);
    }

    console.log(`${modmailRequest.messageId}: Received modmail message from moderator ${modmailRequest.messageAuthor?.name}`);

    let conversation: GetConversationResponse;
    try {
        conversation = await reddit.modMail.getConversation({ conversationId: modmailRequest.conversationId });
        if (!conversation.conversation) {
            console.error(`${modmailRequest.messageId}: Conversation ${modmailRequest.conversationId} not found`);
            return c.json({ message: "conversation not found" }, 404);
        }
    } catch (error) {
        console.error(`${modmailRequest.messageId}: Error fetching conversation ${modmailRequest.conversationId}`, error);
        console.log(JSON.stringify(modmailRequest, null, 2));
        return c.json({ message: "error fetching conversation" }, 500);
    }

    if (!conversation.conversation.participant?.name) {
        console.log(`${modmailRequest.messageId}: Conversation participant not found for conversation ${modmailRequest.conversationId}`);
        return c.json({ message: "conversation participant not found" }, 404);
    }

    const messagesInConversation = Object.values(conversation.conversation.messages).reverse();
    const currentMessage = messagesInConversation.find(message => message.id && modmailRequest.messageId.includes(message.id));
    if (!currentMessage?.bodyMarkdown) {
        console.error(`${modmailRequest.messageId}: Current message not found`);
        return c.json({ message: "current message not found" }, 400);
    }

    if (currentMessage.author?.name === context.appSlug) {
        return c.json({ message: "ignoring message sent by the app itself" }, 200);
    }

    const modmailMessage: ModmailMessage = {
        conversationId: modmailRequest.conversationId,
        participant: conversation.conversation.participant.name,
        messageId: modmailRequest.messageId,
        messageBody: currentMessage.bodyMarkdown,
        messagesInConversation,
    };

    if (modmailMessage.messageBody.startsWith("!translatethis")) {
        return c.json(await handleTranslateThis(modmailMessage), 200);
    } else if (modmailMessage.messageBody.startsWith("!translatethat")) {
        return c.json(await handleTranslateThat(modmailMessage), 200);
    } else {
        console.log(`${modmailRequest.messageId}: No translation command found in message. Ignoring modmail request.`);
        return c.json({ message: "no translation command found for this message" }, 200);
    }
};
