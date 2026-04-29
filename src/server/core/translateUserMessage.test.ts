import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getTextToTranslate } from "./translateUserMessage.js";

const participant = "usuario-es";
const modName = "mod-helper";

function buildMessage (messagesInConversation: { author?: { name?: string }; bodyMarkdown?: string }[]) {
    return {
        conversationId: "conv-1",
        messageId: "msg-1",
        participant,
        messageBody: "!translate",
        messagesInConversation,
    };
}

describe("getTextToTranslate", () => {
    it("returns a single user message when it is followed by a mod message", () => {
        const message = buildMessage([
            { author: { name: modName }, bodyMarkdown: "!translate" },
            { author: { name: participant }, bodyMarkdown: "Necesito ayuda con mi cuenta." },
            { author: { name: modName }, bodyMarkdown: "Gracias por contactar al equipo." },
        ]);

        assert.equal(getTextToTranslate(message), "Necesito ayuda con mi cuenta.");
    });

    it("returns a single user message when there are no further older messages", () => {
        const message = buildMessage([
            { author: { name: modName }, bodyMarkdown: "!translate" },
            { author: { name: participant }, bodyMarkdown: "Hola, no puedo iniciar sesion." },
        ]);

        assert.equal(getTextToTranslate(message), "Hola, no puedo iniciar sesion.");
    });

    it("returns a small string of user messages joined in chronological order when followed by a mod message", () => {
        const message = buildMessage([
            { author: { name: modName }, bodyMarkdown: "!translate" },
            { author: { name: participant }, bodyMarkdown: "Gracias por responder." },
            { author: { name: participant }, bodyMarkdown: "Tengo otro problema tambien." },
            { author: { name: participant }, bodyMarkdown: "Hola, necesito ayuda." },
            { author: { name: modName }, bodyMarkdown: "Entendido, revisaremos el caso." },
        ]);

        assert.equal(
            getTextToTranslate(message),
            "Hola, necesito ayuda.\n\nTengo otro problema tambien.\n\nGracias por responder.",
        );
    });

    it("returns a small string of user messages when there are no further older messages", () => {
        const message = buildMessage([
            { author: { name: modName }, bodyMarkdown: "!translate" },
            { author: { name: participant }, bodyMarkdown: "Ya intente eso y no funciono." },
            { author: { name: participant }, bodyMarkdown: "Sigue apareciendo un error." },
            { author: { name: participant }, bodyMarkdown: "Buenos dias, tengo una duda." },
        ]);

        assert.equal(
            getTextToTranslate(message),
            "Buenos dias, tengo una duda.\n\nSigue apareciendo un error.\n\nYa intente eso y no funciono.",
        );
    });

    it("returns undefined when no user message exists", () => {
        const message = buildMessage([
            { author: { name: modName }, bodyMarkdown: "!translate" },
            { author: { name: modName }, bodyMarkdown: "Mensaje interno del equipo." },
        ]);

        assert.equal(getTextToTranslate(message), undefined);
    });
});
