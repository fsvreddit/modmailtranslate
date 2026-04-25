import { redis } from "@devvit/web/server";
import { addDays } from "date-fns";

function getLanguageKeyForMessage (messageId: string): string {
    return `languageForMessage:${messageId}`;
}

export async function setLanguageForMessage (messageId: string, language: string) {
    await redis.set(getLanguageKeyForMessage(messageId), language, { expiration: addDays(new Date(), 28) });
}

export async function getLanguageForMessage (messageId: string): Promise<string | undefined> {
    return await redis.get(getLanguageKeyForMessage(messageId));
}
