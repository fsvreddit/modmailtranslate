import { redis, settings } from "@devvit/web/server";
import { AppSetting } from ".";

const LOCAL_API_KEY = "localAPIKey";
const FREE_TRIAL_USES = "freeTrialUses";

export async function setLocalAPIKey (apiKey: string) {
    await redis.set(LOCAL_API_KEY, apiKey);
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

    const freeTrialsAvailable = appSettings[AppSetting.FreeTrialUsesAvailable] as number | undefined ?? 0;
    const freeTrialUsesValue = await redis.get(FREE_TRIAL_USES) ?? "0";
    const freeTrialUses = parseInt(freeTrialUsesValue, 10);

    const globalAPIKey = appSettings[AppSetting.GlobalAPIKey] as string | undefined;

    if (freeTrialsAvailable > freeTrialUses) {
        return { apiKey: globalAPIKey, type: "global", freeTrialUsesLeft: freeTrialsAvailable - freeTrialUses };
    } else {
        return {};
    }
}

export async function incrementFreeTrialUses () {
    await redis.incrBy(FREE_TRIAL_USES, 1);
}
