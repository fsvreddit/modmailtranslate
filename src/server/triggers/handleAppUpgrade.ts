import { TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { context } from "@devvit/web/server";

export const handleAppUpgrade = (c: Context) => {
    console.log(`App upgraded in subreddit ${context.subredditName} to version ${context.appVersion}`);
    return c.json<TriggerResponse>({ message: "app upgrade handled" }, 200);
};
