import React from 'react';
import { 
  FileText, 
  CheckCircle,
  Lightbulb,
  BookOpen,
  Target,
  HelpCircle
} from 'lucide-react';
import './WorksheetDisplay.css';

interface WorksheetDisplayProps {
  worksheets: string;
  topicName: string;
  classLevel: string;
  subject?: string;
}

interface Activity {
  type: string;
  question: string;
  answer?: string;
}

interface Worksheet {
  title: string;
  instructions: string;
  activities: Activity[];
  answerKey?: string;
  parentTips?: string;
}

interface JSONWorksheetData {
  worksheets?: Array<{
    title: string;
    instructions: string;
    activities?: Array<{
      type: string;
      question: string;
      answer?: string;
    }>;
    answerKey?: string;
    parentTips?: string;
  }>;
}

const WorksheetDisplay: React.FC<WorksheetDisplayProps> = ({
  worksheets,
  topicName,
  classLevel,
  subject
}) => {

  // Parse the worksheet content to extract worksheets
  const parseWorksheets = (content: string): Worksheet[] => {
    if (!content || content.trim() === '') {
      return [];
    }

    // First, try to parse as JSON
    try {
      const jsonData: JSONWorksheetData = JSON.parse(content);
      return parseJSONWorksheets(jsonData);
    } catch (error) {
      // If JSON parsing fails, try text parsing
      return parseTextWorksheets(content);
    }
  };

  // Parse JSON format worksheets
  const parseJSONWorksheets = (data: JSONWorksheetData): Worksheet[] => {
    const parsedWorksheets: Worksheet[] = [];
    
    if (data.worksheets && Array.isArray(data.worksheets)) {
      data.worksheets.forEach((worksheet, index) => {
        const parsedWorksheet: Worksheet = {
          title: worksheet.title || `Worksheet ${index + 1}`,
          instructions: worksheet.instructions || '',
          activities: [],
          answerKey: worksheet.answerKey,
          parentTips: worksheet.parentTips
        };

        if (worksheet.activities && Array.isArray(worksheet.activities)) {
          worksheet.activities.forEach((activity, actIndex) => {
            parsedWorksheet.activities.push({
              type: activity.type || `Activity ${actIndex + 1}`,
              question: activity.question || '',
              answer: activity.answer
            });
          });
        }

        parsedWorksheets.push(parsedWorksheet);
      });
    }

    return parsedWorksheets;
  };

  // Parse text format worksheets (markdown-like)
  const parseTextWorksheets = (content: string): Worksheet[] => {
    const worksheets: Worksheet[] = [];
    const lines = content.split('\n');
    let currentWorksheet: Worksheet | null = null;
    let currentActivity: Activity | null = null;
    let inActivitiesSection = false;
    let inAnswerKeySection = false;
    let inParentTipsSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines and header lines
      if (trimmedLine === '' || trimmedLine.startsWith('# Worksheets') || trimmedLine.startsWith('*Inspired by NCERT')) {
        continue;
      }

      // Worksheet title (## Worksheet X: Title)
      if (trimmedLine.startsWith('## ')) {
        // Save previous worksheet if exists
        if (currentWorksheet) {
          if (currentActivity) {
            currentWorksheet.activities.push(currentActivity);
            currentActivity = null;
          }
          worksheets.push(currentWorksheet);
        }

        // Start new worksheet
        currentWorksheet = {
          title: trimmedLine.replace(/^##\s*/, '').trim(),
          instructions: '',
          activities: [],
          answerKey: '',
          parentTips: ''
        };
        inActivitiesSection = false;
        inAnswerKeySection = false;
        inParentTipsSection = false;
      }
      // Instructions
      else if (trimmedLine.startsWith('**Instructions:**') || trimmedLine.startsWith('Instructions:')) {
        if (currentWorksheet) {
          currentWorksheet.instructions = trimmedLine.replace(/^\*\*Instructions:\*\*\s*/, '').replace(/^Instructions:\s*/, '').trim();
        }
      }
      // Activities section header
      else if (trimmedLine.startsWith('### Activities')) {
        inActivitiesSection = true;
        inAnswerKeySection = false;
        inParentTipsSection = false;
      }
      // Activity header (Activity X: Type)
      else if (inActivitiesSection && /^\*\*Activity\s+\d+:\*\*/.test(trimmedLine)) {
        // Save previous activity if exists
        if (currentActivity && currentWorksheet) {
          currentWorksheet.activities.push(currentActivity);
        }

        // Start new activity
        const typeMatch = trimmedLine.match(/^\*\*Activity\s+\d+:\*\*\s*(.+)/);
        currentActivity = {
          type: typeMatch ? typeMatch[1].trim() : 'Activity',
          question: '',
          answer: undefined
        };
      }
      // Answer (for current activity)
      else if (currentActivity && (trimmedLine.startsWith('*Answer:') || trimmedLine.startsWith('Answer:'))) {
        currentActivity.answer = trimmedLine.replace(/^\*Answer:\s*/, '').replace(/^Answer:\s*/, '').replace(/\*$/, '').trim();
      }
      // Question text (for current activity)
      else if (currentActivity && trimmedLine !== '' && !trimmedLine.startsWith('###') && !trimmedLine.startsWith('---')) {
        if (currentActivity.question) {
          currentActivity.question += ' ' + trimmedLine;
        } else {
          currentActivity.question = trimmedLine;
        }
      }
      // Answer Key section
      else if (trimmedLine.startsWith('### Answer Key')) {
        inAnswerKeySection = true;
        inActivitiesSection = false;
        inParentTipsSection = false;
      }
      // Parent Tips section
      else if (trimmedLine.startsWith('### Parent Tips')) {
        inParentTipsSection = true;
        inAnswerKeySection = false;
        inActivitiesSection = false;
      }
      // Content for Answer Key or Parent Tips
      else if (currentWorksheet && trimmedLine !== '' && !trimmedLine.startsWith('###') && !trimmedLine.startsWith('---')) {
        if (inAnswerKeySection) {
          if (currentWorksheet.answerKey) {
            currentWorksheet.answerKey += '\n' + trimmedLine;
          } else {
            currentWorksheet.answerKey = trimmedLine;
          }
        } else if (inParentTipsSection) {
          if (currentWorksheet.parentTips) {
            currentWorksheet.parentTips += '\n' + trimmedLine;
          } else {
            currentWorksheet.parentTips = trimmedLine;
          }
        }
      }
    }

    // Save last worksheet and activity
    if (currentActivity && currentWorksheet) {
      currentWorksheet.activities.push(currentActivity);
    }
    if (currentWorksheet) {
      worksheets.push(currentWorksheet);
    }

    return worksheets;
  };

  // Get icon for worksheet type
  const getWorksheetIcon = (title: string): React.ComponentType<{ size?: number }> => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('foundation')) return BookOpen;
    if (lowerTitle.includes('application')) return Target;
    if (lowerTitle.includes('extension')) return HelpCircle;
    
    return FileText;
  };

  // Get activity type badge color
  const getActivityTypeColor = (type: string): string => {
    const lowerType = type.toLowerCase();
    
    if (lowerType.includes('fill-in') || lowerType.includes('blank')) return 'neutral';
    if (lowerType.includes('matching')) return 'blue';
    if (lowerType.includes('short') || lowerType.includes('answer')) return 'amber';
    if (lowerType.includes('multiple') || lowerType.includes('choice')) return 'green';
    
    return 'neutral';
  };

  const parsedWorksheets = parseWorksheets(worksheets);

  return (
    <div className="worksheet-display">
      <div className="worksheet-header">
        <div className="worksheet-title">
          <FileText size={24} />
          <h2>Worksheets: {topicName}</h2>
        </div>
        <div className="worksheet-meta">
          <span className="class-level">{classLevel}</span>
          {subject && <span className="subject">{subject}</span>}
        </div>
      </div>

      <div className="worksheet-intro">
        <p>
          <strong>Student Practice:</strong> These worksheets provide structured practice activities 
          to reinforce learning and develop skills. Complete each activity carefully and check 
          your understanding with the provided guidance.
        </p>
      </div>

      <div className="worksheet-content">
        {parsedWorksheets.length > 0 ? (
          parsedWorksheets.map((worksheet, worksheetIndex) => {
            const Icon = getWorksheetIcon(worksheet.title);
            return (
              <div key={worksheetIndex} className="worksheet-section">
                <div className="worksheet-section-header">
                  <Icon size={20} />
                  <h3>{worksheet.title}</h3>
                </div>
                
                {worksheet.instructions && (
                  <div className="worksheet-instructions">
                    <div className="instructions-header">
                      <CheckCircle size={16} />
                      <strong>Instructions:</strong>
                    </div>
                    <p className="instructions-text">{worksheet.instructions}</p>
                  </div>
                )}

                {worksheet.activities.length > 0 && (
                  <div className="activities-container">
                    <h4 className="activities-title">Activities</h4>
                    <div className="activities-list">
                      {worksheet.activities.map((activity, activityIndex) => (
                        <div key={activityIndex} className="activity-item">
                          <div className="activity-header">
                            <span className={`activity-type-badge ${getActivityTypeColor(activity.type)}`}>
                              {activity.type}
                            </span>
                          </div>
                          <div className="activity-content">
                            <p className="activity-question">{activity.question}</p>
                            {activity.answer && (
                              <div className="activity-answer">
                                <strong>Answer:</strong>
                                <span className="answer-text">{activity.answer}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(worksheet.answerKey || worksheet.parentTips) && (
                  <div className="worksheet-additional-info">
                    {worksheet.answerKey && (
                      <details className="answer-key-section">
                        <summary className="answer-key-header">
                          <CheckCircle size={16} />
                          <strong>Answer Key</strong>
                        </summary>
                        <div className="answer-key-content">
                          <pre className="answer-key-text">{worksheet.answerKey}</pre>
                        </div>
                      </details>
                    )}
                    
                    {worksheet.parentTips && (
                      <div className="parent-tips-section">
                        <div className="parent-tips-header">
                          <Lightbulb size={16} />
                          <strong>Parent Tips</strong>
                        </div>
                        <p className="parent-tips-text">{worksheet.parentTips}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="worksheet-raw">
            <pre className="worksheet-text">{worksheets}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorksheetDisplay;
