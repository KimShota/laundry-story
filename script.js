// create routing system
const validRoutes = ['/', '/video', '/warning', '/success', '/bts', '/team'];
let currentPath = window.location.pathname || '/';

// validate the initial path and redirect users to home if it is invalid
if (!validRoutes.includes(currentPath)) {
  currentPath = '/';
  window.history.replaceState({}, '', '/');
}

// create page elements
const pages = {
  '/': document.getElementById('index-page'),
  '/video': document.getElementById('video-page'),
  '/warning': document.getElementById('warning-page'),
  '/success': document.getElementById('success-page'),
  '/bts': document.getElementById('bts-page'),
  '/team': document.getElementById('team-page'),
};

// create navigation
const navButtons = document.querySelectorAll('.nav-button');
const navigation = document.getElementById('navigation');

function navigate(path) {
  currentPath = path;
  window.history.pushState({}, '', path);
  showPage(path);
}

function showPage(path) {
  //track the previous path to detect the navigation
  const previousPath = currentPath;
  
  // hide all the pages
  Object.values(pages).forEach(page => {
    if (page) page.style.display = 'none';
  });

  // show the current page
  const currentPage = pages[path] || pages['/'];
  if (currentPage) {
    currentPage.style.display = '';
  }

  // update the navigation buttons 
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

  // show or hide navigation based on pages 
  if (path === '/' || path === '/warning' || path === '/success') {
    navigation.style.display = 'none';
  } else {
    navigation.style.display = '';
  }

  // stop all the videos being played when user leave video page
  if (path !== '/video') {
    // stop the video player
    const videoPlayer = document.getElementById('video-player');
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.currentTime = 0; //set the current time to 0
      videoPlayer.src = '';
    }
    
    // stop the video by removing src
    const videoIframe = document.getElementById('video-iframe');
    if (videoIframe) {
      videoIframe.src = '';
      videoIframe.removeAttribute('src');
    }
    
    // clean up the video end hanlder 
    if (videoEndHandler) {
      window.removeEventListener('message', videoEndHandler);
      videoEndHandler = null;
    }
    
    // create the continue button
    const continueButton = document.getElementById('continue-button');
    if (continueButton) {
      continueButton.style.display = 'none';
    }
  }
  
  // stop all the audio when user leave the home page
  const laundryAudio = document.getElementById('laundry-audio');
  const doorAudio = document.getElementById('door-audio');
  if (laundryAudio) { //laundry audio
    laundryAudio.pause();
    laundryAudio.currentTime = 0;
  }
  if (doorAudio) { //door audio
    doorAudio.pause();
    doorAudio.currentTime = 0;
  }
  
  //reset everything when user go back to home page
  if (path === '/') {
    resetVideoState();
    cleanupFloatingTexts(); // clean up any text floating
    initIndexPage();
  } else {
    // clean up floating texts
    cleanupFloatingTexts();
    
    if (path === '/video') {
      // always reset to the main video when coming from any page
      if (previousPath !== '/video') {
        resetVideoState();
        isPlayingChoiceVideo = false;
        selectedChoice = null;
        navigationHistory.push('main-video');
      } else if (navigationHistory.length === 0 || !navigationHistory.includes('main-video')) {
        // reset everything when there is nothing
        resetVideoState();
        // clear the choice video state
        isPlayingChoiceVideo = false;
        selectedChoice = null;
        navigationHistory.push('main-video');
      }
      initVideoPage();
    } else if (path === '/bts') {
      // enable the fullscreen button
      setupBtsFullscreenButton();
    } else if (path === '/success') {
      //clear the navigation history
      navigationHistory = [];
      isPlayingChoiceVideo = false;
      selectedChoice = null;
    }
  }
  
  // update the current path
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

// index page 
let floatingTextInterval = null;
let floatingTextTimeouts = []; //track the timeouts
let isDoorOpening = false;

function cleanupFloatingTexts() {
  // Clear interval
  if (floatingTextInterval) {
    clearInterval(floatingTextInterval);
    floatingTextInterval = null;
  }
  
  // clear all the timeouts 
  floatingTextTimeouts.forEach(timeout => clearTimeout(timeout));
  floatingTextTimeouts = [];
  
  // remove all the texts
  const existingTexts = document.querySelectorAll('.floating-text');
  existingTexts.forEach(text => text.remove());
}

