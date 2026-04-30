import { UiResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { setLocalAPIKey } from "../core";

interface SetAPIKeyFormData {
    apiKey: string;
}

export const handleSetAPIKeyForm = async (c: Context) => {
    const { apiKey } = await c.req.json<SetAPIKeyFormData>();

    await setLocalAPIKey(apiKey);
    console.log("Local API key updated.");

    return c.json<UiResponse>({
        showToast: {
            text: "API key updated successfully.",
            appearance: "success",
        },
    });
};
