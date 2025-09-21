export interface SpeechOptions {
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  voice?: string; // voice name
}

export class SpeechService {
  private static synthesis: SpeechSynthesis | null = null;
  private static voices: SpeechSynthesisVoice[] = [];

  static initialize(): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported in this browser');
        resolve();
        return;
      }

      this.synthesis = window.speechSynthesis;
      
      // Load voices (they may load asynchronously)
      const loadVoices = () => {
        this.voices = this.synthesis?.getVoices() || [];
        if (this.voices.length > 0) {
          resolve();
        }
      };

      loadVoices();
      
      if (this.voices.length === 0) {
        this.synthesis.onvoiceschanged = () => {
          loadVoices();
        };
      }
    });
  }

  static getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => voice.lang.startsWith('en'));
  }

  static getBestVoiceForEducation(): SpeechSynthesisVoice | null {
    const englishVoices = this.getAvailableVoices();
    
    // Prefer female voices for educational content (research shows better student engagement)
    const femaleVoices = englishVoices.filter(voice => 
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('samantha') ||
      voice.name.toLowerCase().includes('karen') ||
      voice.name.toLowerCase().includes('victoria')
    );

    if (femaleVoices.length > 0) {
      return femaleVoices[0];
    }

    // Fallback to any English voice
    return englishVoices[0] || null;
  }

  static generateAudioForSection(
    text: string, 
    sectionTitle: string,
    options: SpeechOptions = {}
  ): Promise<{ success: boolean; audioBlob?: Blob; error?: string }> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve({ success: false, error: 'Speech synthesis not available' });
        return;
      }

      try {
        // Clean the text for better speech
        const cleanText = this.cleanTextForSpeech(text, sectionTitle);
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Set voice options
        utterance.rate = options.rate || 0.9; // Slightly slower for educational content
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        
        // Use the best educational voice
        const voice = this.getBestVoiceForEducation();
        if (voice) {
          utterance.voice = voice;
        }

        // For now, we'll just speak the content
        // In the future, we could record it to a blob using MediaRecorder
        utterance.onend = () => {
          resolve({ success: true });
        };

        utterance.onerror = (event) => {
          resolve({ success: false, error: `Speech error: ${event.error}` });
        };

        this.synthesis.speak(utterance);
        
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown speech error' 
        });
      }
    });
  }

  static stopSpeech(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  static pauseSpeech(): void {
    if (this.synthesis) {
      this.synthesis.pause();
    }
  }

  static resumeSpeech(): void {
    if (this.synthesis) {
      this.synthesis.resume();
    }
  }

  private static cleanTextForSpeech(text: string, sectionTitle: string): string {
    let cleanText = `${sectionTitle}. `;
    
    // Remove markdown formatting
    cleanText += text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Convert links to just title
      .replace(/#{1,6}\s*/g, '') // Remove heading markers
      .replace(/^\s*[-•*]\s+/gm, '') // Remove bullet points
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/\n{2,}/g, '. ') // Convert paragraph breaks to pauses
      .replace(/\n/g, ' ') // Convert line breaks to spaces
      .replace(/\s{2,}/g, ' ') // Remove extra spaces
      .trim();

    return cleanText;
  }

  static generateLessonScript(sectionTitle: string, content: string, classLevel: string): string {
    const script = `
Welcome to today's lesson on ${sectionTitle} for ${classLevel} students.

${content}

Let's begin this exciting learning journey together!
    `.trim();

    return script;
  }
}