function initIndexPage() {
  // clean any texts 
  cleanupFloatingTexts();

  // play laundry audio
  const laundryAudio = document.getElementById('laundry-audio');
  if (laundryAudio) {
    laundryAudio.currentTime = 0;
    //catch error
    laundryAudio.play().catch(err => {
      console.log('Audio autoplay prevented:', err);
    });
  }

  //list of messages
  const messages = [
    'Where are my socks?',
    'Who touched my laundry?',
    'Who took out my laundry?',
    'Who stole my t-shirt?',
    'I will never forgive whoever stole my laundry'
  ];

    const createFloatingText = () => {
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      // calculate the location of washing machine 
      const machineSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9, 800);
      const machineLeft = (window.innerWidth - machineSize) / 2;
      const machineTop = (window.innerHeight - machineSize) / 2;
      const machineRight = machineLeft + machineSize;
      const machineBottom = machineTop + machineSize;
      
      // add the padding around the machine to avoid overlap
      const padding = 80;
      const safeLeft = machineLeft - padding;
      const safeTop = machineTop - padding;
      const safeRight = machineRight + padding;
      const safeBottom = machineBottom + padding;
      
      // calculate the text width
    const textWidth = message.length * 12 + 50;
      const textHeight = 60;
      
      //set variables 
      let x, y;
      let attempts = 0;
      const maxAttempts = 100;
      
      //place floating text on the screen while avoiding overlap
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
      
      //handle if random placements failed many times
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
      
      // track the timeout for cleaning up
      const timeout = setTimeout(() => {
        textElement.remove();
        // remove from the tracking array
        const index = floatingTextTimeouts.indexOf(timeout);
        if (index > -1) {
          floatingTextTimeouts.splice(index, 1);
        }
      }, 3000);
      floatingTextTimeouts.push(timeout);
    }
    };

  // create the initial text
  const initialTimeout = setTimeout(() => {
      createFloatingText();
    }, 500);
  floatingTextTimeouts.push(initialTimeout);
    
  // create texts over time 
  floatingTextInterval = setInterval(createFloatingText, 3500);

  // reset the door state 
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

