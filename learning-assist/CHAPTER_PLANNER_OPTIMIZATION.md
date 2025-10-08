# Chapter Planner Optimization Analysis

## Current Implementation Analysis

### Request Flow
1. User uploads PDF (up to 100,000 characters)
2. Single API call to `analyze-chapter` endpoint
3. Expects JSON array of topic suggestions
4. `maxOutputTokens`: 30,000

### Current Issues

**1. Timeout Risk Factors**
- **Large input**: Up to 100KB of text content
- **Complex prompt**: 272 lines of instructions
- **Large output**: Expecting 30,000 tokens for detailed topic breakdowns
- **Single API call**: No progressive generation
- **Backend timeout**: 180 seconds (3 minutes) Lambda timeout
- **API Gateway timeout**: 30 seconds default (hard limit)

**2. Prompt Complexity**
```
Prompt Structure:
- Instructions: ~100 lines
- Content: Up to 100,000 characters
- Example JSON: ~50 lines
- Guidelines: ~30 lines
Total: Potentially 100KB+ prompt
```

**3. Output Requirements**
- Generate 3-8 detailed topics
- Each topic includes:
  - Name (descriptive)
  - Content (200-500 words each)
  - Learning objectives (multiple)
  - Estimated minutes
  - Part numbers
- Total expected output: 5,000-15,000 tokens

## Optimization Strategies

### Strategy 1: Multi-Phase Approach (RECOMMENDED)

Break the single API call into 3 smaller, focused phases:

#### Phase 1: Content Analysis (Fast)
**Input**: Full textbook content
**Task**: Analyze and identify key concepts, themes, and natural breakpoints
**Output**: Simple structured data (concepts, themes, boundaries)
**Timeout Risk**: LOW (quick analysis, small output)

```typescript
async analyzeContentStructure(content: string): Promise<{
  concepts: string[];
  themes: string[];
  breakpoints: number[];
  complexity: 'low' | 'medium' | 'high';
  suggestedSplits: number;
}> {
  const prompt = `Analyze this textbook content and identify:
1. Main concepts (list only)
2. Major themes
3. Natural section breakpoints (by character position)
4. Overall complexity level
5. Suggested number of teaching topics (3-8)

CONTENT: ${content}

Return ONLY JSON:
{
  "concepts": ["concept1", "concept2"],
  "themes": ["theme1", "theme2"],
  "breakpoints": [1234, 5678, 9012],
  "complexity": "medium",
  "suggestedSplits": 5
}`;

  // maxOutputTokens: 1000 (very small)
  // Expected time: 5-15 seconds
}
```

#### Phase 2: Topic Generation (Parallel)
**Input**: Content chunks based on breakpoints from Phase 1
**Task**: Generate detailed topic for each chunk
**Output**: Individual topic objects
**Timeout Risk**: LOW (parallel processing, smaller chunks)

```typescript
async generateTopicForChunk(
  chunk: string,
  partNumber: number,
  totalParts: number,
  context: {
    concepts: string[];
    themes: string[];
    classLevel: string;
    subject: string;
  }
): Promise<TopicSuggestion> {
  const prompt = `Generate a single teaching topic (Part ${partNumber} of ${totalParts}):

CONTEXT:
- Class: ${context.classLevel}
- Subject: ${context.subject}
- Key concepts: ${context.concepts.join(', ')}
- Overall themes: ${context.themes.join(', ')}

CONTENT FOR THIS TOPIC:
${chunk}

Generate ONE topic object in JSON:
{
  "name": "Chapter X - Part ${partNumber}: [Specific Focus]",
  "content": "[200-500 words summary]",
  "estimatedMinutes": 35,
  "learningObjectives": [
    "Students will...",
    "Students will..."
  ],
  "partNumber": ${partNumber}
}`;

  // maxOutputTokens: 2000 (per topic)
  // Run in parallel for all chunks
  // Expected time: 10-20 seconds per topic (parallel)
}

// Generate all topics in parallel
const topicPromises = chunks.map((chunk, index) => 
  this.generateTopicForChunk(chunk, index + 1, chunks.length, context)
);
const topics = await Promise.all(topicPromises);
```

#### Phase 3: Validation & Refinement (Optional)
**Input**: Generated topics
**Task**: Validate coherence, fix overlaps, ensure progression
**Output**: Validated topics
**Timeout Risk**: LOW (small input/output)

