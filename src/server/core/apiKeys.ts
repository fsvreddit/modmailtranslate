import { redis, settings } from "@devvit/web/server";
import { AppSetting } from ".";
import { endOfMonth, format } from "date-fns";

const LOCAL_API_KEY = "localAPIKey";

export async function setLocalAPIKey (apiKey: string) {
    await redis.set(LOCAL_API_KEY, apiKey);
}

function getThisMonthsUsageKey (): string {
    return `translationsThisMonth:${format(new Date(), "yyyy-MM")}`;
}

interface APIKeyResponse {
    apiKey?: string;
    type?: "local" | "global";
    freeTrialUsesLeft?: number;
}

export async function getAPIKey (): Promise<APIKeyResponse> {
    const localAPIKey = await redis.get(LOCAL_API_KEY);
    if (localAPIKey) {
        return { apiKey: localAPIKey, type: "local" };
    }

    const appSettings = await settings.getAll();

    const monthlyQuota = appSettings[AppSetting.FreeTranslationsPerMonth] as number | undefined ?? 0;
    const translationsThisMonthValue = await redis.get(getThisMonthsUsageKey()) ?? "0";
    const translationsThisMonth = parseInt(translationsThisMonthValue, 10);

    const globalAPIKey = appSettings[AppSetting.GlobalAPIKey] as string | undefined;

    if (monthlyQuota > translationsThisMonth) {
        return { apiKey: globalAPIKey, type: "global", freeTrialUsesLeft: monthlyQuota - translationsThisMonth };
    } else {
        return {};
    }
}

export async function incrementTranslationsThisMonth () {
    const newValue = await redis.incrBy(getThisMonthsUsageKey(), 1);
    if (newValue === 1) {
        // expire after 31 days, which is enough to cover any month
        await redis.expire(getThisMonthsUsageKey(), 60 * 60 * 24 * 31);
    }
}

export async function setTranslationsThisMonth (value: number) {
    await redis.set(getThisMonthsUsageKey(), value.toString(), { expiration: endOfMonth(new Date()) });
}
