import React, { useState } from 'react';
import { Clock, BookOpen, Users, Target, Play, ExternalLink, Youtube, Gamepad2, Wand2, Loader2, Volume2, Monitor, Hand, VolumeX } from 'lucide-react';
import { secureGeminiService, SectionEnhancementRequest } from '../services/secureGeminiService';
import { SpeechService } from '../services/speechService';

interface LessonSection {
  id: string;
  title: string;
  content: string;
  duration?: number;
  type: 'objectives' | 'materials' | 'introduction' | 'content' | 'activities' | 'assessment' | 'homework' | 'resources' | 'other';
}

interface LessonLink {
  title: string;
  url: string;
  type: 'video' | 'game' | 'tool' | 'audio' | 'activity' | 'other';
}

interface LessonPlanDisplayProps {
  lessonPlan: string;
  classLevel: string;
  topicName: string;
  subject?: string;
  onSectionUpdate?: (sectionId: string, newContent: string) => void;
  onLessonPlanUpdate?: (updatedLessonPlan: string) => void;
}

const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({
  lessonPlan,
  classLevel,
  topicName,
  subject,
  onSectionUpdate,
  onLessonPlanUpdate
}) => {
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [enhancingSection, setEnhancingSection] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const parseLessonPlan = (text: string): LessonSection[] => {
    const sections: LessonSection[] = [];
    
    // First, try to parse as JSON (from secureGeminiService)
    try {
      const lessonPlanData = JSON.parse(text);
      if (lessonPlanData && typeof lessonPlanData === 'object') {
        let sectionId = 1;

        // Parse objectives
        if (lessonPlanData.objectives && Array.isArray(lessonPlanData.objectives)) {
          sections.push({
            id: `section-${sectionId}`,
            title: 'Learning Objectives',
            content: lessonPlanData.objectives.map((obj: string, index: number) => `${index + 1}. ${obj}`).join('\n'),
            type: 'objectives'
          });
          sectionId++;
        }

        // Parse materials
        if (lessonPlanData.materials && Array.isArray(lessonPlanData.materials)) {
          sections.push({
            id: `section-${sectionId}`,
            title: 'Materials Needed',
            content: lessonPlanData.materials.map((material: string) => `• ${material}`).join('\n'),
            type: 'materials'
          });
          sectionId++;
        }

        // Parse introduction
        if (lessonPlanData.introduction) {
          sections.push({
            id: `section-${sectionId}`,
            title: 'Introduction',
            content: lessonPlanData.introduction,
            duration: 5,
            type: 'introduction'
          });
          sectionId++;
        }

        // Parse main content
        if (lessonPlanData.mainContent && Array.isArray(lessonPlanData.mainContent)) {
          lessonPlanData.mainContent.forEach((content: any) => {
            sections.push({
              id: `section-${sectionId}`,
              title: content.section || 'Main Content',
              content: content.content || '',
              duration: content.timeEstimate ? parseInt(content.timeEstimate) : undefined,
              type: 'content'
            });
            sectionId++;
          });
        }

        // Parse wrap-up
        if (lessonPlanData.wrapUp) {
          sections.push({
            id: `section-${sectionId}`,
            title: 'Wrap-up',
            content: lessonPlanData.wrapUp,
            duration: 2,
            type: 'activities'
          });
          sectionId++;
        }

        // Parse assessment
        if (lessonPlanData.assessment) {
          sections.push({
            id: `section-${sectionId}`,
            title: 'Assessment Methods',
            content: lessonPlanData.assessment,
            type: 'assessment'
          });
          sectionId++;
        }

        // Parse homework
        if (lessonPlanData.homework) {
          sections.push({
            id: `section-${sectionId}`,
            title: 'Homework & Follow-up',
            content: lessonPlanData.homework,
            type: 'homework'
          });
          sectionId++;
        }

        // Parse resources
        if (lessonPlanData.resources && Array.isArray(lessonPlanData.resources)) {
          sections.push({
            id: `section-${sectionId}`,
            title: 'Educational Resources',
            content: lessonPlanData.resources.map((resource: string) => `• ${resource}`).join('\n'),
            type: 'resources'
          });
          sectionId++;
        }

        if (sections.length > 0) {
          return sections;
        }
      }
    } catch (error) {
      console.log('Not JSON format, falling back to text parsing');
    }

    // Fallback to text parsing (from original geminiService)
    const sectionPatterns = [
      { pattern: /(?:learning\s+)?objectives?[\s:]*(.+?)(?=(?:materials|lesson\s+structure|introduction|main\s+content|activities|assessment|homework|educational\s+resources|$))/is, type: 'objectives' as const, title: 'Learning Objectives' },
      { pattern: /materials?\s+needed[\s:]*(.+?)(?=(?:lesson\s+structure|introduction|main\s+content|activities|assessment|homework|educational\s+resources|$))/is, type: 'materials' as const, title: 'Materials Needed' },
      { pattern: /(?:lesson\s+structure[\s:]*)?introduction[\s:]*\([^)]*\)[\s:]*(.+?)(?=(?:main\s+content|activities|assessment|homework|educational\s+resources|$))/is, type: 'introduction' as const, title: 'Introduction', duration: 5 },
      { pattern: /main\s+content[\s:]*\([^)]*\)[\s:]*(.+?)(?=(?:activities|assessment|homework|educational\s+resources|$))/is, type: 'content' as const, title: 'Main Content', duration: 25 },
      { pattern: /activities[\s:]*\([^)]*\)[\s:]*(.+?)(?=(?:wrap[- ]?up|assessment|homework|educational\s+resources|$))/is, type: 'activities' as const, title: 'Activities', duration: 8 },
      { pattern: /(?:wrap[- ]?up|conclusion)[\s:]*\([^)]*\)[\s:]*(.+?)(?=(?:assessment|homework|educational\s+resources|$))/is, type: 'activities' as const, title: 'Wrap-up', duration: 2 },
      { pattern: /assessment\s+methods?[\s:]*(.+?)(?=(?:homework|educational\s+resources|$))/is, type: 'assessment' as const, title: 'Assessment Methods' },
      { pattern: /(?:homework|follow[- ]?up\s+activities?)[\s:]*(.+?)(?=(?:educational\s+resources|$))/is, type: 'homework' as const, title: 'Homework & Follow-up' },
      { pattern: /educational\s+resources[\s:]*(.+?)$/is, type: 'resources' as const, title: 'Educational Resources' }
    ];

    let sectionId = 1;

    for (const { pattern, type, title, duration } of sectionPatterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 10) {
        sections.push({
          id: `section-${sectionId}`,
          title,
          content: match[1].trim(),
          duration,
          type
        });
        sectionId++;
      }
    }

    // If no structured sections found, create a single section
    if (sections.length === 0) {
      sections.push({
        id: 'section-1',
        title: 'Lesson Plan',
        content: text.trim(),
        type: 'other'
      });
    }

    return sections;
  };

  const extractLinks = (content: string): LessonLink[] => {
    const links: LessonLink[] = [];
    
    // Pattern for markdown-style links: [Title](URL)
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      const title = match[1];
      const url = match[2];
      const type = getLinkType(url, title);
      
      links.push({ title, url, type });
    }

    // Pattern for plain URLs
    const urlRegex = /https?:\/\/[^\s<>"\]]+/g;
    const plainUrls = content.match(urlRegex) || [];
    
    plainUrls.forEach(url => {
      // Skip if already captured as markdown link
      if (!links.some(link => link.url === url)) {
        const title = generateTitleFromUrl(url);
        const type = getLinkType(url, title);
        links.push({ title, url, type });
      }
    });

    return links;
  };

  const extractYouTubeVideos = (content: string): LessonLink[] => {
    const youtubeLinks: LessonLink[] = [];
    
    // Pattern for YouTube markdown links: [Title](https://www.youtube.com/watch?v=...)
    const youtubeMarkdownRegex = /\[([^\]]+)\]\((https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+[^\)]*)\)/g;
    let match;
    
    while ((match = youtubeMarkdownRegex.exec(content)) !== null) {
      const title = match[1];
      const url = match[2];
      
      youtubeLinks.push({ title, url, type: 'video' });
    }

    // Pattern for plain YouTube URLs
    const youtubeUrlRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/g;
    const plainYouTubeUrls = content.match(youtubeUrlRegex) || [];
    
    plainYouTubeUrls.forEach(url => {
      // Skip if already captured as markdown link
      if (!youtubeLinks.some(link => link.url === url)) {
        const title = generateTitleFromUrl(url);
        youtubeLinks.push({ title, url, type: 'video' });
      }
    });

    return youtubeLinks;
  };

  const getLinkType = (url: string, title: string): LessonLink['type'] => {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    // Check for classroom activities first
    if (url === 'Classroom Activity' || urlLower === 'classroom activity' ||
        titleLower.includes('classroom') || titleLower.includes('hands-on') ||
        titleLower.includes('activity') || titleLower.includes('demonstration')) {
      return 'activity';
    }

    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || 
        urlLower.includes('vimeo.com') || urlLower.includes('video') || 
        titleLower.includes('video') || titleLower.includes('watch')) {
      return 'video';
    }
    
    if (titleLower.includes('podcast') || titleLower.includes('audio') || 
        titleLower.includes('listen') || titleLower.includes('song') ||
        urlLower.includes('podcast') || urlLower.includes('audio') ||
        urlLower.includes('spotify') || urlLower.includes('soundcloud')) {
      return 'audio';
    }
    
    if (titleLower.includes('game') || titleLower.includes('play') || 
        titleLower.includes('simulation') || titleLower.includes('interactive') ||
        urlLower.includes('game') || urlLower.includes('simulation') ||
        urlLower.includes('coolmath') || urlLower.includes('kahoot')) {
      return 'game';
    }
    
    if (titleLower.includes('tool') || titleLower.includes('calculator') || 
        titleLower.includes('app') || titleLower.includes('platform') ||
        urlLower.includes('tool') || urlLower.includes('calculator')) {
      return 'tool';
    }
    
    return 'other';
  };

  const generateTitleFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch {
      return 'Educational Resource';
    }
  };

  const formatContent = (content: string): string => {
    let formatted = content;
    
    // Fix line breaks - convert multiple newlines to proper spacing
    formatted = formatted.replace(/\n\s*\n/g, '\n\n');
    
    // Convert markdown-style formatting
    // Bold text: **text** → <strong>text</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle bullet points and lists
    formatted = formatted.replace(/^[\s]*[-•*]\s+(.+)$/gm, '• $1');
    
    // Handle numbered lists
    formatted = formatted.replace(/^[\s]*(\d+)\.\s+(.+)$/gm, '$1. $2');
    
    // Add spacing around headers (lines that end with :)
    formatted = formatted.replace(/^(.+):$/gm, '\n**$1:**\n');
    
    return formatted;
  };

  const renderContentWithLinks = (content: string, links: LessonLink[]) => {
    let processedContent = formatContent(content);
    
    // Create a map of placeholder to link for easier replacement
    const linkMap = new Map<string, LessonLink>();
    
    // Replace markdown links with placeholders
    links.forEach((link, index) => {
      const placeholder = `LINK_PLACEHOLDER_${index}`;
      linkMap.set(placeholder, link);
      
      // Replace markdown format: [Title](URL)
      const markdownPattern = new RegExp(`\\[${link.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${link.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
      processedContent = processedContent.replace(markdownPattern, placeholder);
      
      // Also replace plain URLs
      const urlPattern = new RegExp(link.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedContent = processedContent.replace(urlPattern, placeholder);
    });

    // Split content by paragraphs and process each part
    const paragraphs = processedContent.split('\n\n').filter(p => p.trim());
    
    return (
      <div className="formatted-content">
        {paragraphs.map((paragraph, paragraphIndex) => {
          const parts = paragraph.split(/(LINK_PLACEHOLDER_\d+)/);
          
          return (
            <div key={paragraphIndex} className="content-paragraph">
              {parts.map((part, partIndex) => {
                if (part.startsWith('LINK_PLACEHOLDER_')) {
                  const link = linkMap.get(part);
                  if (link) {
                    return (
                      <div key={partIndex} className="lesson-link">
                        {link.type === 'activity' || link.url === 'Classroom Activity' ? (
                          <div className={`link-${link.type} activity-badge`}>
                            {getLinkIcon(link.type)}
                            <span>{link.title}</span>
                          </div>
                        ) : (
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className={`link-${link.type}`}>
                            {getLinkIcon(link.type)}
                            <span>{link.title}</span>
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    );
                  }
                }
                
                // Process text content with formatting
                const formatTextContent = (text: string) => {
                  // Convert numbered lists
                  const numberedListRegex = /^(\d+)\.\s+(.+)$/gm;
                  let formatted = text.replace(numberedListRegex, '<li>$2</li>');
                  
                  // Wrap consecutive list items in ol tags
                  formatted = formatted.replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)*/gs, (match) => {
                    return `<ol>${match}</ol>`;
                  });
                  
                  // Convert bullet points
                  const bulletListRegex = /^•\s+(.+)$/gm;
                  formatted = formatted.replace(bulletListRegex, '<li>$1</li>');
                  
                  // Wrap consecutive bullet list items in ul tags
                  formatted = formatted.replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)*/gs, (match) => {
                    return `<ul>${match}</ul>`;
                  });
                  
                  // Convert bold text
                  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                  
                  // Convert emoji headers to h3 tags
                  formatted = formatted.replace(/\*\*🎥\s*RECOMMENDED VIDEOS:\*\*/g, '<h3>🎥 RECOMMENDED VIDEOS</h3>');
                  formatted = formatted.replace(/\*\*📚\s*ADDITIONAL RESOURCES:\*\*/g, '<h3>📚 ADDITIONAL RESOURCES</h3>');
                  formatted = formatted.replace(/\*\*🎯\s*TEACHING ACTIVITIES:\*\*/g, '<h3>🎯 TEACHING ACTIVITIES</h3>');
                  
                  // Convert line breaks to paragraphs
                  formatted = formatted.replace(/\n\n/g, '</p><p>');
                  formatted = '<p>' + formatted + '</p>';
                  
                  // Clean up empty paragraphs
                  formatted = formatted.replace(/<p><\/p>/g, '');
                  
                  return formatted;
                };

                return (
                  <div 
                    key={partIndex} 
                    className="text-content"
                    dangerouslySetInnerHTML={{ 
                      __html: formatTextContent(part)
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const getLinkIcon = (type: LessonLink['type']) => {
    switch (type) {
      case 'video': return <Youtube size={16} />;
      case 'audio': return <Volume2 size={16} />;
      case 'game': return <Gamepad2 size={16} />;
      case 'tool': return <Monitor size={16} />;
      case 'activity': return <Hand size={16} />;
      default: return <ExternalLink size={16} />;
    }
  };

  const getIconForType = (type: LessonSection['type']) => {
    const icons = {
      objectives: Target,
      materials: BookOpen,
      introduction: Play,
      content: BookOpen,
      activities: Users,
      assessment: Target,
      homework: BookOpen,
      resources: ExternalLink,
      other: BookOpen
    };
    return icons[type];
  };

  const getColorForType = (type: LessonSection['type']): string => {
    const colors = {
      objectives: 'from-blue-500 to-blue-600',
      materials: 'from-green-500 to-green-600',
      introduction: 'from-purple-500 to-purple-600',
      content: 'from-indigo-500 to-indigo-600',
      activities: 'from-orange-500 to-orange-600',
      assessment: 'from-red-500 to-red-600',
      homework: 'from-gray-500 to-gray-600',
      resources: 'from-teal-500 to-teal-600',
      other: 'from-slate-500 to-slate-600'
    };
    return colors[type];
  };

  // Initialize sections from lesson plan
  React.useEffect(() => {
    const parsedSections = parseLessonPlan(lessonPlan);
    setSections(parsedSections);
  }, [lessonPlan]);

  // Initialize speech service
  React.useEffect(() => {
    SpeechService.initialize();
  }, []);

  const reconstructLessonPlan = (sections: LessonSection[]): string => {
    return sections.map(section => {
      let content = `**${section.title}**\n\n${section.content}`;
      if (section.duration) {
        content = `**${section.title}** (${section.duration} min)\n\n${section.content}`;
      }
      return content;
    }).join('\n\n');
  };

  const handleEnhanceSection = async (section: LessonSection) => {
    if (!section || enhancingSection) return;

    setEnhancingSection(section.id);

    try {
      const request: SectionEnhancementRequest = {
        section: section.title,
        content: section.content,
        classLevel: classLevel,
        enhancementType: 'expand', // Default enhancement type for lesson plans
        topicName: topicName,
        subject: subject,
        sectionType: section.type,
        duration: section.duration
      };

      const response = await secureGeminiService.enhanceSection(request);

      if (response.success && response.enhancedContent) {
        // Update the section content
        const updatedSections = sections.map(s => 
          s.id === section.id 
            ? { ...s, content: response.enhancedContent! }
            : s
        );
        
        setSections(updatedSections);

        // Reconstruct the full lesson plan with the enhanced content
        const updatedLessonPlan = reconstructLessonPlan(updatedSections);
        
        // Notify parent component with the full updated lesson plan
        if (onLessonPlanUpdate) {
          onLessonPlanUpdate(updatedLessonPlan);
        }
        
        // Also notify with section-specific update for backward compatibility
        if (onSectionUpdate && response.enhancedContent) {
          onSectionUpdate(section.id, response.enhancedContent);
        }
      } else {
        console.error('Failed to enhance section:', response.error);
        alert('Failed to enhance section: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error enhancing section:', error);
      alert('An error occurred while enhancing the section');
    } finally {
      setEnhancingSection(null);
    }
  };

  const handlePlayAudio = async (section: LessonSection) => {
    if (playingAudio === section.id) {
      // Stop current audio
      SpeechService.stopSpeech();
      setPlayingAudio(null);
      return;
    }

    // Stop any currently playing audio
    if (playingAudio) {
      SpeechService.stopSpeech();
    }

    setPlayingAudio(section.id);

    try {
      const script = SpeechService.generateLessonScript(section.title, section.content, classLevel);
      const result = await SpeechService.generateAudioForSection(script, section.title);
      
      if (!result.success) {
        console.error('Failed to generate audio:', result.error);
        alert('Audio generation failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('An error occurred while generating audio');
    } finally {
      setPlayingAudio(null);
    }
  };

  return (
    <div className="lesson-plan-display">
      <div className="lesson-header">
        <h2>{topicName}</h2>
        <p className="lesson-meta">{classLevel} • {sections.length} sections</p>
      </div>

      <div className="lesson-sections">
        {sections.map((section) => {
          const Icon = getIconForType(section.type);
          const colorClass = getColorForType(section.type);
          const links = extractLinks(section.content);
          const youtubeVideos = extractYouTubeVideos(section.content);

          return (
            <div key={section.id} className="lesson-section">
              <div className={`section-header bg-gradient-to-r ${colorClass}`}>
                <div className="section-title">
                  <Icon size={20} className="section-icon" />
                  <span>{section.title}</span>
                </div>
                <div className="section-controls">
                  {section.duration && (
                    <div className="section-duration">
                      <Clock size={16} />
                      <span>{section.duration} min</span>
                    </div>
                  )}
                  <button
                    onClick={() => handlePlayAudio(section)}
                    disabled={!!enhancingSection}
                    className="audio-button"
                    title="Generate and play audio for this section"
                  >
                    {playingAudio === section.id ? (
                      <VolumeX size={16} />
                    ) : (
                      <Volume2 size={16} />
                    )}
                    <span>
                      {playingAudio === section.id ? 'Stop' : 'Audio'}
                    </span>
                  </button>
                  <button
                    onClick={() => handleEnhanceSection(section)}
                    disabled={enhancingSection === section.id}
                    className="enhance-button"
                    title="Enhance section with AI teaching aids"
                  >
                    {enhancingSection === section.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Wand2 size={16} />
                    )}
                    <span>
                      {enhancingSection === section.id ? 'Enhancing...' : 'Enhance'}
                    </span>
                  </button>
                </div>
              </div>
              
              {youtubeVideos.length > 0 && (
                <div className="video-buttons-row">
                  {youtubeVideos.map((video, index) => (
                    <a
                      key={index}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="video-button"
                      title={`Watch: ${video.title}`}
                    >
                      <Youtube size={14} />
                      <span>{video.title.length > 25 ? video.title.substring(0, 25) + '...' : video.title}</span>
                    </a>
                  ))}
                </div>
              )}
              
              <div className="section-content">
                <div className="content-text">
                  {renderContentWithLinks(section.content, links)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LessonPlanDisplay;