// handle the door click
const doorButton = document.getElementById('door-button');
if (doorButton) {
  //listen to clicking
  doorButton.addEventListener('click', () => {
    if (!isDoorOpening) {
      isDoorOpening = true;
      doorButton.classList.add('door-open');
      const doorTextContainer = document.getElementById('door-text-container');
      if (doorTextContainer) {
        doorTextContainer.style.display = 'none';
      }

      // play door opening audio
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

// video page functionality
let currentVideoIndex = 0;
const videos = [
  { type: 'iframe', src: 'https://drive.google.com/file/d/1jzz9RxGaODluHLoIRU-b3AQ5pmKwrJZi/preview' },
];

// set all available choices
const allChoices = [
  { 
    optionLabel: 'Option 1', 
    title: 'Confront', 
    video: { type: 'iframe', src: 'https://drive.google.com/file/d/1cLewkmjJWcr45zRh09BLjjOMhOhwh-hX/preview' },
    isCorrect: false 
  },
  { 
    optionLabel: 'Option 2', 
    title: 'Post on ROR', 
    video: { type: 'iframe', src: 'https://drive.google.com/file/d/1AMMhL0VfiADcFP0kDd5ZxWxSQw6x__E8/preview' },
    isCorrect: false 
  },
  { 
    optionLabel: 'Option 3', 
    title: 'Let it go', 
    video: { type: 'iframe', src: 'https://drive.google.com/file/d/1ReIDh10U5CeuXdxf_pBvMgGli4S6KDL5/preview' },
    isCorrect: true 
  },
];

// define the correct index
const choiceLevels = [
  { correctIndex: 2 },
  { correctIndex: 2 },
  { correctIndex: 2 },
];

// track the state
let currentChoiceLevel = 0;
let selectedChoice = null;
let isPlayingChoiceVideo = false;
let selectedChoices = [];

// track the sequence of pages 
let navigationHistory = [];

let videoEndHandler = null;

// reset all the states 
function resetVideoState() {
  currentChoiceLevel = 0;
  selectedChoice = null;
  isPlayingChoiceVideo = false;
  navigationHistory = [];
  currentVideoIndex = 0;
  selectedChoices = []; // reset the selected choices
  
  if (videoEndHandler) {
    window.removeEventListener('message', videoEndHandler);
    videoEndHandler = null;
  }
  
  // reset the video elements
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

// go back to previous state
function goBack() {
  if (navigationHistory.length <= 1) {
    navigate('/');
    return;
  }
  
  // remove the current state
  navigationHistory.pop();
  
  // get the previous state
  const previousState = navigationHistory[navigationHistory.length - 1];
  
  if (previousState === 'main-video') {
    // go back to the main video 
    isPlayingChoiceVideo = false;
    selectedChoice = null;
    initVideoPage();
  } else if (previousState && previousState.startsWith('choices-')) {
    // go back to choices
    const levelIndex = parseInt(previousState.split('-')[1]);
    isPlayingChoiceVideo = false;
    selectedChoice = null;
    showChoicesWithoutHistoryUpdate(levelIndex);
  } else if (previousState === 'choice-video') {
    // go back from choice video to the choices 
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
    //go back to home
    navigate('/');
  }
}

function initVideoPage() {
  const videoPlayer = document.getElementById('video-player');
  const videoIframe = document.getElementById('video-iframe');
  const choicesOverlay = document.getElementById('choices-overlay');
  const continueButton = document.getElementById('continue-button');
  const backButton = document.getElementById('back-button');
  
  // check if we just reset or not
  const isJustReset = navigationHistory.length === 1 && navigationHistory[0] === 'main-video';
  
  if (isJustReset) {
    //clear video states and show main video
    isPlayingChoiceVideo = false;
    selectedChoice = null;
    } else {
    // check if we should resume a choice video or not
    const shouldResumeChoiceVideo = 
      navigationHistory.length > 1 && //navigation history needs to have more than main video
      navigationHistory[navigationHistory.length - 1] === 'choice-video' &&
      isPlayingChoiceVideo && 
      selectedChoice &&
      selectedChoice.choice &&
      selectedChoice.levelIndex !== undefined;
    
    if (shouldResumeChoiceVideo) {
      playChoiceVideo(selectedChoice.choice, selectedChoice.levelIndex);
      return;
    }
    
    // clear video states 
    isPlayingChoiceVideo = false;
    selectedChoice = null;
  }
  
  // reset choice overlay
  if (choicesOverlay) {
    choicesOverlay.style.display = 'none';
  }
  
  // clean up previous video end handler
  if (videoEndHandler) {
    window.removeEventListener('message', videoEndHandler);
    videoEndHandler = null;
  }
  
  //reste the video elemetns to make sure the clean state
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
  
  // show the video wrapper
  const videoWrapper = document.querySelector('.video-wrapper');
  if (videoWrapper) {
    videoWrapper.style.display = 'flex';
  }
  
  // set up fullscreen button
  setupFullscreenButton();
  
  // play main video 
  const currentVideo = videos[currentVideoIndex];
  
  if (currentVideo.type === 'iframe') {
    // show iframe and hide video player
    if (videoIframe) {
      videoIframe.style.display = 'block';
      videoIframe.src = currentVideo.src;
    }
    if (videoPlayer) {
      videoPlayer.style.display = 'none';
    }
    
    // show buttons
    if (continueButton) continueButton.style.display = 'block';
    if (backButton) backButton.style.display = 'block';
    
    // enable continue button to show choices
    if (continueButton) {
      // remove all  event listeners
      const newContinueButton = continueButton.cloneNode(true);
      continueButton.parentNode?.replaceChild(newContinueButton, continueButton);
      
      // get the new button reference
      const freshContinueButton = document.getElementById('continue-button');
      if (freshContinueButton) {
        const handleContinueClick = () => {
          navigationHistory.push('choices-0');
          showChoices(0);
        };
        freshContinueButton.addEventListener('click', handleContinueClick);
      }
    }
    
    // enable the back button
    if (backButton) {
      const handleBackClick = () => {
        goBack();
      };
      backButton.removeEventListener('click', handleBackClick);
      backButton.addEventListener('click', handleBackClick);
    }
  } else {
    // show the video player
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
  
  // update navigation history only when user is not going back 
  const stateKey = `choices-${levelIndex}`;
  if (navigationHistory[navigationHistory.length - 1] !== stateKey) {
    navigationHistory.push(stateKey);
  }
}

// show three choices 
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
  
  // filter out selected choices
  const availableChoices = allChoices.filter((choice, index) => {
    // check if this choice has been selected before
    return !selectedChoices.some(selected => 
      selected.title === choice.title && selected.video.src === choice.video.src
    );
  });
  
  // show all if no choice is available
  const choices = availableChoices.length > 0 ? availableChoices : allChoices;
  
  // stop the current video 
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
  
  // hide the video and buttons
  if (videoWrapper) videoWrapper.style.display = 'none';
  if (continueButton) continueButton.style.display = 'none';
  if (backButton) {
    backButton.style.display = 'none';
  }
  
  // show the choices overlay
  if (choicesOverlay) {
    choicesOverlay.style.display = 'flex';
  }
  
  // clear and populate choices
  choicesGrid.innerHTML = '';
  choicesGrid.style.gridTemplateColumns = `repeat(${choices.length}, minmax(200px, 1fr))`;
  
  choices.forEach((choice, index) => {
    // find the original index in allChoices
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
  // stop the current video before playing a new one
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
  
  // add to the selected choices list 
  selectedChoices.push({
    title: choice.title,
    video: choice.video
  });
  
  // update navigation history
  navigationHistory.push('choice-video');
  
  // hide choices
  const choicesOverlay = document.getElementById('choices-overlay');
  if (choicesOverlay) {
    choicesOverlay.style.display = 'none';
  }
  
  // play the selected video
  playChoiceVideo(choice, levelIndex);
}

function playChoiceVideo(choice, levelIndex) {
  const videoIframe = document.getElementById('video-iframe');
  const videoPlayer = document.getElementById('video-player');
  const videoWrapper = document.querySelector('.video-wrapper');
  const continueButton = document.getElementById('continue-button');
  const backButton = document.getElementById('back-button');
  
  // show the video wrapper
  if (videoWrapper) videoWrapper.style.display = 'flex';
  
  // enable the fullscreen button
  setupFullscreenButton();
  
  // show continue button and hide back button 
  if (continueButton) continueButton.style.display = 'block';
  if (backButton) backButton.style.display = 'none';
  
  // play the video
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
  
  // enable the continue button 
  if (continueButton) {
    // remove all event listeners
    const newContinueButton = continueButton.cloneNode(true);
    continueButton.parentNode?.replaceChild(newContinueButton, continueButton);
    
    // get the new button reference
    const freshContinueButton = document.getElementById('continue-button');
    if (freshContinueButton) {
      const handleContinueAfterChoice = () => {
        if (choice.isCorrect) {
          // go to success page 
          navigate('/success');
        } else {
          // show next level of choices
          const nextLevel = levelIndex + 1;
          if (nextLevel < choiceLevels.length) {
            showChoices(nextLevel);
          } else {
            // go to success if no more choices
            navigate('/success');
          }
        }
      };
      freshContinueButton.addEventListener('click', handleContinueAfterChoice);
    }
  }
}

// warning page button
const warningBackButton = document.getElementById('warning-back-button');
if (warningBackButton) {
  warningBackButton.addEventListener('click', () => {
    navigate('/video');
  });
}

// Success page button
const restartButton = document.getElementById('restart-button');
if (restartButton) {
  restartButton.addEventListener('click', () => {
    //reset everything and go back to home
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

// enable fullscreen functionality
function setupFullscreenButton() {
  const fullscreenButton = document.getElementById('fullscreen-button');
  const videoWrapper = document.getElementById('video-wrapper') || document.querySelector('.video-wrapper');
  
  if (!fullscreenButton || !videoWrapper) return;
  
  // remove event listeners
  const newButton = fullscreenButton.cloneNode(true);
  fullscreenButton.parentNode?.replaceChild(newButton, fullscreenButton);
  
  const freshButton = document.getElementById('fullscreen-button');
  if (!freshButton) return;
  
  freshButton.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        // enter the fullscreen
        if (videoWrapper.requestFullscreen) {
          await videoWrapper.requestFullscreen();
        } else if (videoWrapper.webkitRequestFullscreen) {
          await videoWrapper.webkitRequestFullscreen();
        } else if (videoWrapper.msRequestFullscreen) {
          await videoWrapper.msRequestFullscreen();
        }
      } else {
        // exit the fullscreen
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
  
  // update the button icon based upon fullscreen state
  const updateFullscreenIcon = () => {
    const isFullscreen = !!document.fullscreenElement;
    const svg = freshButton.querySelector('svg');
    if (svg) {
      if (isFullscreen) {
        // exist the fullscreen icon
        svg.innerHTML = `
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
        `;
      } else {
        // enter the fullscreen icon
        svg.innerHTML = `
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        `;
      }
    }
  };
  
  // listen for fullscreen changes
  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
  document.addEventListener('msfullscreenchange', updateFullscreenIcon);
}

function setupBtsFullscreenButton() {
  const fullscreenButton = document.getElementById('bts-fullscreen-button');
  const videoWrapper = document.getElementById('bts-video-wrapper');
  
  if (!fullscreenButton || !videoWrapper) return;
  
  // remove event listeners
  const newButton = fullscreenButton.cloneNode(true);
  fullscreenButton.parentNode?.replaceChild(newButton, fullscreenButton);
  
  const freshButton = document.getElementById('bts-fullscreen-button');
  if (!freshButton) return;
  
  freshButton.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        // enter the fullscreen
        if (videoWrapper.requestFullscreen) {
          await videoWrapper.requestFullscreen();
        } else if (videoWrapper.webkitRequestFullscreen) {
          await videoWrapper.webkitRequestFullscreen();
        } else if (videoWrapper.msRequestFullscreen) {
          await videoWrapper.msRequestFullscreen();
        }
      } else {
        // exit the fullscreen
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
  
  // update the button icon based upon fullscreen state
  const updateFullscreenIcon = () => {
    const isFullscreen = !!document.fullscreenElement;
    const svg = freshButton.querySelector('svg');
    if (svg) {
      if (isFullscreen) {
        // exit the fullscreen icon
        svg.innerHTML = `
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
        `;
      } else {
        // enter the fullscreen icon
        svg.innerHTML = `
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        `;
      }
    }
  };
  
  // listen for fullscreen changes
  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
  document.addEventListener('msfullscreenchange', updateFullscreenIcon);
}

// initialize app
showPage(currentPath);
