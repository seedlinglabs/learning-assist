# 👋 START HERE - Welcome to Sprout AI Learning Assistant!

## 🎯 You Are Here

You've just joined the **Sprout AI Learning Assistant** project and need to get up to speed quickly. I've created a complete onboarding package with everything you need to know.

---

## 📚 Documentation Package Overview

I've created **4 comprehensive documents** to help you understand this project:

### 1. 📖 **ONBOARDING_GUIDE.md** (MAIN GUIDE - Read First!)
   - **What it covers**: Complete deep-dive into the entire project
   - **Sections** (20 total):
     - Project overview and goals
     - System architecture (diagrams included)
     - Technology stack breakdown
     - Project structure walkthrough
     - Key components deep dive
     - Data flow & state management
     - Backend services (Lambda functions)
     - Frontend architecture
     - Authentication & authorization
     - API integration
     - Development workflow
     - Deployment guide
     - Key features
     - Common tasks (with code examples)
     - Troubleshooting
     - Best practices
   - **Length**: ~15,000 words
   - **Time to read**: 45-60 minutes

### 2. ⚡ **QUICK_REFERENCE.md** (Keep This Open While Coding!)
   - **What it covers**: Quick lookup for common commands, URLs, and patterns
   - **Sections**:
     - Essential commands (frontend, backend, deployment)
     - Project URLs (production, dev, API)
     - Data hierarchy diagram
     - User roles & permissions table
     - All API endpoints
     - Database tables
     - Context API methods
     - Common debugging steps
     - Common issues & quick fixes
     - Git workflow
   - **Length**: ~3,000 words
   - **Time to read**: 10-15 minutes
   - **Use case**: Reference while coding

### 3. 🏗️ **ARCHITECTURE_DIAGRAM.md** (Visual Learner's Guide)
   - **What it covers**: Visual architecture diagrams and data flow
   - **Sections**:
     - System overview diagram
     - Data flow examples:
       - User login flow
       - AI content generation flow
       - Navigation flow
     - Component tree
     - Security architecture layers
   - **Length**: ~4,000 words
   - **Time to read**: 15-20 minutes
   - **Use case**: Understanding how everything connects

### 4. 🔧 **TROUBLESHOOTING_GUIDE.md** (Your Emergency Handbook)
   - **What it covers**: Common issues and how to fix them
   - **Sections** (10 categories):
     - Frontend issues
     - Backend/API issues
     - Authentication issues
     - AI content generation issues
     - Database issues
     - Deployment issues
     - Performance issues
     - Browser-specific issues
     - Development environment issues
     - Common error messages
   - **Length**: ~6,000 words
   - **Time to read**: 20-30 minutes
   - **Use case**: When something breaks

---

## 🚀 Recommended Learning Path

### Week 1: Understanding the Basics

#### Day 1: Read Documentation (4-5 hours)
1. ✅ Read this file (START_HERE.md) - 5 minutes
2. ✅ Read **ONBOARDING_GUIDE.md** sections 1-6 (Project Overview → State Management) - 2 hours
3. ✅ Skim **QUICK_REFERENCE.md** to familiarize yourself - 10 minutes
4. ✅ Look at **ARCHITECTURE_DIAGRAM.md** to visualize the system - 20 minutes
5. ✅ Bookmark **TROUBLESHOOTING_GUIDE.md** for later - 5 minutes

#### Day 2-3: Run the App (8 hours)
1. ✅ Set up development environment:
   ```bash
   cd learning-assist/learning-assist
   npm install
   npm start
   ```
2. ✅ Create test accounts (teacher, parent, student)
3. ✅ Navigate through all levels: School → Class → Subject → Topic
4. ✅ Test all features:
   - Create a topic
   - Generate AI content (all tabs)
   - Upload a PDF
   - Search for content
   - Export to PDF/Word
   - Add images/videos
5. ✅ Toggle dark mode, test search, explore admin panel

#### Day 4-5: Code Exploration (12 hours)
1. ✅ Read key files mentioned in **ONBOARDING_GUIDE.md** section 5
2. ✅ Open these files in VS Code:
   - `src/App.tsx` - Main app structure
   - `src/context/AppContext.tsx` - Global state
   - `src/context/AuthContext.tsx` - Authentication
   - `src/components/TopicTabbedView.tsx` - Main content display
   - `backend/lambda_function.py` - Topics API
   - `backend/auth_lambda_function.py` - Auth API
3. ✅ Add `console.log()` statements and see how data flows
4. ✅ Read **ONBOARDING_GUIDE.md** sections 7-10 (Backend → API Integration)

### Week 2: Make Your First Change

