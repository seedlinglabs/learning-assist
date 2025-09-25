import React, { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  FileText, 
  GraduationCap, 
  Image, 
  Video, 
  Save, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Home,
  Search,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import './TeacherTraining.css';

const TeacherTraining: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      id: 0,
      title: "Welcome to Learning Assist",
      icon: Home,
      content: (
        <div className="training-step">
          <h2>Welcome to Learning Assist! 🎓</h2>
          <p>This platform helps you create comprehensive lesson plans with AI assistance. Let's get you started with a step-by-step guide.</p>
          
          <div className="feature-overview">
            <h3>What You'll Learn:</h3>
            <ul>
              <li>✅ How to navigate the platform</li>
              <li>✅ How to create and manage topics</li>
              <li>✅ How to generate AI-powered lesson plans</li>
              <li>✅ How to use teaching guides and resources</li>
              <li>✅ How to upload and manage documents</li>
            </ul>
          </div>

          <div className="time-estimate">
            <strong>⏱️ Estimated Time: 15-20 minutes</strong>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: "Platform Navigation",
      icon: Search,
      content: (
        <div className="training-step">
          <h2>Understanding the Platform Structure</h2>
          
          <div className="navigation-guide">
            <h3>🏫 School → Class → Subject → Topic</h3>
            <p>The platform is organized in a hierarchical structure:</p>
            
            <div className="structure-diagram">
              <div className="level">
                <div className="level-icon">🏫</div>
                <div className="level-content">
                  <strong>School</strong>
                  <p>Your educational institution</p>
                </div>
              </div>
              <ArrowRight className="arrow" />
              <div className="level">
                <div className="level-icon">👥</div>
                <div className="level-content">
                  <strong>Class</strong>
                  <p>Grade level (e.g., Grade 6, Grade 7)</p>
                </div>
              </div>
              <ArrowRight className="arrow" />
              <div className="level">
                <div className="level-icon">📚</div>
                <div className="level-content">
                  <strong>Subject</strong>
                  <p>Academic subject (e.g., Science, Mathematics)</p>
                </div>
              </div>
              <ArrowRight className="arrow" />
              <div className="level">
                <div className="level-icon">📝</div>
                <div className="level-content">
                  <strong>Topic</strong>
                  <p>Individual lesson topics within the subject</p>
                </div>
              </div>
            </div>
          </div>

          <div className="action-steps">
            <h3>How to Navigate:</h3>
            <ol>
              <li><strong>Click on a School</strong> to see available classes</li>
              <li><strong>Select a Class</strong> to view subjects</li>
              <li><strong>Choose a Subject</strong> to see topics</li>
              <li><strong>Click on a Topic</strong> to view and edit lesson content</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Creating Your First Topic",
      icon: Plus,
      content: (
        <div className="training-step">
          <h2>Creating Your First Topic</h2>
          
          <div className="step-by-step">
            <h3>Step 1: Navigate to Your Subject</h3>
            <p>Go to: <strong>School → Class → Subject</strong></p>
            
            <h3>Step 2: Click "Add Topic"</h3>
            <p>Look for the <strong>"+ Add Topic"</strong> button in the right panel</p>
            
            <h3>Step 3: Fill in Topic Details</h3>
            <div className="form-guide">
              <div className="form-field">
                <label><strong>Topic Name</strong> (Required)</label>
                <p>Enter a clear, descriptive name for your lesson topic</p>
                <div className="example">Example: "Introduction to Photosynthesis"</div>
              </div>
              
              <div className="form-field">
                <label><strong>Textbook Content</strong> (Optional but Recommended)</label>
                <p>Upload a PDF of your textbook chapter or paste the content directly</p>
                <div className="tip">
                  <AlertCircle size={16} />
                  <strong>Tip:</strong> The AI uses this content to generate more accurate lesson plans
                </div>
              </div>
              
              <div className="form-field">
                <label><strong>Document Links</strong> (Optional)</label>
                <p>Add links to additional resources (videos, articles, etc.)</p>
                <div className="example">Example: Khan Academy videos, educational websites</div>
              </div>
            </div>
            
            <h3>Step 4: Save Your Topic</h3>
            <p>Click <strong>"Save Topic"</strong> to create your topic</p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Generating AI Content",
      icon: GraduationCap,
      content: (
        <div className="training-step">
          <h2>Generating AI-Powered Lesson Content</h2>
          
          <div className="ai-generation-process">
            <h3>The AI Generation Process</h3>
            <p>Once you've created a topic, you can generate comprehensive teaching materials:</p>
            
            <div className="generation-steps">
              <div className="generation-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>📋 Lesson Plan</h4>
                  <p>AI creates a detailed lesson plan with objectives, materials, activities, and assessment</p>
                </div>
              </div>
              
              <div className="generation-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>👨‍🏫 Teaching Guide</h4>
                  <p>AI generates a conversational teaching script with exact words and actions</p>
                </div>
              </div>
              
              <div className="generation-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>🖼️ Educational Images</h4>
                  <p>AI finds relevant images to support your lesson</p>
                </div>
              </div>
              
              <div className="generation-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>🎥 Educational Videos</h4>
                  <p>AI searches for relevant YouTube videos for your topic</p>
                </div>
              </div>
            </div>
          </div>

          <div className="how-to-generate">
            <h3>How to Generate AI Content:</h3>
            <ol>
              <li><strong>Open your topic</strong> by clicking on it</li>
              <li><strong>Click "Generate AI Content"</strong> button</li>
              <li><strong>Wait for completion</strong> - this takes 1-2 minutes</li>
              <li><strong>Review the generated content</strong> in the tabs</li>
              <li><strong>Edit if needed</strong> and save your changes</li>
            </ol>
          </div>

          <div className="important-notes">
            <h3>⚠️ Important Notes:</h3>
            <ul>
              <li>AI generation requires an internet connection</li>
              <li>Content is automatically saved to your topic</li>
              <li>You can regenerate content anytime</li>
              <li>Always review AI-generated content before teaching</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Using the Teaching Materials",
      icon: BookOpen,
      content: (
        <div className="training-step">
          <h2>Using Your Generated Teaching Materials</h2>
          
          <div className="tabs-overview">
            <h3>Understanding the Topic Tabs</h3>
            
            <div className="tab-guide">
              <div className="tab-item">
                <FileText className="tab-icon" />
                <div className="tab-content">
                  <h4>Topic Details</h4>
                  <p>Edit basic topic information, upload documents, and manage links</p>
                </div>
              </div>
              
              <div className="tab-item">
                <GraduationCap className="tab-icon" />
                <div className="tab-content">
                  <h4>Lesson Plan</h4>
                  <p>Structured lesson plan with objectives, activities, and assessment</p>
                  <div className="usage-tip">
                    <strong>Use this for:</strong> Planning your lesson structure and timing
                  </div>
                </div>
              </div>
              
              <div className="tab-item">
                <Users className="tab-icon" />
                <div className="tab-content">
                  <h4>Teaching Guide</h4>
                  <p>Conversational script with exact words and actions for teaching</p>
                  <div className="usage-tip">
                    <strong>Use this for:</strong> Actual classroom delivery and presentation
                  </div>
                </div>
              </div>
              
              <div className="tab-item">
                <Image className="tab-icon" />
                <div className="tab-content">
                  <h4>Images</h4>
                  <p>Educational images related to your topic</p>
                  <div className="usage-tip">
                    <strong>Use this for:</strong> Visual aids and student engagement
                  </div>
                </div>
              </div>
              
              <div className="tab-item">
                <Video className="tab-icon" />
                <div className="tab-content">
                  <h4>Videos</h4>
                  <p>Educational YouTube videos for your topic</p>
                  <div className="usage-tip">
                    <strong>Use this for:</strong> Supplementary learning and student homework
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="best-practices">
            <h3>Best Practices for Using AI-Generated Content:</h3>
            <ul>
              <li><strong>Always review</strong> AI-generated content before teaching</li>
              <li><strong>Customize</strong> the content to match your teaching style</li>
              <li><strong>Adapt</strong> activities to your students' needs and abilities</li>
              <li><strong>Test</strong> videos and links before showing to students</li>
              <li><strong>Save changes</strong> after making any edits</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Managing Your Topics",
      icon: Edit,
      content: (
        <div className="training-step">
          <h2>Managing and Organizing Your Topics</h2>
          
          <div className="management-tasks">
            <h3>Common Management Tasks</h3>
            
            <div className="task-item">
              <Edit className="task-icon" />
              <div className="task-content">
                <h4>Editing Topics</h4>
                <p>Click on any topic to open it, then use the "Topic Details" tab to edit:</p>
                <ul>
                  <li>Topic name and description</li>
                  <li>Textbook content</li>
                  <li>Document links</li>
                </ul>
                <div className="action-step">
                  <strong>Action:</strong> Make changes → Click "Save Changes"
                </div>
              </div>
            </div>
            
            <div className="task-item">
              <Trash2 className="task-icon" />
              <div className="task-content">
                <h4>Deleting Topics</h4>
                <p>To delete a topic you no longer need:</p>
                <ol>
                  <li>Open the topic</li>
                  <li>Click the "Delete Topic" button</li>
                  <li>Confirm the deletion</li>
                </ol>
                <div className="warning">
                  <AlertCircle size={16} />
                  <strong>Warning:</strong> This action cannot be undone
                </div>
              </div>
            </div>
            
            <div className="task-item">
              <Save className="task-icon" />
              <div className="task-content">
                <h4>Regenerating AI Content</h4>
                <p>If you want to update your AI-generated content:</p>
                <ol>
                  <li>Open your topic</li>
                  <li>Click "Generate AI Content" again</li>
                  <li>Wait for the new content to be generated</li>
                </ol>
                <div className="tip">
                  <CheckCircle size={16} />
                  <strong>Tip:</strong> This will replace your existing AI content
                </div>
              </div>
            </div>
          </div>

          <div className="organization-tips">
            <h3>Organization Tips:</h3>
            <ul>
              <li>Use clear, descriptive topic names</li>
              <li>Upload textbook content for better AI generation</li>
              <li>Add relevant document links for additional resources</li>
              <li>Review and edit AI content to match your teaching style</li>
              <li>Delete topics you no longer need to keep your workspace clean</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "Troubleshooting & Support",
      icon: AlertCircle,
      content: (
        <div className="training-step">
          <h2>Troubleshooting Common Issues</h2>
          
          <div className="troubleshooting-guide">
            <div className="issue-item">
              <h3>❌ AI Content Generation Fails</h3>
              <div className="solution">
                <p><strong>Possible Causes:</strong></p>
                <ul>
                  <li>Internet connection issues</li>
                  <li>AI service temporarily unavailable</li>
                  <li>Invalid API configuration</li>
                </ul>
                <p><strong>Solutions:</strong></p>
                <ul>
                  <li>Check your internet connection</li>
                  <li>Wait a few minutes and try again</li>
                  <li>Contact your system administrator if the issue persists</li>
                </ul>
              </div>
            </div>
            
            <div className="issue-item">
              <h3>❌ Can't Save Changes</h3>
              <div className="solution">
                <p><strong>Possible Causes:</strong></p>
                <ul>
                  <li>Missing required fields (topic name)</li>
                  <li>Network connectivity issues</li>
                  <li>Browser cache problems</li>
                </ul>
                <p><strong>Solutions:</strong></p>
                <ul>
                  <li>Ensure topic name is filled in</li>
                  <li>Check your internet connection</li>
                  <li>Refresh the page and try again</li>
                </ul>
              </div>
            </div>
            
            <div className="issue-item">
              <h3>❌ Videos or Images Not Loading</h3>
              <div className="solution">
                <p><strong>Possible Causes:</strong></p>
                <ul>
                  <li>External service issues (YouTube, image hosting)</li>
                  <li>Network restrictions</li>
                  <li>Outdated links</li>
                </ul>
                <p><strong>Solutions:</strong></p>
                <ul>
                  <li>Check if you can access YouTube directly</li>
                  <li>Try refreshing the page</li>
                  <li>Regenerate AI content to get fresh links</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="support-resources">
            <h3>Getting Help</h3>
            <div className="support-options">
              <div className="support-item">
                <h4>📚 Documentation</h4>
                <p>Refer to this training guide anytime</p>
              </div>
              <div className="support-item">
                <h4>👥 IT Support</h4>
                <p>Contact your school's IT department for technical issues</p>
              </div>
              <div className="support-item">
                <h4>🔄 Try Again</h4>
                <p>Many issues resolve themselves with a simple page refresh</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "Congratulations!",
      icon: CheckCircle,
      content: (
        <div className="training-step">
          <h2>🎉 Congratulations! You're Ready to Teach!</h2>
          
          <div className="completion-summary">
            <h3>What You've Learned:</h3>
            <div className="achievements">
              <div className="achievement">
                <CheckCircle className="achievement-icon" />
                <span>Platform navigation and structure</span>
              </div>
              <div className="achievement">
                <CheckCircle className="achievement-icon" />
                <span>Creating and managing topics</span>
              </div>
              <div className="achievement">
                <CheckCircle className="achievement-icon" />
                <span>Generating AI-powered lesson content</span>
              </div>
              <div className="achievement">
                <CheckCircle className="achievement-icon" />
                <span>Using teaching materials effectively</span>
              </div>
              <div className="achievement">
                <CheckCircle className="achievement-icon" />
                <span>Troubleshooting common issues</span>
              </div>
            </div>
          </div>

          <div className="next-steps">
            <h3>Your Next Steps:</h3>
            <ol>
              <li><strong>Create your first topic</strong> in your subject area</li>
              <li><strong>Upload textbook content</strong> for better AI generation</li>
              <li><strong>Generate AI content</strong> and review the results</li>
              <li><strong>Customize the content</strong> to match your teaching style</li>
              <li><strong>Start teaching</strong> with confidence!</li>
            </ol>
          </div>

          <div className="final-tips">
            <h3>💡 Final Tips for Success:</h3>
            <ul>
              <li>Always review AI-generated content before teaching</li>
              <li>Upload textbook content for more accurate lesson plans</li>
              <li>Save your work frequently</li>
              <li>Don't hesitate to regenerate content if needed</li>
              <li>Use the teaching guide as your classroom script</li>
            </ul>
          </div>

          <div className="training-complete">
            <h3>🚀 You're All Set!</h3>
            <p>You now have all the knowledge you need to use Learning Assist effectively. Happy teaching!</p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <div className="teacher-training">
      <div className="training-header">
        <h1>Teacher Training Guide</h1>
        <p>Learn how to use Learning Assist effectively</p>
      </div>

      <div className="training-container">
        <div className="training-sidebar">
          <div className="progress-indicator">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
            <p>Step {currentStep + 1} of {steps.length}</p>
          </div>

          <div className="steps-list">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`step-item ${currentStep === index ? 'active' : ''} ${completedSteps.includes(index) ? 'completed' : ''}`}
                onClick={() => handleStepClick(index)}
              >
                <div className="step-icon">
                  {completedSteps.includes(index) ? (
                    <CheckCircle size={20} />
                  ) : (
                    <step.icon size={20} />
                  )}
                </div>
                <div className="step-info">
                  <h4>{step.title}</h4>
                  <p>Step {index + 1}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="training-content">
          <div className="step-header">
            <div className="step-title">
              <IconComponent size={24} />
              <h2>{currentStepData.title}</h2>
            </div>
            <div className="step-navigation">
              <button 
                onClick={handlePrevious} 
                disabled={currentStep === 0}
                className="nav-button"
              >
                <ArrowLeft size={16} />
                Previous
              </button>
              <button 
                onClick={handleNext} 
                disabled={currentStep === steps.length - 1}
                className="nav-button primary"
              >
                {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="step-body">
            {currentStepData.content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherTraining;
