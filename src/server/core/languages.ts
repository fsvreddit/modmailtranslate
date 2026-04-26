import { redis } from "@devvit/web/server";
import { addDays } from "date-fns";

function getLanguageKeyForConversation (conversationId: string): string {
    return `languageForConversation:${conversationId}`;
}

export async function setLanguageForConversation (conversationId: string, language: string) {
    await redis.set(getLanguageKeyForConversation(conversationId), language, { expiration: addDays(new Date(), 28) });
}

export async function getLanguageForConversation (conversationId: string): Promise<string | undefined> {
    return await redis.get(getLanguageKeyForConversation(conversationId));
}

export const LANGUAGES: Record<string, string> = {
    en: "English",
    ar: "Arabic",
    bn: "Bengali",
    zh: "Chinese",
    cs: "Czech",
    da: "Danish",
    nl: "Dutch",
    fi: "Finnish",
    fr: "French",
    de: "German",
    el: "Greek",
    he: "Hebrew",
    hi: "Hindi",
    id: "Indonesian",
    it: "Italian",
    ja: "Japanese",
    ko: "Korean",
    ms: "Malay",
    no: "Norwegian",
    pl: "Polish",
    pt: "Portuguese",
    ro: "Romanian",
    ru: "Russian",
    es: "Spanish",
    sv: "Swedish",
    tl: "Tagalog",
    th: "Thai",
    tr: "Turkish",
    uk: "Ukrainian",
    ur: "Urdu",
    vi: "Vietnamese",
};

export function getLanguage (languageCode?: string): string | undefined {
    return LANGUAGES[languageCode ?? "en"];
}