#### Day 1-2: Small Bug Fix or Feature (8 hours)
1. ✅ Pick a small task:
   - Fix a CSS issue
   - Add a validation message
   - Improve error handling
   - Add a new field to a component
2. ✅ Follow **ONBOARDING_GUIDE.md** section 14 (Common Tasks)
3. ✅ Test your changes locally
4. ✅ Use **TROUBLESHOOTING_GUIDE.md** if you encounter issues

#### Day 3: Deploy Your Changes (4 hours)
1. ✅ Read **ONBOARDING_GUIDE.md** section 12 (Deployment Guide)
2. ✅ Deploy to dev environment:
   ```bash
   # Frontend
   ./deploy-frontend-dev.sh
   
   # Backend (if you changed Lambda)
   cd backend
   ./deploy-topics-only.sh
   ```
3. ✅ Test on dev URL
4. ✅ Deploy to production if working

#### Day 4-5: Code Review & Learning (8 hours)
1. ✅ Read **ONBOARDING_GUIDE.md** section 16 (Best Practices)
2. ✅ Review your code against best practices
3. ✅ Learn Git workflow (section 19)
4. ✅ Explore more complex components

### Week 3-4: Deep Dive

1. ✅ Understand AI content generation flow
2. ✅ Learn Lambda function internals
3. ✅ Understand DynamoDB schema and queries
4. ✅ Explore API Gateway configuration
5. ✅ Work on a medium-sized feature
6. ✅ Optimize performance
7. ✅ Add monitoring/logging

---

## 🎯 Quick Start (If You're In a Hurry)

### 30-Minute Quick Start

1. **Read**: Section 1 of ONBOARDING_GUIDE.md (Project Overview) - 10 min
2. **Run**: Start the app locally:
   ```bash
   cd learning-assist/learning-assist
   npm install
   npm start
   ```
   - 10 min
3. **Explore**: Click around the app, test features - 10 min

### 2-Hour Crash Course

1. **Read**: ONBOARDING_GUIDE.md sections 1-6 - 60 min
2. **Run**: Local development environment - 15 min
3. **Code**: Read App.tsx and AppContext.tsx - 30 min
4. **Reference**: Skim QUICK_REFERENCE.md - 15 min

---

## 📋 Essential Information At a Glance

### Project Type
- **Full-stack educational platform**
- **Serverless AWS architecture**
- **React + TypeScript frontend**
- **Python Lambda backend**

### Key Technologies
- React 19, TypeScript, Context API
- AWS Lambda, DynamoDB, API Gateway
- Google Gemini AI for content generation
- YouTube/Unsplash/Pexels APIs

### Project URLs
- **Production**: http://aischool.seedlinglabs.com.s3-website-us-west-2.amazonaws.com
- **Development**: http://aischool.dev.seedlinglabs.com.s3-website-us-west-2.amazonaws.com
- **API**: https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod

### User Roles
1. **Teacher**: Create/edit content, generate AI materials
2. **Parent**: View content for their children's classes
3. **Student**: Access learning materials
4. **Admin**: Manage users and system settings

### Data Hierarchy
```
School
  └── Class (e.g., "Grade 6 - Section A")
      └── Subject (e.g., "Science")
          └── Topic (e.g., "Photosynthesis")
              ├── Overview
              ├── Lesson Plan (AI-generated)
              ├── Teaching Guide (AI-generated)
              ├── Group Discussion (AI-generated)
              ├── Assessment (AI-generated)
              ├── Worksheets (AI-generated)
              ├── Images
              └── Videos
```

---

## 🔑 Key Files to Know

### Must Read (Priority 1)
1. `src/App.tsx` - Main app component
2. `src/context/AppContext.tsx` - Global state management
3. `src/context/AuthContext.tsx` - Authentication state
4. `src/types/index.ts` - TypeScript interfaces
5. `backend/lambda_function.py` - Topics API
6. `backend/auth_lambda_function.py` - Auth API

### Important (Priority 2)
7. `src/components/TopicTabbedView.tsx` - Main content display
8. `src/services/api.ts` - API client
9. `src/services/authService.ts` - Auth service
10. `src/services/secureGeminiService.ts` - AI integration

### Helpful (Priority 3)
11. All other components in `src/components/`
12. `backend/gemini_lambda_function.py` - AI proxy
13. All other services in `src/services/`

---

## 🛠️ Essential Commands

### Start Development
```bash
cd learning-assist/learning-assist
npm start
```

### Deploy Frontend
```bash
# Development
./deploy-frontend-dev.sh

# Production
./deploy-frontend.sh
```

