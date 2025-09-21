# TouchGrass - Burnout Prevention for Developers

## Inspiration

As ambitious software engineers, we spend a lot of time on our computers and are incredibly vulnerable to burnout. We want to empower coders to monitor their productivity and detect signs of burnout before it's too late.

## What it does

Our web app monitors your webcam to estimate your mood and how much time you're spending at your desk each day. It also monitors your Linear account to see how quickly you're crushing story points. We use this data to predict when you might be prone to burnout and proactively remind you to take breaks.

**Key Features:**
- **Real-time Mood Monitoring**: Uses face-api.js and TwelveLabs AI to analyze webcam feeds for mood detection and presence tracking
- **Work Session Tracking**: Automatically tracks continuous work sessions and breaks
- **Multi-Source Data Integration**: Combines mood data with Linear velocity, GitHub commit patterns, and Wakatime coding metrics
- **Burnout Risk Prediction**: Advanced algorithm calculates daily burnout risk scores (0-100) based on multiple factors
- **Smart Notifications**: Sends browser notifications when burnout risk exceeds user-defined thresholds
- **Comprehensive Dashboard**: Visualizes trends with interactive charts for mood, work hours, velocity, and burnout history

## How we built it

**Technology Stack:**
- **Frontend**: React 19 with Vite, TypeScript, and Tailwind CSS
- **Backend**: Convex for real-time database, functions, and authentication
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Data Visualization**: Recharts for interactive charts and graphs
- **AI/ML**: face-api.js for break detection and TwelveLabs for advanced mood analysis
- **Authentication**: Auth0 integration for secure user management

**Architecture:**
- **Real-time Database**: Convex handles all data storage and real-time updates
- **Multi-Service Integration**: APIs for Linear (project management), GitHub (commit analysis), and Wakatime (coding time tracking)
- **Background Processing**: Automated burnout score calculations using Convex actions and internal functions
- **Responsive Design**: Mobile-friendly interface with adaptive layouts

**Data Flow:**
1. Webcam monitoring captures mood and presence data
2. Linear integration tracks velocity and story point completion
3. GitHub API analyzes commit patterns and timing
4. Wakatime API provides coding time metrics
5. Burnout algorithm combines all data sources to calculate risk scores
6. Dashboard visualizes trends and triggers notifications when needed

## Challenges we ran into

1. **Real-time Webcam Processing**: Implementing efficient webcam monitoring without performance degradation required careful optimization of face-api.js models and TwelveLabs API calls.

2. **Multi-Service API Integration**: Managing rate limits and authentication across multiple third-party services (Linear, GitHub, Wakatime) while maintaining a seamless user experience.

3. **Burnout Algorithm Development**: Creating an accurate burnout prediction model that appropriately weights different factors (velocity, mood, work hours, breaks) based on data availability.

4. **Privacy Concerns**: Ensuring user privacy with webcam monitoring while still providing valuable insights through local processing and secure data handling.

5. **Real-time Notifications**: Implementing browser notifications that work reliably across different platforms and browsers without being intrusive.

## Accomplishments that we're proud of

1. **Comprehensive Burnout Detection**: Successfully integrated multiple data sources to create a holistic view of developer wellbeing and burnout risk.

2. **Real-time Monitoring**: Built a responsive system that continuously monitors user activity and provides immediate feedback without significant performance impact.

3. **Clean Architecture**: Established a scalable codebase following Convex best practices with proper separation of concerns, TypeScript typing, and modular design.

4. **User-Friendly Interface**: Created an intuitive dashboard with interactive charts and clear visual indicators for burnout risk factors.

5. **Privacy-First Design**: Implemented local webcam processing and secure data handling to protect user privacy while still providing valuable insights.

## What we learned

1. **Convex Power**: Leveraged Convex's real-time capabilities and background processing to create a responsive, data-driven application without managing servers.

2. **Multi-Model AI Integration**: Learned to effectively combine different AI services (face-api.js and TwelveLabs) for enhanced mood detection accuracy.

3. **User Experience Design**: Understood the importance of balancing comprehensive data collection with non-intrusive user experience.

4. **Rate Limit Management**: Developed strategies for handling API rate limits across multiple services while maintaining application functionality.

5. **Burnout Psychology**: Gained insights into the various factors that contribute to developer burnout and how to effectively measure and mitigate them.

## What's next for TouchGrass

1. **Mobile App Development**: Extend the platform to mobile devices for on-the-go burnout monitoring and insights.

2. **Team Features**: Add team-level analytics and management tools for engineering teams to monitor collective wellbeing.

3. **Advanced AI Models**: Integrate more sophisticated machine learning models for improved burnout prediction and personalized recommendations.

4. **Integration Expansion**: Add support for additional project management tools like Jira, Asana, and Trello.

5. **Wellness Recommendations**: Develop personalized wellness recommendations based on individual patterns and risk factors.

6. **Historical Analysis**: Implement long-term trend analysis and pattern recognition to identify chronic burnout risks.

7. **Enterprise Features**: Add organization-level dashboards, compliance features, and advanced analytics for enterprise customers.