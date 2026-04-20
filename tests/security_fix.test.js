const fs = require('fs');
const vm = require('vm');
const path = require('path');

function runTest() {
  const htmlPath = path.join(__dirname, '../ai-agent-economy.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Extract the escapeHTML function from the script tag
  const scriptRegex = /<script>([\s\S]*?)<\/script>/;
  const match = htmlContent.match(scriptRegex);
  if (!match) {
    throw new Error('Could not find script tag in HTML');
  }

  let scriptText = match[1];

  // Find the escapeHTML function by locating its start and counting braces
  const functionName = 'function escapeHTML';
  const startIndex = scriptText.indexOf(functionName);
  if (startIndex === -1) {
    throw new Error('Could not find escapeHTML function in script');
  }

  let braceCount = 0;
  let foundFirstBrace = false;
  let endIndex = -1;

  for (let i = startIndex; i < scriptText.length; i++) {
    if (scriptText[i] === '{') {
      braceCount++;
      foundFirstBrace = true;
    } else if (scriptText[i] === '}') {
      braceCount--;
    }

    if (foundFirstBrace && braceCount === 0) {
      endIndex = i + 1;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error('Could not find the end of escapeHTML function');
  }

  const escapeHTMLScript = scriptText.substring(startIndex, endIndex);

  const context = {
    console: console,
  };
  vm.createContext(context);
  vm.runInContext(escapeHTMLScript, context);

  const escapeHTML = context.escapeHTML;

  const testCases = [
    { input: '<script>alert(1)</script>', expected: '&lt;script&gt;alert(1)&lt;/script&gt;' },
    { input: 'Hello & welcome', expected: 'Hello &amp; welcome' },
    { input: 'Double "quote"', expected: 'Double &quot;quote&quot;' },
    { input: "Single 'quote'", expected: 'Single &#39;quote&#39;' },
    { input: 123, expected: '123' },
    { input: true, expected: 'true' },
    { input: null, expected: 'null' },
    { input: undefined, expected: 'undefined' },
  ];

  let failures = 0;
  testCases.forEach((tc, index) => {
    const result = escapeHTML(tc.input);
    if (result !== tc.expected) {
      console.error(`Test Case ${index + 1} Failed:`);
      console.error(`  Input:    ${tc.input}`);
      console.error(`  Expected: ${tc.expected}`);
      console.error(`  Actual:   ${result}`);
      failures++;
    } else {
      console.log(`Test Case ${index + 1} Passed`);
    }
  });

  if (failures > 0) {
    process.exit(1);
  } else {
    console.log('All escapeHTML tests passed!');
  }
}

runTest();
