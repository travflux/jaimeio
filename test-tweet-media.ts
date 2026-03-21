import { TwitterApi } from 'twitter-api-v2';
import { getXCredentials } from './server/xTwitterService';

const creds = getXCredentials();
if (!creds) {
  console.log('No credentials');
  process.exit(1);
}

const client = new TwitterApi({
  appKey: creds.apiKey,
  appSecret: creds.apiSecret,
  accessToken: creds.accessToken,
  accessSecret: creds.accessTokenSecret,
});

// Get the test tweet ID
const tweetId = '2025471216937480534';

// Fetch the tweet with media expansion
const tweet = await client.v2.singleTweet(tweetId, { 
  expansions: ['attachments.media_keys'], 
  'media.fields': 'type,url,preview_image_url' 
});

console.log('Tweet data:', JSON.stringify(tweet.data, null, 2));
console.log('Includes:', JSON.stringify(tweet.includes, null, 2));
if (tweet.includes?.media) {
  console.log('\nMedia found:', tweet.includes.media.length, 'attachments');
  tweet.includes.media.forEach(m => console.log('  -', m.type, m.url));
} else {
  console.log('\nNo media found in tweet!');
}
