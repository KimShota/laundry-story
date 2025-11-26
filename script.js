// Simple routing system
const validRoutes = ['/', '/video', '/warning', '/success', '/bts', '/team'];
let currentPath = window.location.pathname || '/';

// Validate initial path and redirect to home if invalid
if (!validRoutes.includes(currentPath)) {
  currentPath = '/';
  window.history.replaceState({}, '', '/');
}

// Page elements
const pages = {
  '/': document.getElementById('index-page'),
  '/video': document.getElementById('video-page'),
  '/warning': document.getElementById('warning-page'),
  '/success': document.getElementById('success-page'),
  '/bts': document.getElementById('bts-page'),
  '/team': document.getElementById('team-page'),
};

// Navigation
const navButtons = document.querySelectorAll('.nav-button');
const navigation = document.getElementById('navigation');

function navigate(path) {
  currentPath = path;
  window.history.pushState({}, '', path);
  showPage(path);
}

function showPage(path) {
  // Track previous path to detect navigation from non-video pages
  const previousPath = currentPath;
  
  // Hide all pages
  Object.values(pages).forEach(page => {
    if (page) page.style.display = 'none';
  });

  // Show current page
  const currentPage = pages[path] || pages['/'];
  if (currentPage) {
    currentPage.style.display = '';
  }

  // Update navigation buttons
  navButtons.forEach(button => {
    const buttonPath = button.getAttribute('data-path');
    if (buttonPath === path) {
      button.classList.remove('outline');
      button.classList.add('default');
    } else {
      button.classList.remove('default');
      button.classList.add('outline');
    }
  });

  // Show/hide navigation based on page
  if (path === '/' || path === '/warning' || path === '/success') {
    navigation.style.display = 'none';
  } else {
    navigation.style.display = '';
  }

  // Stop all videos when leaving video page
  if (path !== '/video') {
    // Stop video player
    const videoPlayer = document.getElementById('video-player');
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.currentTime = 0;
      videoPlayer.src = '';
    }
    
    // Stop iframe video by removing src
    const videoIframe = document.getElementById('video-iframe');
    if (videoIframe) {
      videoIframe.src = '';
      videoIframe.removeAttribute('src');
    }
    
    // Clean up video end handler
    if (videoEndHandler) {
      window.removeEventListener('message', videoEndHandler);
      videoEndHandler = null;
    }
    
    const continueButton = document.getElementById('continue-button');
    if (continueButton) {
      continueButton.style.display = 'none';
    }
  }
  
  // Stop all audio when leaving home page
  const laundryAudio = document.getElementById('laundry-audio');
  const doorAudio = document.getElementById('door-audio');
  if (laundryAudio) {
    laundryAudio.pause();
    laundryAudio.currentTime = 0;
  }
  if (doorAudio) {
    doorAudio.pause();
    doorAudio.currentTime = 0;
  }
  
  // Reset everything when going to home page
  if (path === '/') {
    resetVideoState();
    cleanupFloatingTexts(); // Clean up any existing floating texts before initializing
    initIndexPage();
  } else {
    // Clean up floating texts when leaving home page
    cleanupFloatingTexts();
    
    if (path === '/video') {
      // Always reset to main video if coming from any page other than /video itself
      // This ensures video always starts from the beginning when navigating from any other page
      if (previousPath !== '/video') {
        // Coming from any other page - always reset to main video
        resetVideoState();
        // Explicitly clear choice video state to prevent resuming
        isPlayingChoiceVideo = false;
        selectedChoice = null;
        navigationHistory.push('main-video');
      } else if (navigationHistory.length === 0 || !navigationHistory.includes('main-video')) {
        // Fresh start or no main-video in history - reset everything
        resetVideoState();
        // Explicitly clear choice video state to prevent resuming
        isPlayingChoiceVideo = false;
        selectedChoice = null;
        navigationHistory.push('main-video');
      }
      // If previousPath is '/video', we're staying on the video page, so preserve state
      initVideoPage();
    } else if (path === '/bts') {
      // Setup fullscreen button for BTS page
      setupBtsFullscreenButton();
    } else if (path === '/success') {
      // Clear navigation history when reaching success page
      // This ensures a fresh start when going back to home
      navigationHistory = [];
      isPlayingChoiceVideo = false;
      selectedChoice = null;
    }
  }
  
  // Update current path
  currentPath = path;
}