### Deploy Backend
```bash
cd backend
./deploy-topics-only.sh
./deploy-auth-only.sh
./enable-cors.sh
```

### Debug
```bash
# Check Lambda logs
aws logs tail /aws/lambda/learning-assist-topics --follow

# Test API
curl https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/topics
```

---

## 🆘 When You're Stuck

### Step 1: Check Browser Console
- Press **F12**
- Go to **Console** tab
- Look for red error messages
- Read the error carefully

### Step 2: Check Documentation
- Search **TROUBLESHOOTING_GUIDE.md** for your error
- Check **QUICK_REFERENCE.md** for command/syntax
- Refer to **ONBOARDING_GUIDE.md** for concept explanation

### Step 3: Check Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/learning-assist-topics --follow

# Network requests (browser F12 → Network tab)
```

### Step 4: Test Components Individually
- API endpoints with curl
- Components with console.log()
- Lambda functions directly with AWS CLI

### Step 5: Ask for Help
Include in your question:
- What you're trying to do
- What you expected to happen
- What actually happened
- Error messages (exact text)
- Steps to reproduce

---

## 📈 Progress Checklist

Track your onboarding progress:

### Week 1: Understanding
- [ ] Read ONBOARDING_GUIDE.md (sections 1-6)
- [ ] Skim QUICK_REFERENCE.md
- [ ] Review ARCHITECTURE_DIAGRAM.md
- [ ] Bookmark TROUBLESHOOTING_GUIDE.md
- [ ] Run app locally
- [ ] Test all features manually
- [ ] Read key source files

### Week 2: First Contribution
- [ ] Make a small code change
- [ ] Test locally
- [ ] Deploy to dev environment
- [ ] Verify it works
- [ ] Deploy to production
- [ ] Document what you learned

### Week 3-4: Deep Dive
- [ ] Understand authentication flow
- [ ] Understand AI content generation
- [ ] Understand DynamoDB schema
- [ ] Work on medium feature
- [ ] Optimize something
- [ ] Help another developer

---

## 🎓 Learning Resources

### Internal Documentation
1. **ONBOARDING_GUIDE.md** - Complete reference
2. **QUICK_REFERENCE.md** - Quick lookup
3. **ARCHITECTURE_DIAGRAM.md** - Visual guide
4. **TROUBLESHOOTING_GUIDE.md** - Problem solving
5. `learning-assist/README.md` - Project overview
6. `learning-assist/backend/README.md` - Backend deployment
7. `learning-assist/DEPLOYMENT.md` - Detailed deployment guide
8. `learning-assist/FEATURES_IMPLEMENTED.md` - Feature list

### External Resources
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **AWS Lambda**: https://docs.aws.amazon.com/lambda/
- **DynamoDB**: https://docs.aws.amazon.com/dynamodb/
- **Gemini API**: https://ai.google.dev/docs

---

## 💡 Pro Tips

### For Maximum Productivity

1. **Keep QUICK_REFERENCE.md open** in a second monitor or tab
2. **Use VS Code search** (Ctrl+Shift+F) to find examples in codebase
3. **Read error messages carefully** - they usually tell you exactly what's wrong
4. **Check Lambda logs first** when API calls fail
5. **Test in dev environment** before deploying to production
6. **Use React DevTools** browser extension for debugging
7. **Use AWS CLI** for quick debugging (faster than Console)

### Time-Saving Shortcuts

```bash
# Alias for common commands (add to ~/.bashrc or ~/.zshrc)
alias lm-start="cd ~/learning-assist/learning-assist && npm start"
alias lm-deploy-dev="cd ~/learning-assist/learning-assist && ./deploy-frontend-dev.sh"
alias lm-logs="aws logs tail /aws/lambda/learning-assist-topics --follow"
alias lm-api="curl https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod"
```

---

## 🎉 You're Ready!

You now have:
- ✅ Complete understanding of project structure
- ✅ Comprehensive documentation package
- ✅ Clear learning path
- ✅ Quick reference guide
- ✅ Troubleshooting handbook
- ✅ Essential commands memorized

**Next Step**: Open **ONBOARDING_GUIDE.md** and start reading! 📖

Good luck, and welcome to the team! 🚀

---

## 📞 Need Help?

If you're stuck:
1. Check **TROUBLESHOOTING_GUIDE.md**
2. Search documentation (Ctrl+F)
3. Check browser console / Lambda logs
4. Ask team members
5. Review code examples in **ONBOARDING_GUIDE.md** section 14

---

**Created**: November 6, 2025  
**Documentation Version**: 1.0  
**Total Documentation**: ~30,000 words across 4 files

**Happy Learning! 🎓**

