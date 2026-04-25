import { MessageData } from "@devvit/web/server";

export interface ModmailMessage {
    conversationId: string;
    messageId: string;
    participant: string;
    messageBody: string;
    messagesInConversation: MessageData[];
}
