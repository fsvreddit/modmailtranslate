import assert from "node:assert/strict";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replyMock = vi.fn();
const getAllMock = vi.fn();
const getSettingMock = vi.fn();
const getAPIKeyMock = vi.fn();
const incrementFreeTrialUsesMock = vi.fn();
const setLanguageForConversationMock = vi.fn();
const getLanguageMock = vi.fn();
const getLanguageForConversationMock = vi.fn();
const createResponseMock = vi.fn();

class MockOpenAI {
    responses = {
        create: createResponseMock,
    };
}

const outputTextKey = "output_text";

function getResponseMessage (response: { message?: string }) {
    return response.message;
}

function getReplyBody (): string | undefined {
    const [replyCall] = replyMock.mock.calls as [[{ body?: string }]?];
    return replyCall?.[0]?.body;
}

vi.mock("@devvit/web/server", () => ({
    reddit: {
        modMail: {
            reply: replyMock,
        },
    },
    settings: {
        getAll: getAllMock,
        get: getSettingMock,
    },
}));

vi.mock("./index.js", () => ({
    AppSetting: {
        Language: "language",
        OpenAIModel: "openAIModel",
    },
    getAPIKey: getAPIKeyMock,
    getLanguage: getLanguageMock,
    getLanguageForConversation: getLanguageForConversationMock,
    incrementFreeTrialUses: incrementFreeTrialUsesMock,
    setLanguageForConversation: setLanguageForConversationMock,
}));

vi.mock("openai/index.js", () => ({
    OpenAI: MockOpenAI,
}));

vi.mock("openai", () => ({
    default: MockOpenAI,
}));

const { handleTranslateUserMessage } = await import("./translateUserMessage.js");
const { handleTranslateModMessage } = await import("./translateModMessage.js");

const baseMessage = {
    conversationId: "conv-1",
    messageId: "msg-1",
    participant: "translator-user",
    messageBody: "!translate Spanish\nHello world",
    messagesInConversation: [
        {
            author: { name: "translator-user" },
            bodyMarkdown: "Bonjour tout le monde",
        },
    ],
};

describe("translation failure handling", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        replyMock.mockResolvedValue(undefined);
        getAPIKeyMock.mockResolvedValue({ apiKey: "test-key", type: "local" });
        getAllMock.mockResolvedValue({
            openAIModel: "gpt-5.4-mini",
            language: ["en"],
        });
        getSettingMock.mockResolvedValue("gpt-5.4-mini");
        getLanguageMock.mockReturnValue("English");
        getLanguageForConversationMock.mockResolvedValue("Spanish");
        incrementFreeTrialUsesMock.mockResolvedValue(undefined);
        setLanguageForConversationMock.mockResolvedValue(undefined);
    });

    it("returns a controlled error when the user translation OpenAI call throws", async () => {
        createResponseMock.mockRejectedValueOnce(new Error("network down"));

        const response = await handleTranslateUserMessage(baseMessage);

        assert.equal(getResponseMessage(response), "error from OpenAI API: network down");
        expect(replyMock).toHaveBeenCalledTimes(1);
        expect(replyMock).toHaveBeenCalledWith(expect.objectContaining({
            conversationId: "conv-1",
            isInternal: true,
        }));
        expect(getReplyBody()).toContain("network down");
        expect(setLanguageForConversationMock).not.toHaveBeenCalled();
    });

    it("returns a controlled error when the structured user translation response cannot be parsed", async () => {
        createResponseMock.mockResolvedValueOnce({
            [outputTextKey]: "{not-json}",
        });

        const response = await handleTranslateUserMessage(baseMessage);

        assert.equal(getResponseMessage(response), "invalid OpenAI response format");
        expect(replyMock).toHaveBeenCalledTimes(1);
        expect(getReplyBody()).toContain("Could not parse structured translation response");
        expect(setLanguageForConversationMock).not.toHaveBeenCalled();
    });

    it("returns a controlled error when the mod translation OpenAI call throws", async () => {
        createResponseMock.mockRejectedValueOnce(new Error("request timed out"));

        const response = await handleTranslateModMessage(baseMessage);

        assert.equal(getResponseMessage(response), "error from OpenAI API: request timed out");
        expect(replyMock).toHaveBeenCalledTimes(1);
        expect(replyMock).toHaveBeenCalledWith(expect.objectContaining({
            conversationId: "conv-1",
            isInternal: true,
        }));
        expect(getReplyBody()).toContain("request timed out");
    });

    it("returns a controlled error when the mod translation response is empty", async () => {
        createResponseMock.mockResolvedValueOnce({
            [outputTextKey]: "",
        });

        const response = await handleTranslateModMessage(baseMessage);

        assert.equal(getResponseMessage(response), "invalid OpenAI response format");
        expect(replyMock).toHaveBeenCalledTimes(1);
        expect(getReplyBody()).toContain("OpenAI returned an empty translation response.");
    });
});