```typescript
async validateTopics(topics: TopicSuggestion[]): Promise<TopicSuggestion[]> {
  const prompt = `Review these ${topics.length} topics for coherence:

${JSON.stringify(topics, null, 2)}

Fix any issues:
1. Remove overlapping content
2. Ensure logical progression
3. Balance time estimates
4. Verify learning objectives

Return ONLY corrected JSON array.`;

  // maxOutputTokens: 5000
  // Expected time: 10-20 seconds
}
```

**Benefits:**
- ✅ Each phase has LOW timeout risk
- ✅ Parallel processing reduces total time
- ✅ Progressive feedback to user
- ✅ Can retry individual phases if they fail
- ✅ Better error handling

**Total Time Estimate:**
- Phase 1: 5-15 seconds
- Phase 2: 10-20 seconds (parallel for 5 topics)
- Phase 3: 10-20 seconds (optional)
- **Total: 25-55 seconds** (vs 60-180 seconds currently)

### Strategy 2: Optimized Single-Phase Approach

If you prefer to keep single API call, optimize the prompt:

#### Optimizations:
1. **Reduce Prompt Verbosity**
   - Current: ~272 lines of instructions
   - Optimized: ~50 lines (essential only)
   - Savings: 75% smaller prompt

2. **Limit Content Length**
   - Current: 100,000 characters max
   - Optimized: 30,000 characters max
   - Use content summarization first if larger

3. **Reduce Output Requirements**
   - Don't ask for full content in response
   - Just structural information + learning objectives
   - Extract actual content from original text using breakpoints

4. **Optimize maxOutputTokens**
   - Current: 30,000 tokens
   - Optimized: 5,000 tokens (structural only)
   - Savings: 83% fewer tokens to generate

**Optimized Prompt Example:**
```typescript
private static buildOptimizedPrompt(
  content: string,
  subject: string,
  classLevel: string,
  numberOfSplits: number
): string {
  return `Split this ${subject} content into ${numberOfSplits} teaching topics for ${classLevel}.

CONTENT (${content.length} chars):
${content}

Return JSON array with ${numberOfSplits} objects:
[{
  "name": "Part 1: [Focus]",
  "startPos": 0,
  "endPos": 1234,
  "minutes": 35,
  "objectives": ["Learn X", "Understand Y"]
}]

Requirements:
- Sequential parts (1-${numberOfSplits})
- 30-45 min each
- Natural breakpoints
- Specific objectives
- Use startPos/endPos instead of copying content`;
}
```

**Benefits:**
- ✅ Much smaller output (5-10x reduction)
- ✅ Faster generation
- ✅ Lower timeout risk
- ❌ Still single point of failure

### Strategy 3: Hybrid Streaming Approach

Use streaming API if available:

```typescript
async analyzeWithStreaming(
  content: string,
  onProgress: (partial: TopicSuggestion[]) => void
): Promise<TopicSuggestion[]> {
  // Use streaming to show progressive results
  // User sees topics being generated in real-time
  // Can stop early if satisfied
}
```

## Recommended Implementation

### Phase 1: Quick Win (Week 1)
Implement **Strategy 2** (Optimized Single-Phase):
1. Reduce prompt size to ~50 lines
2. Limit content to 30,000 chars
3. Use position-based content references
4. Reduce maxOutputTokens to 5,000

**Impact:**
- 70% reduction in processing time
- 80% reduction in timeout risk
- Same user experience

### Phase 2: Long-term (Week 2-3)
Implement **Strategy 1** (Multi-Phase):
1. Build 3-phase pipeline
2. Add parallel processing
3. Add progress indicators
4. Better error handling

**Impact:**
- 90% reduction in timeout risk
- Better user feedback
- More resilient to errors
- Slightly more complex

## Code Examples

### Optimized Single-Phase Implementation

```typescript
static async analyzeTextbookContentOptimized(
  content: string,
  subject: string,
  classLevel: string,
  chapterName?: string,
  numberOfSplits: number = 4
): Promise<TopicSuggestion[]> {
  // Limit content size
  const maxContentLength = 30000; // Reduced from 100000
  const truncatedContent = content.length > maxContentLength 
    ? content.substring(0, maxContentLength)
    : content;
  
  // Optimized prompt (50 lines vs 272)
  const prompt = `Analyze and split this ${subject} textbook content for ${classLevel} into ${numberOfSplits} teaching topics.

${chapterName ? `Chapter: ${chapterName}\n` : ''}
CONTENT:
${truncatedContent}

