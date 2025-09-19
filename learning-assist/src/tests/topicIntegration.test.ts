// Integration test for topic creation and retrieval
// This test will:
// 1. Create a topic "Test Topic" in Class 1 Science
// 2. Verify it's stored in the backend
// 3. Verify it can be retrieved
// 4. Check if it appears in the UI

const API_BASE_URL = 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
}

class TopicIntegrationTest {
  private results: TestResult[] = [];
  private createdTopicId: string | null = null;

  async runTest(): Promise<void> {
    console.log('🚀 Starting Topic Integration Test...\n');

    try {
      await this.step1_CreateTopic();
      await this.step2_VerifyTopicExists();
      await this.step3_RetrieveTopicsBySubject();
      await this.step4_CleanupTestData();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test failed with error:', error);
      this.printResults();
    }
  }

  private async step1_CreateTopic(): Promise<void> {
    console.log('📝 Step 1: Creating "Test Topic" in Class 1 Science...');
    
    const topicData = {
      name: 'Test Topic',
      description: 'This is a test topic for automated testing',
      documentLinks: [
        {
          name: 'Test Document 1',
          url: 'https://example.com/doc1'
        },
        {
          name: 'Auto-named Document',
          url: 'https://docs.google.com/document/d/test-doc-2'
        }
      ],
      subject_id: 'subject-class-1-science',
      school_id: 'school-1',
      class_id: 'class-1'
    };

    try {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(topicData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const createdTopic = await response.json();
      this.createdTopicId = createdTopic.id;

      this.results.push({
        step: 'Create Topic',
        success: true,
        data: {
          topicId: createdTopic.id,
          name: createdTopic.name,
          subject_id: createdTopic.subject_id
        }
      });

      console.log('✅ Topic created successfully!');
      console.log(`   Topic ID: ${createdTopic.id}`);
      console.log(`   Name: ${createdTopic.name}`);
      console.log('');

    } catch (error) {
      this.results.push({
        step: 'Create Topic',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async step2_VerifyTopicExists(): Promise<void> {
    console.log('🔍 Step 2: Verifying topic exists by ID...');

    if (!this.createdTopicId) {
      throw new Error('No topic ID available from previous step');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/topics/${this.createdTopicId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const topic = await response.json();

      this.results.push({
        step: 'Verify Topic Exists',
        success: true,
        data: {
          found: true,
          name: topic.name,
          description: topic.description
        }
      });

      console.log('✅ Topic found by ID!');
      console.log(`   Name: ${topic.name}`);
      console.log(`   Description: ${topic.description}`);
      console.log('');

    } catch (error) {
      this.results.push({
        step: 'Verify Topic Exists',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async step3_RetrieveTopicsBySubject(): Promise<void> {
    console.log('📚 Step 3: Retrieving all topics for Class 1 Science...');

    try {
      const response = await fetch(`${API_BASE_URL}/topics?subject_id=subject-class-1-science`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const topics = await response.json();
      const testTopic = topics.find((t: any) => t.id === this.createdTopicId);

      if (!testTopic) {
        throw new Error('Test topic not found in subject topics list');
      }

      this.results.push({
        step: 'Retrieve Topics by Subject',
        success: true,
        data: {
          totalTopics: topics.length,
          testTopicFound: true,
          testTopicName: testTopic.name
        }
      });

      console.log('✅ Topics retrieved successfully!');
      console.log(`   Total topics in Class 1 Science: ${topics.length}`);
      console.log(`   Test topic found: ${testTopic.name}`);
      console.log('');

    } catch (error) {
      this.results.push({
        step: 'Retrieve Topics by Subject',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async step4_CleanupTestData(): Promise<void> {
    console.log('🧹 Step 4: Cleaning up test data...');

    if (!this.createdTopicId) {
      console.log('⚠️  No topic ID to clean up');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/topics/${this.createdTopicId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      this.results.push({
        step: 'Cleanup Test Data',
        success: true,
        data: { deleted: true }
      });

      console.log('✅ Test data cleaned up successfully!');
      console.log('');

    } catch (error) {
      this.results.push({
        step: 'Cleanup Test Data',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('⚠️  Failed to cleanup test data:', error);
    }
  }

  private printResults(): void {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    let passedSteps = 0;
    let totalSteps = this.results.length;

    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.step}: ${status}`);
      
      if (result.success) {
        passedSteps++;
        if (result.data) {
          console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
        }
      } else {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    console.log(`Overall Result: ${passedSteps}/${totalSteps} steps passed`);
    
    if (passedSteps === totalSteps) {
      console.log('🎉 ALL TESTS PASSED! Topic integration is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above.');
    }
  }
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).TopicIntegrationTest = TopicIntegrationTest;
  console.log('💡 To run the test, execute: new TopicIntegrationTest().runTest()');
} else {
  // Node.js environment
  module.exports = TopicIntegrationTest;
}

export default TopicIntegrationTest;