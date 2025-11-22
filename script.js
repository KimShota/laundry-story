// React and ReactDOM are loaded from CDN
const { useState, useEffect, useRef, createElement: h } = React;
const { createRoot } = ReactDOM;

// Simple routing system
const validRoutes = ['/', '/video', '/warning', '/success', '/bts', '/team'];
let currentPath = window.location.pathname || '/';

// Validate initial path and redirect to home if invalid
if (!validRoutes.includes(currentPath)) {
  currentPath = '/';
  window.history.replaceState({}, '', '/');
}

const listeners = [];

function navigate(path) {
  currentPath = path;
  window.history.pushState({}, '', path);
  listeners.forEach(listener => listener(currentPath));
}

window.addEventListener('popstate', () => {
  const newPath = window.location.pathname;
  if (validRoutes.includes(newPath)) {
    currentPath = newPath;
  } else {
    currentPath = '/';
    window.history.replaceState({}, '', '/');
  }
  listeners.forEach(listener => listener(currentPath));
});

function useLocation() {
  const [path, setPath] = useState(currentPath);
  
  useEffect(() => {
    const listener = (newPath) => setPath(newPath);
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);
  
  return { pathname: path };
}

// Utility function for className merging
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

// Simple Button component
function Button({ className = '', variant = 'default', size = 'default', children, onClick, ...props }) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantStyles = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  };
  
  const sizeStyles = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
  };
  
  const styles = cn(baseStyles, variantStyles[variant] || variantStyles.default, sizeStyles[size] || sizeStyles.default, className);
  
  return h('button', { className: styles, onClick, ...props }, children);
}

// Navigation component
function Navigation() {
  const location = useLocation();
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Video', path: '/video' },
    { name: 'BTS', path: '/bts' },
    { name: 'Team', path: '/team' },
  ];

  return h('nav', { className: 'nav' },
    h('div', { className: 'nav-container' },
      h('div', { className: 'nav-brand' },
        h('h1', { className: 'nav-title' }, 'Laundry Guide')
      ),
      h('div', { className: 'nav-items' },
        navItems.map(item =>
          h(Button, {
            key: item.path,
            onClick: () => navigate(item.path),
            variant: location.pathname === item.path ? 'default' : 'outline',
            className: 'nav-button'
          }, item.name)
        )
      )
    )
  );
}

// Index page
function Index() {
  const [isDoorOpening, setIsDoorOpening] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState([]);

  const messages = [
    'Where are my socks?',
    'Who touched my laundry?',
    'Who took out my laundry?',
    'Who stole my t-shirt?',
    'I will never forgive whoever stole my laundry'
  ];

  useEffect(() => {
    const createFloatingText = () => {
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      // Calculate washing machine position (centered, max 800px)
      const machineSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9, 800);
      const machineLeft = (window.innerWidth - machineSize) / 2;
      const machineTop = (window.innerHeight - machineSize) / 2;
      const machineRight = machineLeft + machineSize;
      const machineBottom = machineTop + machineSize;
      
      // Add padding around machine to avoid overlap
      const padding = 80;
      const safeLeft = machineLeft - padding;
      const safeTop = machineTop - padding;
      const safeRight = machineRight + padding;
      const safeBottom = machineBottom + padding;
      
      // Estimate text width (rough calculation)
      const textWidth = message.length * 12 + 50; // Approximate width
      const textHeight = 60;
      
      let x, y;
      let attempts = 0;
      const maxAttempts = 100;
      
      // Try to find a position that doesn't overlap with machine
      do {
        // Random position with margins to keep text on screen
        x = Math.random() * (window.innerWidth - textWidth - 40) + 20;
        y = Math.random() * (window.innerHeight - textHeight - 40) + 20;
        attempts++;
        
        // Check if position overlaps with machine area
        const overlaps = (
          x + textWidth > safeLeft &&
          x < safeRight &&
          y + textHeight > safeTop &&
          y < safeBottom
        );
        
        if (!overlaps) break;
      } while (attempts < maxAttempts);
      
      // If we couldn't find a good position, place it in a corner
      if (attempts >= maxAttempts) {
        const corners = [
          { x: 20, y: 20 },
          { x: window.innerWidth - textWidth - 20, y: 20 },
          { x: 20, y: window.innerHeight - textHeight - 20 },
          { x: window.innerWidth - textWidth - 20, y: window.innerHeight - textHeight - 20 }
        ];
        const corner = corners[Math.floor(Math.random() * corners.length)];
        x = corner.x;
        y = corner.y;
      }
      
      const id = Date.now() + Math.random();
      const newText = { id, message, x, y };
      
      setFloatingTexts(prev => [...prev, newText]);
      
      // Remove text after animation (0.5s fade in + 2s display + 0.5s fade out = 3s total)
      setTimeout(() => {
        setFloatingTexts(prev => prev.filter(text => text.id !== id));
      }, 3000);
    };

    // Create initial texts
    setTimeout(() => {
      createFloatingText();
      createFloatingText();
    }, 500);
    
    // Create texts periodically
    const periodicInterval = setInterval(createFloatingText, 2500);

    return () => {
      clearInterval(periodicInterval);
    };
  }, []);

  const handleDoorClick = () => {
    if (!isDoorOpening) {
      setIsDoorOpening(true);
      setTimeout(() => {
        navigate('/video');
      }, 1000);
    }
  };

  return h('div', { className: 'index-page-fullscreen' },
    h('div', { className: 'laundry-background' }),
    floatingTexts.map(text =>
      h('div', {
        key: text.id,
        className: 'floating-text',
        style: {
          left: `${text.x}px`,
          top: `${text.y}px`,
        }
      }, text.message)
    ),
    h('div', { className: 'washing-machine-container-fullscreen' },
      h('div', { className: 'washing-machine-large shake' },
        h('div', { className: 'washing-machine-body' }),
        h('div', { className: 'control-panel' },
          h('div', { className: 'control-button' }),
          h('div', { className: 'control-button' }),
          h('div', { className: 'control-button' })
        ),
        h('div', { className: 'door-frame-large' },
          h('button', {
            onClick: handleDoorClick,
            className: cn('door-glass-large', isDoorOpening && 'door-open'),
          },
            h('div', { className: 'door-border-outer' }),
            h('div', { className: 'door-border-inner' }),
            !isDoorOpening && h('div', { className: 'door-text-container' },
              h('span', { className: 'door-text' }, 'Grab your laundry')
            )
          )
        )
      )
    )
  );
}

