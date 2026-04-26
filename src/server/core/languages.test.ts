import assert from "node:assert/strict";
import { describe, it } from "vitest";
import devvitConfig from "../../../devvit.json";
import { LANGUAGES } from "./languages.js";

const languageOptions = devvitConfig.settings.subreddit.language.options;

describe("language options configuration", () => {
    it("has a settings option for every LANGUAGES entry", () => {
        const missingOptions = Object.entries(LANGUAGES).filter(([code, language]) => !languageOptions.some(option => option.value === code && option.label === language));

        assert.deepEqual(missingOptions, []);
    });

    it("has a LANGUAGES entry for every settings option", () => {
        const missingLanguages = languageOptions.filter(option => LANGUAGES[option.value] !== option.label);

        assert.deepEqual(missingLanguages, []);
    });
});
