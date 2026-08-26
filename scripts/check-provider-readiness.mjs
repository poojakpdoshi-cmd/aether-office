import { getCliProviderOptions, testCliProviderConfiguration } from "../dist/cli-config.js";

const outcomes = [];
for (const option of getCliProviderOptions()) {
  const result = await testCliProviderConfiguration(option.id);
  outcomes.push({ provider: option.label, ready: result.ok });
}

console.log(JSON.stringify({ outcomes }, null, 2));