Return JSON array with ${numberOfSplits} topic objects:
[{
  "name": "Part 1: [Specific Focus]",
  "startChar": 0,
  "endChar": 5000,
  "minutes": 35,
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "partNumber": 1
}]

Requirements:
- Exactly ${numberOfSplits} topics
- Sequential parts (1-${numberOfSplits})
- 30-45 minutes each
- 3-5 objectives per topic
- Use startChar/endChar positions to reference content
- Natural conceptual boundaries`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 5000, // Reduced from 30000
    }
  };

  const response = await secureGeminiService.makeSecureRequest('analyze-chapter', payload);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to analyze chapter');
  }

  const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const suggestions = this.parseOptimizedSuggestions(generatedText, content);
  
  return suggestions;
}

private static parseOptimizedSuggestions(
  response: string,
  originalContent: string
): TopicSuggestion[] {
  const parsed = JSON.parse(this.extractJSON(response));
  
  return parsed.map((item: any) => ({
    name: item.name,
    content: originalContent.substring(item.startChar, item.endChar),
    estimatedMinutes: item.minutes,
    learningObjectives: item.objectives,
    partNumber: item.partNumber
  }));
}
```

### Multi-Phase Implementation

```typescript
static async analyzeTextbookContentMultiPhase(
  content: string,
  subject: string,
  classLevel: string,
  chapterName?: string,
  onProgress?: (stage: string, progress: number) => void
): Promise<TopicSuggestion[]> {
  try {
    // Phase 1: Analyze structure
    onProgress?.('Analyzing content structure...', 10);
    const structure = await this.analyzeStructure(content, subject, classLevel);
    
    // Phase 2: Generate topics in parallel
    onProgress?.('Generating topics...', 40);
    const chunks = this.splitContentByBreakpoints(content, structure.breakpoints);
    
    const topicPromises = chunks.map((chunk, index) =>
      this.generateTopicForChunk(
        chunk,
        index + 1,
        chunks.length,
        { concepts: structure.concepts, themes: structure.themes, classLevel, subject }
      )
    );
    
    const topics = await Promise.all(topicPromises);
    onProgress?.('Validating topics...', 80);
    
    // Phase 3: Validate (optional)
    const validatedTopics = await this.validateTopics(topics);
    onProgress?.('Complete!', 100);
    
    return validatedTopics;
    
  } catch (error) {
    console.error('Multi-phase analysis error:', error);
    throw error;
  }
}

private static async analyzeStructure(
  content: string,
  subject: string,
  classLevel: string
): Promise<{
  concepts: string[];
  themes: string[];
  breakpoints: number[];
  suggestedSplits: number;
}> {
  const prompt = `Analyze this ${subject} content for ${classLevel}:

${content.substring(0, 50000)}

Return ONLY JSON:
{
  "concepts": ["concept1", "concept2", "concept3"],
  "themes": ["theme1", "theme2"],
  "breakpoints": [5000, 12000, 20000, 30000],
  "suggestedSplits": 5
}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1000
    }
  };

  const response = await secureGeminiService.makeSecureRequest('analyze-chapter', payload);
  const result = JSON.parse(this.extractJSON(response.data?.candidates?.[0]?.content?.parts?.[0]?.text));
  
  return result;
}

private static splitContentByBreakpoints(
  content: string,
  breakpoints: number[]
): string[] {
  const chunks: string[] = [];
  let lastPos = 0;
  
  for (const breakpoint of [...breakpoints, content.length]) {
    chunks.push(content.substring(lastPos, breakpoint));
    lastPos = breakpoint;
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0);
}
```

## Metrics & Monitoring

Add timing and success tracking:

```typescript
private static async measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`[ChapterPlanner] ${operation} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[ChapterPlanner] ${operation} failed after ${duration}ms:`, error);
    throw error;
  }
}
```

## Summary

| Strategy | Complexity | Timeout Risk | Time Savings | Recommended |
|----------|-----------|--------------|--------------|-------------|
| Optimized Single-Phase | Low | Medium | 70% | ✅ Phase 1 |
| Multi-Phase Parallel | Medium | Very Low | 60% | ✅ Phase 2 |
| Streaming | High | Low | 50% | Future |

**Action Plan:**
1. ✅ Week 1: Implement optimized single-phase (quick win)
2. ✅ Week 2-3: Migrate to multi-phase approach
3. 📊 Monitor metrics and adjust
4. 🔮 Future: Add streaming support