window.addEventListener('popstate', () => {
  const newPath = window.location.pathname;
  if (validRoutes.includes(newPath)) {
    currentPath = newPath;
  } else {
    currentPath = '/';
    window.history.replaceState({}, '', '/');
  }
  showPage(currentPath);
});

// Index page functionality
let floatingTextInterval = null;
let floatingTextTimeouts = []; // Track all timeouts for cleanup
let isDoorOpening = false;

function cleanupFloatingTexts() {
  // Clear interval
  if (floatingTextInterval) {
    clearInterval(floatingTextInterval);
    floatingTextInterval = null;
  }
  
  // Clear all timeouts
  floatingTextTimeouts.forEach(timeout => clearTimeout(timeout));
  floatingTextTimeouts = [];
  
  // Remove all existing floating texts
  const existingTexts = document.querySelectorAll('.floating-text');
  existingTexts.forEach(text => text.remove());
}

function initIndexPage() {
  // Clean up any existing floating texts first
  cleanupFloatingTexts();

  // Play laundry audio on home page
  const laundryAudio = document.getElementById('laundry-audio');
  if (laundryAudio) {
    laundryAudio.currentTime = 0;
    laundryAudio.play().catch(err => {
      // Handle autoplay restrictions
      console.log('Audio autoplay prevented:', err);
    });
  }

  const messages = [
    'Where are my socks?',
    'Who touched my laundry?',
    'Who took out my laundry?',
    'Who stole my t-shirt?',
    'I will never forgive whoever stole my laundry'
  ];

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
    const textWidth = message.length * 12 + 50;
      const textHeight = 60;
      
      let x, y;
      let attempts = 0;
      const maxAttempts = 100;
      
      do {
        x = Math.random() * (window.innerWidth - textWidth - 40) + 20;
        y = Math.random() * (window.innerHeight - textHeight - 40) + 20;
        attempts++;
        
        const overlaps = (
          x + textWidth > safeLeft &&
          x < safeRight &&
          y + textHeight > safeTop &&
          y < safeBottom
        );
        
        if (!overlaps) break;
      } while (attempts < maxAttempts);
      
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
      
    const textElement = document.createElement('div');
    textElement.className = 'floating-text';
    textElement.style.left = `${x}px`;
    textElement.style.top = `${y}px`;
    textElement.textContent = message;
    
    const indexPage = document.getElementById('index-page');
    if (indexPage) {
      indexPage.appendChild(textElement);
      
      // Track timeout for cleanup
      const timeout = setTimeout(() => {
        textElement.remove();
        // Remove from tracking array
        const index = floatingTextTimeouts.indexOf(timeout);
        if (index > -1) {
          floatingTextTimeouts.splice(index, 1);
        }
      }, 3000);
      floatingTextTimeouts.push(timeout);
    }
    };

  // Create initial text
  const initialTimeout = setTimeout(() => {
      createFloatingText();
    }, 500);
  floatingTextTimeouts.push(initialTimeout);
    
    // Create texts periodically
  floatingTextInterval = setInterval(createFloatingText, 3500);

  // Reset door state
  isDoorOpening = false;
  const doorButton = document.getElementById('door-button');
  const doorTextContainer = document.getElementById('door-text-container');
  if (doorButton) {
    doorButton.classList.remove('door-open');
  }
  if (doorTextContainer) {
    doorTextContainer.style.display = '';
  }
}

