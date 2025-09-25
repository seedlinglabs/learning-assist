import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  CheckCircle,
  HelpCircle,
  Target,
  BookOpen,
  Lightbulb
} from 'lucide-react';
import './AssessmentDisplay.css';

interface AssessmentDisplayProps {
  assessmentQuestions: string;
  topicName: string;
  classLevel: string;
  subject?: string;
}

interface Question {
  id: string;
  question: string;
  options: { letter: string; text: string }[];
  answer: string;
  explanation: string;
}

interface AssessmentSection {
  title: string;
  questions: Question[];
  icon: React.ComponentType<{ size?: number }>;
}

interface JSONAssessmentData {
  mcqs?: Array<{
    question: string;
    options: string[];
    correct: string;
    explanation: string;
  }>;
  shortAnswers?: Array<{
    question: string;
    sampleAnswer: string;
  }>;
  longAnswers?: Array<{
    question: string;
    sampleAnswer: string;
  }>;
  cfuQuestions?: Array<{
    question: string;
    parentGuidance: string;
  }>;
}

const AssessmentDisplay: React.FC<AssessmentDisplayProps> = ({
  assessmentQuestions,
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

  const playAssessment = () => {
    if (!speechSupported) return;

    const sections = parseAssessment(assessmentQuestions);
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
      let textToSpeak = `${section.title}. `;
      
      section.questions.forEach((question, qIndex) => {
        textToSpeak += `Question ${qIndex + 1}: ${question.question}. `;
        question.options.forEach(option => {
          textToSpeak += `${option.letter}: ${option.text}. `;
        });
        textToSpeak += `Answer: ${question.answer}. Explanation: ${question.explanation}. `;
      });
      
      speakText(textToSpeak, () => {
        speakSection(index + 1);
      });
    };

    speakSection(0);
  };

  // Parse the assessment content to extract questions
  const parseAssessment = (content: string): AssessmentSection[] => {
    if (!content || content.trim() === '') {
      return [];
    }

    // First, try to parse as JSON
    try {
      const jsonData: JSONAssessmentData = JSON.parse(content);
      return parseJSONAssessment(jsonData);
    } catch (error) {
      // If JSON parsing fails, try text parsing
      return parseTextAssessment(content);
    }
  };

  // Parse JSON format assessment
  const parseJSONAssessment = (data: JSONAssessmentData): AssessmentSection[] => {
    const sections: AssessmentSection[] = [];

    // Parse Multiple Choice Questions
    if (data.mcqs && data.mcqs.length > 0) {
      const questions: Question[] = data.mcqs.map((mcq, index) => ({
        id: `mcq-${index}`,
        question: mcq.question,
        options: mcq.options.map((option, optIndex) => ({
          letter: String.fromCharCode(65 + optIndex), // A, B, C, D
          text: option
        })),
        answer: mcq.correct,
        explanation: mcq.explanation
      }));

      sections.push({
        title: 'Multiple Choice Questions',
        questions,
        icon: Target
      });
    }

    // Parse Short Answer Questions
    if (data.shortAnswers && data.shortAnswers.length > 0) {
      const questions: Question[] = data.shortAnswers.map((sa, index) => ({
        id: `short-${index}`,
        question: sa.question,
        options: [],
        answer: 'See sample answer below',
        explanation: sa.sampleAnswer
      }));

      sections.push({
        title: 'Short Answer Questions',
        questions,
        icon: BookOpen
      });
    }

    // Parse Long Answer Questions
    if (data.longAnswers && data.longAnswers.length > 0) {
      const questions: Question[] = data.longAnswers.map((la, index) => ({
        id: `long-${index}`,
        question: la.question,
        options: [],
        answer: 'See sample answer below',
        explanation: la.sampleAnswer
      }));

      sections.push({
        title: 'Long Answer Questions',
        questions,
        icon: HelpCircle
      });
    }

    // Parse Check for Understanding Questions
    if (data.cfuQuestions && data.cfuQuestions.length > 0) {
      const questions: Question[] = data.cfuQuestions.map((cfu, index) => ({
        id: `cfu-${index}`,
        question: cfu.question,
        options: [],
        answer: 'Discussion question',
        explanation: cfu.parentGuidance
      }));

      sections.push({
        title: 'Check for Understanding Questions',
        questions,
        icon: Lightbulb
      });
    }

    return sections;
  };

  // Parse text format assessment (original logic)
  const parseTextAssessment = (content: string): AssessmentSection[] => {
    const sections: AssessmentSection[] = [];
    const lines = content.split('\n');
    let currentSection: AssessmentSection | null = null;
    let currentQuestion: Question | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for main headers (Assessment Questions, Multiple Choice Questions, etc.)
      if ((trimmedLine.startsWith('#') || (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')))) {
        // Save previous section if it has questions
        if (currentSection && currentSection.questions.length > 0) {
          sections.push(currentSection);
        }
        
        // Start new section
        const title = trimmedLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        currentSection = {
          title,
          questions: [],
          icon: getSectionIcon(title)
        };
        currentQuestion = null;
      }
      // Check for question headers (Q1:, Q2:, etc.) - handle both **Q1:** and Q1: formats
      else if (/\*\*Q\d+:\*\*/.test(trimmedLine) || /^Q\d+:/.test(trimmedLine)) {
        // Save previous question
        if (currentQuestion && currentSection) {
          currentSection.questions.push(currentQuestion);
        }
        
        // Start new question - handle both **Q1:** and Q1: formats
        const questionText = trimmedLine.replace(/^\*\*Q\d+:\*\*\s*/, '').replace(/^Q\d+:\s*/, '').trim();
        currentQuestion = {
          id: `q${currentSection?.questions.length || 0 + 1}`,
          question: questionText,
          options: [],
          answer: '', // No default answer needed
          explanation: ''
        };
      }
      // Check for options (A., B., C., D.) - handle with or without space after dot
      else if (/^[A-D]\./.test(trimmedLine)) {
        if (currentQuestion) {
          const match = trimmedLine.match(/^([A-D])\.\s*(.+)/);
          if (match) {
            currentQuestion.options.push({
              letter: match[1],
              text: match[2]
            });
          }
        }
      }
      // Check for answer - handle **Answer:**, Answer:, **Sample Answer:**, and Sample Answer: formats
      else if (trimmedLine.startsWith('**Answer:**') || trimmedLine.startsWith('Answer:') || 
               trimmedLine.startsWith('**Sample Answer:**') || trimmedLine.startsWith('Sample Answer:')) {
        if (currentQuestion) {
          currentQuestion.answer = trimmedLine.replace(/^\*\*Answer:\*\*\s*/, '').replace(/^Answer:\s*/, '')
                                               .replace(/^\*\*Sample Answer:\*\*\s*/, '').replace(/^Sample Answer:\s*/, '').trim();
        }
      }
      // Check for explanation or parent guidance
      else if (trimmedLine.startsWith('**Explanation:**') || trimmedLine.startsWith('Explanation:') || 
               trimmedLine.startsWith('**Parent Guidance:**') || trimmedLine.startsWith('Parent Guidance:')) {
        if (currentQuestion) {
          currentQuestion.explanation = trimmedLine.replace(/^\*\*Explanation:\*\*\s*/, '').replace(/^Explanation:\s*/, '')
                                                      .replace(/^\*\*Parent Guidance:\*\*\s*/, '').replace(/^Parent Guidance:\s*/, '').trim();
        }
      }
    }
    
    // Add the last question and section
    if (currentQuestion && currentSection) {
      currentSection.questions.push(currentQuestion);
    }
    if (currentSection && currentSection.questions.length > 0) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  const getSectionIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('multiple choice')) return Target;
    if (lowerTitle.includes('assessment')) return ClipboardList;
    if (lowerTitle.includes('questions')) return HelpCircle;
    if (lowerTitle.includes('short answer')) return BookOpen;
    if (lowerTitle.includes('long answer')) return HelpCircle;
    if (lowerTitle.includes('check for understanding')) return Lightbulb;
    return BookOpen;
  };


  const sections = parseAssessment(assessmentQuestions);

  return (
    <div className="assessment-display">
      <div className="assessment-header">
        <div className="assessment-title">
          <ClipboardList size={24} />
          <h2>Assessment: {topicName}</h2>
        </div>
        <div className="assessment-meta">
          <span className="class-level">{classLevel}</span>
          {subject && <span className="subject">{subject}</span>}
        </div>
        {speechSupported && (
          <div className="audio-controls">
            <button
              onClick={isPlaying ? stopSpeaking : playAssessment}
              className={`audio-btn ${isPlaying ? 'stop' : 'play'}`}
              title={isPlaying ? 'Stop listening' : 'Listen to assessment'}
            >
              {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isPlaying ? 'Stop' : 'Listen'}
            </button>
            {isPlaying && (
              <button
                onClick={pauseSpeaking}
                className={`audio-btn pause ${isPaused ? 'paused' : ''}`}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="assessment-intro">
        <p>
          This assessment contains carefully crafted questions to evaluate student understanding of the topic. 
          Each question includes multiple choice options, correct answers, and detailed explanations.
        </p>
      </div>

      <div className="assessment-content">
        {sections.length > 0 ? (
          sections.map((section, sectionIndex) => {
            const Icon = section.icon;
            const isCurrentSection = isPlaying && currentSection === sectionIndex;
            return (
              <div key={sectionIndex} className={`assessment-section ${isCurrentSection ? 'currently-playing' : ''}`}>
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
                
                <div className="questions-container">
                  {section.questions.map((question, questionIndex) => (
                    <div key={question.id} className="question-card">
                      <div className="question-header">
                        <span className="question-number">Q{questionIndex + 1}</span>
                        <h4 className="question-text">{question.question}</h4>
                      </div>
                      
                      {question.options.length > 0 && (
                        <div className="options-container">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="option-item">
                              <span className="option-letter">{option.letter}.</span>
                              <span className="option-text">{option.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {(question.answer || question.explanation) && (
                        <div className="answer-section">
                          {question.answer && (
                            <div>
                              <div className="answer-header">
                                <CheckCircle size={16} />
                                <strong>
                                  {section.title.toLowerCase().includes('short answer') || section.title.toLowerCase().includes('long answer') 
                                    ? 'Sample Answer:' 
                                    : 'Correct Answer:'}
                                </strong>
                              </div>
                              <div className="answer-content">
                                {question.answer}
                              </div>
                            </div>
                          )}
                          {question.explanation && (
                            <div className="explanation">
                              <div className="explanation-header">
                                <Lightbulb size={16} />
                                <strong>{section.title.toLowerCase().includes('check for understanding') ? 'Parent Guidance:' : 'Explanation:'}</strong>
                              </div>
                              <p className="explanation-text">{question.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="assessment-raw">
            <pre className="assessment-text">{assessmentQuestions}</pre>
          </div>
        )}
      </div>

      <div className="assessment-footer">
        <div className="assessment-tips">
          <h4>💡 Assessment Tips</h4>
          <ul>
            <li>Review questions before administering to ensure clarity</li>
            <li>Consider the difficulty level for your specific class</li>
            <li>Use explanations to provide additional learning opportunities</li>
            <li>Adapt questions based on your curriculum focus</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssessmentDisplay;
