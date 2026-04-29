console.log("Running tests...");

import testOAuth2 from "./test.oauth2.js";

let result_testOAuth2;
try {
    result_testOAuth2 = await testOAuth2();
} catch (error) {
    console.error("Error during testOAuth2:", error);
    result_testOAuth2 = false;
}
console.log("================================")
console.log("testOAuth2: " + (result_testOAuth2 ? "PASSED" : "FAILED"));
console.log("================================")

import { testMicrosoftMeeting, testCreateMicrosoftMeeting } from "./test.microsoft.ts";
import initializeMSAccessToken from "../server/plugins/microsoft.ts";

await initializeMSAccessToken();
const token = await import("../server/plugins/microsoft.ts").then(m => m.getMSAccessToken());

const result_testMicrosoftMeeting = await testMicrosoftMeeting(token, "");
console.log("================================")
console.log("testMicrosoftMeeting: " + (result_testMicrosoftMeeting ? "PASSED" : "FAILED"));
console.log("================================")

// const result_testCreateMicrosoftMeeting = await testCreateMicrosoftMeeting(token, "ChunPing.Wong12024-bisz@basischina.com");
// console.log("================================")
// console.log("testCreateMicrosoftMeeting: " + (result_testCreateMicrosoftMeeting ? "PASSED" : "FAILED"));
// console.log("================================")