// Door click handler
const doorButton = document.getElementById('door-button');
if (doorButton) {
  doorButton.addEventListener('click', () => {
    if (!isDoorOpening) {
      isDoorOpening = true;
      doorButton.classList.add('door-open');
      const doorTextContainer = document.getElementById('door-text-container');
      if (doorTextContainer) {
        doorTextContainer.style.display = 'none';
      }
      
      // Play door opening audio immediately
      const doorAudio = document.getElementById('door-audio');
      if (doorAudio) {
        doorAudio.currentTime = 0;
        doorAudio.play().catch(err => {
          console.log('Door audio play prevented:', err);
        });
      }
      
      setTimeout(() => {
        navigate('/video');
      }, 1000);
    }
  });
}

// Video page functionality
let currentVideoIndex = 0;
const videos = [
  { type: 'iframe', src: 'https://drive.google.com/file/d/1tXRuomBFox5A2s3Lv0WzmuEhNfbrmhKu/preview' },
];

// All available choices
const allChoices = [
  { 
    optionLabel: 'Option 1', 
    title: 'Confront', 
    video: { type: 'iframe', src: 'https://drive.google.com/file/d/1_Nd69YGWeychNnHv88fUQ0Bj0G0x8LWw/preview' },
    isCorrect: false 
  },
  { 
    optionLabel: 'Option 2', 
    title: 'Post on ROR', 
    video: { type: 'iframe', src: 'https://drive.google.com/file/d/1SVFubzYXmUkw70lmQxDmzkYyd0xmDgwn/preview' },
    isCorrect: false 
  },
  { 
    optionLabel: 'Option 3', 
    title: 'Let it go', 
    video: { type: 'iframe', src: 'https://drive.google.com/file/d/1ZwtIBMWeeo17NoRSFmul937vg6KFHnqD/preview' },
    isCorrect: true 
  },
];

// Choice levels - defines which choices are correct at each level
const choiceLevels = [
  // Level 1: Option 3 (Let it go) is correct
  { correctIndex: 2 },
  // Level 2: Option 3 (Let it go) is correct
  { correctIndex: 2 },
  // Level 3: Option 3 (Let it go) is correct
  { correctIndex: 2 },
];

// State tracking
let currentChoiceLevel = 0;
let selectedChoice = null;
let isPlayingChoiceVideo = false;
let selectedChoices = []; // Track which choices have been selected

// Navigation history stack: tracks the sequence of pages/states
let navigationHistory = [];

// Global variable to track video end detection
let videoEndHandler = null;

// Reset all video-related state
function resetVideoState() {
  // Reset all state variables
  currentChoiceLevel = 0;
  selectedChoice = null;
  isPlayingChoiceVideo = false;
  navigationHistory = [];
  currentVideoIndex = 0;
  selectedChoices = []; // Reset selected choices
  
  // Clean up video end handler
  if (videoEndHandler) {
    window.removeEventListener('message', videoEndHandler);
    videoEndHandler = null;
  }
  
  // Reset video elements
  const videoIframe = document.getElementById('video-iframe');
  const videoPlayer = document.getElementById('video-player');
  const choicesOverlay = document.getElementById('choices-overlay');
  const choicesGrid = document.getElementById('choices-grid');
  const videoWrapper = document.querySelector('.video-wrapper');
  const continueButton = document.getElementById('continue-button');
  const backButton = document.getElementById('back-button');
  
  if (videoIframe) {
    videoIframe.style.display = 'none';
    videoIframe.src = '';
    videoIframe.removeAttribute('src');
  }
  if (videoPlayer) {
    videoPlayer.style.display = 'none';
    videoPlayer.src = '';
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load(); // Reset video element
  }
  if (choicesOverlay) {
    choicesOverlay.style.display = 'none';
  }
  if (choicesGrid) {
    choicesGrid.innerHTML = ''; // Clear all choice buttons
  }
  if (videoWrapper) {
    videoWrapper.style.display = 'flex';
  }
  if (continueButton) {
    continueButton.style.display = 'none';
  }
  if (backButton) {
    backButton.style.display = 'none';
  }
}

