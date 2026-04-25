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
                    type: "string",
                    required: true,
                },
            ],
        },
    },
});
