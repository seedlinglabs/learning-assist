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

    const sections = parseTeachingGuide(teachingGuide);
    if (sections.length === 0) return;

    setIsPlaying(true);
    setIsPaused(false);
    setCurrentSection(0);

    const speakSection = (index: number) => {
      if (index >= sections.length) {
        setIsPlaying(false);
        setCurrentSection(0);
        return;
      }

      setCurrentSection(index);
      const section = sections[index];
      const textToSpeak = `${section.title}. ${section.content}`;
      
      speakText(textToSpeak, () => {
        speakSection(index + 1);
      });
    };

    speakSection(0);
  };

  // Parse the teaching guide content to extract sections
  const parseTeachingGuide = (content: string) => {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = { title: '', content: '', icon: BookOpen };
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for section headers
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        // Save previous section if it has content
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection });
        }
        
        // Start new section
        const title = trimmedLine.replace(/\*\*/g, '').trim();
        currentSection = {
          title,
          content: '',
          icon: getSectionIcon(title)
        };
      } else if (trimmedLine) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      }
    }
    
    // Add the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
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

  const sections = parseTeachingGuide(teachingGuide);

  return (
    <div className="teaching-guide-display">
      <div className="teaching-guide-header">
        <div className="teaching-guide-title">
          <User size={24} />
          <h2>Teaching Guide: {topicName}</h2>
        </div>
        <div className="teaching-guide-meta">
          <span className="class-level">{classLevel}</span>
          {subject && <span className="subject">{subject}</span>}
        </div>
        {speechSupported && (
          <div className="audio-controls">
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
      </div>

      <div className="teaching-guide-intro">
        <p>
          <strong>Teacher's Perspective:</strong> This guide shows exactly how to deliver this lesson 
          as if you were the teacher in the classroom. It includes your exact words, classroom 
          management techniques, and real-time teaching strategies.
        </p>
      </div>

      <div className="teaching-guide-content">
        {sections.length > 0 ? (
          sections.map((section, index) => {
            const Icon = section.icon;
            const isCurrentSection = isPlaying && currentSection === index;
            return (
              <div key={index} className={`teaching-guide-section ${isCurrentSection ? 'currently-playing' : ''}`}>
                <div className="section-header">
                  <Icon size={20} />
                  <h3>{section.title}</h3>
                  {isCurrentSection && (
                    <div className="playing-indicator">
                      <Volume2 size={16} />
                      <span>Playing...</span>
                    </div>
                  )}
                </div>
                <div className="section-content">
                  {formatContent(section.content)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="teaching-guide-raw">
            <pre className="teaching-guide-text">{teachingGuide}</pre>
          </div>
        )}
      </div>

      <div className="teaching-guide-footer">
        <div className="teaching-tips">
          <h4>💡 Teaching Tips</h4>
          <ul>
            <li>Use the exact dialogue provided to maintain consistency</li>
            <li>Adapt the timing based on your students' responses</li>
            <li>Be prepared to answer questions that may arise</li>
            <li>Use the classroom management techniques suggested</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TeachingGuideDisplay;
