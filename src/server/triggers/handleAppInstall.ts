import { TriggerResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { context } from "@devvit/web/server";

export const handleAppInstall = (c: Context) => {
    console.log(`App installed in subreddit ${context.subredditName} at version ${context.appVersion}`);
    return c.json<TriggerResponse>({ message: "app install handled" }, 200);
};
