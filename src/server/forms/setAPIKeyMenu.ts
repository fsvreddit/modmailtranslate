import { UiResponse } from "@devvit/web/shared";
import { Context } from "hono";
import { removeLocalAPIKey, setLocalAPIKey } from "../core";
import { OpenAI } from "openai";

interface SetAPIKeyFormData {
    apiKey: string;
}

export const handleSetAPIKeyForm = async (c: Context): Promise<Response> => {
    const { apiKey } = await c.req.json<SetAPIKeyFormData>();

    if (apiKey.trim() === "delete") {
        await removeLocalAPIKey();
        return c.json<UiResponse>({
            showToast: {
                text: "API key has been removed.",
                appearance: "success",
            },
        });
    }

    const openAI = new OpenAI({ apiKey });
    try {
        await openAI.models.list();
    } catch (error) {
        console.error("Failed to validate API key:", error);
        return c.json<UiResponse>({
            showToast: {
                text: "Failed to validate API key. Please check the key and try again.",
            },
        });
    }

    await setLocalAPIKey(apiKey);
    console.log("Local API key updated.");

    return c.json<UiResponse>({
        showToast: {
            text: "API key updated successfully.",
            appearance: "success",
        },
    });
};
