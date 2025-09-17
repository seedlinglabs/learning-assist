# Learning Assistant

A React-based hierarchical learning management system that integrates with NotebookLM. This application allows teachers to navigate through a structured hierarchy of Schools → Classes → Subjects → Topics and seamlessly open relevant NotebookLM notebooks.

## Features

### 🏫 Hierarchical Navigation
- **School Level**: Browse different schools in your system
- **Class Level**: Navigate through classes within a school
- **Subject Level**: Explore subjects within a class
- **Topic Level**: Access individual topics with NotebookLM integration

### 🔍 Powerful Search
- Search across all levels of the hierarchy
- Find topics, subjects, classes, and schools instantly
- Search results show the full path and context
- Click on search results to navigate directly to that location

### 📝 Topic Management
- **Add Topics**: Create new topics with descriptions and NotebookLM URLs
- **Edit Topics**: Update topic information, descriptions, and links
- **Delete Topics**: Remove topics that are no longer needed
- **NotebookLM Integration**: Click on topics to open them directly in NotebookLM

### 🎨 Modern UI/UX
- Beautiful, responsive design that works on all devices
- Intuitive breadcrumb navigation
- Card-based layout for easy browsing
- Smooth animations and transitions
- Professional gradient styling

## Technology Stack

- **React 18** with TypeScript
- **Lucide React** for beautiful icons
- **CSS3** with modern features (Grid, Flexbox, Gradients)
- **Context API** for state management
- **Local Storage** ready (data persists in React state)

## Getting Started

### Prerequisites
- Node.js 14 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd learning-assist
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Data Structure

The application uses a hierarchical data structure:

```typescript
School → Classes → Subjects → Topics
```

### Sample Data
The app comes with sample data including:
- **Lincoln Elementary School** with Grade 3 & 4 classes
- **Washington High School** with Grade 9 classes
- Various subjects like Mathematics, Science, Biology
- Topics with NotebookLM integration examples

### Adding Your Own Data
To customize the data for your institution:

1. Open `src/data/mockData.ts`
2. Modify the `mockSchools` array with your school structure
3. Add your NotebookLM URLs to the topics
4. Save and restart the application

## Usage Guide

### Navigation
1. **Start at Home**: View all schools in your system
2. **Select School**: Click on a school to see its classes
3. **Choose Class**: Select a class to view its subjects
4. **Pick Subject**: Click on a subject to see all topics
5. **Access Topic**: Click on a topic to open it in NotebookLM

### Search Functionality
- Use the search bar in the header to find content quickly
- Search works across all levels (schools, classes, subjects, topics)
- Click on search results to jump directly to that content
- Clear search to return to normal navigation

### Managing Topics
- **Add Topic**: Click the "Add Topic" button when viewing a subject
- **Edit Topic**: Click the edit icon on any topic card
- **Delete Topic**: Click the delete icon (confirmation required)
- **Open in NotebookLM**: Click anywhere on a topic card

### Breadcrumb Navigation
- Use the breadcrumb trail to navigate back to any level
- Click "Home" to return to the school list
- Click any level in the breadcrumb to jump back to that view

## Customization

### Styling
The application uses a modern CSS design system with:
- CSS custom properties for easy theming
- Responsive design for mobile and desktop
- Beautiful gradients and shadows
- Consistent spacing and typography

To customize the appearance:
1. Open `src/App.css`
2. Modify the CSS custom properties at the top
3. Adjust colors, fonts, and spacing as needed

### Adding New Features
The application is built with extensibility in mind:
- Add new fields to the data types in `src/types/index.ts`
- Extend the context API in `src/context/AppContext.tsx`
- Create new components in the `src/components/` directory

## NotebookLM Integration

The application integrates with NotebookLM by:
1. Storing NotebookLM URLs in topic data
2. Opening links in new browser tabs when topics are clicked
3. Displaying visual indicators for topics with NotebookLM links

### Setting Up NotebookLM Links
1. Create your notebook in NotebookLM
2. Copy the notebook URL
3. Add or edit a topic in the Learning Assistant
4. Paste the URL in the "NotebookLM URL" field
5. Save the topic

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:
1. Check the GitHub issues page
2. Create a new issue with detailed information
3. Include browser version and steps to reproduce any problems

## Future Enhancements

Planned features:
- Export/import functionality for data
- User authentication and permissions
- Advanced filtering and sorting
- Bulk topic management
- Integration with other educational platforms
- Offline support with service workers