async function check(url) {
  try {
    console.log('Fetching URL:', url);
    const res = await fetch(url);
    const text = await res.text();
    const ogTags = text.match(/<meta[^>]*property="og:[^>]*>/gi);
    const twitterTags = text.match(/<meta[^>]*name="twitter:[^>]*>/gi);
    console.log('Status Header:', res.status);
    console.log('OG Tags:');
    if (ogTags) {
      console.log(ogTags.join('\n'));
    } else {
      console.log('NONE FOUND');
    }
    console.log('Twitter Tags:');
    if (twitterTags) {
      console.log(twitterTags.join('\n'));
    } else {
      console.log('NONE FOUND');
    }
  } catch (err) {
    console.error('Error fetching', url, err);
  }
}

async function run() {
  await check('https://nexiplay.vercel.app');
  // Need to find a valid movie URL to check
}
run();