// Video page
function Video() {
  const videoRef = useRef(null);
  const [showChoices, setShowChoices] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const videos = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  ];

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play();
      const handleEnded = () => setShowChoices(true);
      video.addEventListener('ended', handleEnded);
      return () => video.removeEventListener('ended', handleEnded);
    }
  }, [currentVideoIndex]);

  const handleChoice = (isCorrect) => {
    if (isCorrect) {
      navigate('/success');
    } else {
      navigate('/warning');
    }
  };

  return h('div', { className: 'page-container' },
    h(Navigation),
    h('div', { className: 'video-content' },
      h('div', { className: 'video-container' },
        h('div', { className: 'video-wrapper' },
          h('video', {
            ref: videoRef,
            className: 'video-player',
            src: videos[currentVideoIndex]
          }),
          showChoices && h('div', { className: 'choices-overlay' },
            h('div', { className: 'choices-grid fade-in' },
              h(Button, {
                onClick: () => handleChoice(false),
                variant: 'outline',
                className: 'choice-button choice-button-wrong'
              }, 'Option 1'),
              h(Button, {
                onClick: () => handleChoice(true),
                variant: 'outline',
                className: 'choice-button choice-button-correct'
              }, 'Option 2'),
              h(Button, {
                onClick: () => handleChoice(false),
                variant: 'outline',
                className: 'choice-button choice-button-wrong'
              }, 'Option 3')
            )
          )
        )
      )
    )
  );
}

// Warning page
function Warning() {
  return h('div', { className: 'warning-page' },
    h('div', { className: 'warning-content fade-in' },
      h('h1', { className: 'warning-title' }, 'Do Not Do This!'),
      h(Button, {
        onClick: () => navigate('/video'),
        size: 'lg',
        variant: 'outline',
        className: 'warning-button'
      }, 'Back to Video')
    )
  );
}

// Success page
function Success() {
  return h('div', { className: 'success-page' },
    h('div', { className: 'success-content fade-in' },
      h('h1', { className: 'success-title' }, 'Let It Go'),
      h('h2', { className: 'success-subtitle' }, 'Be a Gentleman'),
      h(Button, {
        onClick: () => navigate('/video'),
        size: 'lg',
        variant: 'outline',
        className: 'success-button'
      }, 'Next Video')
    )
  );
}

// BTS page
function BTS() {
  return h('div', { className: 'page-container' },
    h(Navigation),
    h('div', { className: 'bts-content' },
      h('div', { className: 'bts-container' },
        h('h2', { className: 'bts-title' }, 'Behind the scene'),
        h('div', { className: 'video-wrapper' },
          h('video', {
            controls: true,
            className: 'video-player',
            src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
          }, 'Your browser does not support the video tag.')
        )
      )
    )
  );
}

// Team page
function Team() {
  const teamMembers = [
    { name: 'Shota', role: 'Developer' },
    { name: 'Alex', role: 'Designer' },
    { name: 'Maria', role: 'Producer' },
    { name: 'James', role: 'Director' },
  ];

  return h('div', { className: 'page-container' },
    h(Navigation),
    h('div', { className: 'team-content' },
      h('div', { className: 'team-container' },
        h('div', { className: 'team-header' },
          h('h2', { className: 'team-title' }, 'Team Members')
        ),
        h('div', { className: 'team-grid' },
          teamMembers.map((member, index) =>
            h('div', { key: index, className: 'team-member fade-in', style: { animationDelay: `${index * 0.1}s` } },
              h('div', { className: 'team-member-name' },
                h('h3', { className: 'team-member-title' }, member.name)
              ),
              h('div', { className: 'team-member-avatar' },
                h('svg', { className: 'team-member-icon', fill: 'currentColor', viewBox: '0 0 24 24' },
                  h('path', { d: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' })
                )
              )
            )
          )
        )
      )
    )
  );
}

// NotFound page
function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
    // Redirect to home after a short delay
    const timer = setTimeout(() => {
      navigate('/');
    }, 2000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return h('div', { className: 'not-found-page' },
    h('div', { className: 'not-found-content' },
      h('h1', { className: 'not-found-title' }, '404'),
      h('p', { className: 'not-found-text' }, 'Oops! Page not found'),
      h('button', { 
        onClick: () => navigate('/'),
        className: 'not-found-link'
      }, 'Return to Home')
    )
  );
}

// Main App component
function App() {
  const location = useLocation();

  const routes = {
    '/': Index,
    '/video': Video,
    '/warning': Warning,
    '/success': Success,
    '/bts': BTS,
    '/team': Team,
  };

  const Component = routes[location.pathname] || NotFound;

  return h(Component);
}

// Initialize the app
const root = createRoot(document.getElementById('root'));
root.render(h(App));