// Go back to previous state
function goBack() {
  if (navigationHistory.length <= 1) {
    // If we're at the start, go to home
    navigate('/');
    return;
  }
  
  // Remove current state
  navigationHistory.pop();
  
  // Get previous state
  const previousState = navigationHistory[navigationHistory.length - 1];
  
  if (previousState === 'main-video') {
    // Go back to main video
    isPlayingChoiceVideo = false;
    selectedChoice = null;
    // Don't re-initialize navigation history, it's already set
    initVideoPage();
  } else if (previousState && previousState.startsWith('choices-')) {
    // Go back to choices - restore without adding to history again
    const levelIndex = parseInt(previousState.split('-')[1]);
    isPlayingChoiceVideo = false;
    selectedChoice = null;
    showChoicesWithoutHistoryUpdate(levelIndex);
  } else if (previousState === 'choice-video') {
    // Go back from choice video to the choices that led to it
    // Need to go back one more step to get the choices state
    if (navigationHistory.length > 1) {
      navigationHistory.pop();
      const choicesState = navigationHistory[navigationHistory.length - 1];
      if (choicesState && choicesState.startsWith('choices-')) {
        const levelIndex = parseInt(choicesState.split('-')[1]);
        isPlayingChoiceVideo = false;
        selectedChoice = null;
        showChoicesWithoutHistoryUpdate(levelIndex);
      } else {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  } else {
    // Fallback: go to home
    navigate('/');
  }
}

function initVideoPage() {
  const videoPlayer = document.getElementById('video-player');
  const videoIframe = document.getElementById('video-iframe');
  const choicesOverlay = document.getElementById('choices-overlay');
  const continueButton = document.getElementById('continue-button');
  const backButton = document.getElementById('back-button');
  
  // First, check if we just reset (navigationHistory only has 'main-video')
  // If so, always show main video and ignore any choice video state
  const isJustReset = navigationHistory.length === 1 && navigationHistory[0] === 'main-video';
  
  if (isJustReset) {
    // We just reset, so force clear choice video state and show main video
    isPlayingChoiceVideo = false;
    selectedChoice = null;
    } else {
    // Check if we should resume a choice video
    // Only resume if:
    // 1. Navigation history has more than just 'main-video' (we're in the middle of a flow)
    // 2. The last state in history is 'choice-video' (we were watching a choice video)
    // 3. We have valid choice video state
    const shouldResumeChoiceVideo = 
      navigationHistory.length > 1 && 
      navigationHistory[navigationHistory.length - 1] === 'choice-video' &&
      isPlayingChoiceVideo && 
      selectedChoice &&
      selectedChoice.choice &&
      selectedChoice.levelIndex !== undefined;
    
    if (shouldResumeChoiceVideo) {
      playChoiceVideo(selectedChoice.choice, selectedChoice.levelIndex);
      return;
    }
    
    // If we're here but not in reset state, still clear choice video state
    // This handles edge cases where state might be inconsistent
    isPlayingChoiceVideo = false;
    selectedChoice = null;
  }
  
  // Reset choices overlay
  if (choicesOverlay) {
    choicesOverlay.style.display = 'none';
  }
  
  // Clean up previous video end handler
  if (videoEndHandler) {
    window.removeEventListener('message', videoEndHandler);
    videoEndHandler = null;
  }
  
  // Explicitly reset video elements to ensure clean state
  if (videoIframe) {
    videoIframe.style.display = 'none';
    videoIframe.src = '';
    videoIframe.removeAttribute('src');
  }
  if (videoPlayer) {
    videoPlayer.style.display = 'none';
    videoPlayer.src = '';
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
  }
  
  // Show video wrapper
  const videoWrapper = document.querySelector('.video-wrapper');
  if (videoWrapper) {
    videoWrapper.style.display = 'flex';
  }
  
  // Setup fullscreen button
  setupFullscreenButton();
  
  // Play main video
  const currentVideo = videos[currentVideoIndex];
  
  if (currentVideo.type === 'iframe') {
    // Show iframe, hide video player
    if (videoIframe) {
      videoIframe.style.display = 'block';
      videoIframe.src = currentVideo.src;
    }
    if (videoPlayer) {
      videoPlayer.style.display = 'none';
    }
    
    // Show buttons
    if (continueButton) continueButton.style.display = 'block';
    if (backButton) backButton.style.display = 'block';
    
    // Setup continue button to show choices
    if (continueButton) {
      // Remove all existing event listeners by cloning the button
      const newContinueButton = continueButton.cloneNode(true);
      continueButton.parentNode?.replaceChild(newContinueButton, continueButton);
      
      // Get the new button reference
      const freshContinueButton = document.getElementById('continue-button');
      if (freshContinueButton) {
        const handleContinueClick = () => {
          navigationHistory.push('choices-0');
          showChoices(0);
        };
        freshContinueButton.addEventListener('click', handleContinueClick);
      }
    }
    
    // Setup back button
    if (backButton) {
      const handleBackClick = () => {
        goBack();
      };
      backButton.removeEventListener('click', handleBackClick);
      backButton.addEventListener('click', handleBackClick);
    }
  } else {
    // Show video player, hide iframe
    if (videoPlayer) {
      videoPlayer.style.display = 'block';
      videoPlayer.src = currentVideo.src;
      videoPlayer.play();
      
      videoPlayer.addEventListener('ended', () => {
        if (continueButton) continueButton.style.display = 'block';
        if (backButton) backButton.style.display = 'block';
      }, { once: true });
    }
    if (videoIframe) {
      videoIframe.style.display = 'none';
    }
  }
}

function showChoices(levelIndex) {
  showChoicesWithoutHistoryUpdate(levelIndex);
  
  // Update navigation history only when not going back
  const stateKey = `choices-${levelIndex}`;
  if (navigationHistory[navigationHistory.length - 1] !== stateKey) {
    navigationHistory.push(stateKey);
  }
}

function showChoicesWithoutHistoryUpdate(levelIndex) {
  const choicesOverlay = document.getElementById('choices-overlay');
  const choicesGrid = document.getElementById('choices-grid');
  const continueButton = document.getElementById('continue-button');
  const backButton = document.getElementById('back-button');
  const videoWrapper = document.querySelector('.video-wrapper');
  
  if (!choicesOverlay || !choicesGrid) {
    console.error('Choices overlay or grid not found');
    return;
  }
  
  currentChoiceLevel = levelIndex;
  
  // Filter out already selected choices
  const availableChoices = allChoices.filter((choice, index) => {
    // Check if this choice has been selected before
    return !selectedChoices.some(selected => 
      selected.title === choice.title && selected.video.src === choice.video.src
    );
  });
  
  // If no choices available, show all (shouldn't happen, but safety check)
  const choices = availableChoices.length > 0 ? availableChoices : allChoices;
  
  // Stop current video before showing choices
  const videoPlayer = document.getElementById('video-player');
  const videoIframe = document.getElementById('video-iframe');
  
  if (videoPlayer) {
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
  }
  
  if (videoIframe) {
    videoIframe.src = '';
    videoIframe.removeAttribute('src');
  }
  
  // Hide video and buttons
  if (videoWrapper) videoWrapper.style.display = 'none';
  if (continueButton) continueButton.style.display = 'none';
  if (backButton) {
    backButton.style.display = 'none';
  }
  
  // Show choices overlay
  if (choicesOverlay) {
    choicesOverlay.style.display = 'flex';
  }
  
  // Clear and populate choices
  choicesGrid.innerHTML = '';
  choicesGrid.style.gridTemplateColumns = `repeat(${choices.length}, minmax(200px, 1fr))`;
  
  choices.forEach((choice, index) => {
    // Find the original index in allChoices to check if it's correct
    const originalIndex = allChoices.findIndex(c => 
      c.title === choice.title && c.video.src === choice.video.src
    );
    const levelConfig = choiceLevels[levelIndex];
    const isCorrect = levelConfig && originalIndex === levelConfig.correctIndex;
    
    const button = document.createElement('button');
    button.className = 'choice-button';
    button.setAttribute('data-choice-index', index);
    button.innerHTML = `
      <span style="font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: hsl(var(--muted-foreground)); opacity: 0.8; display: block; margin-bottom: 0.5rem;">${choice.optionLabel}</span>
      <span style="font-size: 2.5rem; font-weight: 800; display: block; color: hsl(var(--foreground)); line-height: 1.2; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);">${choice.title}</span>
    `;
    button.addEventListener('click', () => handleChoiceSelection({ ...choice, isCorrect }, levelIndex));
    choicesGrid.appendChild(button);
  });
  
  choicesOverlay.style.display = 'flex';
}

function handleChoiceSelection(choice, levelIndex) {
  // Stop current video before playing new one
  const videoPlayer = document.getElementById('video-player');
  const videoIframe = document.getElementById('video-iframe');
  
  if (videoPlayer) {
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
  }
  
  if (videoIframe) {
    videoIframe.src = '';
    videoIframe.removeAttribute('src');
  }
  
  selectedChoice = { choice, levelIndex };
  isPlayingChoiceVideo = true;
  
  // Add to selected choices list (to exclude from next level)
  selectedChoices.push({
    title: choice.title,
    video: choice.video
  });
  
  // Update navigation history
  navigationHistory.push('choice-video');
  
  // Hide choices
  const choicesOverlay = document.getElementById('choices-overlay');
  if (choicesOverlay) {
    choicesOverlay.style.display = 'none';
  }
  
  // Play the selected video
  playChoiceVideo(choice, levelIndex);
}

function playChoiceVideo(choice, levelIndex) {
  const videoIframe = document.getElementById('video-iframe');
  const videoPlayer = document.getElementById('video-player');
  const videoWrapper = document.querySelector('.video-wrapper');
  const continueButton = document.getElementById('continue-button');
  const backButton = document.getElementById('back-button');
  
  // Show video wrapper
  if (videoWrapper) videoWrapper.style.display = 'flex';
  
  // Setup fullscreen button
  setupFullscreenButton();
  
  // Show continue button, hide back button for choice videos
  if (continueButton) continueButton.style.display = 'block';
  if (backButton) backButton.style.display = 'none';
  
  // Play video
  if (choice.video.type === 'iframe') {
    if (videoIframe) {
      videoIframe.style.display = 'block';
      videoIframe.src = choice.video.src;
    }
    if (videoPlayer) {
      videoPlayer.style.display = 'none';
    }
  } else {
    if (videoPlayer) {
      videoPlayer.style.display = 'block';
      videoPlayer.src = choice.video.src;
      videoPlayer.play();
    }
    if (videoIframe) {
      videoIframe.style.display = 'none';
    }
  }
  
  // Setup continue button - remove all existing listeners first
  if (continueButton) {
    // Remove all existing event listeners by cloning the button
    const newContinueButton = continueButton.cloneNode(true);
    continueButton.parentNode?.replaceChild(newContinueButton, continueButton);
    
    // Get the new button reference
    const freshContinueButton = document.getElementById('continue-button');
    if (freshContinueButton) {
      const handleContinueAfterChoice = () => {
        if (choice.isCorrect) {
          // Correct choice - go to success page
          navigate('/success');
        } else {
          // Wrong choice - show next level of choices
          const nextLevel = levelIndex + 1;
          if (nextLevel < choiceLevels.length) {
            showChoices(nextLevel);
          } else {
            // No more levels, go to success anyway
            navigate('/success');
          }
        }
      };
      freshContinueButton.addEventListener('click', handleContinueAfterChoice);
    }
  }
}

// Choice buttons are now handled dynamically in showChoices function

// Warning page button
const warningBackButton = document.getElementById('warning-back-button');
if (warningBackButton) {
  warningBackButton.addEventListener('click', () => {
    navigate('/video');
  });
}

// Success page button - restart the journey
const restartButton = document.getElementById('restart-button');
if (restartButton) {
  restartButton.addEventListener('click', () => {
    // Reset everything and go to home
    resetVideoState();
    navigate('/');
  });
}

// Navigation buttons
navButtons.forEach(button => {
  button.addEventListener('click', () => {
    const path = button.getAttribute('data-path');
    navigate(path);
  });
});

// Not found page button
const notFoundLink = document.getElementById('not-found-link');
if (notFoundLink) {
  notFoundLink.addEventListener('click', () => {
    navigate('/');
  });
}

// Fullscreen functionality
function setupFullscreenButton() {
  const fullscreenButton = document.getElementById('fullscreen-button');
  const videoWrapper = document.getElementById('video-wrapper') || document.querySelector('.video-wrapper');
  
  if (!fullscreenButton || !videoWrapper) return;
  
  // Remove existing event listeners
  const newButton = fullscreenButton.cloneNode(true);
  fullscreenButton.parentNode?.replaceChild(newButton, fullscreenButton);
  
  const freshButton = document.getElementById('fullscreen-button');
  if (!freshButton) return;
  
  freshButton.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (videoWrapper.requestFullscreen) {
          await videoWrapper.requestFullscreen();
        } else if (videoWrapper.webkitRequestFullscreen) {
          await videoWrapper.webkitRequestFullscreen();
        } else if (videoWrapper.msRequestFullscreen) {
          await videoWrapper.msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (err) {
      console.log('Fullscreen error:', err);
    }
  });
  
  // Update button icon based on fullscreen state
  const updateFullscreenIcon = () => {
    const isFullscreen = !!document.fullscreenElement;
    const svg = freshButton.querySelector('svg');
    if (svg) {
      if (isFullscreen) {
        // Exit fullscreen icon
        svg.innerHTML = `
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
        `;
      } else {
        // Enter fullscreen icon
        svg.innerHTML = `
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        `;
      }
    }
  };
  
  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
  document.addEventListener('msfullscreenchange', updateFullscreenIcon);
}

function setupBtsFullscreenButton() {
  const fullscreenButton = document.getElementById('bts-fullscreen-button');
  const videoWrapper = document.getElementById('bts-video-wrapper');
  
  if (!fullscreenButton || !videoWrapper) return;
  
  // Remove existing event listeners
  const newButton = fullscreenButton.cloneNode(true);
  fullscreenButton.parentNode?.replaceChild(newButton, fullscreenButton);
  
  const freshButton = document.getElementById('bts-fullscreen-button');
  if (!freshButton) return;
  
  freshButton.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (videoWrapper.requestFullscreen) {
          await videoWrapper.requestFullscreen();
        } else if (videoWrapper.webkitRequestFullscreen) {
          await videoWrapper.webkitRequestFullscreen();
        } else if (videoWrapper.msRequestFullscreen) {
          await videoWrapper.msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (err) {
      console.log('BTS Fullscreen error:', err);
    }
  });
  
  // Update button icon based on fullscreen state
  const updateFullscreenIcon = () => {
    const isFullscreen = !!document.fullscreenElement;
    const svg = freshButton.querySelector('svg');
    if (svg) {
      if (isFullscreen) {
        // Exit fullscreen icon
        svg.innerHTML = `
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
        `;
      } else {
        // Enter fullscreen icon
        svg.innerHTML = `
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        `;
      }
    }
  };
  
  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
  document.addEventListener('msfullscreenchange', updateFullscreenIcon);
}

// Initialize app
showPage(currentPath);
