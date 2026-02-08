/**
 * Test Training Content API
 * Quick test script to verify API endpoints work
 */

import { loadStructuredTrainingContent, getTrainingContentByCategory, searchTrainingContent } from './data/knowledge-base/structured-training-content';

async function testTrainingAPI() {
  console.log('='.repeat(60));
  console.log('🧪 TESTING TRAINING CONTENT API');
  console.log('='.repeat(60));

  try {
    // Test 1: Load all content
    console.log('\n1️⃣ Testing: Load all training content');
    const allContent = await loadStructuredTrainingContent();
    console.log(`✅ Loaded ${allContent.length} documents`);

    if (allContent.length > 0) {
      console.log(`   First document: "${allContent[0].title}"`);
      console.log(`   Categories: ${[...new Set(allContent.map(c => c.category))].join(', ')}`);
    }

    // Test 2: Filter by category
    console.log('\n2️⃣ Testing: Filter by category (battery)');
    const batteryContent = await getTrainingContentByCategory('battery');
    console.log(`✅ Found ${batteryContent.length} battery documents`);

    // Test 3: Search
    console.log('\n3️⃣ Testing: Search for "battery"');
    const searchResults = await searchTrainingContent('battery');
    console.log(`✅ Found ${searchResults.length} matching documents`);

    // Test 4: Content structure
    console.log('\n4️⃣ Testing: Content structure');
    if (allContent.length > 0) {
      const firstDoc = allContent[0];
      console.log(`   Title: ${firstDoc.title}`);
      console.log(`   Category: ${firstDoc.category}`);
      console.log(`   Sections: ${firstDoc.sections.length}`);
      console.log(`   Source: ${firstDoc.source}`);
      if (firstDoc.sections.length > 0) {
        console.log(`   First section heading: "${firstDoc.sections[0].heading || 'None'}"`);
        console.log(`   First section content length: ${firstDoc.sections[0].content.length} chars`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testTrainingAPI();

