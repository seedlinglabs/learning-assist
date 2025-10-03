import React, { useState, useEffect } from 'react';
import { Topic } from '../types';
import '../styles/Quiz.css';

interface QuizProps {
  topic: Topic;
  onClose: () => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

const Quiz: React.FC<QuizProps> = ({ topic, onClose }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parseAssessmentQuestions();
  }, [topic]);

  const parseAssessmentQuestions = () => {
    const assessmentText = topic.aiContent?.assessmentQuestions;
    if (!assessmentText) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    try {
      // Parse the assessment questions text
      // Expected format:
      // 1. Question text?
      // A) Option 1
      // B) Option 2
      // C) Option 3
      // D) Option 4
      // Answer: A) Option 1
      
      const questionBlocks = assessmentText.split(/\n\n+/);
      const parsedQuestions: QuizQuestion[] = [];

      for (const block of questionBlocks) {
        const lines = block.trim().split('\n').filter(line => line.trim());
        if (lines.length < 3) continue;

        // Extract question (first line, remove number prefix)
        const questionMatch = lines[0].match(/^\d+[\.)]\s*(.+)/);
        if (!questionMatch) continue;
        const question = questionMatch[1].trim();

        // Extract options
        const options: string[] = [];
        let answerLine = '';
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line.match(/^[A-D][\):\.]?\s*/)) {
            const optionText = line.replace(/^[A-D][\):\.]?\s*/, '').trim();
            options.push(optionText);
          } else if (line.toLowerCase().startsWith('answer:') || line.toLowerCase().startsWith('correct answer:')) {
            answerLine = line;
          }
        }

        // Extract correct answer
        if (options.length >= 2 && answerLine) {
          const answerMatch = answerLine.match(/[A-D][\):\.]?\s*(.+)/);
          let correctAnswer = '';
          
          if (answerMatch) {
            const answerText = answerMatch[1].trim();
            // Try to match with options
            correctAnswer = options.find(opt => 
              opt.toLowerCase().includes(answerText.toLowerCase()) ||
              answerText.toLowerCase().includes(opt.toLowerCase())
            ) || options[0];
          }

          if (correctAnswer) {
            parsedQuestions.push({
              question,
              options,
              correctAnswer
            });
          }
        }
      }

      setQuestions(parsedQuestions);
      setSelectedAnswers(new Array(parsedQuestions.length).fill(null));
    } catch (error) {
      console.error('Error parsing assessment questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers(new Array(questions.length).fill(null));
    setShowResults(false);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return { correct, total: questions.length };
  };

  if (loading) {
    return (
      <div className="quiz-overlay" onClick={onClose}>
        <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
          <div className="quiz-loading">
            <div className="spinner"></div>
            <p>Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-overlay" onClick={onClose}>
        <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
          <div className="quiz-header">
            <h2>Quiz Not Available</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          <div className="quiz-content">
            <p>No assessment questions are available for this topic yet.</p>
            <button className="quiz-action-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const { correct, total } = calculateScore();
    const percentage = Math.round((correct / total) * 100);
    const isPassed = percentage >= 70;

    return (
      <div className="quiz-overlay" onClick={onClose}>
        <div className="quiz-modal quiz-results" onClick={(e) => e.stopPropagation()}>
          <div className="quiz-header">
            <h2>🎉 Quiz Results</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          
          <div className="quiz-content">
            <div className={`score-display ${isPassed ? 'passed' : 'needs-practice'}`}>
              <div className="score-circle">
                <div className="score-percentage">{percentage}%</div>
                <div className="score-text">{correct} / {total} Correct</div>
              </div>
              <div className="score-message">
                {isPassed ? (
                  <p>🌟 Excellent work! You have a great understanding of this topic!</p>
                ) : (
                  <p>Keep practicing! Review the videos and try again.</p>
                )}
              </div>
            </div>

            <div className="answers-review">
              <h3>Review Your Answers</h3>
              {questions.map((q, index) => {
                const userAnswer = selectedAnswers[index];
                const isCorrect = userAnswer === q.correctAnswer;
                
                return (
                  <div key={index} className={`answer-review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                    <div className="question-number">
                      {isCorrect ? '✓' : '✗'} Question {index + 1}
                    </div>
                    <div className="question-text">{q.question}</div>
                    <div className="answer-details">
                      {!isCorrect && userAnswer && (
                        <div className="user-answer">
                          Your answer: {userAnswer}
                        </div>
                      )}
                      <div className="correct-answer">
                        Correct answer: {q.correctAnswer}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="quiz-actions">
              <button className="quiz-action-button secondary" onClick={handleRestart}>
                Try Again
              </button>
              <button className="quiz-action-button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="quiz-overlay" onClick={onClose}>
      <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quiz-header">
          <div>
            <h2>{topic.name}</h2>
            <p className="quiz-subtitle">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="quiz-progress">
          <div className="quiz-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="quiz-content">
          <div className="question-section">
            <h3 className="question-text">{currentQuestion.question}</h3>
            
            <div className="options-container">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`option-button ${selectedAnswers[currentQuestionIndex] === option ? 'selected' : ''}`}
                  onClick={() => handleAnswerSelect(option)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{option}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="quiz-navigation">
            <button 
              className="quiz-nav-button"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              ← Previous
            </button>
            <button 
              className="quiz-nav-button primary"
              onClick={handleNext}
              disabled={!selectedAnswers[currentQuestionIndex]}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;

