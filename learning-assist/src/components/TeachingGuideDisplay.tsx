import React, { useState, useRef, useEffect } from 'react';
import { User, Clock, BookOpen, Users, Lightbulb, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import './TeachingGuideDisplay.css';

interface TeachingGuideDisplayProps {
  teachingGuide: string;
  topicName: string;
  classLevel: string;
  subject?: string;
}

const TeachingGuideDisplay: React.FC<TeachingGuideDisplayProps> = ({
  teachingGuide,
  topicName,
  classLevel,
  subject
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check if speech synthesis is supported
  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window);
  }, []);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speech synthesis functions
  const speakText = (text: string, onEnd?: () => void) => {
    if (!speechSupported) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8; // Slightly slower for better comprehension
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSupported) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSection(0);
    }
  };

  const pauseSpeaking = () => {
    if (speechSupported) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        setIsPaused(true);
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      }
    }
  };

  const playTeachingGuide = () => {
    if (!speechSupported) return;

    setIsPlaying(true);
    setIsPaused(false);
    setCurrentSection(0);

    // Extract text content from HTML for speech
    const textContent = teachingGuide.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    speakText(textContent, () => {
      setIsPlaying(false);
      setCurrentSection(-1);
    });
  };

  // Parse the teaching guide content to extract sections
  const parseTeachingGuide = (content: string) => {
    // First, clean the content by removing any HTML headings
    let cleanContent = content
      .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '') // Remove all HTML headings
      .replace(/^\s*#+\s*/gm, '') // Remove markdown headings
      .trim();
    
    const sections = [];
    const lines = cleanContent.split('\n');
    let currentSection = { title: '', content: '', icon: BookOpen };
    
    // Define section patterns to look for
    const sectionPatterns = [
      { pattern: /materials needed|classroom setup|learning objectives/i, title: 'Preparation (5 minutes)', icon: User },
      { pattern: /opening activity|main teaching points|key questions|examples and demonstrations|student activities|assessment checkpoints/i, title: 'Lesson Delivery (30 minutes)', icon: BookOpen },
      { pattern: /discussion prompts|group work|individual practice|understanding checks/i, title: 'Student Engagement', icon: Users },
      { pattern: /summary|homework|preview/i, title: 'Closing (5 minutes)', icon: Clock },
      { pattern: /page references|content usage|student guidance|explanation basis|visual aids/i, title: 'Textbook Integration', icon: BookOpen }
    ];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Check if this line starts a new section based on content patterns
      let foundSection = false;
      for (const sectionPattern of sectionPatterns) {
        if (sectionPattern.pattern.test(trimmedLine)) {
          // Save previous section if it has content
          if (currentSection.content.trim()) {
            sections.push({ ...currentSection });
          }
          
          // Start new section
          currentSection = {
            title: sectionPattern.title,
            content: '',
            icon: sectionPattern.icon
          };
          foundSection = true;
          break;
        }
      }
      
      if (!foundSection) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      }
    }
    
    // Add the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }
    
    // If no sections were found, create a single section with all content
    if (sections.length === 0 && cleanContent.trim()) {
      sections.push({
        title: 'Teaching Guide',
        content: cleanContent,
        icon: BookOpen
      });
    }
    
    return sections;
  };

  const getSectionIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('setup') || lowerTitle.includes('greet')) return User;
    if (lowerTitle.includes('delivery') || lowerTitle.includes('lesson')) return BookOpen;
    if (lowerTitle.includes('interaction') || lowerTitle.includes('student')) return Users;
    if (lowerTitle.includes('closing') || lowerTitle.includes('summary')) return Clock;
    return Lightbulb;
  };

  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        const trimmedLine = line.trim();
        
        // Format bullet points
        if (trimmedLine.startsWith('- ')) {
          return (
            <div key={index} className="teaching-guide-bullet">
              <span className="bullet-point">•</span>
              <span className="bullet-content">{trimmedLine.substring(2)}</span>
            </div>
          );
        }
        
        // Format numbered lists
        if (/^\d+\.\s/.test(trimmedLine)) {
          return (
            <div key={index} className="teaching-guide-numbered">
              <span className="number">{trimmedLine.match(/^\d+\./)?.[0]}</span>
              <span className="numbered-content">{trimmedLine.replace(/^\d+\.\s/, '')}</span>
            </div>
          );
        }
        
        // Format regular paragraphs
        if (trimmedLine) {
          return (
            <p key={index} className="teaching-guide-paragraph">
              {trimmedLine}
            </p>
          );
        }
        
        return <br key={index} />;
      });
  };

  // Simplified - no parsing needed, AI generates formatted HTML

  return (
    <div className="teaching-guide-display">
      {speechSupported && (
        <div className="audio-controls-top">
          <button
            onClick={isPlaying ? stopSpeaking : playTeachingGuide}
            className={`audio-btn ${isPlaying ? 'stop' : 'play'}`}
            title={isPlaying ? 'Stop listening' : 'Listen to teaching guide'}
          >
            {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {isPlaying ? 'Stop' : 'Listen'}
          </button>
          {isPlaying && (
            <button
              onClick={pauseSpeaking}
              className="audio-btn pause"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
      )}

      <div className="teaching-guide-content">
        <div className="teaching-guide-html" dangerouslySetInnerHTML={{ __html: teachingGuide }} />
      </div>
    </div>
  );
};

export default TeachingGuideDisplay;
