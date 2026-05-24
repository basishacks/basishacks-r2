import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runSearch(query) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

  // URL encode the query to handle spaces and special characters safely
  const encodedQuery = encodeURIComponent(query);

  // Construct the official REST endpoint URL
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodedQuery}`;

  try {
    // Using Node's native fetch API
    console.log('Fetching');
    const response = await fetch(url);

    // Google API returns error details inside the JSON if the status isn't 200
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const searchResults = data.items;

    if (!searchResults || searchResults.length === 0) {
      console.log('No results found.');
      return;
    }

    console.log(`--- Native Fetch Search Results for: "${query}" ---\n`);

    searchResults.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Link: ${item.link}`);
      console.log(`   Snippet: ${item.snippet}\n`);
    });
  } catch (error) {
    console.log(error);
    console.error('Failed to fetch search results:', error.message);
  }
}

// Execute a sample search

export async function testSearch() {
  console.log('testing search query');

  const query = 'What is the current president of China?';

  const result = await runSearch(query);

  console.log(result);
}
