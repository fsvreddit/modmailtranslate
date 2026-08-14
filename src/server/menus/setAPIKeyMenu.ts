import { UiResponse } from "@devvit/web/shared";
import { Context } from "hono";

export const setAPIKeyMenu = (c: Context) => c.json<UiResponse>({
    showForm: {
        name: "set-openai-key",
        form: {
            fields: [
                {
                    name: "apiKey",
                    label: "OpenAI API Key",
                    helpText: "Enter your OpenAI API key, or 'delete' to remove the existing key.",
                    type: "string",
                    required: true,
                },
            ],
        },
    },
});
