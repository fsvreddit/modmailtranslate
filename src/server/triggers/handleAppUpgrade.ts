import { TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { context, redis } from "@devvit/web/server";
import { setTranslationsThisMonth } from "../core";

export const handleAppUpgrade = async (c: Context) => {
    console.log(`App upgraded in subreddit ${context.subredditName} to version ${context.appVersion}`);

    // Data migration. Retain this until no subreddits are still on v1.0.0.
    const freeTrialUsesKey = "freeTrialUses";
    const freeTrialUses = await redis.get(freeTrialUsesKey);
    if (freeTrialUses) {
        await setTranslationsThisMonth(parseInt(freeTrialUses, 10));
        await redis.del(freeTrialUsesKey);
        console.log(`Migrated freeTrialUses (${freeTrialUses}) to translationsThisMonth and deleted old key`);
    }

    return c.json<TriggerResponse>({ message: "app upgrade handled" }, 200);
};
